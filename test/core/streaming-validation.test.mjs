/**
 * Streaming Validation Tests
 * @fileoverview Comprehensive tests for streaming validation features
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { Readable, Writable, pipeline } from 'node:stream';
import { promisify } from 'node:util';
import {
  createValidationStream,
  createParseStream,
  createFormatStream,
  createValidationPipeline,
  createBackpressureStream,
  createFanOutStream,
  createProgressiveStream,
  autoDetectFormat,
  createMemoryEfficientStream,
} from '../../src/core/streaming.mjs';
import {
  createIncrementalCompiler,
  createAggregatorStream,
  createPartialValidatorStream,
  createSchemaEvolutionStream,
  createConditionalValidatorStream,
  createSamplingValidatorStream,
  createDeduplicationStream,
  createRepairStream,
  createBatchedValidatorStream,
} from '../../src/core/stream-validators.mjs';

const pipelineAsync = promisify(pipeline);

describe('Streaming Validation', () => {
  const UserSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().email(),
    age: z.number().min(0).max(150),
  });

  const sampleUsers = [
    { id: 1, name: 'Alice', email: 'alice@example.com', age: 30 },
    { id: 2, name: 'Bob', email: 'bob@example.com', age: 25 },
    { id: 3, name: 'Charlie', email: 'charlie@example.com', age: 35 },
  ];

  describe('createValidationStream', () => {
    it('should validate records in real-time', async () => {
      const validRecords = [];
      const validationStream = createValidationStream(UserSchema, {
        onValid: (record) => {
          validRecords.push(record);
        },
      });

      const input = Readable.from(sampleUsers);
      const output = [];

      await pipelineAsync(
        input,
        validationStream,
        new Writable({
          objectMode: true,
          write(chunk, encoding, callback) {
            output.push(chunk);
            callback();
          },
        })
      );

      expect(output).toHaveLength(3);
      expect(validRecords).toHaveLength(3);
      expect(validationStream.getStats().validRecords).toBe(3);
      expect(validationStream.getStats().invalidRecords).toBe(0);
    });

    it('should handle validation errors with skipInvalid', async () => {
      const invalidData = [
        ...sampleUsers,
        { id: 4, name: 'Invalid', email: 'not-an-email', age: 25 }, // Invalid email
      ];

      const validationStream = createValidationStream(UserSchema, {
        skipInvalid: true,
      });

      const input = Readable.from(invalidData);
      const output = [];

      await pipelineAsync(
        input,
        validationStream,
        new Writable({
          objectMode: true,
          write(chunk, encoding, callback) {
            output.push(chunk);
            callback();
          },
        })
      );

      expect(output).toHaveLength(3); // Only valid records
      expect(validationStream.getStats().validRecords).toBe(3);
      expect(validationStream.getStats().invalidRecords).toBe(1);
    });

    it('should emit error events for invalid records', async () => {
      const errors = [];
      const invalidData = [
        { id: 1, name: 'Alice', email: 'alice@example.com', age: 30 },
        { id: 2, name: 'Bob', email: 'invalid-email', age: 25 },
      ];

      const validationStream = createValidationStream(UserSchema, {
        skipInvalid: true,
        onError: (error, chunk, index) => {
          errors.push({ error, chunk, index });
        },
      });

      const input = Readable.from(invalidData);
      const output = [];

      await pipelineAsync(
        input,
        validationStream,
        new Writable({
          objectMode: true,
          write(chunk, encoding, callback) {
            output.push(chunk);
            callback();
          },
        })
      );

      expect(errors).toHaveLength(1);
      expect(errors[0].index).toBe(1);
    });

    it('should include provenance metadata', async () => {
      const validationStream = createValidationStream(UserSchema, {
        includeProvenance: true,
      });

      const input = Readable.from([sampleUsers[0]]);
      const output = [];

      await pipelineAsync(
        input,
        validationStream,
        new Writable({
          objectMode: true,
          write(chunk, encoding, callback) {
            output.push(chunk);
            callback();
          },
        })
      );

      expect(output[0]).toHaveProperty('data');
      expect(output[0]).toHaveProperty('provenance');
      expect(output[0].provenance).toHaveProperty('timestamp');
      expect(validationStream.getProvenance()).toBeTruthy();
    });

    it('should track validation statistics', async () => {
      let statsUpdates = 0;
      const validationStream = createValidationStream(UserSchema, {
        onStats: (stats) => {
          statsUpdates++;
          expect(stats).toHaveProperty('totalRecords');
          expect(stats).toHaveProperty('validRecords');
          expect(stats).toHaveProperty('errorRate');
        },
      });

      // Generate large dataset to trigger stats updates
      const largeDataset = Array.from({ length: 2000 }, (_, i) => ({
        id: i,
        name: `User${i}`,
        email: `user${i}@example.com`,
        age: 20 + (i % 50),
      }));

      const input = Readable.from(largeDataset);
      const output = [];

      await pipelineAsync(
        input,
        validationStream,
        new Writable({
          objectMode: true,
          write(chunk, encoding, callback) {
            output.push(chunk);
            callback();
          },
        })
      );

      const finalStats = validationStream.getStats();
      expect(finalStats.totalRecords).toBe(2000);
      expect(finalStats.validRecords).toBe(2000);
      expect(statsUpdates).toBeGreaterThan(0);
    });
  });

  describe('createParseStream', () => {
    it('should parse NDJSON format', async () => {
      const ndjsonData = sampleUsers.map(u => JSON.stringify(u)).join('\n');
      const parseStream = createParseStream('ndjson');
      const input = Readable.from([ndjsonData]);
      const output = [];

      await pipelineAsync(
        input,
        parseStream,
        new Writable({
          objectMode: true,
          write(chunk, encoding, callback) {
            output.push(chunk);
            callback();
          },
        })
      );

      expect(output).toHaveLength(3);
      expect(output[0]).toEqual(sampleUsers[0]);
    });

    it('should handle multi-line NDJSON chunks', async () => {
      const ndjsonData = sampleUsers.map(u => JSON.stringify(u)).join('\n');
      const parseStream = createParseStream('ndjson');

      // Split data into chunks
      const chunks = [
        ndjsonData.slice(0, 50),
        ndjsonData.slice(50, 100),
        ndjsonData.slice(100),
      ];

      const input = Readable.from(chunks);
      const output = [];

      await pipelineAsync(
        input,
        parseStream,
        new Writable({
          objectMode: true,
          write(chunk, encoding, callback) {
            output.push(chunk);
            callback();
          },
        })
      );

      expect(output.length).toBeGreaterThan(0);
    });
  });

  describe('createFormatStream', () => {
    it('should format to NDJSON', async () => {
      const formatStream = createFormatStream('ndjson');
      const input = Readable.from(sampleUsers);
      let output = '';

      await pipelineAsync(
        input,
        formatStream,
        new Writable({
          write(chunk, encoding, callback) {
            output += chunk.toString();
            callback();
          },
        })
      );

      const lines = output.trim().split('\n');
      expect(lines).toHaveLength(3);
      expect(JSON.parse(lines[0])).toEqual(sampleUsers[0]);
    });

    it('should format to JSON array', async () => {
      const formatStream = createFormatStream('json');
      const input = Readable.from(sampleUsers);
      let output = '';

      await pipelineAsync(
        input,
        formatStream,
        new Writable({
          write(chunk, encoding, callback) {
            output += chunk.toString();
            callback();
          },
        })
      );

      const parsed = JSON.parse(output);
      expect(parsed).toHaveLength(3);
      expect(parsed[0]).toEqual(sampleUsers[0]);
    });
  });

  describe('createBackpressureStream', () => {
    it('should handle backpressure on errors', async () => {
      const invalidData = [
        ...sampleUsers,
        { id: 4, name: 'Invalid', email: 'bad-email', age: 25 },
      ];

      const backpressureStream = createBackpressureStream(UserSchema, {
        pauseOnError: true,
        resumeDelay: 100,
        skipInvalid: true,
      });

      const input = Readable.from(invalidData);
      const output = [];

      await pipelineAsync(
        input,
        backpressureStream,
        new Writable({
          objectMode: true,
          write(chunk, encoding, callback) {
            output.push(chunk);
            callback();
          },
        })
      );

      expect(output).toHaveLength(3);
    });
  });

  describe('createFanOutStream', () => {
    it('should write to multiple outputs', async () => {
      const output1 = [];
      const output2 = [];

      const writable1 = new Writable({
        objectMode: true,
        write(chunk, encoding, callback) {
          output1.push(chunk);
          callback();
        },
      });

      const writable2 = new Writable({
        objectMode: true,
        write(chunk, encoding, callback) {
          output2.push(chunk);
          callback();
        },
      });

      const fanOutStream = createFanOutStream(UserSchema, [writable1, writable2]);
      const input = Readable.from(sampleUsers);

      await pipelineAsync(input, fanOutStream);

      expect(output1).toHaveLength(3);
      expect(output2).toHaveLength(3);
      expect(output1).toEqual(output2);
    });
  });

  describe('createProgressiveStream', () => {
    it('should apply schemas progressively', async () => {
      const partialSchema = z.object({
        id: z.number(),
        name: z.string(),
      });

      const fullSchema = UserSchema;

      const progressiveStream = createProgressiveStream([partialSchema, fullSchema], {
        switchThreshold: 2,
      });

      const input = Readable.from(sampleUsers);
      const output = [];

      await pipelineAsync(
        input,
        progressiveStream,
        new Writable({
          objectMode: true,
          write(chunk, encoding, callback) {
            output.push(chunk);
            callback();
          },
        })
      );

      expect(output).toHaveLength(3);
    });
  });

  describe('createMemoryEfficientStream', () => {
    it('should process large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 10_000 }, (_, i) => ({
        id: i,
        name: `User${i}`,
        email: `user${i}@example.com`,
        age: 20 + (i % 50),
      }));

      const memoryStream = createMemoryEfficientStream(UserSchema, {
        batchSize: 100,
      });

      const input = Readable.from(largeDataset);
      let count = 0;

      await pipelineAsync(
        input,
        memoryStream,
        new Writable({
          objectMode: true,
          write(chunk, encoding, callback) {
            count++;
            callback();
          },
        })
      );

      expect(count).toBe(10_000);
    });
  });

  describe('Incremental Compiler', () => {
    it('should cache validation results', () => {
      const compiler = createIncrementalCompiler(UserSchema);

      const data = sampleUsers[0];
      const result1 = compiler.validate(data);
      const result2 = compiler.validate(data);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const stats = compiler.getStats();
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheMisses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should respect cache size limit', () => {
      const compiler = createIncrementalCompiler(UserSchema, { cacheSize: 2 });

      compiler.validate({ id: 1, name: 'A', email: 'a@ex.com', age: 20 });
      compiler.validate({ id: 2, name: 'B', email: 'b@ex.com', age: 21 });
      compiler.validate({ id: 3, name: 'C', email: 'c@ex.com', age: 22 });

      const stats = compiler.getStats();
      expect(stats.cacheSize).toBeLessThanOrEqual(2);
    });
  });

  describe('Aggregator Stream', () => {
    it('should aggregate validation results', async () => {
      const aggregatorStream = createAggregatorStream(UserSchema, {
        trackFieldStats: true,
      });

      const input = Readable.from(sampleUsers);
      const output = [];

      await pipelineAsync(
        input,
        aggregatorStream,
        new Writable({
          objectMode: true,
          write(chunk, encoding, callback) {
            output.push(chunk);
            callback();
          },
        })
      );

      const aggregation = aggregatorStream.getAggregation();
      expect(aggregation.totalValidated).toBe(3);
      expect(aggregation.passed).toBe(3);
      expect(aggregation.failed).toBe(0);
      expect(aggregation.fieldStats).toHaveProperty('id');
      expect(aggregation.fieldStats).toHaveProperty('name');
    });
  });

  describe('Partial Validator Stream', () => {
    it('should validate only specified fields', async () => {
      const partialStream = createPartialValidatorStream(UserSchema, ['id', 'name']);

      const data = [
        { id: 1, name: 'Alice', extra: 'field' },
        { id: 2, name: 'Bob', extra: 'field' },
      ];

      const input = Readable.from(data);
      const output = [];

      await pipelineAsync(
        input,
        partialStream,
        new Writable({
          objectMode: true,
          write(chunk, encoding, callback) {
            output.push(chunk);
            callback();
          },
        })
      );

      expect(output).toHaveLength(2);
      expect(output[0]).toHaveProperty('extra'); // Non-strict mode keeps extra fields
    });
  });

  describe('Schema Evolution Stream', () => {
    it('should handle multiple schema versions', async () => {
      const v1Schema = z.object({
        id: z.number(),
        name: z.string(),
      });

      const v2Schema = z.object({
        id: z.number(),
        name: z.string(),
        email: z.string().email(),
      });

      const evolutionStream = createSchemaEvolutionStream({
        v1: v1Schema,
        v2: v2Schema,
      });

      const data = [
        { _version: 'v1', id: 1, name: 'Alice' },
        { _version: 'v2', id: 2, name: 'Bob', email: 'bob@example.com' },
      ];

      const input = Readable.from(data);
      const output = [];

      await pipelineAsync(
        input,
        evolutionStream,
        new Writable({
          objectMode: true,
          write(chunk, encoding, callback) {
            output.push(chunk);
            callback();
          },
        })
      );

      expect(output).toHaveLength(2);
      expect(output[0]._version).toBe('v1');
      expect(output[1]._version).toBe('v2');
    });
  });

  describe('Deduplication Stream', () => {
    it('should remove duplicate records', async () => {
      const dedupeStream = createDeduplicationStream(UserSchema, {
        keyFields: ['id'],
      });

      const data = [
        { id: 1, name: 'Alice', email: 'alice@example.com', age: 30 },
        { id: 1, name: 'Alice Updated', email: 'alice2@example.com', age: 31 },
        { id: 2, name: 'Bob', email: 'bob@example.com', age: 25 },
      ];

      const input = Readable.from(data);
      const output = [];

      await pipelineAsync(
        input,
        dedupeStream,
        new Writable({
          objectMode: true,
          write(chunk, encoding, callback) {
            output.push(chunk);
            callback();
          },
        })
      );

      expect(output).toHaveLength(2);
      expect(output[0].id).toBe(1);
      expect(output[1].id).toBe(2);
    });
  });

  describe('Repair Stream', () => {
    it('should repair common validation issues', async () => {
      const repairs = {
        email: (value) => value.toLowerCase().trim(),
        age: (value) => Math.max(0, Math.min(150, value)),
      };

      const repairStream = createRepairStream(UserSchema, {
        repairs,
      });

      const data = [
        { id: 1, name: 'Alice', email: '  ALICE@EXAMPLE.COM  ', age: 30 },
        { id: 2, name: 'Bob', email: 'BOB@EXAMPLE.COM', age: 200 }, // Age out of range
      ];

      const input = Readable.from(data);
      const output = [];

      await pipelineAsync(
        input,
        repairStream,
        new Writable({
          objectMode: true,
          write(chunk, encoding, callback) {
            output.push(chunk);
            callback();
          },
        })
      );

      expect(output).toHaveLength(2);
      expect(output[0].email).toBe('alice@example.com');
      expect(output[0]._repaired).toBe(true);
      expect(output[1].age).toBe(150);
      expect(output[1]._repaired).toBe(true);
    });
  });

  describe('Batched Validator Stream', () => {
    it('should validate records in batches', async () => {
      const batchedStream = createBatchedValidatorStream(UserSchema, {
        batchSize: 2,
      });

      const input = Readable.from(sampleUsers);
      const output = [];

      await pipelineAsync(
        input,
        batchedStream,
        new Writable({
          objectMode: true,
          write(chunk, encoding, callback) {
            output.push(chunk);
            callback();
          },
        })
      );

      expect(output).toHaveLength(3);
    });
  });

  describe('Sampling Validator Stream', () => {
    it('should validate a sample of records', async () => {
      const samplingStream = createSamplingValidatorStream(UserSchema, {
        sampleRate: 0.5,
      });

      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `User${i}`,
        email: `user${i}@example.com`,
        age: 20 + i,
      }));

      const input = Readable.from(largeDataset);
      const output = [];

      await pipelineAsync(
        input,
        samplingStream,
        new Writable({
          objectMode: true,
          write(chunk, encoding, callback) {
            output.push(chunk);
            callback();
          },
        })
      );

      expect(output).toHaveLength(100); // All records pass through
      const stats = samplingStream.getSamplingStats();
      expect(stats.recordCount).toBe(100);
      expect(stats.sampleCount).toBeGreaterThan(0);
    });
  });

  describe('Integration Tests', () => {
    it('should handle end-to-end streaming validation', async () => {
      const ndjsonData = sampleUsers.map(u => JSON.stringify(u)).join('\n');

      const parseStream = createParseStream('ndjson');
      const validationStream = createValidationStream(UserSchema, {
        includeProvenance: false, // Format stream unwraps, so test without provenance
      });
      const formatStream = createFormatStream('json');

      const input = Readable.from([ndjsonData]);
      let output = '';

      await pipelineAsync(
        input,
        parseStream,
        validationStream,
        formatStream,
        new Writable({
          write(chunk, encoding, callback) {
            output += chunk.toString();
            callback();
          },
        })
      );

      const result = JSON.parse(output);
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
    });

    it('should handle large file streaming with statistics', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `User${i}`,
        email: `user${i}@example.com`,
        age: 20 + (i % 50),
      }));

      let statsReceived = false;
      const validationStream = createValidationStream(UserSchema, {
        onStats: (stats) => {
          statsReceived = true;
          expect(stats.totalRecords).toBeGreaterThan(0);
        },
      });

      const input = Readable.from(largeDataset);
      let count = 0;

      await pipelineAsync(
        input,
        validationStream,
        new Writable({
          objectMode: true,
          write(chunk, encoding, callback) {
            count++;
            callback();
          },
        })
      );

      expect(count).toBe(1000);
      expect(statsReceived).toBe(true);
    });
  });
});
