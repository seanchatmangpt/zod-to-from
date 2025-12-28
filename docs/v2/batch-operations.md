# Batch Operations

Batch operations in zod-to-from v2 enable efficient processing of multiple conversions with aggregated provenance tracking, parallel execution, progress monitoring, and advanced resource management.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Batch Processing API](#batch-processing-api)
- [Batch Scheduler](#batch-scheduler)
- [Resource Management](#resource-management)
- [Advanced Features](#advanced-features)
- [API Reference](#api-reference)

## Overview

The batch operations system provides:

- **Parallel Execution**: Process multiple items concurrently with configurable parallelism
- **Progress Tracking**: Real-time progress callbacks and events
- **Error Handling**: Continue on error or stop, with detailed error reporting
- **Batch Provenance**: Aggregated audit trail for all batch operations
- **Resource Management**: Memory limits, throttling, and resource pooling
- **Queue Management**: Priority scheduling and task orchestration
- **Incremental Processing**: Resume from failure points

## Quick Start

### Basic Batch Parsing

```javascript
import { createBatchParser } from 'zod-to-from/core/batch';
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number(),
});

// Create batch parser
const batch = createBatchParser(UserSchema)
  .add('user1', '{"name":"Alice","email":"alice@example.com","age":30}', 'json')
  .add('user2', '{"name":"Bob","email":"bob@example.com","age":25}', 'json')
  .add('user3', '{"name":"Charlie","email":"charlie@example.com","age":35}', 'json')
  .parallel(4)
  .onProgress((done, total) => console.log(`${done}/${total}`));

// Execute batch
const results = await batch.execute();

console.log(`Processed ${results.successful}/${results.total} items`);
console.log(`Failed: ${results.failed}`);
console.log(`Average duration: ${results.averageDuration}ms`);
```

### Batch Conversion

```javascript
import { createBatchConverter } from 'zod-to-from/core/batch';

const batch = createBatchConverter(UserSchema, {
  continueOnError: true,
  includeProvenance: true
})
  .addConversion('file1', jsonData, 'json', 'yaml')
  .addConversion('file2', csvData, 'csv', 'json')
  .addConversion('file3', yamlData, 'yaml', 'toml')
  .parallel(3);

const summary = await batch.execute();

// Access successful results
const successful = summary.results.filter(r => r.success);

// Access failed results
const failed = summary.results.filter(r => !r.success);

// View aggregated provenance
console.log(summary.batchProvenance);
```

## Batch Processing API

### Creating Batch Processors

```javascript
import {
  createBatchParser,
  createBatchFormatter,
  createBatchConverter,
  createBatch
} from 'zod-to-from/core/batch';

// Parser: input string → validated object
const parser = createBatchParser(schema, options);

// Formatter: validated object → output string
const formatter = createBatchFormatter(schema, options);

// Converter: input format → output format
const converter = createBatchConverter(schema, options);

// Generic (defaults to converter)
const batch = createBatch(schema, options);
```

### Batch Options

```javascript
const options = {
  // Continue processing on errors (default: true)
  continueOnError: true,

  // Include provenance metadata (default: false)
  includeProvenance: true,

  // Number of parallel operations (default: 4)
  parallel: 8,

  // Maximum memory usage in MB
  maxMemoryMB: 512,

  // Minimum delay between batches in ms
  throttleMs: 100,

  // Progress callback
  onProgress: (done, total) => {
    console.log(`Progress: ${done}/${total} (${(done/total*100).toFixed(1)}%)`);
  },

  // Item completion callback
  onItemComplete: (result) => {
    if (result.success) {
      console.log(`✓ ${result.id} completed in ${result.duration}ms`);
    } else {
      console.error(`✗ ${result.id} failed: ${result.error.message}`);
    }
  },

  // Include full error details (default: true)
  detailedErrors: true
};
```

### Adding Items

```javascript
// Add parse/format items
batch.add(id, input, format, itemOptions);

// Add conversion items
batch.addConversion(id, input, sourceFormat, targetFormat, itemOptions);

// Example with item-specific options
batch.add('user1', jsonString, 'json', {
  adapter: { pretty: true }
});

batch.addConversion('config', yamlString, 'yaml', 'json', {
  adapter: { indent: 2 }
});
```

### Executing Batches

```javascript
const summary = await batch.execute();

// Summary structure:
{
  total: 10,              // Total items processed
  successful: 8,          // Successfully processed
  failed: 2,              // Failed items
  totalDuration: 1234,    // Total time in ms
  averageDuration: 123,   // Average per item in ms
  results: [              // Individual results
    {
      id: 'item1',
      success: true,
      data: {...},
      provenance: {...},  // If includeProvenance: true
      duration: 45
    },
    {
      id: 'item2',
      success: false,
      error: Error(...),
      duration: 12
    }
  ],
  batchProvenance: {      // If includeProvenance: true
    batchId: 'abc123',
    operation: 'parse',
    totalItems: 10,
    successfulItems: 8,
    failedItems: 2,
    parallelism: 4,
    processingTime: 1234,
    formats: ['json', 'yaml'],
    timestamp: '2025-01-15T10:30:00.000Z',
    version: '2.0.0'
  }
}
```

### Event-Based Progress Tracking

```javascript
const batch = createBatchParser(schema);

// Progress event
batch.on('progress', (event) => {
  console.log(`${event.completed}/${event.total} (${event.percentage}%)`);
});

// Item completion event
batch.on('itemComplete', (result) => {
  console.log(`Item ${result.id}: ${result.success ? 'success' : 'failed'}`);
});

// Start event
batch.on('start', (event) => {
  console.log(`Starting batch of ${event.total} items`);
});

// Complete event
batch.on('complete', (summary) => {
  console.log(`Batch complete: ${summary.successful}/${summary.total}`);
});
```

## Batch Scheduler

The scheduler provides queue management, priority scheduling, and resource optimization for batch operations.

### Creating a Scheduler

```javascript
import { createScheduler, Priority } from 'zod-to-from/core/batch-scheduler';

const scheduler = createScheduler({
  maxConcurrent: 3,              // Max concurrent batches
  maxQueueSize: 100,              // Max queue size
  autoPrioritize: true,           // Auto-boost waiting tasks
  priorityBoostInterval: 30000,   // Boost every 30s
  enableResourcePool: true        // Enable resource pooling
});
```

### Scheduling Tasks

```javascript
// Schedule a batch processor
const batch = createBatchParser(schema)
  .add('item1', data1, 'json')
  .add('item2', data2, 'json');

const taskId = scheduler.schedule(batch, {
  priority: Priority.HIGH,
  id: 'custom-task-id',
  metadata: { source: 'api', user: 'alice' }
});

// Schedule multiple batches
const taskIds = scheduler.scheduleMany([batch1, batch2, batch3], {
  priority: Priority.NORMAL,
  idPrefix: 'batch'
});
```

### Priority Levels

```javascript
import { Priority } from 'zod-to-from/core/batch-scheduler';

Priority.CRITICAL  // 20 - Highest priority
Priority.HIGH      // 10
Priority.NORMAL    // 5  - Default
Priority.LOW       // 1
```

### Waiting for Tasks

```javascript
// Wait for specific task
const result = await scheduler.waitFor(taskId);

// Wait for all tasks
await scheduler.waitForAll();

// Get task status
const task = scheduler.getTask(taskId);
console.log(task.status); // 'pending', 'scheduled', 'running', 'completed', 'failed'
```

### Canceling Tasks

```javascript
// Cancel a pending task
const cancelled = scheduler.cancel(taskId);

if (cancelled) {
  console.log('Task cancelled successfully');
} else {
  console.log('Task cannot be cancelled (already running or completed)');
}
```

### Scheduler Events

```javascript
scheduler.on('taskScheduled', (task) => {
  console.log(`Task ${task.id} scheduled with priority ${task.priority}`);
});

scheduler.on('taskStarted', (task) => {
  console.log(`Task ${task.id} started`);
});

scheduler.on('taskCompleted', (task) => {
  console.log(`Task ${task.id} completed in ${task.result.totalDuration}ms`);
});

scheduler.on('taskFailed', (task) => {
  console.error(`Task ${task.id} failed: ${task.error.message}`);
});

scheduler.on('paused', () => console.log('Scheduler paused'));
scheduler.on('resumed', () => console.log('Scheduler resumed'));
```

### Resource Statistics

```javascript
const stats = scheduler.getResourceStats();

console.log(`Active: ${stats.activeTasks}`);
console.log(`Queued: ${stats.queuedTasks}`);
console.log(`Completed: ${stats.completedTasks}`);
console.log(`Failed: ${stats.failedTasks}`);
console.log(`Avg time: ${stats.averageExecutionTime}ms`);
console.log(`Memory: ${stats.memoryUsageMB.toFixed(2)}MB`);
console.log(`Queue utilization: ${stats.queueUtilization.toFixed(1)}%`);
```

### Pause/Resume and Shutdown

```javascript
// Pause processing
scheduler.pause();

// Resume processing
scheduler.resume();

// Graceful shutdown (wait for running tasks)
await scheduler.shutdown(true);

// Force shutdown (stop immediately)
await scheduler.shutdown(false);
```

## Resource Management

### Resource Pool

```javascript
import { ResourcePool } from 'zod-to-from/core/batch-scheduler';

const pool = new ResourcePool({
  maxResources: 10,

  // Create new resource
  createResource: async () => {
    return await createDatabaseConnection();
  },

  // Cleanup resource
  destroyResource: async (connection) => {
    await connection.close();
  }
});

// Use resource
const resource = await pool.acquire();
try {
  await useResource(resource);
} finally {
  pool.release(resource);
}

// Cleanup all resources
await pool.destroy();
```

### Memory Management

```javascript
const batch = createBatchParser(schema, {
  maxMemoryMB: 512,  // Limit memory usage
  throttleMs: 100    // Throttle between chunks
});

// Monitor memory during execution
batch.on('progress', () => {
  const memoryMB = process.memoryUsage().heapUsed / 1024 / 1024;
  console.log(`Memory usage: ${memoryMB.toFixed(2)}MB`);
});
```

## Advanced Features

### Format Auto-Detection

```javascript
import { detectFormat } from 'zod-to-from/core/batch';

// Detect from file extension
const format1 = detectFormat('config.yaml');  // 'yaml'
const format2 = detectFormat('data.json');    // 'json'

// Detect from content
const format3 = detectFormat('unknown.txt', '{"key":"value"}');  // 'json'
const format4 = detectFormat('unknown.txt', 'key: value');       // 'yaml'
```

### Retry Failed Items

```javascript
import { retryBatch } from 'zod-to-from/core/batch';

const summary = await batch.execute();
const failed = summary.results.filter(r => !r.success);

if (failed.length > 0) {
  const retryResult = await retryBatch(batch, failed, {
    maxRetries: 3,
    retryDelay: 1000  // Wait 1s between retries
  });

  console.log(`Retry results: ${retryResult.successful}/${retryResult.total}`);
}
```

### Batch Reset and Reuse

```javascript
const batch = createBatchParser(schema);

// First batch
batch.add('item1', data1, 'json');
const result1 = await batch.execute();

// Reset and reuse
batch.reset();

// Second batch
batch.add('item2', data2, 'json');
const result2 = await batch.execute();
```

### Custom Priority Function

```javascript
const scheduler = createScheduler({
  priorityFunction: (task) => {
    // Higher priority for tasks with more items
    const itemCount = task.processor.items.length;
    return itemCount > 100 ? Priority.HIGH : Priority.NORMAL;
  }
});
```

## API Reference

### Batch Processing

#### `createBatchParser(schema, options)`
Create a batch parser for parsing input strings into validated objects.

#### `createBatchFormatter(schema, options)`
Create a batch formatter for formatting validated objects into output strings.

#### `createBatchConverter(schema, options)`
Create a batch converter for converting between formats.

#### `createBatch(schema, options)`
Create a generic batch processor (defaults to converter).

### BatchProcessor Methods

- `add(id, input, format, itemOptions)` - Add item to batch
- `addConversion(id, input, sourceFormat, targetFormat, itemOptions)` - Add conversion
- `parallel(count)` - Set parallel execution count
- `onProgress(callback)` - Set progress callback
- `onItemComplete(callback)` - Set item completion callback
- `execute()` - Execute the batch
- `reset()` - Reset batch state

### Batch Scheduler

#### `createScheduler(options)`
Create a new batch scheduler.

### BatchScheduler Methods

- `schedule(processor, options)` - Schedule a batch processor
- `scheduleMany(processors, options)` - Schedule multiple processors
- `getTask(taskId)` - Get task by ID
- `cancel(taskId)` - Cancel a task
- `waitFor(taskId)` - Wait for task completion
- `waitForAll()` - Wait for all tasks
- `getResourceStats()` - Get resource statistics
- `clearCompleted(olderThanMs)` - Clear completed tasks
- `pause()` - Pause scheduler
- `resume()` - Resume scheduler
- `shutdown(graceful)` - Shutdown scheduler

### Utilities

#### `detectFormat(filename, content)`
Auto-detect format from file extension or content.

#### `retryBatch(processor, failedResults, options)`
Retry failed batch items.

## Best Practices

1. **Choose Appropriate Parallelism**: Balance between throughput and resource usage
   ```javascript
   // For I/O-bound operations (file/network)
   .parallel(8)

   // For CPU-bound operations
   .parallel(require('os').cpus().length)
   ```

2. **Handle Errors Gracefully**: Use `continueOnError` and monitor failed items
   ```javascript
   const batch = createBatchParser(schema, {
     continueOnError: true,
     detailedErrors: true
   });
   ```

3. **Monitor Progress**: Provide user feedback for long-running batches
   ```javascript
   batch.onProgress((done, total) => {
     const pct = ((done / total) * 100).toFixed(1);
     console.log(`Processing: ${done}/${total} (${pct}%)`);
   });
   ```

4. **Use Provenance for Auditing**: Track batch operations for compliance
   ```javascript
   const summary = await batch.execute({ includeProvenance: true });
   await saveAuditLog(summary.batchProvenance);
   ```

5. **Implement Retry Logic**: Handle transient failures
   ```javascript
   const failed = summary.results.filter(r => !r.success);
   if (failed.length > 0) {
     await retryBatch(batch, failed, { maxRetries: 3 });
   }
   ```

6. **Use Scheduler for Complex Workflows**: Prioritize and manage multiple batches
   ```javascript
   const scheduler = createScheduler({ maxConcurrent: 3 });
   scheduler.schedule(criticalBatch, { priority: Priority.CRITICAL });
   scheduler.schedule(normalBatch, { priority: Priority.NORMAL });
   ```

## Examples

### Example 1: Processing Multiple Files

```javascript
import { createBatchConverter } from 'zod-to-from/core/batch';
import { readFile } from 'fs/promises';
import { z } from 'zod';

const ConfigSchema = z.object({
  name: z.string(),
  version: z.string(),
  settings: z.record(z.unknown())
});

async function convertConfigFiles(files) {
  const batch = createBatchConverter(ConfigSchema, {
    parallel: 4,
    includeProvenance: true
  });

  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    batch.addConversion(
      file,
      content,
      'yaml',
      'json',
      { adapter: { indent: 2 } }
    );
  }

  const summary = await batch.execute();

  console.log(`Converted ${summary.successful}/${summary.total} files`);

  return summary.results
    .filter(r => r.success)
    .map(r => ({ file: r.id, json: r.data }));
}
```

### Example 2: Scheduled Data Pipeline

```javascript
import { createScheduler, Priority } from 'zod-to-from/core/batch-scheduler';
import { createBatchParser } from 'zod-to-from/core/batch';

const scheduler = createScheduler({
  maxConcurrent: 2,
  autoPrioritize: true
});

// High-priority user data
const userBatch = createBatchParser(UserSchema)
  .add('user1', userData1, 'json')
  .add('user2', userData2, 'json');

scheduler.schedule(userBatch, {
  priority: Priority.HIGH,
  metadata: { type: 'users' }
});

// Normal-priority analytics data
const analyticsBatch = createBatchParser(AnalyticsSchema)
  .add('event1', eventData1, 'json')
  .add('event2', eventData2, 'json');

scheduler.schedule(analyticsBatch, {
  priority: Priority.NORMAL,
  metadata: { type: 'analytics' }
});

// Wait for all and collect results
await scheduler.waitForAll();

const stats = scheduler.getResourceStats();
console.log(`Processed ${stats.completedTasks} batches`);
```

### Example 3: Bulk Data Validation with Retry

```javascript
async function validateBulkData(records) {
  const batch = createBatchParser(RecordSchema, {
    continueOnError: true,
    parallel: 8
  });

  records.forEach((record, index) => {
    batch.add(`record-${index}`, JSON.stringify(record), 'json');
  });

  let summary = await batch.execute();
  let failed = summary.results.filter(r => !r.success);

  // Retry failed records
  if (failed.length > 0) {
    console.log(`Retrying ${failed.length} failed records...`);
    const retryResult = await retryBatch(batch, failed, {
      maxRetries: 2,
      retryDelay: 500
    });

    summary = retryResult;
    failed = retryResult.results.filter(r => !r.success);
  }

  return {
    valid: summary.results.filter(r => r.success).map(r => r.data),
    invalid: failed.map(r => ({ id: r.id, error: r.error.message })),
    stats: {
      total: summary.total,
      valid: summary.successful,
      invalid: summary.failed
    }
  };
}
```

## Performance Considerations

- **Parallelism**: More parallel operations = faster throughput but higher memory usage
- **Batch Size**: Larger batches are more efficient but require more memory
- **Throttling**: Use `throttleMs` to prevent overwhelming external services
- **Memory Limits**: Set `maxMemoryMB` to prevent out-of-memory errors
- **Provenance Overhead**: Enabling provenance adds ~10-15% overhead
- **Scheduler Queue**: Monitor queue utilization and adjust `maxQueueSize` as needed

## Migration from v1

If you're using individual conversions in v1:

```javascript
// v1 - Sequential
const results = [];
for (const item of items) {
  const result = await parseFrom(schema, 'json', item);
  results.push(result);
}

// v2 - Parallel batch
const batch = createBatchParser(schema).parallel(4);
items.forEach((item, i) => batch.add(`item-${i}`, item, 'json'));
const summary = await batch.execute();
const results = summary.results.map(r => r.data);
```

## Support

For issues, questions, or contributions, visit:
- GitHub: https://github.com/seanchatmangpt/zod-to-from
- Issues: https://github.com/seanchatmangpt/zod-to-from/issues
