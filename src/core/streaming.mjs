/**
 * Advanced Streaming Module for ZTF v2
 * @fileoverview Real-time validation, progressive parsing, and memory-efficient streaming
 */

import { Transform, pipeline, Readable, Writable } from 'node:stream';
import { promisify } from 'node:util';
import { createProvenance, simpleHash } from './registry.mjs';

const pipelineAsync = promisify(pipeline);

/**
 * @typedef {import('zod').ZodSchema} ZodSchema
 * @typedef {import('./registry.mjs').Provenance} Provenance
 */

/**
 * Validation event types
 * @typedef {'valid' | 'invalid' | 'partial' | 'error' | 'end'} ValidationEventType
 */

/**
 * Validation statistics
 * @typedef {Object} ValidationStats
 * @property {number} totalRecords - Total records processed
 * @property {number} validRecords - Successfully validated records
 * @property {number} invalidRecords - Records that failed validation
 * @property {number} bytesProcessed - Total bytes processed
 * @property {number} startTime - Processing start timestamp
 * @property {number} endTime - Processing end timestamp
 * @property {number} errorRate - Percentage of failed validations
 * @property {Array<{index: number, error: string}>} errors - Error details
 */

/**
 * Streaming validation options
 * @typedef {Object} StreamValidationOptions
 * @property {string} [format='ndjson'] - Input format (ndjson, csv, json)
 * @property {boolean} [failFast=false] - Stop on first error
 * @property {boolean} [skipInvalid=false] - Skip invalid records instead of failing
 * @property {boolean} [includeProvenance=false] - Include provenance metadata
 * @property {number} [highWaterMark=16] - Stream buffer size
 * @property {number} [maxErrors=100] - Maximum errors to track
 * @property {Function} [onValid] - Callback for valid records
 * @property {Function} [onInvalid] - Callback for invalid records
 * @property {Function} [onError] - Callback for validation errors
 * @property {Function} [onStats] - Callback for statistics updates
 * @property {Object} [transformOptions] - Additional transform options
 */

/**
 * Create a validation stream with real-time feedback
 * @param {ZodSchema} schema - Zod schema for validation
 * @param {StreamValidationOptions} options - Streaming options
 * @returns {Transform} Transform stream for validation
 */
export function createValidationStream(schema, options = {}) {
  const {
    format = 'ndjson',
    failFast = false,
    skipInvalid = false,
    includeProvenance = false,
    highWaterMark = 16,
    maxErrors = 100,
    onValid,
    onInvalid,
    onError,
    onStats,
  } = options;

  /** @type {ValidationStats} */
  const stats = {
    totalRecords: 0,
    validRecords: 0,
    invalidRecords: 0,
    bytesProcessed: 0,
    startTime: Date.now(),
    endTime: 0,
    errorRate: 0,
    errors: [],
  };

  let provenance = null;
  if (includeProvenance) {
    provenance = createProvenance(format, format, undefined, {
      schemaHash: simpleHash(schema.toString()),
      streaming: true,
    });
  }

  const stream = new Transform({
    objectMode: true,
    highWaterMark,

    transform(chunk, encoding, callback) {
      try {
        stats.totalRecords++;
        stats.bytesProcessed += Buffer.byteLength(JSON.stringify(chunk));

        // Validate chunk against schema
        const result = schema.safeParse(chunk);

        if (result.success) {
          stats.validRecords++;

          // Emit valid event
          if (onValid) {
            onValid(result.data, stats.totalRecords - 1);
          }

          // Build output object
          const output = includeProvenance
            ? { data: result.data, provenance, recordIndex: stats.totalRecords - 1 }
            : result.data;

          this.push(output);
          callback();
        } else {
          stats.invalidRecords++;
          stats.errorRate = (stats.invalidRecords / stats.totalRecords) * 100;

          const errorDetail = {
            index: stats.totalRecords - 1,
            error: result.error.message,
            issues: result.error.issues,
          };

          if (stats.errors.length < maxErrors) {
            stats.errors.push(errorDetail);
          }

          // Emit invalid event
          if (onInvalid) {
            onInvalid(chunk, errorDetail, stats.totalRecords - 1);
          }

          if (onError) {
            onError(result.error, chunk, stats.totalRecords - 1);
          }

          if (failFast) {
            callback(new Error(`Validation failed at record ${stats.totalRecords - 1}: ${result.error.message}`));
          } else if (skipInvalid) {
            // Skip this record but continue processing
            callback();
          } else {
            callback(new Error(`Validation failed at record ${stats.totalRecords - 1}: ${result.error.message}`));
          }
        }

        // Emit stats update periodically
        if (onStats && stats.totalRecords % 1000 === 0) {
          onStats({ ...stats });
        }
      } catch (error) {
        callback(error);
      }
    },

    flush(callback) {
      stats.endTime = Date.now();
      stats.errorRate = stats.totalRecords > 0
        ? (stats.invalidRecords / stats.totalRecords) * 100
        : 0;

      if (onStats) {
        onStats({ ...stats, final: true });
      }

      callback();
    },
  });

  // Attach stats getter to stream
  stream.getStats = () => ({ ...stats });
  stream.getProvenance = () => provenance;

  return stream;
}

/**
 * Create a parsing stream for various formats
 * @param {string} format - Input format (ndjson, csv, json-stream)
 * @param {Object} options - Format-specific options
 * @returns {Transform} Transform stream that parses input
 */
export function createParseStream(format, options = {}) {
  switch (format) {
    case 'ndjson': {
      return createNDJSONParseStream(options);
    }
    case 'csv': {
      return createCSVParseStream(options);
    }
    case 'json-stream': {
      return createJSONParseStream(options);
    }
    default: {
      throw new Error(`Unsupported streaming format: ${format}`);
    }
  }
}

/**
 * Create NDJSON parsing stream
 * @param {Object} options - Parse options
 * @returns {Transform} NDJSON parse stream
 */
function createNDJSONParseStream(options = {}) {
  let buffer = '';

  return new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      try {
        buffer += chunk.toString();
        const lines = buffer.split('\n');

        // Keep last incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const obj = JSON.parse(line);
              this.push(obj);
            } catch (error) {
              callback(new Error(`Invalid JSON line: ${error.message}`));
              return;
            }
          }
        }

        callback();
      } catch (error) {
        callback(error);
      }
    },

    flush(callback) {
      if (buffer.trim()) {
        try {
          const obj = JSON.parse(buffer);
          this.push(obj);
        } catch (error) {
          callback(new Error(`Invalid JSON in final buffer: ${error.message}`));
          return;
        }
      }
      callback();
    },
  });
}

/**
 * Create CSV parsing stream
 * @param {Object} options - CSV parse options
 * @returns {Transform} CSV parse stream
 */
function createCSVParseStream(options = {}) {
  const { parse } = require('csv-parse');

  return parse({
    columns: true,
    skip_empty_lines: true,
    cast: true,
    ...options,
  });
}

/**
 * Create JSON array streaming parser
 * @param {Object} options - Parse options
 * @returns {Transform} JSON streaming parser
 */
function createJSONParseStream(options = {}) {
  let buffer = '';
  let inArray = false;
  let depth = 0;
  let currentObject = '';

  return new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      try {
        buffer += chunk.toString();

        for (const char of buffer) {

          if (char === '[' && depth === 0) {
            inArray = true;
            depth++;
          } else if (char === '{') {
            if (inArray && depth === 1) {
              currentObject = char;
            } else {
              currentObject += char;
            }
            depth++;
          } else if (char === '}') {
            depth--;
            currentObject += char;

            if (inArray && depth === 1) {
              try {
                const obj = JSON.parse(currentObject);
                this.push(obj);
                currentObject = '';
              } catch (error) {
                callback(new Error(`Invalid JSON object: ${error.message}`));
                return;
              }
            }
          } else if (depth > 1) {
            currentObject += char;
          }
        }

        buffer = '';
        callback();
      } catch (error) {
        callback(error);
      }
    },
  });
}

/**
 * Create a formatting stream for various formats
 * @param {string} format - Output format (ndjson, csv, json)
 * @param {Object} options - Format-specific options
 * @returns {Transform} Transform stream that formats output
 */
export function createFormatStream(format, options = {}) {
  switch (format) {
    case 'ndjson': {
      return createNDJSONFormatStream(options);
    }
    case 'csv': {
      return createCSVFormatStream(options);
    }
    case 'json': {
      return createJSONFormatStream(options);
    }
    default: {
      throw new Error(`Unsupported output format: ${format}`);
    }
  }
}

/**
 * Create NDJSON formatting stream
 * @param {Object} options - Format options
 * @returns {Transform} NDJSON format stream
 */
function createNDJSONFormatStream(options = {}) {
  return new Transform({
    objectMode: true,
    writableObjectMode: true,
    readableObjectMode: false,
    transform(chunk, encoding, callback) {
      try {
        // Extract data if it's wrapped with provenance
        const data = chunk.data === undefined ? chunk : chunk.data;
        const json = JSON.stringify(data) + '\n';
        this.push(json);
        callback();
      } catch (error) {
        callback(error);
      }
    },
  });
}

/**
 * Create CSV formatting stream
 * @param {Object} options - CSV format options
 * @returns {Transform} CSV format stream
 */
function createCSVFormatStream(options = {}) {
  const { stringify } = require('csv-stringify');

  return stringify({
    header: true,
    ...options,
  });
}

/**
 * Create JSON array formatting stream
 * @param {Object} options - Format options
 * @returns {Transform} JSON format stream
 */
function createJSONFormatStream(options = {}) {
  let first = true;

  return new Transform({
    objectMode: true,
    writableObjectMode: true,
    readableObjectMode: false,

    transform(chunk, encoding, callback) {
      try {
        const data = chunk.data === undefined ? chunk : chunk.data;

        if (first) {
          this.push('[');
          first = false;
        } else {
          this.push(',');
        }

        this.push(JSON.stringify(data, null, 2));
        callback();
      } catch (error) {
        callback(error);
      }
    },

    flush(callback) {
      if (first) {
        this.push('[]');
      } else {
        this.push(']');
      }
      callback();
    },
  });
}

/**
 * Create a complete validation pipeline
 * @param {ZodSchema} schema - Zod schema for validation
 * @param {Object} options - Pipeline options
 * @param {string} options.inputFormat - Input format
 * @param {string} options.outputFormat - Output format
 * @param {StreamValidationOptions} options.validation - Validation options
 * @returns {Transform} Complete pipeline stream
 */
export function createValidationPipeline(schema, options = {}) {
  const {
    inputFormat = 'ndjson',
    outputFormat = 'ndjson',
    validation = {},
  } = options;

  const parseStream = createParseStream(inputFormat);
  const validationStream = createValidationStream(schema, validation);
  const formatStream = createFormatStream(outputFormat);

  // Create a combined stream
  const combinedStream = new Transform({
    objectMode: false,
  });

  pipelineAsync(
    combinedStream,
    parseStream,
    validationStream,
    formatStream
  ).catch(error => {
    combinedStream.destroy(error);
  });

  // Expose stats and provenance
  combinedStream.getStats = () => validationStream.getStats();
  combinedStream.getProvenance = () => validationStream.getProvenance();

  return combinedStream;
}

/**
 * Create a backpressure-aware validation stream
 * @param {ZodSchema} schema - Zod schema for validation
 * @param {Object} options - Backpressure options
 * @returns {Transform} Backpressure-aware stream
 */
export function createBackpressureStream(schema, options = {}) {
  const {
    pauseOnError = true,
    resumeDelay = 1000,
    maxPausedTime = 30_000,
  } = options;

  let paused = false;
  let pausedTime = 0;
  let pauseStartTime = 0;

  const validationStream = createValidationStream(schema, {
    ...options,
    onError: (error, chunk, index) => {
      if (pauseOnError && !paused) {
        paused = true;
        pauseStartTime = Date.now();
        validationStream.pause();

        // Auto-resume after delay
        setTimeout(() => {
          if (paused) {
            pausedTime += Date.now() - pauseStartTime;

            if (pausedTime < maxPausedTime) {
              paused = false;
              validationStream.resume();
            } else {
              validationStream.destroy(new Error('Maximum paused time exceeded'));
            }
          }
        }, resumeDelay);
      }

      if (options.onError) {
        options.onError(error, chunk, index);
      }
    },
  });

  validationStream.getPausedTime = () => pausedTime;
  validationStream.isPaused = () => paused;

  return validationStream;
}

/**
 * Create a multi-output fan-out stream
 * @param {ZodSchema} schema - Zod schema for validation
 * @param {Array<Writable>} outputs - Array of output streams
 * @param {Object} options - Fan-out options
 * @returns {Transform} Fan-out validation stream
 */
export function createFanOutStream(schema, outputs, options = {}) {
  const validationStream = createValidationStream(schema, options);

  validationStream.on('data', (data) => {
    for (const output of outputs) {
      if (!output.destroyed && output.writable) {
        output.write(data);
      }
    }
  });

  validationStream.on('end', () => {
    for (const output of outputs) {
      if (!output.destroyed && output.writable) {
        output.end();
      }
    }
  });

  return validationStream;
}

/**
 * Create a progressive schema stream (validates with partial schemas)
 * @param {Array<ZodSchema>} schemas - Array of schemas to apply progressively
 * @param {Object} options - Progressive validation options
 * @returns {Transform} Progressive validation stream
 */
export function createProgressiveStream(schemas, options = {}) {
  let currentSchemaIndex = 0;
  let recordsSinceSwitch = 0;
  const switchThreshold = options.switchThreshold || 100;

  return new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      try {
        const currentSchema = schemas[currentSchemaIndex];
        const result = currentSchema.safeParse(chunk);

        if (result.success) {
          recordsSinceSwitch++;
          this.push(result.data);

          // Switch to next schema after threshold
          if (recordsSinceSwitch >= switchThreshold && currentSchemaIndex < schemas.length - 1) {
            currentSchemaIndex++;
            recordsSinceSwitch = 0;
          }

          callback();
        } else {
          callback(new Error(`Progressive validation failed: ${result.error.message}`));
        }
      } catch (error) {
        callback(error);
      }
    },
  });
}

/**
 * Auto-detect format from stream content
 * @param {Readable} inputStream - Input stream
 * @param {Object} options - Detection options
 * @returns {Promise<{format: string, stream: Readable}>} Detected format and stream
 */
export async function autoDetectFormat(inputStream, options = {}) {
  const { maxSampleSize = 1024 } = options;
  let sample = '';
  let detectedFormat = 'unknown';

  return new Promise((resolve, reject) => {
    const detectStream = new Transform({
      transform(chunk, encoding, callback) {
        if (sample.length < maxSampleSize) {
          sample += chunk.toString();
        }

        this.push(chunk);
        callback();
      },

      flush(callback) {
        // Detect format from sample
        sample = sample.trim();

        if (sample.startsWith('[') || sample.startsWith('{')) {
          detectedFormat = 'json';
        } else if (sample.includes('\n') && sample.split('\n').every(line => {
          try {
            JSON.parse(line);
            return true;
          } catch {
            return false;
          }
        })) {
          detectedFormat = 'ndjson';
        } else if (sample.includes(',') && sample.split('\n').length > 1) {
          detectedFormat = 'csv';
        }

        callback();
      },
    });

    detectStream.on('finish', () => {
      resolve({ format: detectedFormat, stream: inputStream });
    });

    detectStream.on('error', reject);

    inputStream.pipe(detectStream);
  });
}

/**
 * Create a memory-efficient stream for large files
 * @param {ZodSchema} schema - Zod schema for validation
 * @param {Object} options - Memory options
 * @returns {Transform} Memory-efficient stream
 */
export function createMemoryEfficientStream(schema, options = {}) {
  const {
    batchSize = 100,
    flushInterval = 1000,
  } = options;

  let batch = [];
  let lastFlush = Date.now();

  const processBatch = function(stream, schema, batch) {
    for (const item of batch) {
      const result = schema.safeParse(item);
      if (result.success) {
        stream.push(result.data);
      }
    }
  };

  const stream = new Transform({
    objectMode: true,

    transform(chunk, encoding, callback) {
      batch.push(chunk);

      const shouldFlush = batch.length >= batchSize ||
                         (Date.now() - lastFlush) > flushInterval;

      if (shouldFlush) {
        processBatch(this, schema, batch);
        batch = [];
        lastFlush = Date.now();
      }

      callback();
    },

    flush(callback) {
      if (batch.length > 0) {
        processBatch(this, schema, batch);
      }
      callback();
    },
  });

  return stream;
}

export default {
  createValidationStream,
  createParseStream,
  createFormatStream,
  createValidationPipeline,
  createBackpressureStream,
  createFanOutStream,
  createProgressiveStream,
  autoDetectFormat,
  createMemoryEfficientStream,
};
