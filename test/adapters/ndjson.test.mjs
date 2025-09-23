/**
 * NDJSON Adapter Tests
 * @fileoverview Comprehensive tests for Newline Delimited JSON parsing and formatting
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { convert, formatTo, parseFrom } from '../../src/core/main.mjs';

describe('NDJSON Adapter', () => {
  const SimpleNDJSONSchema = z.object({
    items: z.array(
      z.object({
        name: z.string(),
        age: z.number(),
        active: z.boolean(),
      })
    ),
  });

  const ComplexNDJSONSchema = z.object({
    items: z.array(
      z.object({
        id: z.string(),
        metadata: z.object({
          tags: z.array(z.string()),
          score: z.number(),
        }),
        nested: z.object({
          value: z.string(),
          optional: z.string().optional(),
        }),
      })
    ),
  });

  beforeEach(() => {
    // Ensure clean state for each test
  });

  describe('NDJSON Parsing', () => {
    it('should parse simple NDJSON input', async () => {
      const ndjsonInput = `{"name": "John", "age": 30, "active": true}
{"name": "Jane", "age": 25, "active": false}`;

      const result = await parseFrom(SimpleNDJSONSchema, 'ndjson', ndjsonInput);

      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({
        name: 'John',
        age: 30,
        active: true,
      });
      expect(result.items[1]).toEqual({
        name: 'Jane',
        age: 25,
        active: false,
      });
    });

    it('should handle single line NDJSON', async () => {
      const ndjsonInput = '{"name": "Single", "age": 42, "active": true}';

      const result = await parseFrom(SimpleNDJSONSchema, 'ndjson', ndjsonInput);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        name: 'Single',
        age: 42,
        active: true,
      });
    });

    it('should handle empty NDJSON input', async () => {
      const ndjsonInput = '';

      const result = await parseFrom(SimpleNDJSONSchema, 'ndjson', ndjsonInput);

      expect(result.items).toHaveLength(0);
    });

    it('should handle NDJSON with trailing newline', async () => {
      const ndjsonInput = `{"name": "John", "age": 30, "active": true}
{"name": "Jane", "age": 25, "active": false}
`;

      const result = await parseFrom(SimpleNDJSONSchema, 'ndjson', ndjsonInput);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].name).toBe('John');
      expect(result.items[1].name).toBe('Jane');
    });

    it('should handle NDJSON with empty lines', async () => {
      const ndjsonInput = `{"name": "John", "age": 30, "active": true}

{"name": "Jane", "age": 25, "active": false}`;

      const result = await parseFrom(SimpleNDJSONSchema, 'ndjson', ndjsonInput);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].name).toBe('John');
      expect(result.items[1].name).toBe('Jane');
    });

    it('should handle complex nested NDJSON', async () => {
      const ndjsonInput = `{"id": "1", "metadata": {"tags": ["important"], "score": 85}, "nested": {"value": "test1"}}
{"id": "2", "metadata": {"tags": ["urgent"], "score": 90}, "nested": {"value": "test2", "optional": "present"}}`;

      const result = await parseFrom(ComplexNDJSONSchema, 'ndjson', ndjsonInput);

      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({
        id: '1',
        metadata: {
          tags: ['important'],
          score: 85,
        },
        nested: {
          value: 'test1',
        },
      });
      expect(result.items[1]).toEqual({
        id: '2',
        metadata: {
          tags: ['urgent'],
          score: 90,
        },
        nested: {
          value: 'test2',
          optional: 'present',
        },
      });
    });

    it('should throw error for malformed JSON line', async () => {
      const malformedNDJSON = `{"name": "John", "age": 30, "active": true}
{"name": "Jane", "age": 25, "active": false,}`; // Trailing comma

      await expect(parseFrom(SimpleNDJSONSchema, 'ndjson', malformedNDJSON)).rejects.toThrow();
    });

    it('should throw error for invalid JSON line', async () => {
      const invalidNDJSON = `{"name": "John", "age": 30, "active": true}
not-json-line
{"name": "Jane", "age": 25, "active": false}`;

      await expect(parseFrom(SimpleNDJSONSchema, 'ndjson', invalidNDJSON)).rejects.toThrow();
    });
  });

  describe('NDJSON Formatting', () => {
    it('should format array data to NDJSON', async () => {
      const data = {
        items: [
          { name: 'John', age: 30, active: true },
          { name: 'Jane', age: 25, active: false },
        ],
      };

      const result = await formatTo(SimpleNDJSONSchema, 'ndjson', data);

      const lines = result.trim().split('\n');
      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0])).toEqual({ name: 'John', age: 30, active: true });
      expect(JSON.parse(lines[1])).toEqual({ name: 'Jane', age: 25, active: false });
    });

    it('should format single object to NDJSON', async () => {
      const data = {
        items: [{ name: 'Single', age: 42, active: true }],
      };

      const result = await formatTo(SimpleNDJSONSchema, 'ndjson', data);

      const lines = result.trim().split('\n');
      expect(lines).toHaveLength(1);
      expect(JSON.parse(lines[0])).toEqual({ name: 'Single', age: 42, active: true });
    });

    it('should handle empty array formatting', async () => {
      const data = { items: [] };

      const result = await formatTo(SimpleNDJSONSchema, 'ndjson', data);

      expect(result.trim()).toBe('');
    });

    it('should format complex nested data to NDJSON', async () => {
      const data = {
        items: [
          {
            id: '1',
            metadata: {
              tags: ['important'],
              score: 85,
            },
            nested: {
              value: 'test1',
            },
          },
          {
            id: '2',
            metadata: {
              tags: ['urgent'],
              score: 90,
            },
            nested: {
              value: 'test2',
              optional: 'present',
            },
          },
        ],
      };

      const result = await formatTo(ComplexNDJSONSchema, 'ndjson', data);

      const lines = result.trim().split('\n');
      expect(lines).toHaveLength(2);

      const parsed1 = JSON.parse(lines[0]);
      expect(parsed1.id).toBe('1');
      expect(parsed1.metadata.tags).toEqual(['important']);
      expect(parsed1.nested.value).toBe('test1');

      const parsed2 = JSON.parse(lines[1]);
      expect(parsed2.id).toBe('2');
      expect(parsed2.metadata.tags).toEqual(['urgent']);
      expect(parsed2.nested.optional).toBe('present');
    });

    it('should handle special characters in NDJSON formatting', async () => {
      const data = {
        items: [
          { name: 'John "The Great"', age: 30, active: true },
          { name: 'Jane\nSmith', age: 25, active: false },
        ],
      };

      const result = await formatTo(SimpleNDJSONSchema, 'ndjson', data);

      const lines = result.trim().split('\n');
      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0]).name).toBe('John "The Great"');
      expect(JSON.parse(lines[1]).name).toBe('Jane\nSmith');
    });
  });

  describe('NDJSON Round-Trip Testing', () => {
    it('should maintain data integrity through parse-format round-trip', async () => {
      const originalNDJSON = `{"name": "John", "age": 30, "active": true}
{"name": "Jane", "age": 25, "active": false}`;

      // Parse then format
      const parsed = await parseFrom(SimpleNDJSONSchema, 'ndjson', originalNDJSON);
      const formatted = await formatTo(SimpleNDJSONSchema, 'ndjson', parsed);

      // Parse the formatted result
      const roundTripParsed = await parseFrom(SimpleNDJSONSchema, 'ndjson', formatted);

      expect(roundTripParsed.items).toHaveLength(2);
      expect(roundTripParsed.items[0]).toEqual({
        name: 'John',
        age: 30,
        active: true,
      });
      expect(roundTripParsed.items[1]).toEqual({
        name: 'Jane',
        age: 25,
        active: false,
      });
    });

    it('should handle round-trip with complex nested data', async () => {
      const originalNDJSON = `{"id": "1", "metadata": {"tags": ["important"], "score": 85}, "nested": {"value": "test1"}}
{"id": "2", "metadata": {"tags": ["urgent"], "score": 90}, "nested": {"value": "test2", "optional": "present"}}`;

      // Parse then format
      const parsed = await parseFrom(ComplexNDJSONSchema, 'ndjson', originalNDJSON);
      const formatted = await formatTo(ComplexNDJSONSchema, 'ndjson', parsed);

      // Parse the formatted result
      const roundTripParsed = await parseFrom(ComplexNDJSONSchema, 'ndjson', formatted);

      expect(roundTripParsed.items).toHaveLength(2);
      expect(roundTripParsed.items[0].id).toBe('1');
      expect(roundTripParsed.items[1].nested.optional).toBe('present');
    });

    it('should handle round-trip with special characters', async () => {
      const originalNDJSON = `{"name": "John "The Great"", "age": 30, "active": true}
{"name": "Jane\nSmith", "age": 25, "active": false}`;

      // Parse then format
      const parsed = await parseFrom(SimpleNDJSONSchema, 'ndjson', originalNDJSON);
      const formatted = await formatTo(SimpleNDJSONSchema, 'ndjson', parsed);

      // Parse the formatted result
      const roundTripParsed = await parseFrom(SimpleNDJSONSchema, 'ndjson', formatted);

      expect(roundTripParsed.items).toHaveLength(2);
      expect(roundTripParsed.items[0].name).toBe('John "The Great"');
      expect(roundTripParsed.items[1].name).toBe('Jane\nSmith');
    });
  });

  describe('NDJSON Conversion', () => {
    it('should convert NDJSON to JSON', async () => {
      const ndjsonInput = `{"name": "John", "age": 30, "active": true}
{"name": "Jane", "age": 25, "active": false}`;

      const result = await convert(SimpleNDJSONSchema, { from: 'ndjson', to: 'json' }, ndjsonInput);

      const parsedResult = JSON.parse(result);
      expect(parsedResult.items).toHaveLength(2);
      expect(parsedResult.items[0]).toEqual({
        name: 'John',
        age: 30,
        active: true,
      });
    });

    it('should convert JSON to NDJSON', async () => {
      const jsonInput = JSON.stringify({
        items: [
          { name: 'John', age: 30, active: true },
          { name: 'Jane', age: 25, active: false },
        ],
      });

      const result = await convert(SimpleNDJSONSchema, { from: 'json', to: 'ndjson' }, jsonInput);

      const lines = result.trim().split('\n');
      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0])).toEqual({ name: 'John', age: 30, active: true });
      expect(JSON.parse(lines[1])).toEqual({ name: 'Jane', age: 25, active: false });
    });

    it('should convert NDJSON to CSV', async () => {
      const ndjsonInput = `{"name": "John", "age": 30, "active": true}
{"name": "Jane", "age": 25, "active": false}`;

      const result = await convert(SimpleNDJSONSchema, { from: 'ndjson', to: 'csv' }, ndjsonInput);

      expect(result).toContain('name,age,active');
      expect(result).toContain('John,30,true');
      expect(result).toContain('Jane,25,false');
    });

    it('should convert CSV to NDJSON', async () => {
      const csvInput = `name,age,active
John,30,true
Jane,25,false`;

      const result = await convert(SimpleNDJSONSchema, { from: 'csv', to: 'ndjson' }, csvInput);

      const lines = result.trim().split('\n');
      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0])).toEqual({ name: 'John', age: 30, active: true });
      expect(JSON.parse(lines[1])).toEqual({ name: 'Jane', age: 25, active: false });
    });
  });

  describe('NDJSON Error Handling', () => {
    it('should handle empty input gracefully', async () => {
      const result = await parseFrom(SimpleNDJSONSchema, 'ndjson', '');
      expect(result.items).toHaveLength(0);
    });

    it('should handle whitespace-only input', async () => {
      const result = await parseFrom(SimpleNDJSONSchema, 'ndjson', '   \n  \n  ');
      expect(result.items).toHaveLength(0);
    });

    it('should throw error for malformed JSON line', async () => {
      const malformedNDJSON = `{"name": "John", "age": 30, "active": true}
{"name": "Jane", "age": 25, "active": false,}`; // Trailing comma

      await expect(parseFrom(SimpleNDJSONSchema, 'ndjson', malformedNDJSON)).rejects.toThrow();
    });

    it('should throw error for invalid JSON line', async () => {
      const invalidNDJSON = `{"name": "John", "age": 30, "active": true}
not-json-line
{"name": "Jane", "age": 25, "active": false}`;

      await expect(parseFrom(SimpleNDJSONSchema, 'ndjson', invalidNDJSON)).rejects.toThrow();
    });

    it('should handle schema validation errors', async () => {
      const invalidNDJSON = `{"name": "John", "age": "not-a-number", "active": true}`;

      await expect(parseFrom(SimpleNDJSONSchema, 'ndjson', invalidNDJSON)).rejects.toThrow();
    });
  });

  describe('NDJSON Streaming Support', () => {
    it('should support streaming operations', async () => {
      const ndjsonInput = `{"name": "John", "age": 30, "active": true}
{"name": "Jane", "age": 25, "active": false}`;

      // Should work with streaming enabled
      await expect(
        parseFrom(SimpleNDJSONSchema, 'ndjson', ndjsonInput, { streaming: true })
      ).resolves.toBeDefined();
      await expect(
        formatTo(SimpleNDJSONSchema, 'ndjson', { items: [] }, { streaming: true })
      ).resolves.toBeDefined();
    });

    it('should handle large NDJSON files efficiently', async () => {
      // Generate large NDJSON
      const lines = Array.from({ length: 1000 }, (_, i) =>
        JSON.stringify({ name: `Person${i}`, age: 20 + i, active: i % 2 === 0 })
      ).join('\n');

      const startTime = Date.now();
      const result = await parseFrom(SimpleNDJSONSchema, 'ndjson', lines);
      const endTime = Date.now();

      expect(result.items).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle streaming with async iterables', async () => {
      // This test would be expanded when streaming async iterables are implemented
      const ndjsonInput = `{"name": "John", "age": 30, "active": true}
{"name": "Jane", "age": 25, "active": false}`;

      const result = await parseFrom(SimpleNDJSONSchema, 'ndjson', ndjsonInput, {
        streaming: true,
      });
      expect(result.items).toHaveLength(2);
    });
  });

  describe('NDJSON Metadata', () => {
    it('should include metadata in parse results', async () => {
      const ndjsonInput = `{"name": "John", "age": 30, "active": true}
{"name": "Jane", "age": 25, "active": false}`;

      const result = await parseFrom(SimpleNDJSONSchema, 'ndjson', ndjsonInput, {
        includeProvenance: true,
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('provenance');
      expect(result.provenance).toHaveProperty('adapter', 'ndjson');
      expect(result.provenance).toHaveProperty('sourceFormat', 'ndjson');
    });

    it('should include metadata in format results', async () => {
      const data = {
        items: [{ name: 'John', age: 30, active: true }],
      };

      const result = await formatTo(SimpleNDJSONSchema, 'ndjson', data, {
        includeProvenance: true,
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('provenance');
      expect(result.provenance).toHaveProperty('adapter', 'ndjson');
      expect(result.provenance).toHaveProperty('targetFormat', 'ndjson');
    });
  });

  describe('NDJSON Edge Cases', () => {
    it('should handle NDJSON with unicode characters', async () => {
      const ndjsonInput = `{"name": "José", "age": 30, "active": true}
{"name": "François", "age": 25, "active": false}`;

      const result = await parseFrom(SimpleNDJSONSchema, 'ndjson', ndjsonInput);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].name).toBe('José');
      expect(result.items[1].name).toBe('François');
    });

    it('should handle NDJSON with very long lines', async () => {
      const longName = 'A'.repeat(10_000);
      const ndjsonInput = `{"name": "${longName}", "age": 30, "active": true}`;

      const result = await parseFrom(SimpleNDJSONSchema, 'ndjson', ndjsonInput);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe(longName);
    });

    it('should handle NDJSON with deeply nested objects', async () => {
      const deepNested = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: 'deep',
                },
              },
            },
          },
        },
      };

      const ndjsonInput = JSON.stringify(deepNested);
      const schema = z.object({
        items: z.array(
          z.object({
            level1: z.object({
              level2: z.object({
                level3: z.object({
                  level4: z.object({
                    level5: z.object({
                      value: z.string(),
                    }),
                  }),
                }),
              }),
            }),
          })
        ),
      });

      const result = await parseFrom(schema, 'ndjson', ndjsonInput);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].level1.level2.level3.level4.level5.value).toBe('deep');
    });
  });
});
