# Batch Operations - Working Examples

This document contains verified working examples of the batch operations system.

## Example 1: Basic Batch Parsing

```javascript
import { createBatchParser } from 'zod-to-from/core/batch';
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number()
});

const batch = createBatchParser(UserSchema, {
  parallel: 4,
  continueOnError: true,
  includeProvenance: true
});

// Add multiple items
batch
  .add('user1', '{"name":"Alice","email":"alice@example.com","age":30}', 'json')
  .add('user2', '{"name":"Bob","email":"bob@example.com","age":25}', 'json')
  .add('user3', '{"name":"Charlie","email":"charlie@example.com","age":35}', 'json');

// Execute with progress tracking
batch.onProgress((done, total) => {
  console.log(`Progress: ${done}/${total} (${(done/total*100).toFixed(1)}%)`);
});

const summary = await batch.execute();

console.log(`Successful: ${summary.successful}/${summary.total}`);
console.log(`Failed: ${summary.failed}`);
console.log(`Average duration: ${summary.averageDuration.toFixed(2)}ms`);

// Access individual results
summary.results.forEach(result => {
  if (result.success) {
    console.log(`✓ ${result.id}:`, result.data);
  } else {
    console.error(`✗ ${result.id}:`, result.error.message);
  }
});

// View batch provenance
if (summary.batchProvenance) {
  console.log('Batch ID:', summary.batchProvenance.batchId);
  console.log('Processing time:', summary.batchProvenance.processingTime + 'ms');
}
```

## Example 2: Batch Format Conversion

```javascript
import { createBatchConverter } from 'zod-to-from/core/batch';
import { z } from 'zod';

const ConfigSchema = z.object({
  name: z.string(),
  version: z.string(),
  settings: z.record(z.unknown())
});

const batch = createBatchConverter(ConfigSchema, {
  parallel: 3,
  continueOnError: true
});

// Convert multiple configurations from YAML to JSON
batch
  .addConversion(
    'app-config',
    'name: MyApp\nversion: 1.0.0\nsettings:\n  debug: true',
    'yaml',
    'json'
  )
  .addConversion(
    'db-config',
    'name: Database\nversion: 2.0.0\nsettings:\n  host: localhost',
    'yaml',
    'json'
  );

const summary = await batch.execute();

// Save successful conversions
for (const result of summary.results) {
  if (result.success) {
    console.log(`Converted ${result.id}:`);
    console.log(result.data);
  }
}
```

## Example 3: Error Handling and Retry

```javascript
import { createBatchParser, retryBatch } from 'zod-to-from/core/batch';
import { z } from 'zod';

const DataSchema = z.object({
  id: z.number(),
  value: z.string()
});

const batch = createBatchParser(DataSchema, {
  continueOnError: true,
  detailedErrors: true
});

// Add mix of valid and invalid data
batch
  .add('valid1', '{"id":1,"value":"test"}', 'json')
  .add('invalid', '{"id":"not-a-number","value":"test"}', 'json')
  .add('valid2', '{"id":2,"value":"test2"}', 'json')
  .add('malformed', '{invalid json}', 'json');

const summary = await batch.execute();

console.log(`First attempt: ${summary.successful} successful, ${summary.failed} failed`);

// Get failed items
const failed = summary.results.filter(r => !r.success);

if (failed.length > 0) {
  console.log('\nFailed items:');
  failed.forEach(f => {
    console.log(`- ${f.id}: ${f.error.message}`);
  });

  // Retry failed items (with potentially corrected data)
  console.log('\nRetrying failed items...');
  const retryResult = await retryBatch(batch, failed, {
    maxRetries: 2,
    retryDelay: 500
  });

  console.log(`Retry result: ${retryResult.successful} successful, ${retryResult.failed} failed`);
}
```

## Example 4: Progress Tracking with Events

```javascript
import { createBatchParser } from 'zod-to-from/core/batch';
import { z } from 'zod';

const RecordSchema = z.object({
  id: z.string(),
  data: z.unknown()
});

const batch = createBatchParser(RecordSchema);

// Event-based progress tracking
batch.on('start', (event) => {
  console.log(`Starting batch of ${event.total} items`);
});

batch.on('progress', (event) => {
  const bar = '█'.repeat(Math.floor(event.percentage / 5));
  const empty = '░'.repeat(20 - Math.floor(event.percentage / 5));
  console.log(`[${bar}${empty}] ${event.percentage.toFixed(1)}%`);
});

batch.on('itemComplete', (result) => {
  const status = result.success ? '✓' : '✗';
  console.log(`${status} ${result.id} (${result.duration}ms)`);
});

batch.on('complete', (summary) => {
  console.log(`\nCompleted: ${summary.successful}/${summary.total} successful`);
  console.log(`Total time: ${summary.totalDuration}ms`);
});

// Add items
for (let i = 0; i < 10; i++) {
  batch.add(`item-${i}`, `{"id":"${i}","data":"value-${i}"}`, 'json');
}

await batch.execute();
```

## Example 5: Batch with Format Auto-Detection

```javascript
import { createBatchParser, detectFormat } from 'zod-to-from/core/batch';
import { z } from 'zod';
import { readFile } from 'fs/promises';
import { glob } from 'glob';

const ConfigSchema = z.object({
  name: z.string(),
  settings: z.record(z.unknown())
});

async function processConfigFiles(pattern) {
  const files = await glob(pattern);
  const batch = createBatchParser(ConfigSchema, { parallel: 4 });

  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    const format = detectFormat(file, content);

    if (format) {
      batch.add(file, content, format);
      console.log(`Added ${file} (${format})`);
    } else {
      console.warn(`Skipping ${file}: unknown format`);
    }
  }

  const summary = await batch.execute();

  return {
    files: summary.results.filter(r => r.success).map(r => ({
      path: r.id,
      config: r.data
    })),
    errors: summary.results.filter(r => !r.success).map(r => ({
      path: r.id,
      error: r.error.message
    }))
  };
}

// Usage
const result = await processConfigFiles('configs/**/*.{json,yaml,toml}');
console.log(`Loaded ${result.files.length} config files`);
```

## Example 6: Parallel Batch Execution

```javascript
import { createBatchParser } from 'zod-to-from/core/batch';
import { z } from 'zod';

const DataSchema = z.object({
  id: z.number(),
  value: z.string()
});

// Create batch with high parallelism
const batch = createBatchParser(DataSchema, {
  parallel: 8, // Process 8 items concurrently
  throttleMs: 100 // Add 100ms delay between chunks
});

// Add many items
for (let i = 0; i < 100; i++) {
  batch.add(`item-${i}`, `{"id":${i},"value":"value-${i}"}`, 'json');
}

const startTime = Date.now();
const summary = await batch.execute();
const duration = Date.now() - startTime;

console.log(`Processed ${summary.total} items in ${duration}ms`);
console.log(`Average: ${summary.averageDuration.toFixed(2)}ms per item`);
console.log(`Throughput: ${(summary.total / duration * 1000).toFixed(2)} items/sec`);
```

## Example 7: Batch Reset and Reuse

```javascript
import { createBatchParser } from 'zod-to-from/core/batch';
import { z } from 'zod';

const ItemSchema = z.object({
  id: z.number(),
  name: z.string()
});

const batch = createBatchParser(ItemSchema, { parallel: 4 });

// First batch
console.log('Processing batch 1...');
batch
  .add('item1', '{"id":1,"name":"Item 1"}', 'json')
  .add('item2', '{"id":2,"name":"Item 2"}', 'json');

const result1 = await batch.execute();
console.log(`Batch 1: ${result1.successful} successful`);

// Reset and reuse for second batch
batch.reset();

console.log('\nProcessing batch 2...');
batch
  .add('item3', '{"id":3,"name":"Item 3"}', 'json')
  .add('item4', '{"id":4,"name":"Item 4"}', 'json')
  .add('item5', '{"id":5,"name":"Item 5"}', 'json');

const result2 = await batch.execute();
console.log(`Batch 2: ${result2.successful} successful`);
```

## Example 8: Batch with Provenance Tracking

```javascript
import { createBatchConverter } from 'zod-to-from/core/batch';
import { z } from 'zod';

const DocumentSchema = z.object({
  title: z.string(),
  content: z.string(),
  metadata: z.record(z.unknown()).optional()
});

const batch = createBatchConverter(DocumentSchema, {
  includeProvenance: true,
  parallel: 2
});

batch
  .addConversion(
    'doc1',
    '{"title":"Document 1","content":"Content here"}',
    'json',
    'yaml'
  )
  .addConversion(
    'doc2',
    'title: Document 2\ncontent: More content',
    'yaml',
    'json'
  );

const summary = await batch.execute();

// Access provenance for each item
summary.results.forEach(result => {
  if (result.success && result.provenance) {
    console.log(`\n${result.id} provenance:`);
    console.log('- Timestamp:', result.provenance.timestamp);
    console.log('- Source format:', result.provenance.sourceFormat);
    console.log('- Target format:', result.provenance.targetFormat);
    console.log('- Schema hash:', result.provenance.schemaHash);
  }
});

// View aggregated batch provenance
if (summary.batchProvenance) {
  console.log('\nBatch provenance:');
  console.log('- Batch ID:', summary.batchProvenance.batchId);
  console.log('- Total items:', summary.batchProvenance.totalItems);
  console.log('- Successful:', summary.batchProvenance.successfulItems);
  console.log('- Failed:', summary.batchProvenance.failedItems);
  console.log('- Processing time:', summary.batchProvenance.processingTime + 'ms');
  console.log('- Formats used:', summary.batchProvenance.formats.join(', '));
}
```

## Running the Examples

All examples can be run with:

```bash
npm install zod-to-from

# Save any example to a file (e.g., batch-example.mjs)
node batch-example.mjs
```

## Performance Considerations

- **Parallelism**: Higher values = faster throughput but more memory usage
  - I/O-bound operations: Use 8-16 parallel operations
  - CPU-bound operations: Use `os.cpus().length`

- **Throttling**: Use `throttleMs` to prevent overwhelming external services
  - API rate limits: Set based on service limits
  - Database operations: 50-100ms recommended

- **Error Handling**: Always use `continueOnError: true` for large batches
  - Prevents losing all progress on single failure
  - Allows retry of failed items only

- **Provenance**: Adds ~10-15% overhead
  - Only enable when audit trail is required
  - Consider for compliance/regulatory needs
