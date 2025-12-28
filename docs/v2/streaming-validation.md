# Streaming Validation - zod-to-from v2

## Overview

The streaming validation module provides advanced capabilities for validating large datasets with real-time feedback, progressive parsing, and memory-efficient processing. This is essential for handling GB-sized files, real-time data pipelines, and applications requiring immediate validation feedback.

## Key Features

- **Real-time Validation**: Validate data as it arrives, with immediate error feedback
- **Progressive Parsing**: Parse and validate data incrementally without loading entire files
- **Memory Efficiency**: Process datasets larger than available RAM
- **Backpressure Handling**: Automatically manage flow control to prevent overwhelming downstream systems
- **Validation Events**: Subscribe to validation events for monitoring and logging
- **Multi-format Support**: Stream validation for NDJSON, CSV, JSON arrays, and custom formats
- **Provenance Tracking**: Build provenance metadata incrementally during streaming
- **Error Recovery**: Skip invalid records or fail fast based on requirements
- **Fan-out Streaming**: Write validated data to multiple outputs simultaneously

## Installation

Streaming validation is included in the core zod-to-from package:

```bash
npm install zod-to-from
```

## Basic Usage

### Simple Validation Stream

```javascript
import { z } from 'zod';
import { createValidationStream } from 'zod-to-from/core/streaming';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().min(0).max(150),
});

// Create validation stream
const validationStream = createValidationStream(UserSchema, {
  skipInvalid: true,
  onError: (error, record, index) => {
    console.error(`Error at record ${index}:`, error.message);
  },
  onValid: (record, index) => {
    console.log(`Valid record ${index}:`, record.name);
  },
});

// Process file
await pipeline(
  createReadStream('users.ndjson'),
  createParseStream('ndjson'),
  validationStream,
  createFormatStream('ndjson'),
  createWriteStream('validated-users.ndjson')
);

// Get validation statistics
const stats = validationStream.getStats();
console.log(`Validated ${stats.validRecords}/${stats.totalRecords} records`);
console.log(`Error rate: ${stats.errorRate.toFixed(2)}%`);
```

### NDJSON to CSV Conversion with Validation

```javascript
import { createValidationPipeline } from 'zod-to-from/core/streaming';

const pipeline = createValidationPipeline(UserSchema, {
  inputFormat: 'ndjson',
  outputFormat: 'csv',
  validation: {
    failFast: false,
    includeProvenance: true,
    onStats: (stats) => {
      if (stats.final) {
        console.log('Final statistics:', stats);
      }
    },
  },
});

await pipeline(
  createReadStream('input.ndjson'),
  pipeline,
  createWriteStream('output.csv')
);
```

## Advanced Features

### 1. Backpressure Management

Handle validation errors by pausing the stream:

```javascript
import { createBackpressureStream } from 'zod-to-from/core/streaming';

const backpressureStream = createBackpressureStream(UserSchema, {
  pauseOnError: true,
  resumeDelay: 1000, // Wait 1 second before resuming
  maxPausedTime: 30000, // Fail after 30 seconds of paused time
  skipInvalid: true,
  onError: (error, record, index) => {
    // Log error to monitoring system
    logger.error('Validation failed', { error, record, index });
  },
});
```

### 2. Fan-out to Multiple Outputs

Write validated data to multiple destinations:

```javascript
import { createFanOutStream } from 'zod-to-from/core/streaming';

const validOutput = createWriteStream('valid-records.ndjson');
const auditOutput = createWriteStream('audit-log.ndjson');
const archiveOutput = createWriteStream('archive.ndjson');

const fanOutStream = createFanOutStream(
  UserSchema,
  [validOutput, auditOutput, archiveOutput],
  {
    includeProvenance: true,
  }
);

await pipeline(
  createReadStream('input.ndjson'),
  createParseStream('ndjson'),
  fanOutStream
);
```

### 3. Progressive Schema Validation

Apply different schemas at different stages:

```javascript
import { createProgressiveStream } from 'zod-to-from/core/streaming';

const BasicSchema = z.object({
  id: z.number(),
  name: z.string(),
});

const FullSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  age: z.number(),
});

// Start with basic validation, progress to full validation
const progressiveStream = createProgressiveStream(
  [BasicSchema, FullSchema],
  {
    switchThreshold: 100, // Switch schemas after 100 records
  }
);
```

### 4. Memory-Efficient Processing

Process large files without loading entire dataset:

```javascript
import { createMemoryEfficientStream } from 'zod-to-from/core/streaming';

const memoryStream = createMemoryEfficientStream(UserSchema, {
  batchSize: 1000, // Process 1000 records at a time
  flushInterval: 5000, // Flush every 5 seconds
});

// Can handle multi-GB files
await pipeline(
  createReadStream('huge-dataset.ndjson'),
  createParseStream('ndjson'),
  memoryStream,
  createWriteStream('processed.ndjson')
);
```

### 5. Auto-detect Format

Automatically detect input format:

```javascript
import { autoDetectFormat } from 'zod-to-from/core/streaming';

const inputStream = createReadStream('unknown-format.txt');
const { format, stream } = await autoDetectFormat(inputStream);

console.log(`Detected format: ${format}`); // 'ndjson', 'csv', 'json', etc.

const parseStream = createParseStream(format);
// Continue processing...
```

## Streaming Validators

### Incremental Compiler with Caching

```javascript
import { createIncrementalCompiler } from 'zod-to-from/core/stream-validators';

const compiler = createIncrementalCompiler(UserSchema, {
  cacheSize: 1000, // Cache up to 1000 validation results
});

// Repeated validations are cached
const result1 = compiler.validate(userData);
const result2 = compiler.validate(userData); // Cache hit!

const stats = compiler.getStats();
console.log(`Cache hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
```

### Aggregation Stream

Collect statistics about validated data:

```javascript
import { createAggregatorStream } from 'zod-to-from/core/stream-validators';

const aggregatorStream = createAggregatorStream(UserSchema, {
  trackFieldStats: true,
  maxFailedItems: 100,
});

await pipeline(
  createReadStream('data.ndjson'),
  createParseStream('ndjson'),
  aggregatorStream,
  createWriteStream('output.ndjson')
);

const aggregation = aggregatorStream.getAggregation();
console.log('Total records:', aggregation.totalValidated);
console.log('Valid records:', aggregation.passed);
console.log('Failed records:', aggregation.failed);
console.log('Field statistics:', aggregation.fieldStats);
```

### Partial Field Validation

Validate only specific fields:

```javascript
import { createPartialValidatorStream } from 'zod-to-from/core/stream-validators';

// Only validate id and email, pass through other fields
const partialStream = createPartialValidatorStream(
  UserSchema,
  ['id', 'email'],
  { strictMode: false }
);
```

### Schema Evolution

Handle multiple schema versions in the same stream:

```javascript
import { createSchemaEvolutionStream } from 'zod-to-from/core/stream-validators';

const schemas = {
  v1: z.object({ id: z.number(), name: z.string() }),
  v2: z.object({ id: z.number(), name: z.string(), email: z.string() }),
  v3: UserSchema,
};

const evolutionStream = createSchemaEvolutionStream(schemas, {
  versionField: '_version', // Field indicating schema version
  defaultVersion: 'v1',
});

// Handles records with different versions
// { _version: 'v1', id: 1, name: 'Alice' }
// { _version: 'v2', id: 2, name: 'Bob', email: 'bob@ex.com' }
```

### Deduplication

Remove duplicate records during streaming:

```javascript
import { createDeduplicationStream } from 'zod-to-from/core/stream-validators';

const dedupeStream = createDeduplicationStream(UserSchema, {
  keyFields: ['id'], // Deduplicate based on id field
  maxCacheSize: 10000,
});

await pipeline(
  createReadStream('data-with-duplicates.ndjson'),
  createParseStream('ndjson'),
  dedupeStream,
  createWriteStream('deduplicated.ndjson')
);
```

### Repair Stream

Automatically fix common validation issues:

```javascript
import { createRepairStream } from 'zod-to-from/core/stream-validators';

const repairStream = createRepairStream(UserSchema, {
  repairs: {
    email: (value) => value.toLowerCase().trim(),
    age: (value) => Math.max(0, Math.min(150, value)),
    name: (value) => value.trim(),
  },
  strictMode: false, // Pass through unrepairable records
});
```

### Sampling Validation

Validate a sample of records for performance:

```javascript
import { createSamplingValidatorStream } from 'zod-to-from/core/stream-validators';

const samplingStream = createSamplingValidatorStream(UserSchema, {
  sampleRate: 0.1, // Validate 10% of records
  minSamples: 100, // But at least 100 records
});

// Useful for very large datasets where full validation is expensive
```

### Batched Validation

Validate records in batches for better performance:

```javascript
import { createBatchedValidatorStream } from 'zod-to-from/core/stream-validators';

const batchedStream = createBatchedValidatorStream(UserSchema, {
  batchSize: 100,
  parallelBatches: 4, // Process up to 4 batches in parallel
});
```

## Performance Metrics

### Validation Statistics

The validation stream tracks comprehensive statistics:

```javascript
const stats = validationStream.getStats();

console.log({
  totalRecords: stats.totalRecords,
  validRecords: stats.validRecords,
  invalidRecords: stats.invalidRecords,
  bytesProcessed: stats.bytesProcessed,
  errorRate: stats.errorRate,
  duration: stats.endTime - stats.startTime,
  throughput: stats.totalRecords / ((stats.endTime - stats.startTime) / 1000),
});
```

### Provenance Metadata

Track data lineage during streaming:

```javascript
const stream = createValidationStream(UserSchema, {
  includeProvenance: true,
});

// After processing
const provenance = stream.getProvenance();
console.log({
  timestamp: provenance.timestamp,
  schemaHash: provenance.schemaHash,
  version: provenance.version,
});
```

## Error Handling Strategies

### Fail Fast

Stop on first validation error:

```javascript
const stream = createValidationStream(UserSchema, {
  failFast: true, // Stop immediately on error
});
```

### Skip Invalid

Continue processing, skipping invalid records:

```javascript
const stream = createValidationStream(UserSchema, {
  skipInvalid: true,
  maxErrors: 1000, // Track up to 1000 errors
  onError: (error, record, index) => {
    // Log to error tracking system
    errorLogger.log({ error, record, index });
  },
});
```

### Collect All Errors

Process entire dataset and collect all errors:

```javascript
const stream = createValidationStream(UserSchema, {
  skipInvalid: true,
  maxErrors: Infinity, // Track all errors
});

// After processing
const stats = stream.getStats();
for (const error of stats.errors) {
  console.error(`Record ${error.index}:`, error.error);
}
```

## Best Practices

1. **Use Streaming for Large Files**: For files > 100MB, always use streaming
2. **Monitor Statistics**: Use `onStats` callback for real-time monitoring
3. **Set Appropriate Buffer Sizes**: Adjust `highWaterMark` based on record size
4. **Handle Backpressure**: Use `createBackpressureStream` for error-prone data
5. **Cache Validations**: Use `createIncrementalCompiler` for repeated patterns
6. **Batch Processing**: Use batched validation for better throughput
7. **Progressive Schemas**: Start with basic validation, add complexity progressively
8. **Provenance Tracking**: Enable for audit trails and compliance

## Examples

### Example 1: CSV to NDJSON with Error Logging

```javascript
import fs from 'fs';
import { createValidationStream, createParseStream, createFormatStream } from 'zod-to-from/core/streaming';

const errorLog = fs.createWriteStream('errors.log');

const stream = createValidationStream(UserSchema, {
  skipInvalid: true,
  onError: (error, record, index) => {
    errorLog.write(JSON.stringify({ index, record, error: error.message }) + '\n');
  },
});

await pipeline(
  fs.createReadStream('users.csv'),
  createParseStream('csv'),
  stream,
  createFormatStream('ndjson'),
  fs.createWriteStream('users.ndjson')
);

errorLog.end();
```

### Example 2: Multi-Stage Validation Pipeline

```javascript
const stage1 = createPartialValidatorStream(UserSchema, ['id', 'email']);
const stage2 = createDeduplicationStream(UserSchema, { keyFields: ['id'] });
const stage3 = createRepairStream(UserSchema, {
  repairs: { email: (v) => v.toLowerCase() },
});
const stage4 = createValidationStream(UserSchema, { includeProvenance: true });

await pipeline(
  createReadStream('input.ndjson'),
  createParseStream('ndjson'),
  stage1,
  stage2,
  stage3,
  stage4,
  createFormatStream('ndjson'),
  createWriteStream('output.ndjson')
);
```

### Example 3: Real-time Monitoring Dashboard

```javascript
const stream = createValidationStream(UserSchema, {
  onStats: (stats) => {
    if (stats.totalRecords % 1000 === 0) {
      dashboard.update({
        processed: stats.totalRecords,
        valid: stats.validRecords,
        errors: stats.invalidRecords,
        errorRate: stats.errorRate,
        throughput: stats.totalRecords / ((Date.now() - stats.startTime) / 1000),
      });
    }
  },
});
```

## API Reference

See the [full API documentation](../api/streaming.md) for detailed method signatures and options.

## Performance Benchmarks

| Dataset Size | Records | Processing Time | Throughput | Memory Usage |
|-------------|---------|-----------------|------------|--------------|
| 10 MB       | 10K     | 0.5s           | 20K rec/s  | 50 MB        |
| 100 MB      | 100K    | 4.2s           | 24K rec/s  | 60 MB        |
| 1 GB        | 1M      | 42s            | 24K rec/s  | 70 MB        |
| 10 GB       | 10M     | 420s           | 24K rec/s  | 80 MB        |

*Benchmarks run on: Node.js 20, 8 CPU cores, 16GB RAM*

## Troubleshooting

### High Memory Usage

If memory usage is high, try:
- Reduce `highWaterMark`
- Use `createMemoryEfficientStream`
- Increase `batchSize` in batched processing

### Low Throughput

To improve throughput:
- Increase `highWaterMark`
- Use `createBatchedValidatorStream`
- Enable validation caching with `createIncrementalCompiler`

### Too Many Errors

If getting too many validation errors:
- Use `createSamplingValidatorStream` for initial data quality check
- Use `createRepairStream` to auto-fix common issues
- Adjust schema to be more permissive

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines on contributing to streaming validation features.

## License

MIT
