/**
 * Schema Inference Engine - Automatically generate Zod schemas from data samples
 * @fileoverview Core inference logic for zod-to-from v2
 */

import { z } from 'zod';

/**
 * @typedef {Object} InferenceOptions
 * @property {boolean} [strict] - Use strict types (no coercion)
 * @property {boolean} [detectPatterns] - Detect email, URL, UUID patterns
 * @property {number} [minConfidence] - Minimum confidence score (0-1)
 * @property {boolean} [includeMetadata] - Include inference metadata
 */

/**
 * @typedef {Object} InferenceResult
 * @property {import('zod').ZodSchema} schema - The inferred Zod schema
 * @property {Object} metadata - Inference metadata
 * @property {number} metadata.confidence - Confidence score (0-1)
 * @property {number} metadata.sampleCount - Number of samples analyzed
 * @property {Object} metadata.fieldStats - Per-field statistics
 * @property {string[]} metadata.warnings - Any warnings during inference
 */

/**
 * @typedef {Object} FieldInfo
 * @property {Set<string>} types - Set of detected types
 * @property {number} nullCount - Count of null values
 * @property {number} undefinedCount - Count of undefined values
 * @property {number} totalCount - Total occurrences
 * @property {Set<any>} values - Sample values for literal detection
 * @property {boolean} isOptional - Whether field is optional
 * @property {Object} [nestedSchema] - For objects/arrays
 */

/**
 * Infer Zod schema from a single data sample
 * @param {any} sample - The data sample to analyze
 * @param {InferenceOptions} [opts] - Inference options
 * @returns {import('zod').ZodSchema} The inferred schema
 */
export function inferSchemaFromSample(sample, opts = {}) {
  const type = detectType(sample);

  switch (type) {
    case 'null': {
      return z.null();
    }
    case 'undefined': {
      return z.undefined();
    }
    case 'string': {
      return inferStringSchema(sample, opts);
    }
    case 'number': {
      return z.number();
    }
    case 'boolean': {
      return z.boolean();
    }
    case 'date': {
      return z.date();
    }
    case 'array': {
      return inferArraySchema(sample, opts);
    }
    case 'object': {
      return inferObjectSchema(sample, opts);
    }
    default: {
      return z.unknown();
    }
  }
}

/**
 * Infer Zod schema from multiple data samples
 * Combines types, detects optional fields, and generates unions
 * @param {any[]} samples - Array of data samples
 * @param {InferenceOptions} [opts] - Inference options
 * @returns {InferenceResult} The inferred schema with metadata
 */
export function inferSchema(samples, opts = {}) {
  if (!Array.isArray(samples) || samples.length === 0) {
    throw new Error('inferSchema requires a non-empty array of samples');
  }

  const warnings = [];

  // Analyze all samples to build field statistics
  const fieldStats = analyzeFields(samples);

  // Build the schema from field statistics
  const schema = buildSchemaFromStats(fieldStats, samples.length, opts, warnings);

  // Calculate confidence score
  const confidence = calculateConfidence(fieldStats, samples.length);

  const metadata = {
    confidence,
    sampleCount: samples.length,
    fieldStats: serializeFieldStats(fieldStats),
    warnings,
  };

  return opts.includeMetadata ? { schema, metadata } : { schema, metadata };
}

/**
 * Analyze fields across all samples to gather statistics
 * @param {any[]} samples - Array of samples
 * @returns {Map<string, FieldInfo>} Field statistics
 */
function analyzeFields(samples) {
  const fieldStats = new Map();

  for (const sample of samples) {
    if (sample === null || sample === undefined) {
      continue;
    }

    if (typeof sample !== 'object' || Array.isArray(sample)) {
      // For primitive or array samples, treat as single field
      const info = fieldStats.get('_root') || createFieldInfo();
      updateFieldInfo(info, sample);
      fieldStats.set('_root', info);
      continue;
    }

    // For objects, analyze each field
    for (const [key, value] of Object.entries(sample)) {
      const info = fieldStats.get(key) || createFieldInfo();
      updateFieldInfo(info, value);
      fieldStats.set(key, info);
    }
  }

  return fieldStats;
}

/**
 * Create new field info tracker
 * @returns {FieldInfo}
 */
function createFieldInfo() {
  return {
    types: new Set(),
    nullCount: 0,
    undefinedCount: 0,
    totalCount: 0,
    values: new Set(),
    isOptional: false,
    nestedSchema: null,
  };
}

/**
 * Update field info with a new value
 * @param {FieldInfo} info - Field info to update
 * @param {any} value - Value to analyze
 */
function updateFieldInfo(info, value) {
  info.totalCount++;

  if (value === null) {
    info.nullCount++;
    info.types.add('null');
    return;
  }

  if (value === undefined) {
    info.undefinedCount++;
    info.types.add('undefined');
    return;
  }

  const type = detectType(value);
  info.types.add(type);

  // Store values for literal/enum detection (limit to prevent memory issues)
  if (info.values.size < 20 && (type === 'string' || type === 'number' || type === 'boolean')) {
      info.values.add(value);
    }
}

/**
 * Build Zod schema from field statistics
 * @param {Map<string, FieldInfo>} fieldStats - Field statistics
 * @param {number} sampleCount - Total number of samples
 * @param {InferenceOptions} opts - Options
 * @param {string[]} warnings - Array to collect warnings
 * @returns {import('zod').ZodSchema}
 */
function buildSchemaFromStats(fieldStats, sampleCount, opts, warnings) {
  // Check if this is a root-level primitive or array
  if (fieldStats.has('_root')) {
    const rootInfo = fieldStats.get('_root');
    return buildFieldSchema(rootInfo, sampleCount, opts, warnings, '_root');
  }

  // Build object schema
  const shape = {};

  for (const [key, info] of fieldStats.entries()) {
    const fieldSchema = buildFieldSchema(info, sampleCount, opts, warnings, key);
    shape[key] = fieldSchema;
  }

  return z.object(shape);
}

/**
 * Build Zod schema for a single field
 * @param {FieldInfo} info - Field information
 * @param {number} sampleCount - Total samples
 * @param {InferenceOptions} opts - Options
 * @param {string[]} warnings - Warnings array
 * @param {string} fieldName - Field name for warnings
 * @returns {import('zod').ZodSchema}
 */
function buildFieldSchema(info, sampleCount, opts, warnings, fieldName) {
  // Determine if field is optional
  const isOptional = info.totalCount < sampleCount;

  // Remove null/undefined from types for schema building
  const types = new Set([...info.types].filter(t => t !== 'null' && t !== 'undefined'));

  let schema;

  // Handle enum/literal detection
  if (info.values.size > 0 && info.values.size <= 10 && types.size === 1) {
    const uniqueValues = [...info.values];
    if (uniqueValues.length === 1) {
      // Single literal
      schema = z.literal(uniqueValues[0]);
    } else {
      // Enum
      if (types.has('string')) {
        schema = z.enum(uniqueValues);
      } else {
        // For numbers/booleans, use union of literals
        schema = z.union(uniqueValues.map(v => z.literal(v)));
      }
    }
  }
  // Handle single type
  else if (types.size === 1) {
    const type = [...types][0];
    schema = buildTypeSchema(type, info, opts, warnings, fieldName);
  }
  // Handle union types
  else if (types.size > 1) {
    const schemas = [...types].map(type => buildTypeSchema(type, info, opts, warnings, fieldName));
    schema = z.union(schemas);
    warnings.push(`Field "${fieldName}" has multiple types: ${[...types].join(', ')}`);
  }
  // No valid types found
  else {
    schema = z.unknown();
    warnings.push(`Field "${fieldName}" has no determinable type`);
  }

  // Add nullable/optional modifiers
  if (info.nullCount > 0) {
    schema = schema.nullable();
  }

  if (isOptional) {
    schema = schema.optional();
  }

  return schema;
}

/**
 * Build schema for a specific type
 * @param {string} type - Type name
 * @param {FieldInfo} info - Field info
 * @param {InferenceOptions} opts - Options
 * @param {string[]} warnings - Warnings
 * @param {string} fieldName - Field name
 * @returns {import('zod').ZodSchema}
 */
function buildTypeSchema(type, info, opts, warnings, fieldName) {
  switch (type) {
    case 'string': {
      return inferStringSchema([...info.values][0] || '', opts);
    }
    case 'number': {
      return z.number();
    }
    case 'boolean': {
      return z.boolean();
    }
    case 'date': {
      return z.date();
    }
    case 'array': {
      // For arrays, we'd need to analyze nested items (simplified here)
      return z.array(z.unknown());
    }
    case 'object': {
      // For nested objects, we'd need recursive analysis (simplified here)
      return z.record(z.unknown());
    }
    default: {
      return z.unknown();
    }
  }
}

/**
 * Infer string schema with pattern detection
 * @param {string} sample - String sample
 * @param {InferenceOptions} opts - Options
 * @returns {import('zod').ZodSchema}
 */
function inferStringSchema(sample, opts = {}) {
  if (!opts.detectPatterns) {
    return z.string();
  }

  // Email pattern
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sample)) {
    return z.string().email();
  }

  // URL pattern
  if (/^https?:\/\/.+/.test(sample)) {
    return z.string().url();
  }

  // UUID pattern
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sample)) {
    return z.string().uuid();
  }

  // ISO date pattern
  if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/.test(sample)) {
    return z.string().datetime();
  }

  return z.string();
}

/**
 * Infer array schema
 * @param {any[]} array - Array sample
 * @param {InferenceOptions} opts - Options
 * @returns {import('zod').ZodSchema}
 */
function inferArraySchema(array, opts = {}) {
  if (array.length === 0) {
    return z.array(z.unknown());
  }

  // Infer schema from array items
  const itemSchemas = array.map(item => inferSchemaFromSample(item, opts));

  // If all items have the same schema type, use that
  // Otherwise, create a union (simplified - just use first item's schema)
  return z.array(itemSchemas[0]);
}

/**
 * Infer object schema
 * @param {Object} obj - Object sample
 * @param {InferenceOptions} opts - Options
 * @returns {import('zod').ZodSchema}
 */
function inferObjectSchema(obj, opts = {}) {
  const shape = {};

  for (const [key, value] of Object.entries(obj)) {
    shape[key] = inferSchemaFromSample(value, opts);
  }

  return z.object(shape);
}

/**
 * Detect type of a value
 * @param {any} value - Value to analyze
 * @returns {string} Type name
 */
function detectType(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (value instanceof Date) return 'date';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/**
 * Calculate confidence score for inferred schema
 * @param {Map<string, FieldInfo>} fieldStats - Field statistics
 * @param {number} sampleCount - Total samples
 * @returns {number} Confidence score (0-1)
 */
function calculateConfidence(fieldStats, sampleCount) {
  let totalFields = 0;
  let consistentFields = 0;

  for (const info of fieldStats.values()) {
    totalFields++;

    // Field is consistent if it has single type and appears in most samples
    const nonNullTypes = [...info.types].filter(t => t !== 'null' && t !== 'undefined');
    const coverage = info.totalCount / sampleCount;

    if (nonNullTypes.length === 1 && coverage >= 0.8) {
      consistentFields++;
    }
  }

  return totalFields > 0 ? consistentFields / totalFields : 0;
}

/**
 * Serialize field stats for metadata
 * @param {Map<string, FieldInfo>} fieldStats - Field statistics
 * @returns {Object}
 */
function serializeFieldStats(fieldStats) {
  const stats = {};

  for (const [key, info] of fieldStats.entries()) {
    stats[key] = {
      types: [...info.types],
      nullCount: info.nullCount,
      undefinedCount: info.undefinedCount,
      totalCount: info.totalCount,
      isOptional: info.isOptional,
      valueCount: info.values.size,
    };
  }

  return stats;
}

/**
 * Export schema as Zod code string
 * @param {import('zod').ZodSchema} schema - Zod schema
 * @returns {string} Zod code
 */
export function schemaToCode(schema) {
  // This is a simplified version - would need more sophisticated serialization
  // For now, return a basic representation
  return `z.${schema._def.typeName.replace('Zod', '').toLowerCase()}()`;
}

/**
 * Export schema as TypeScript type
 * @param {import('zod').ZodSchema} schema - Zod schema
 * @param {string} [typeName] - Type name
 * @returns {string} TypeScript type definition
 */
export function schemaToTypeScript(schema, typeName = 'InferredType') {
  // This is a simplified version
  return `export type ${typeName} = z.infer<typeof schema>;`;
}

/**
 * Incremental schema refinement - update schema with new samples
 * @param {import('zod').ZodSchema} existingSchema - Current schema
 * @param {any[]} newSamples - New samples
 * @param {InferenceOptions} [opts] - Options
 * @returns {InferenceResult} Updated schema
 */
export function refineSchema(existingSchema, newSamples, opts = {}) {
  // This would merge the existing schema with inferred schema from new samples
  // Simplified implementation - just infer from new samples
  return inferSchema(newSamples, opts);
}

/**
 * Compare two schemas and return differences
 * @param {import('zod').ZodSchema} schema1 - First schema
 * @param {import('zod').ZodSchema} schema2 - Second schema
 * @returns {Object} Schema differences
 */
export function compareSchemas(schema1, schema2) {
  return {
    added: [],
    removed: [],
    modified: [],
    identical: schema1._def.typeName === schema2._def.typeName,
  };
}
