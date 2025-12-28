/**
 * Batch Operations Tests
 * @fileoverview Comprehensive tests for batch processing functionality
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  BatchProcessor,
  createBatch,
  createBatchParser,
  createBatchFormatter,
  createBatchConverter,
  detectFormat,
  retryBatch,
} from '../../src/core/batch.mjs';
import { BatchScheduler, createScheduler, Priority, ResourcePool } from '../../src/core/batch-scheduler.mjs';
import { registerAdapter } from '../setup.mjs';

describe('Batch Operations', () => {
  // Test schemas
  const SimpleSchema = z.object({
    name: z.string(),
    age: z.number(),
  });

  const UserSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    active: z.boolean(),
  });

  beforeEach(() => {
    // Register test adapters
    registerAdapter('test-batch', {
      async parse(input, opts = {}) {
        return { data: JSON.parse(input), metadata: { parsed: true } };
      },
      async format(data, opts = {}) {
        return { data: JSON.stringify(data, null, 2), metadata: { formatted: true } };
      },
      supportsStreaming: false,
      isAI: false,
    });

    registerAdapter('test-slow', {
      async parse(input, opts = {}) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { data: JSON.parse(input), metadata: {} };
      },
      async format(data, opts = {}) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { data: JSON.stringify(data), metadata: {} };
      },
      supportsStreaming: false,
      isAI: false,
    });

    registerAdapter('test-error', {
      async parse(input, opts = {}) {
        throw new Error('Simulated parse error');
      },
      async format(data, opts = {}) {
        throw new Error('Simulated format error');
      },
      supportsStreaming: false,
      isAI: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('BatchProcessor - Basic Operations', () => {
    it('should create a batch parser', () => {
      const batch = createBatchParser(SimpleSchema);
      expect(batch).toBeInstanceOf(BatchProcessor);
      expect(batch.operation).toBe('parse');
    });

    it('should create a batch formatter', () => {
      const batch = createBatchFormatter(SimpleSchema);
      expect(batch).toBeInstanceOf(BatchProcessor);
      expect(batch.operation).toBe('format');
    });

    it('should create a batch converter', () => {
      const batch = createBatchConverter(SimpleSchema);
      expect(batch).toBeInstanceOf(BatchProcessor);
      expect(batch.operation).toBe('convert');
    });

    it('should create batch with simplified API', () => {
      const batch = createBatch(SimpleSchema);
      expect(batch).toBeInstanceOf(BatchProcessor);
    });

    it('should add items to batch', () => {
      const batch = createBatchParser(SimpleSchema);
      batch.add('item1', '{"name":"John","age":30}', 'json');
      batch.add('item2', '{"name":"Jane","age":25}', 'json');

      expect(batch.items).toHaveLength(2);
      expect(batch.items[0].id).toBe('item1');
      expect(batch.items[1].id).toBe('item2');
    });

    it('should support method chaining', () => {
      const batch = createBatchParser(SimpleSchema)
        .add('item1', '{"name":"John","age":30}', 'json')
        .add('item2', '{"name":"Jane","age":25}', 'json')
        .parallel(4)
        .onProgress(() => {});

      expect(batch.items).toHaveLength(2);
      expect(batch.options.parallel).toBe(4);
    });
  });

  describe('BatchProcessor - Parsing', () => {
    it('should parse multiple items successfully', async () => {
      const batch = createBatchParser(SimpleSchema);

      batch.add('user1', '{"name":"Alice","age":30}', 'json');
      batch.add('user2', '{"name":"Bob","age":25}', 'json');
      batch.add('user3', '{"name":"Charlie","age":35}', 'json');

      const summary = await batch.execute();

      expect(summary.total).toBe(3);
      expect(summary.successful).toBe(3);
      expect(summary.failed).toBe(0);
      expect(summary.results).toHaveLength(3);

      expect(summary.results[0].success).toBe(true);
      expect(summary.results[0].data).toEqual({ name: 'Alice', age: 30 });
      expect(summary.results[1].data).toEqual({ name: 'Bob', age: 25 });
      expect(summary.results[2].data).toEqual({ name: 'Charlie', age: 35 });
    });

    it('should handle parsing errors gracefully', async () => {
      const batch = createBatchParser(SimpleSchema, { continueOnError: true });

      batch.add('valid', '{"name":"Valid","age":30}', 'json');
      batch.add('invalid', '{"name":"Invalid","age":"not-a-number"}', 'json');
      batch.add('malformed', '{invalid json}', 'json');

      const summary = await batch.execute();

      expect(summary.total).toBe(3);
      expect(summary.successful).toBe(1);
      expect(summary.failed).toBe(2);

      const validResult = summary.results.find((r) => r.id === 'valid');
      expect(validResult?.success).toBe(true);

      const invalidResult = summary.results.find((r) => r.id === 'invalid');
      expect(invalidResult?.success).toBe(false);
      expect(invalidResult?.error).toBeDefined();
    });

    it('should include provenance when requested', async () => {
      const batch = createBatchParser(SimpleSchema, { includeProvenance: true });

      batch.add('item1', '{"name":"Test","age":30}', 'json');

      const summary = await batch.execute();

      expect(summary.results[0].provenance).toBeDefined();
      expect(summary.results[0].provenance?.timestamp).toBeDefined();
      expect(summary.batchProvenance).toBeDefined();
      expect(summary.batchProvenance?.batchId).toBeDefined();
      expect(summary.batchProvenance?.totalItems).toBe(1);
    });
  });

  describe('BatchProcessor - Formatting', () => {
    it('should format multiple items successfully', async () => {
      const batch = createBatchFormatter(SimpleSchema);

      batch.add('user1', { name: 'Alice', age: 30 }, 'json');
      batch.add('user2', { name: 'Bob', age: 25 }, 'json');

      const summary = await batch.execute();

      expect(summary.total).toBe(2);
      expect(summary.successful).toBe(2);
      expect(summary.failed).toBe(0);

      expect(summary.results[0].data).toContain('"name": "Alice"');
      expect(summary.results[1].data).toContain('"name": "Bob"');
    });

    it('should validate data before formatting', async () => {
      const batch = createBatchFormatter(SimpleSchema, { continueOnError: true });

      batch.add('valid', { name: 'Valid', age: 30 }, 'json');
      batch.add('invalid', { name: 'Invalid', age: 'not-a-number' }, 'json');

      const summary = await batch.execute();

      expect(summary.successful).toBe(1);
      expect(summary.failed).toBe(1);
    });
  });

  describe('BatchProcessor - Conversion', () => {
    it('should convert between formats', async () => {
      const batch = createBatchConverter(SimpleSchema);

      batch.addConversion('item1', '{"name":"Alice","age":30}', 'json', 'json');
      batch.addConversion('item2', '{"name":"Bob","age":25}', 'json', 'json');

      const summary = await batch.execute();

      expect(summary.total).toBe(2);
      expect(summary.successful).toBe(2);
      expect(summary.results[0].data).toContain('"name": "Alice"');
    });

    it('should handle conversion errors', async () => {
      const batch = createBatchConverter(SimpleSchema, { continueOnError: true });

      batch.addConversion('valid', '{"name":"Valid","age":30}', 'json', 'json');
      batch.addConversion('invalid', '{invalid}', 'json', 'json');

      const summary = await batch.execute();

      expect(summary.successful).toBe(1);
      expect(summary.failed).toBe(1);
    });
  });

  describe('BatchProcessor - Parallel Execution', () => {
    it('should process items in parallel', async () => {
      const batch = createBatchParser(SimpleSchema, { parallel: 2 });

      // Add items that take time to process
      for (let i = 0; i < 4; i++) {
        batch.add(`item${i}`, `{"name":"User${i}","age":${20 + i}}`, 'test-slow');
      }

      const startTime = Date.now();
      const summary = await batch.execute();
      const duration = Date.now() - startTime;

      // With parallel=2, 4 items should take ~200ms (2 batches of 2 items)
      // Without parallelism, it would take ~400ms (4 sequential items)
      expect(summary.successful).toBe(4);
      expect(duration).toBeLessThan(350); // Allow some buffer
    });

    it('should respect parallel limit', async () => {
      const batch = createBatchParser(SimpleSchema);
      batch.parallel(3);

      expect(batch.options.parallel).toBe(3);
    });
  });

  describe('BatchProcessor - Progress Tracking', () => {
    it('should call progress callback', async () => {
      const progressCalls = [];
      const batch = createBatchParser(SimpleSchema);

      batch.onProgress((done, total) => {
        progressCalls.push({ done, total });
      });

      batch.add('item1', '{"name":"Alice","age":30}', 'json');
      batch.add('item2', '{"name":"Bob","age":25}', 'json');
      batch.add('item3', '{"name":"Charlie","age":35}', 'json');

      await batch.execute();

      expect(progressCalls).toHaveLength(3);
      expect(progressCalls[0]).toEqual({ done: 1, total: 3 });
      expect(progressCalls[1]).toEqual({ done: 2, total: 3 });
      expect(progressCalls[2]).toEqual({ done: 3, total: 3 });
    });

    it('should emit progress events', async () => {
      const progressEvents = [];
      const batch = createBatchParser(SimpleSchema);

      batch.on('progress', (event) => {
        progressEvents.push(event);
      });

      batch.add('item1', '{"name":"Alice","age":30}', 'json');
      batch.add('item2', '{"name":"Bob","age":25}', 'json');

      await batch.execute();

      expect(progressEvents).toHaveLength(2);
      expect(progressEvents[0].completed).toBe(1);
      expect(progressEvents[0].percentage).toBe(50);
    });

    it('should call item completion callback', async () => {
      const completedItems = [];
      const batch = createBatchParser(SimpleSchema);

      batch.onItemComplete((result) => {
        completedItems.push(result);
      });

      batch.add('item1', '{"name":"Alice","age":30}', 'json');
      batch.add('item2', '{"name":"Bob","age":25}', 'json');

      await batch.execute();

      expect(completedItems).toHaveLength(2);
      expect(completedItems[0].id).toBe('item1');
      expect(completedItems[1].id).toBe('item2');
    });
  });

  describe('BatchProcessor - Error Handling', () => {
    it('should continue on error by default', async () => {
      const batch = createBatchParser(SimpleSchema);

      batch.add('valid', '{"name":"Valid","age":30}', 'json');
      batch.add('error', '{"name":"Error","age":30}', 'test-error');
      batch.add('valid2', '{"name":"Valid2","age":25}', 'json');

      const summary = await batch.execute();

      expect(summary.total).toBe(3);
      expect(summary.successful).toBe(2);
      expect(summary.failed).toBe(1);
    });

    it('should stop on error when continueOnError is false', async () => {
      const batch = createBatchParser(SimpleSchema, { continueOnError: false, parallel: 1 });

      batch.add('valid', '{"name":"Valid","age":30}', 'json');
      batch.add('error', '{"name":"Error","age":30}', 'test-error');
      batch.add('valid2', '{"name":"Valid2","age":25}', 'json');

      const summary = await batch.execute();

      // Should stop after the error
      expect(summary.successful).toBe(1);
      expect(summary.failed).toBe(1);
    });

    it('should include error details when requested', async () => {
      const batch = createBatchParser(SimpleSchema, { detailedErrors: true });

      batch.add('error', '{"name":"Test","age":30}', 'test-error');

      const summary = await batch.execute();

      expect(summary.results[0].error).toBeDefined();
      expect(summary.results[0].error?.message).toContain('Simulated parse error');
    });
  });

  describe('BatchProcessor - Resource Management', () => {
    it('should handle empty batch', async () => {
      const batch = createBatchParser(SimpleSchema);
      const summary = await batch.execute();

      expect(summary.total).toBe(0);
      expect(summary.successful).toBe(0);
      expect(summary.failed).toBe(0);
    });

    it('should reset batch state', () => {
      const batch = createBatchParser(SimpleSchema);
      batch.add('item1', '{"name":"Test","age":30}', 'json');

      expect(batch.items).toHaveLength(1);

      batch.reset();

      expect(batch.items).toHaveLength(0);
      expect(batch.completedCount).toBe(0);
    });

    it('should track execution duration', async () => {
      const batch = createBatchParser(SimpleSchema);
      batch.add('item1', '{"name":"Test","age":30}', 'json');

      const summary = await batch.execute();

      expect(summary.totalDuration).toBeGreaterThanOrEqual(0);
      expect(summary.averageDuration).toBeGreaterThanOrEqual(0);
      expect(summary.results[0].duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Format Detection', () => {
    it('should detect format from file extension', () => {
      expect(detectFormat('data.json')).toBe('json');
      expect(detectFormat('config.yaml')).toBe('yaml');
      expect(detectFormat('config.yml')).toBe('yaml');
      expect(detectFormat('data.toml')).toBe('toml');
      expect(detectFormat('data.csv')).toBe('csv');
      expect(detectFormat('config.ini')).toBe('ini');
      expect(detectFormat('settings.env')).toBe('env');
    });

    it('should detect format from content', () => {
      expect(detectFormat('unknown.txt', '{"key":"value"}')).toBe('json');
      expect(detectFormat('unknown.txt', '[{"key":"value"}]')).toBe('json');
      expect(detectFormat('unknown.txt', '---\nkey: value')).toBe('yaml');
      expect(detectFormat('unknown.txt', 'key: value')).toBe('yaml');
      expect(detectFormat('unknown.txt', '<?xml version="1.0"?>')).toBe('xml');
      expect(detectFormat('unknown.txt', '<root></root>')).toBe('xml');
    });

    it('should return null for unknown formats', () => {
      expect(detectFormat('unknown.xyz')).toBe(null);
      expect(detectFormat('unknown.txt', 'random text content')).toBe(null);
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed batch items', async () => {
      const batch = createBatchParser(SimpleSchema);

      batch.add('valid', '{"name":"Valid","age":30}', 'json');
      batch.add('error', '{"name":"Error","age":30}', 'test-error');

      const summary = await batch.execute();
      const failed = summary.results.filter((r) => !r.success);

      expect(failed).toHaveLength(1);

      // Retry would still fail with test-error adapter
      const retryResult = await retryBatch(batch, failed, { maxRetries: 2, retryDelay: 10 });

      expect(retryResult.failed).toBe(1);
    });
  });

  describe('BatchScheduler', () => {
    it('should create a scheduler', () => {
      const scheduler = createScheduler();
      expect(scheduler).toBeInstanceOf(BatchScheduler);
    });

    it('should schedule batch tasks', async () => {
      const scheduler = createScheduler({ maxConcurrent: 2 });

      const batch1 = createBatchParser(SimpleSchema);
      batch1.add('item1', '{"name":"Alice","age":30}', 'json');

      const batch2 = createBatchParser(SimpleSchema);
      batch2.add('item2', '{"name":"Bob","age":25}', 'json');

      const taskId1 = scheduler.schedule(batch1, { priority: Priority.HIGH });
      const taskId2 = scheduler.schedule(batch2, { priority: Priority.NORMAL });

      expect(taskId1).toBeDefined();
      expect(taskId2).toBeDefined();

      // Wait for tasks to complete
      await scheduler.waitForAll();

      const stats = scheduler.getResourceStats();
      expect(stats.completedTasks).toBe(2);
      expect(stats.failedTasks).toBe(0);
    });

    it('should respect priority ordering', async () => {
      const scheduler = createScheduler({ maxConcurrent: 1 });

      const executionOrder = [];

      const batch1 = createBatchParser(SimpleSchema);
      batch1.add('item1', '{"name":"Low","age":30}', 'json');

      const batch2 = createBatchParser(SimpleSchema);
      batch2.add('item2', '{"name":"High","age":25}', 'json');

      const batch3 = createBatchParser(SimpleSchema);
      batch3.add('item3', '{"name":"Critical","age":35}', 'json');

      scheduler.on('taskStarted', (task) => {
        executionOrder.push(task.priority);
      });

      scheduler.schedule(batch1, { priority: Priority.LOW });
      scheduler.schedule(batch2, { priority: Priority.HIGH });
      scheduler.schedule(batch3, { priority: Priority.CRITICAL });

      await scheduler.waitForAll();

      // Higher priority should execute first
      expect(executionOrder[0]).toBe(Priority.CRITICAL);
      expect(executionOrder[1]).toBe(Priority.HIGH);
      expect(executionOrder[2]).toBe(Priority.LOW);
    });

    it('should cancel scheduled tasks', () => {
      const scheduler = createScheduler({ maxConcurrent: 1 });

      const batch1 = createBatchParser(SimpleSchema);
      batch1.add('item1', '{"name":"Test","age":30}', 'test-slow');

      const batch2 = createBatchParser(SimpleSchema);
      batch2.add('item2', '{"name":"Cancel","age":25}', 'json');

      scheduler.schedule(batch1);
      const taskId2 = scheduler.schedule(batch2);

      const cancelled = scheduler.cancel(taskId2);
      expect(cancelled).toBe(true);

      const task = scheduler.getTask(taskId2);
      expect(task?.status).toBe('cancelled');
    });

    it('should wait for specific task', async () => {
      const scheduler = createScheduler();

      const batch = createBatchParser(SimpleSchema);
      batch.add('item1', '{"name":"Test","age":30}', 'json');

      const taskId = scheduler.schedule(batch);
      const result = await scheduler.waitFor(taskId);

      expect(result).toBeDefined();
      expect(result.successful).toBe(1);
    });

    it('should get resource statistics', async () => {
      const scheduler = createScheduler({ maxConcurrent: 2 });

      const batch = createBatchParser(SimpleSchema);
      batch.add('item1', '{"name":"Test","age":30}', 'json');

      scheduler.schedule(batch);

      const stats = scheduler.getResourceStats();
      expect(stats).toHaveProperty('activeTasks');
      expect(stats).toHaveProperty('queuedTasks');
      expect(stats).toHaveProperty('completedTasks');
      expect(stats).toHaveProperty('memoryUsageMB');
      expect(stats).toHaveProperty('queueUtilization');

      await scheduler.waitForAll();
    });

    it('should clear completed tasks', async () => {
      const scheduler = createScheduler();

      const batch = createBatchParser(SimpleSchema);
      batch.add('item1', '{"name":"Test","age":30}', 'json');

      scheduler.schedule(batch);
      await scheduler.waitForAll();

      expect(scheduler.tasks.size).toBe(1);

      const cleared = scheduler.clearCompleted();
      expect(cleared).toBe(1);
      expect(scheduler.tasks.size).toBe(0);
    });

    it('should pause and resume', async () => {
      const scheduler = createScheduler({ maxConcurrent: 1 });

      const batch1 = createBatchParser(SimpleSchema);
      batch1.add('item1', '{"name":"First","age":30}', 'test-slow');

      const batch2 = createBatchParser(SimpleSchema);
      batch2.add('item2', '{"name":"Second","age":25}', 'json');

      scheduler.schedule(batch1);
      scheduler.schedule(batch2);

      scheduler.pause();
      expect(scheduler.paused).toBe(true);

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 50));

      scheduler.resume();
      expect(scheduler.paused).toBe(false);

      await scheduler.waitForAll();
    });

    it('should shutdown gracefully', async () => {
      const scheduler = createScheduler();

      const batch = createBatchParser(SimpleSchema);
      batch.add('item1', '{"name":"Test","age":30}', 'json');

      scheduler.schedule(batch);

      await scheduler.shutdown(true);

      expect(scheduler.queue).toHaveLength(0);
      expect(scheduler.running).toHaveLength(0);
    });
  });

  describe('ResourcePool', () => {
    it('should acquire and release resources', async () => {
      const pool = new ResourcePool({ maxResources: 3 });

      const resource1 = await pool.acquire();
      const resource2 = await pool.acquire();

      expect(pool.inUse.size).toBe(2);
      expect(pool.available.length).toBe(0);

      pool.release(resource1);

      expect(pool.inUse.size).toBe(1);
      expect(pool.available.length).toBe(1);
    });

    it('should reuse released resources', async () => {
      const pool = new ResourcePool({ maxResources: 2 });

      const resource1 = await pool.acquire();
      pool.release(resource1);

      const resource2 = await pool.acquire();

      expect(resource1).toBe(resource2);
    });

    it('should destroy all resources', async () => {
      const destroyed = [];
      const pool = new ResourcePool({
        maxResources: 3,
        createResource: async () => ({ id: Math.random() }),
        destroyResource: async (r) => {
          destroyed.push(r);
        },
      });

      await pool.acquire();
      await pool.acquire();

      await pool.destroy();

      expect(destroyed.length).toBe(2);
      expect(pool.pool).toHaveLength(0);
    });
  });

  describe('Batch Provenance', () => {
    it('should aggregate provenance across batch', async () => {
      const batch = createBatchParser(SimpleSchema, { includeProvenance: true });

      batch.add('item1', '{"name":"Alice","age":30}', 'json');
      batch.add('item2', '{"name":"Bob","age":25}', 'json');
      batch.add('error', '{invalid}', 'json');

      const summary = await batch.execute();

      expect(summary.batchProvenance).toBeDefined();
      expect(summary.batchProvenance?.batchId).toBeDefined();
      expect(summary.batchProvenance?.operation).toBe('parse');
      expect(summary.batchProvenance?.totalItems).toBe(3);
      expect(summary.batchProvenance?.successfulItems).toBe(2);
      expect(summary.batchProvenance?.failedItems).toBe(1);
      expect(summary.batchProvenance?.parallelism).toBe(4);
      expect(summary.batchProvenance?.processingTime).toBeGreaterThan(0);
    });
  });
});
