/**
 * Core API Tests - Main ZTF functions
 * @fileoverview Comprehensive tests for parseFrom, formatTo, and convert functions
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { convert, formatTo, parseFrom } from '../../src/core/main.mjs';
import { registerAdapter } from '../../src/core/registry.mjs';

describe('Core API - Main Functions', () => {
  // Test schemas for different data types
  const SimpleSchema = z.object({
    name: z.string(),
    age: z.number(),
    active: z.boolean(),
  });

  const ComplexSchema = z.object({
    id: z.string().uuid(),
    metadata: z.object({
      tags: z.array(z.string()),
      score: z.number().min(0).max(100),
    }),
    nested: z.object({
      value: z.string(),
      optional: z.string().optional(),
    }),
  });

  const ArraySchema = z.object({
    items: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
      })
    ),
    count: z.number(),
  });

  beforeEach(() => {
    // Ensure clean state for each test
  });

  afterEach(() => {
    // Cleanup if needed
  });

  describe('parseFrom', () => {
    it('should parse valid JSON input', async () => {
      const input = '{"name": "John", "age": 30, "active": true}';
      const result = await parseFrom(SimpleSchema, 'json', input);

      expect(result).toEqual({
        name: 'John',
        age: 30,
        active: true,
      });
    });

    it('should throw error for unknown format', async () => {
      const input = '{"name": "Test"}';

      await expect(parseFrom(SimpleSchema, 'unknown-format', input)).rejects.toThrow(
        'No adapter found for format: unknown-format'
      );
    });

    it('should validate data against schema', async () => {
      const invalidInput = '{"name": "Test", "age": "not-a-number"}';

      await expect(parseFrom(SimpleSchema, 'json', invalidInput)).rejects.toThrow();
    });

    it('should include provenance metadata when requested', async () => {
      const input = '{"name": "John", "age": 30, "active": true}';
      const result = await parseFrom(SimpleSchema, 'json', input, { includeProvenance: true });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('provenance');
      expect(result.provenance).toHaveProperty('timestamp');
      expect(result.provenance).toHaveProperty('sourceFormat', 'json');
      expect(result.provenance).toHaveProperty('adapter', 'json');
      expect(result.provenance).toHaveProperty('version');
      expect(result.provenance).toHaveProperty('schemaHash');
    });

    it('should handle streaming requests correctly', async () => {
      const input = '{"name": "Test", "age": 25, "active": true}';

      // Should work for non-streaming adapters
      await expect(
        parseFrom(SimpleSchema, 'json', input, { streaming: false })
      ).resolves.toBeDefined();

      // Should throw for streaming requests on non-streaming adapters
      await expect(parseFrom(SimpleSchema, 'json', input, { streaming: true })).rejects.toThrow(
        "Adapter 'json' does not support streaming"
      );
    });

    it('should pass adapter options correctly', async () => {
      // Register a test adapter that tracks options
      let receivedOptions = undefined;
      registerAdapter('test-options', {
        async parse(input, opts = {}) {
          receivedOptions = opts;
          return { data: JSON.parse(input), metadata: {} };
        },
        async format(data, opts = {}) {
          return { data: JSON.stringify(data), metadata: {} };
        },
        supportsStreaming: false,
        isAI: false,
      });

      const input = '{"name": "Test"}';
      const customOptions = { custom: 'value', nested: { option: true } };

      await parseFrom(SimpleSchema, 'test-options', input, { adapter: customOptions });

      expect(receivedOptions).toEqual(customOptions);
    });

    it('should handle complex nested data structures', async () => {
      const complexData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        metadata: {
          tags: ['important', 'test'],
          score: 85,
        },
        nested: {
          value: 'test-value',
          optional: 'optional-value',
        },
      };

      const input = JSON.stringify(complexData);
      const result = await parseFrom(ComplexSchema, 'json', input);

      expect(result).toEqual(complexData);
    });

    it('should handle array data structures', async () => {
      const arrayData = {
        items: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ],
        count: 2,
      };

      const input = JSON.stringify(arrayData);
      const result = await parseFrom(ArraySchema, 'json', input);

      expect(result).toEqual(arrayData);
    });
  });

  describe('formatTo', () => {
    it('should format data to JSON', async () => {
      const data = { name: 'Jane', age: 25, active: false };
      const result = await formatTo(SimpleSchema, 'json', data);

      expect(result).toContain('"name": "Jane"');
      expect(result).toContain('"age": 25');
      expect(result).toContain('"active": false');
    });

    it('should throw error for unknown format', async () => {
      const data = { name: 'Test' };

      await expect(formatTo(SimpleSchema, 'unknown-format', data)).rejects.toThrow(
        'No adapter found for format: unknown-format'
      );
    });

    it('should validate data against schema before formatting', async () => {
      const invalidData = { name: 'Test', age: 'not-a-number' };

      await expect(formatTo(SimpleSchema, 'json', invalidData)).rejects.toThrow();
    });

    it('should provide deterministic output when requested', async () => {
      const data = { name: 'Test', age: 25, active: true };
      const result1 = await formatTo(SimpleSchema, 'json', data, { deterministic: true });
      const result2 = await formatTo(SimpleSchema, 'json', data, { deterministic: true });

      expect(result1).toBe(result2);
      expect(result1).toContain('"name": "Test"');
      expect(result1).toContain('"age": 25');
      expect(result1).toContain('"active": true');
    });

    it('should include provenance metadata when requested', async () => {
      const data = { name: 'John', age: 30, active: true };
      const result = await formatTo(SimpleSchema, 'json', data, { includeProvenance: true });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('provenance');
      expect(result.provenance).toHaveProperty('timestamp');
      expect(result.provenance).toHaveProperty('targetFormat', 'json');
      expect(result.provenance).toHaveProperty('adapter', 'json');
      expect(result.provenance).toHaveProperty('version');
      expect(result.provenance).toHaveProperty('schemaHash');
    });

    it('should handle streaming requests correctly', async () => {
      const data = { name: 'Test', age: 25, active: true };

      // Should work for non-streaming adapters
      await expect(
        formatTo(SimpleSchema, 'json', data, { streaming: false })
      ).resolves.toBeDefined();

      // Should throw for streaming requests on non-streaming adapters
      await expect(formatTo(SimpleSchema, 'json', data, { streaming: true })).rejects.toThrow(
        "Adapter 'json' does not support streaming"
      );
    });

    it('should pass adapter options correctly', async () => {
      // Register a test adapter that tracks options
      let receivedOptions = undefined;
      registerAdapter('test-format-options', {
        async parse(input, opts = {}) {
          return { data: JSON.parse(input), metadata: {} };
        },
        async format(data, opts = {}) {
          receivedOptions = opts;
          return { data: JSON.stringify(data), metadata: {} };
        },
        supportsStreaming: false,
        isAI: false,
      });

      const data = { name: 'Test' };
      const customOptions = { indent: 4, sortKeys: true };

      await formatTo(SimpleSchema, 'test-format-options', data, { adapter: customOptions });

      expect(receivedOptions).toEqual(customOptions);
    });
  });

  describe('convert', () => {
    it('should convert between formats', async () => {
      const input = '{"name": "Bob", "age": 35, "active": true}';
      const result = await convert(SimpleSchema, { from: 'json', to: 'json' }, input);

      expect(result).toContain('"name": "Bob"');
      expect(result).toContain('"age": 35');
      expect(result).toContain('"active": true');
    });

    it('should handle provenance in conversion', async () => {
      const input = '{"name": "Test", "age": 25, "active": true}';
      const result = await convert(SimpleSchema, { from: 'json', to: 'json' }, input, {
        includeProvenance: true,
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('provenance');
      expect(result.provenance).toHaveProperty('sourceFormat', 'json');
      expect(result.provenance).toHaveProperty('targetFormat', 'json');
    });

    it('should throw error for unknown source format', async () => {
      const input = '{"name": "Test"}';

      await expect(convert(SimpleSchema, { from: 'unknown', to: 'json' }, input)).rejects.toThrow(
        'No adapter found for format: unknown'
      );
    });

    it('should throw error for unknown target format', async () => {
      const input = '{"name": "Test"}';

      await expect(convert(SimpleSchema, { from: 'json', to: 'unknown' }, input)).rejects.toThrow(
        'No adapter found for format: unknown'
      );
    });

    it('should validate data at both parse and format stages', async () => {
      const invalidInput = '{"name": "Test", "age": "not-a-number"}';

      await expect(
        convert(SimpleSchema, { from: 'json', to: 'json' }, invalidInput)
      ).rejects.toThrow();
    });

    it('should handle complex conversion workflows', async () => {
      const complexData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        metadata: {
          tags: ['conversion', 'test'],
          score: 90,
        },
        nested: {
          value: 'conversion-test',
        },
      };

      const input = JSON.stringify(complexData);
      const result = await convert(ComplexSchema, { from: 'json', to: 'json' }, input);

      const parsedResult = JSON.parse(result);
      expect(parsedResult).toEqual(complexData);
    });
  });

  describe('Round-Trip Invariant Testing', () => {
    it('should maintain data integrity through parse-format round-trip', async () => {
      const originalData = { name: 'RoundTrip', age: 42, active: true };
      const input = JSON.stringify(originalData);

      // Parse then format
      const parsed = await parseFrom(SimpleSchema, 'json', input);
      const formatted = await formatTo(SimpleSchema, 'json', parsed);
      const roundTripParsed = JSON.parse(formatted);

      expect(roundTripParsed).toEqual(originalData);
    });

    it('should maintain data integrity through convert round-trip', async () => {
      const originalData = { name: 'ConvertRoundTrip', age: 33, active: false };
      const input = JSON.stringify(originalData);

      // Convert json -> json
      const converted = await convert(SimpleSchema, { from: 'json', to: 'json' }, input);
      const roundTripConverted = await convert(
        SimpleSchema,
        { from: 'json', to: 'json' },
        converted
      );

      expect(JSON.parse(roundTripConverted)).toEqual(originalData);
    });

    it('should handle complex nested structures in round-trip', async () => {
      const originalData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        metadata: {
          tags: ['roundtrip', 'complex'],
          score: 75,
        },
        nested: {
          value: 'roundtrip-test',
          optional: 'present',
        },
      };

      const input = JSON.stringify(originalData);

      // Parse then format
      const parsed = await parseFrom(ComplexSchema, 'json', input);
      const formatted = await formatTo(ComplexSchema, 'json', parsed);
      const roundTripParsed = JSON.parse(formatted);

      expect(roundTripParsed).toEqual(originalData);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty input gracefully', async () => {
      await expect(parseFrom(SimpleSchema, 'json', '')).rejects.toThrow();
    });

    it('should handle null/undefined data gracefully', async () => {
      await expect(formatTo(SimpleSchema, 'json', undefined)).rejects.toThrow();
      await expect(formatTo(SimpleSchema, 'json', undefined)).rejects.toThrow();
    });

    it('should handle malformed JSON input', async () => {
      const malformedInput = '{"name": "Test", "age": 25, "active": true'; // Missing closing brace

      await expect(parseFrom(SimpleSchema, 'json', malformedInput)).rejects.toThrow();
    });

    it('should handle schema validation errors with detailed messages', async () => {
      const invalidData = { name: 'Test', age: -5, active: true }; // Negative age should fail if schema has min constraint

      const schemaWithConstraints = z.object({
        name: z.string(),
        age: z.number().min(0),
        active: z.boolean(),
      });

      await expect(formatTo(schemaWithConstraints, 'json', invalidData)).rejects.toThrow();
    });

    it('should handle very large data structures', async () => {
      const largeData = {
        name: 'LargeTest',
        age: 30,
        active: true,
        largeArray: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item-${i}` })),
      };

      const largeSchema = z.object({
        name: z.string(),
        age: z.number(),
        active: z.boolean(),
        largeArray: z.array(
          z.object({
            id: z.number(),
            value: z.string(),
          })
        ),
      });

      const input = JSON.stringify(largeData);
      const result = await parseFrom(largeSchema, 'json', input);

      expect(result.largeArray).toHaveLength(1000);
      expect(result.largeArray[0]).toEqual({ id: 0, value: 'item-0' });
    });
  });
});
