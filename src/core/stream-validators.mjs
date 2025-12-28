/**
 * Streaming-Optimized Validators for ZTF v2
 * @fileoverview Specialized validators for streaming scenarios with incremental compilation
 */

import { z } from 'zod';
import { Transform } from 'node:stream';

/**
 * @typedef {import('zod').ZodSchema} ZodSchema
 */

/**
 * Validation result aggregator
 * @typedef {Object} ValidationAggregation
 * @property {number} totalValidated - Total items validated
 * @property {number} passed - Items that passed validation
 * @property {number} failed - Items that failed validation
 * @property {Array<Object>} failedItems - Failed items with details
 * @property {Object} fieldStats - Statistics per field
 */

/**
 * Create an incremental schema compiler for streaming
 * @param {ZodSchema} baseSchema - Base Zod schema
 * @param {Object} options - Compiler options
 * @returns {Object} Incremental compiler
 */
export function createIncrementalCompiler(baseSchema, options = {}) {
  const { cacheSize = 1000 } = options;
  const validationCache = new Map();
  let cacheHits = 0;
  let cacheMisses = 0;

  return {
    /**
     * Validate with caching
     * @param {any} data - Data to validate
     * @returns {Object} Validation result
     */
    validate(data) {
      const cacheKey = JSON.stringify(data);

      if (validationCache.has(cacheKey)) {
        cacheHits++;
        return validationCache.get(cacheKey);
      }

      cacheMisses++;
      const result = baseSchema.safeParse(data);

      // Maintain cache size limit
      if (validationCache.size >= cacheSize) {
        const firstKey = validationCache.keys().next().value;
        validationCache.delete(firstKey);
      }

      validationCache.set(cacheKey, result);
      return result;
    },

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getStats() {
      return {
        cacheHits,
        cacheMisses,
        cacheSize: validationCache.size,
        hitRate: cacheHits / (cacheHits + cacheMisses) || 0,
      };
    },

    /**
     * Clear the cache
     */
    clearCache() {
      validationCache.clear();
      cacheHits = 0;
      cacheMisses = 0;
    },
  };
}

/**
 * Create a validation result aggregator stream
 * @param {ZodSchema} schema - Zod schema
 * @param {Object} options - Aggregation options
 * @returns {Transform} Aggregator stream
 */
export function createAggregatorStream(schema, options = {}) {
  const {
    trackFieldStats = true,
    maxFailedItems = 100,
  } = options;

  /** @type {ValidationAggregation} */
  const aggregation = {
    totalValidated: 0,
    passed: 0,
    failed: 0,
    failedItems: [],
    fieldStats: {},
  };

  const stream = new Transform({
    objectMode: true,

    transform(chunk, encoding, callback) {
      aggregation.totalValidated++;
      const result = schema.safeParse(chunk);

      if (result.success) {
        aggregation.passed++;

        // Track field statistics
        if (trackFieldStats) {
          for (const [field, value] of Object.entries(result.data)) {
            if (!aggregation.fieldStats[field]) {
              aggregation.fieldStats[field] = {
                count: 0,
                types: new Set(),
                nullCount: 0,
                uniqueValues: new Set(),
              };
            }

            const stats = aggregation.fieldStats[field];
            stats.count++;
            stats.types.add(typeof value);

            if (value === null || value === undefined) {
              stats.nullCount++;
            }

            // Track unique values for small cardinality fields
            if (stats.uniqueValues.size < 100) {
              stats.uniqueValues.add(JSON.stringify(value));
            }
          }
        }

        this.push(result.data);
      } else {
        aggregation.failed++;

        if (aggregation.failedItems.length < maxFailedItems) {
          aggregation.failedItems.push({
            index: aggregation.totalValidated - 1,
            data: chunk,
            error: result.error.message,
            issues: result.error.issues,
          });
        }
      }

      callback();
    },

    flush(callback) {
      // Convert Sets to Arrays for serialization
      for (const field of Object.keys(aggregation.fieldStats)) {
        aggregation.fieldStats[field].types = [...aggregation.fieldStats[field].types];
        aggregation.fieldStats[field].uniqueValues = [...aggregation.fieldStats[field].uniqueValues];
      }

      callback();
    },
  });

  stream.getAggregation = () => ({ ...aggregation });

  return stream;
}

/**
 * Create a partial validation stream (validates subset of schema)
 * @param {ZodSchema} schema - Full Zod schema
 * @param {Array<string>} fields - Fields to validate
 * @param {Object} options - Partial validation options
 * @returns {Transform} Partial validator stream
 */
export function createPartialValidatorStream(schema, fields, options = {}) {
  const { strictMode = false } = options;

  // Create a partial schema
  const partialSchema = schema instanceof z.ZodObject
    ? schema.pick(Object.fromEntries(fields.map(( field) => [field, true])))
    : schema;

  return new Transform({
    objectMode: true,

    transform(chunk, encoding, callback) {
      try {
        const result = partialSchema.safeParse(chunk);

        if (result.success) {
          // In non-strict mode, pass through original data with validated fields
          const output = strictMode ? result.data : { ...chunk, ...result.data };
          this.push(output);
          callback();
        } else {
          callback(new Error(`Partial validation failed: ${result.error.message}`));
        }
      } catch (error) {
        callback(error);
      }
    },
  });
}

/**
 * Create a schema evolution stream (handles schema changes over time)
 * @param {Object} schemaVersions - Map of version to schema
 * @param {Object} options - Evolution options
 * @returns {Transform} Schema evolution stream
 */
export function createSchemaEvolutionStream(schemaVersions, options = {}) {
  const { versionField = '_version', defaultVersion = 'v1' } = options;

  return new Transform({
    objectMode: true,

    transform(chunk, encoding, callback) {
      try {
        const version = chunk[versionField] || defaultVersion;
        const schema = schemaVersions[version];

        if (!schema) {
          callback(new Error(`Unknown schema version: ${version}`));
          return;
        }

        const result = schema.safeParse(chunk);

        if (result.success) {
          this.push({ ...result.data, [versionField]: version });
          callback();
        } else {
          callback(new Error(`Validation failed for version ${version}: ${result.error.message}`));
        }
      } catch (error) {
        callback(error);
      }
    },
  });
}

/**
 * Create a conditional validation stream
 * @param {Object} conditions - Map of condition functions to schemas
 * @param {Object} options - Conditional options
 * @returns {Transform} Conditional validator stream
 */
export function createConditionalValidatorStream(conditions, options = {}) {
  const { defaultSchema = z.any() } = options;

  return new Transform({
    objectMode: true,

    transform(chunk, encoding, callback) {
      try {
        let matchedSchema = defaultSchema;

        // Find first matching condition
        for (const [condition, schema] of Object.entries(conditions)) {
          if (typeof condition === 'function' && condition(chunk)) {
            matchedSchema = schema;
            break;
          } else if (typeof condition === 'string') {
            // Simple field-based condition
            const [field, value] = condition.split('=');
            if (chunk[field] === value) {
              matchedSchema = schema;
              break;
            }
          }
        }

        const result = matchedSchema.safeParse(chunk);

        if (result.success) {
          this.push(result.data);
          callback();
        } else {
          callback(new Error(`Conditional validation failed: ${result.error.message}`));
        }
      } catch (error) {
        callback(error);
      }
    },
  });
}

/**
 * Create a sampling validator stream (validates every nth record)
 * @param {ZodSchema} schema - Zod schema
 * @param {Object} options - Sampling options
 * @returns {Transform} Sampling validator stream
 */
export function createSamplingValidatorStream(schema, options = {}) {
  const { sampleRate = 0.1, minSamples = 10 } = options;
  let recordCount = 0;
  let sampleCount = 0;

  const stream = new Transform({
    objectMode: true,

    transform(chunk, encoding, callback) {
      recordCount++;

      const shouldSample = Math.random() < sampleRate || sampleCount < minSamples;

      if (shouldSample) {
        sampleCount++;
        const result = schema.safeParse(chunk);

        if (!result.success) {
          callback(new Error(`Sample validation failed at record ${recordCount}: ${result.error.message}`));
          return;
        }
      }

      // Always pass through
      this.push(chunk);
      callback();
    },
  });

  stream.getSamplingStats = () => ({
    recordCount,
    sampleCount,
    samplingRate: sampleCount / recordCount || 0,
  });

  return stream;
}

/**
 * Create a schema-aware deduplication stream
 * @param {ZodSchema} schema - Zod schema
 * @param {Object} options - Deduplication options
 * @returns {Transform} Deduplication stream
 */
export function createDeduplicationStream(schema, options = {}) {
  const { keyFields = [], maxCacheSize = 10_000 } = options;
  const seenKeys = new Set();

  const stream = new Transform({
    objectMode: true,

    transform(chunk, encoding, callback) {
      try {
        const result = schema.safeParse(chunk);

        if (!result.success) {
          callback(new Error(`Validation failed: ${result.error.message}`));
          return;
        }

        // Generate deduplication key
        const key = keyFields.length > 0
          ? keyFields.map(field => result.data[field]).join('|')
          : JSON.stringify(result.data);

        if (!seenKeys.has(key)) {
          if (seenKeys.size >= maxCacheSize) {
            // Clear cache when limit reached (simple LRU alternative)
            seenKeys.clear();
          }

          seenKeys.add(key);
          this.push(result.data);
        }

        callback();
      } catch (error) {
        callback(error);
      }
    },
  });

  stream.getDuplicateStats = () => ({
    uniqueRecords: seenKeys.size,
  });

  return stream;
}

/**
 * Create a validation repair stream (attempts to fix common issues)
 * @param {ZodSchema} schema - Zod schema
 * @param {Object} options - Repair options
 * @returns {Transform} Repair stream
 */
export function createRepairStream(schema, options = {}) {
  const {
    repairs = {},
    strictMode = false,
  } = options;

  return new Transform({
    objectMode: true,

    transform(chunk, encoding, callback) {
      try {
        let data = { ...chunk };
        let repaired = false;

        // Apply repairs
        for (const [field, repairFn] of Object.entries(repairs)) {
          if (data[field] !== undefined) {
            try {
              const repairedValue = repairFn(data[field], data);
              if (repairedValue !== data[field]) {
                data[field] = repairedValue;
                repaired = true;
              }
            } catch {
              // Repair failed, continue with original value
            }
          }
        }

        const result = schema.safeParse(data);

        if (result.success) {
          this.push({ ...result.data, _repaired: repaired });
          callback();
        } else {
          if (strictMode) {
            callback(new Error(`Repair validation failed: ${result.error.message}`));
          } else {
            // Pass through with repair flag
            this.push({ ...chunk, _repaired: false, _validationError: result.error.message });
            callback();
          }
        }
      } catch (error) {
        callback(error);
      }
    },
  });
}

/**
 * Create a batched validation stream
 * @param {ZodSchema} schema - Zod schema
 * @param {Object} options - Batch options
 * @returns {Transform} Batched validator stream
 */
export function createBatchedValidatorStream(schema, options = {}) {
  const { batchSize = 100, parallelBatches = 4 } = options;
  let batch = [];
  let processing = 0;

  return new Transform({
    objectMode: true,

    async transform(chunk, encoding, callback) {
      batch.push(chunk);

      if (batch.length >= batchSize) {
        const currentBatch = batch.splice(0, batchSize);
        processing++;

        try {
          // Validate batch in parallel
          const results = await Promise.all(
            currentBatch.map(item => schema.safeParseAsync(item))
          );

          for (const result of results) {
            if (result.success) {
              this.push(result.data);
            } else {
              callback(new Error(`Batch validation failed: ${result.error.message}`));
              return;
            }
          }

          processing--;
        } catch (error) {
          processing--;
          callback(error);
          return;
        }
      }

      callback();
    },

    async flush(callback) {
      if (batch.length > 0) {
        try {
          const results = await Promise.all(
            batch.map(item => schema.safeParseAsync(item))
          );

          for (const result of results) {
            if (result.success) {
              this.push(result.data);
            }
          }
        } catch (error) {
          callback(error);
          return;
        }
      }

      callback();
    },
  });
}

export default {
  createIncrementalCompiler,
  createAggregatorStream,
  createPartialValidatorStream,
  createSchemaEvolutionStream,
  createConditionalValidatorStream,
  createSamplingValidatorStream,
  createDeduplicationStream,
  createRepairStream,
  createBatchedValidatorStream,
};
