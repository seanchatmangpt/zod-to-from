/**
 * Batch Operations - Process multiple conversions with aggregated provenance
 * @fileoverview Batch processing API for zod-to-from with parallel execution,
 * progress tracking, error handling, and resource management
 */

import { Worker } from 'node:worker_threads';
import { EventEmitter } from 'node:events';
import { parseFrom, formatTo, convert } from './main.mjs';
import { createProvenance, simpleHash } from './registry.mjs';

/**
 * @typedef {import('zod').ZodSchema} ZodSchema
 * @typedef {import('./registry.mjs').Provenance} Provenance
 */

/**
 * @typedef {Object} BatchItem
 * @property {string} id - Unique identifier for the batch item
 * @property {any} input - Input data or string to process
 * @property {string} format - Format for the input/output
 * @property {string} [sourceFormat] - Source format for conversion operations
 * @property {string} [targetFormat] - Target format for conversion operations
 * @property {Object} [options] - Adapter-specific options
 */

/**
 * @typedef {Object} BatchResult
 * @property {string} id - The batch item ID
 * @property {boolean} success - Whether the operation succeeded
 * @property {any} [data] - The result data if successful
 * @property {Error} [error] - The error if failed
 * @property {Provenance} [provenance] - Provenance metadata if requested
 * @property {number} duration - Processing time in milliseconds
 */

/**
 * @typedef {Object} BatchSummary
 * @property {number} total - Total number of items
 * @property {number} successful - Number of successful operations
 * @property {number} failed - Number of failed operations
 * @property {number} totalDuration - Total processing time in milliseconds
 * @property {number} averageDuration - Average processing time per item
 * @property {BatchResult[]} results - Individual results
 * @property {Provenance} [batchProvenance] - Aggregated batch provenance
 */

/**
 * @typedef {Object} BatchOptions
 * @property {boolean} [continueOnError] - Continue processing on errors (default: true)
 * @property {boolean} [includeProvenance] - Include provenance in results
 * @property {number} [parallel] - Number of parallel operations (default: 4)
 * @property {number} [maxMemoryMB] - Maximum memory usage in MB
 * @property {number} [throttleMs] - Minimum delay between batches in ms
 * @property {function(number, number): void} [onProgress] - Progress callback (done, total)
 * @property {function(BatchResult): void} [onItemComplete] - Called when each item completes
 * @property {boolean} [detailedErrors] - Include full error details in results
 */

/**
 * Batch processor for multiple format conversions
 */
export class BatchProcessor extends EventEmitter {
  /**
   * @param {ZodSchema} schema - The Zod schema for validation
   * @param {string} operation - Operation type: 'parse', 'format', or 'convert'
   * @param {BatchOptions} [options] - Batch processing options
   */
  constructor(schema, operation, options = {}) {
    super();
    this.schema = schema;
    this.operation = operation;
    this.options = {
      continueOnError: true,
      includeProvenance: false,
      parallel: 4,
      throttleMs: 0,
      detailedErrors: true,
      ...options,
    };
    this.items = [];
    this.startTime = undefined;
    this.completedCount = 0;
  }

  /**
   * Add an item to the batch
   * @param {string} id - Unique identifier
   * @param {any} input - Input data
   * @param {string} format - Format identifier
   * @param {Object} [itemOptions] - Item-specific options
   * @returns {BatchProcessor} This instance for chaining
   */
  add(id, input, format, itemOptions = {}) {
    this.items.push({
      id,
      input,
      format,
      options: itemOptions,
    });
    return this;
  }

  /**
   * Add a conversion item to the batch
   * @param {string} id - Unique identifier
   * @param {any} input - Input data
   * @param {string} sourceFormat - Source format
   * @param {string} targetFormat - Target format
   * @param {Object} [itemOptions] - Item-specific options
   * @returns {BatchProcessor} This instance for chaining
   */
  addConversion(id, input, sourceFormat, targetFormat, itemOptions = {}) {
    this.items.push({
      id,
      input,
      sourceFormat,
      targetFormat,
      options: itemOptions,
    });
    return this;
  }

  /**
   * Set the number of parallel operations
   * @param {number} count - Parallel operation count
   * @returns {BatchProcessor} This instance for chaining
   */
  parallel(count) {
    this.options.parallel = count;
    return this;
  }

  /**
   * Set progress callback
   * @param {function(number, number): void} callback - Progress callback
   * @returns {BatchProcessor} This instance for chaining
   */
  onProgress(callback) {
    this.options.onProgress = callback;
    return this;
  }

  /**
   * Set item completion callback
   * @param {function(BatchResult): void} callback - Item completion callback
   * @returns {BatchProcessor} This instance for chaining
   */
  onItemComplete(callback) {
    this.options.onItemComplete = callback;
    return this;
  }

  /**
   * Process a single batch item
   * @param {BatchItem} item - The item to process
   * @returns {Promise<BatchResult>} The result
   * @private
   */
  async _processItem(item) {
    const startTime = Date.now();
    const result = {
      id: item.id,
      success: false,
      duration: 0,
    };

    try {
      const opts = {
        ...item.options,
        includeProvenance: this.options.includeProvenance,
      };

      let output;

      switch (this.operation) {
        case 'parse': {
          output = await parseFrom(this.schema, item.format, item.input, opts);
          break;
        }
        case 'format': {
          output = await formatTo(this.schema, item.format, item.input, opts);
          break;
        }
        case 'convert': {
          if (!item.sourceFormat || !item.targetFormat) {
            throw new Error('sourceFormat and targetFormat required for convert operation');
          }
          output = await convert(
            this.schema,
            { from: item.sourceFormat, to: item.targetFormat },
            item.input,
            opts
          );
          break;
        }
        default: {
          throw new Error(`Unknown operation: ${this.operation}`);
        }
      }

      // Handle provenance result format
      if (this.options.includeProvenance && output && typeof output === 'object' && output.data) {
        result.data = output.data;
        result.provenance = output.provenance;
      } else {
        result.data = output;
      }

      result.success = true;
    } catch (error) {
      result.success = false;
      result.error = this.options.detailedErrors
        ? error
        : new Error(error.message || 'Processing failed');
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Process items in parallel chunks
   * @param {BatchItem[]} items - Items to process
   * @returns {Promise<BatchResult[]>} Results
   * @private
   */
  async _processParallel(items) {
    const results = [];
    const chunks = [];

    // Split items into chunks based on parallel count
    for (let i = 0; i < items.length; i += this.options.parallel) {
      chunks.push(items.slice(i, i + this.options.parallel));
    }

    for (const chunk of chunks) {
      // Process chunk in parallel
      const chunkResults = await Promise.all(
        chunk.map(async (item) => {
          const result = await this._processItem(item);

          // Update progress
          this.completedCount++;
          if (this.options.onProgress) {
            this.options.onProgress(this.completedCount, this.items.length);
          }

          // Emit progress event
          this.emit('progress', {
            completed: this.completedCount,
            total: this.items.length,
            percentage: (this.completedCount / this.items.length) * 100,
          });

          // Call item completion callback
          if (this.options.onItemComplete) {
            this.options.onItemComplete(result);
          }

          // Emit item completion event
          this.emit('itemComplete', result);

          return result;
        })
      );

      results.push(...chunkResults);

      // Apply throttling between chunks
      if (this.options.throttleMs > 0 && chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, this.options.throttleMs));
      }

      // Check if we should stop on error
      if (!this.options.continueOnError && chunkResults.some((r) => !r.success)) {
        break;
      }
    }

    return results;
  }

  /**
   * Create aggregated batch provenance
   * @param {BatchResult[]} results - Batch results
   * @returns {Provenance} Aggregated provenance
   * @private
   */
  _createBatchProvenance(results) {
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    const baseProvenance = createProvenance(
      'batch-processor',
      this.operation === 'convert' ? 'mixed' : undefined,
      this.operation === 'convert' ? 'mixed' : undefined,
      {
        schemaHash: simpleHash(this.schema.toString()),
      }
    );

    return {
      ...baseProvenance,
      batchId: simpleHash(Date.now().toString() + Math.random().toString()),
      operation: this.operation,
      totalItems: results.length,
      successfulItems: successful.length,
      failedItems: failed.length,
      parallelism: this.options.parallel,
      processingTime: Date.now() - this.startTime,
      formats: [...new Set(this.items.map((item) => item.format || item.sourceFormat))],
    };
  }

  /**
   * Execute the batch operation
   * @returns {Promise<BatchSummary>} Summary of batch results
   */
  async execute() {
    if (this.items.length === 0) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        totalDuration: 0,
        averageDuration: 0,
        results: [],
      };
    }

    this.startTime = Date.now();
    this.completedCount = 0;

    // Emit start event
    this.emit('start', { total: this.items.length });

    // Process items
    const results = await this._processParallel(this.items);

    const totalDuration = Date.now() - this.startTime;
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    const summary = {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      totalDuration,
      averageDuration: totalDuration / results.length,
      results,
    };

    // Add batch provenance if requested
    if (this.options.includeProvenance) {
      summary.batchProvenance = this._createBatchProvenance(results);
    }

    // Emit complete event
    this.emit('complete', summary);

    return summary;
  }

  /**
   * Get successful results only
   * @returns {BatchResult[]} Successful results
   */
  getSuccessful() {
    return this.items.filter((r) => r.success);
  }

  /**
   * Get failed results only
   * @returns {BatchResult[]} Failed results
   */
  getFailed() {
    return this.items.filter((r) => !r.success);
  }

  /**
   * Reset the batch processor
   * @returns {BatchProcessor} This instance for chaining
   */
  reset() {
    this.items = [];
    this.completedCount = 0;
    this.startTime = undefined;
    return this;
  }
}

/**
 * Create a batch processor for parsing
 * @param {ZodSchema} schema - The Zod schema
 * @param {BatchOptions} [options] - Batch options
 * @returns {BatchProcessor} Batch processor instance
 */
export function createBatchParser(schema, options = {}) {
  return new BatchProcessor(schema, 'parse', options);
}

/**
 * Create a batch processor for formatting
 * @param {ZodSchema} schema - The Zod schema
 * @param {BatchOptions} [options] - Batch options
 * @returns {BatchProcessor} Batch processor instance
 */
export function createBatchFormatter(schema, options = {}) {
  return new BatchProcessor(schema, 'format', options);
}

/**
 * Create a batch processor for conversion
 * @param {ZodSchema} schema - The Zod schema
 * @param {BatchOptions} [options] - Batch options
 * @returns {BatchProcessor} Batch processor instance
 */
export function createBatchConverter(schema, options = {}) {
  return new BatchProcessor(schema, 'convert', options);
}

/**
 * Simplified batch creation API
 * @param {ZodSchema} schema - The Zod schema
 * @param {BatchOptions} [options] - Batch options
 * @returns {BatchProcessor} Batch processor instance
 */
export function createBatch(schema, options = {}) {
  // Default to convert operation for backward compatibility
  return new BatchProcessor(schema, 'convert', options);
}

/**
 * Process a directory of files
 * @param {ZodSchema} schema - The Zod schema
 * @param {string} directory - Directory path
 * @param {Object} [options] - Processing options
 * @param {string} [options.pattern] - File pattern (glob)
 * @param {string} [options.inputFormat] - Input format (or auto-detect)
 * @param {string} [options.outputFormat] - Output format
 * @param {function(string): Promise<string>} [options.readFile] - Custom file reader
 * @param {function(string, string): Promise<void>} [options.writeFile] - Custom file writer
 * @returns {Promise<BatchSummary>} Batch results
 */
export async function processDirectory(schema, directory, options = {}) {
  const {
    pattern = '**/*',
    inputFormat,
    outputFormat,
    readFile,
    writeFile,
    ...batchOptions
  } = options;

  // Note: Actual file system operations would require fs/promises
  // This is a placeholder for the interface
  throw new Error(
    'processDirectory requires file system implementation - use with fs/promises integration'
  );
}

/**
 * Auto-detect format from file extension or content
 * @param {string} filename - File name or path
 * @param {string} [content] - File content for content-based detection
 * @returns {string|null} Detected format or null
 */
export function detectFormat(filename, content) {
  // Extension-based detection
  const ext = filename.split('.').pop()?.toLowerCase();
  const formatMap = {
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    csv: 'csv',
    xml: 'xml',
    ini: 'ini',
    env: 'env',
  };

  if (ext && formatMap[ext]) {
    return formatMap[ext];
  }

  // Content-based detection (basic heuristics)
  if (content) {
    const trimmed = content.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return 'json';
    }
    if (trimmed.startsWith('---') || /^\w+:\s/m.test(trimmed)) {
      return 'yaml';
    }
    if (trimmed.startsWith('<?xml') || trimmed.startsWith('<')) {
      return 'xml';
    }
  }

  return null;
}

/**
 * Retry failed batch items
 * @param {BatchProcessor} processor - The batch processor
 * @param {BatchResult[]} failedResults - Failed results to retry
 * @param {Object} [options] - Retry options
 * @param {number} [options.maxRetries] - Maximum retry attempts (default: 3)
 * @param {number} [options.retryDelay] - Delay between retries in ms (default: 1000)
 * @returns {Promise<BatchSummary>} Retry results
 */
export async function retryBatch(processor, failedResults, options = {}) {
  const { maxRetries = 3, retryDelay = 1000 } = options;

  const retryProcessor = new BatchProcessor(processor.schema, processor.operation, {
    ...processor.options,
  });

  for (const failed of failedResults) {
    const originalItem = processor.items.find((item) => item.id === failed.id);
    if (originalItem) {
      if (originalItem.sourceFormat) {
        retryProcessor.addConversion(
          originalItem.id,
          originalItem.input,
          originalItem.sourceFormat,
          originalItem.targetFormat,
          originalItem.options
        );
      } else {
        retryProcessor.add(
          originalItem.id,
          originalItem.input,
          originalItem.format,
          originalItem.options
        );
      }
    }
  }

  let lastResults = failedResults;
  let attempt = 0;

  while (attempt < maxRetries && lastResults.length > 0) {
    attempt++;

    if (retryDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }

    const summary = await retryProcessor.execute();
    lastResults = summary.results.filter((r) => !r.success);

    if (lastResults.length === 0) {
      return summary;
    }

    // Reset for next attempt
    retryProcessor.reset();
    for (const failed of lastResults) {
      const originalItem = processor.items.find((item) => item.id === failed.id);
      if (originalItem) {
        if (originalItem.sourceFormat) {
          retryProcessor.addConversion(
            originalItem.id,
            originalItem.input,
            originalItem.sourceFormat,
            originalItem.targetFormat,
            originalItem.options
          );
        } else {
          retryProcessor.add(
            originalItem.id,
            originalItem.input,
            originalItem.format,
            originalItem.options
          );
        }
      }
    }
  }

  // Return final attempt results
  return retryProcessor.execute();
}
