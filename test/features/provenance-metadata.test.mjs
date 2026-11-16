/**
 * Provenance and Metadata Tests
 * @fileoverview Tests for adapter metadata and provenance tracking
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { convert, formatTo, parseFrom } from '../../src/core/index.mjs';
import { csvAdapter, jsonAdapter, ndjsonAdapter } from '../../src/adapters/data.mjs';

describe('Provenance and Metadata', () => {
  const TestSchema = z.object({
    name: z.string(),
    value: z.number(),
  });

  describe('Provenance Tracking', () => {
    it('should include provenance on parseFrom', async () => {
      const input = JSON.stringify({ name: 'test', value: 42 });
      const result = await parseFrom(TestSchema, 'json', input, { includeProvenance: true });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('provenance');
      expect(result.provenance).toHaveProperty('timestamp');
      expect(result.provenance).toHaveProperty('sourceFormat', 'json');
      expect(result.provenance).toHaveProperty('adapter', 'json');
      expect(result.provenance).toHaveProperty('version');
      expect(result.provenance).toHaveProperty('schemaHash');
    });

    it('should include provenance on formatTo', async () => {
      const data = { name: 'test', value: 42 };
      const result = await formatTo(TestSchema, 'json', data, { includeProvenance: true });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('provenance');
      expect(result.provenance).toHaveProperty('timestamp');
      expect(result.provenance).toHaveProperty('targetFormat', 'json');
      expect(result.provenance).toHaveProperty('adapter', 'json');
      expect(result.provenance).toHaveProperty('version');
      expect(result.provenance).toHaveProperty('schemaHash');
    });

    it('should include combined provenance on convert', async () => {
      const input = JSON.stringify({ name: 'test', value: 42 });
      const result = await convert(TestSchema, { from: 'json', to: 'json' }, input, {
        includeProvenance: true,
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('provenance');
      expect(result.provenance).toHaveProperty('sourceFormat', 'json');
      expect(result.provenance).toHaveProperty('targetFormat', 'json');
      expect(result.provenance).toHaveProperty('timestamp');
      expect(result.provenance).toHaveProperty('schemaHash');
    });

    it('should have consistent timestamps in provenance', async () => {
      const input = JSON.stringify({ name: 'test', value: 42 });
      const result = await parseFrom(TestSchema, 'json', input, { includeProvenance: true });

      const timestamp = new Date(result.provenance.timestamp);
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
      expect(timestamp.getTime()).toBeGreaterThan(Date.now() - 5000); // Within last 5 seconds
    });

    it('should generate consistent schema hashes', async () => {
      const input = JSON.stringify({ name: 'test', value: 42 });

      const result1 = await parseFrom(TestSchema, 'json', input, { includeProvenance: true });
      const result2 = await parseFrom(TestSchema, 'json', input, { includeProvenance: true });

      expect(result1.provenance.schemaHash).toBe(result2.provenance.schemaHash);
    });

    it('should generate different hashes for different schemas', async () => {
      const Schema1 = z.object({ name: z.string() });
      const Schema2 = z.object({ value: z.number() });

      const input1 = JSON.stringify({ name: 'test' });
      const input2 = JSON.stringify({ value: 42 });

      const result1 = await parseFrom(Schema1, 'json', input1, { includeProvenance: true });
      const result2 = await parseFrom(Schema2, 'json', input2, { includeProvenance: true });

      expect(result1.provenance.schemaHash).not.toBe(result2.provenance.schemaHash);
    });
  });

  describe('Adapter Metadata', () => {
    it('should include metadata in JSON adapter output', async () => {
      const data = { name: 'test', value: 42 };
      const result = await jsonAdapter.format(data);

      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('format', 'json');
      expect(result.metadata).toHaveProperty('outputSize');
      expect(result.metadata.outputSize).toBeGreaterThan(0);
    });

    it('should include metadata in CSV adapter output', async () => {
      const data = { name: 'test', value: 42 };
      const result = await csvAdapter.format(data);

      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('format', 'csv');
      expect(result.metadata).toHaveProperty('outputSize');
      expect(result.metadata).toHaveProperty('recordCount', 1);
    });

    it('should include metadata in NDJSON adapter output', async () => {
      const data = [
        { name: 'test1', value: 1 },
        { name: 'test2', value: 2 },
      ];
      const result = await ndjsonAdapter.format(data);

      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('format', 'ndjson');
      expect(result.metadata).toHaveProperty('recordCount', 2);
      expect(result.metadata).toHaveProperty('outputSize');
    });

    it('should include parse metadata for CSV', async () => {
      const csv = 'name,value\ntest1,1\ntest2,2';
      const result = await csvAdapter.parse(csv);

      expect(result.metadata).toHaveProperty('recordCount', 2);
      expect(result.metadata).toHaveProperty('columnCount', 2);
      expect(result.metadata).toHaveProperty('format', 'csv');
    });

    it('should include parse metadata for NDJSON', async () => {
      const ndjson = '{"name":"test1","value":1}\n{"name":"test2","value":2}';
      const result = await ndjsonAdapter.parse(ndjson);

      expect(result.metadata).toHaveProperty('recordCount', 2);
      expect(result.metadata).toHaveProperty('format', 'ndjson');
    });
  });

  describe('Adapter Properties', () => {
    it('should have correct streaming support flags', () => {
      expect(jsonAdapter.supportsStreaming).toBe(false);
      expect(csvAdapter.supportsStreaming).toBe(true);
      expect(ndjsonAdapter.supportsStreaming).toBe(true);
    });

    it('should have correct AI flags', () => {
      expect(jsonAdapter.isAI).toBe(false);
      expect(csvAdapter.isAI).toBe(false);
      expect(ndjsonAdapter.isAI).toBe(false);
    });

    it('should have version information', () => {
      expect(jsonAdapter.version).toBe('1.0.0');
      expect(csvAdapter.version).toBe('1.0.0');
      expect(ndjsonAdapter.version).toBe('1.0.0');
    });
  });

  describe('Custom Adapter Options', () => {
    it('should pass custom options to adapter on parse', async () => {
      const csv = 'name;value\ntest;42';

      const result = await parseFrom(TestSchema, 'csv', csv, {
        adapter: { delimiter: ';' },
      });

      expect(result.name).toBe('test');
      expect(result.value).toBe(42);
    });

    it('should pass custom options to adapter on format', async () => {
      const data = { name: 'test', value: 42 };

      const result = await formatTo(TestSchema, 'json', data, {
        adapter: { deterministic: true },
      });

      expect(result).toContain('"name"');
      expect(result).toContain('"value"');
    });

    it('should preserve custom options in metadata', async () => {
      const data = { name: 'test', value: 42 };
      const customOpts = { custom: 'value', nested: { option: true } };

      const result = await csvAdapter.format(data, customOpts);

      expect(result.metadata).toHaveProperty('custom', 'value');
      expect(result.metadata).toHaveProperty('nested');
      expect(result.metadata.nested).toHaveProperty('option', true);
    });
  });

  describe('Deterministic Output', () => {
    it('should produce deterministic JSON with flag', async () => {
      const data = { name: 'test', value: 42, extra: 'data' };

      const result1 = await formatTo(TestSchema.extend({ extra: z.string() }), 'json', data, {
        deterministic: true,
      });
      const result2 = await formatTo(TestSchema.extend({ extra: z.string() }), 'json', data, {
        deterministic: true,
      });

      expect(result1).toBe(result2);
    });

    it('should have stable key ordering with deterministic flag', async () => {
      const data = { z: 'last', a: 'first', m: 'middle' };
      const Schema = z.object({ z: z.string(), a: z.string(), m: z.string() });

      const result = await formatTo(Schema, 'json', data, { deterministic: true });

      // Keys should be in a consistent order
      const parsed = JSON.parse(result);
      const keys = Object.keys(parsed);
      expect(keys).toEqual(['a', 'm', 'z']); // Alphabetical order
    });
  });

  describe('Error Metadata', () => {
    it('should provide helpful error context on validation failure', async () => {
      const InvalidSchema = z.object({
        name: z.string(),
        value: z.number().min(100),
      });

      const input = JSON.stringify({ name: 'test', value: 42 });

      try {
        await parseFrom(InvalidSchema, 'json', input);
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message || error.toString()).toContain('Number must be greater than');
      }
    });

    it('should provide helpful error context on format failure', async () => {
      const data = { name: 'test', value: 'not-a-number' };

      try {
        await formatTo(TestSchema, 'json', data);
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
