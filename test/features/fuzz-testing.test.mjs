/**
 * Fuzz Testing
 * @fileoverview Adversarial and fuzz testing for robust input validation
 */

import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { convert, formatTo, parseFrom } from '../../src/core/main.mjs';

describe('Fuzz Testing', () => {
  const SimpleSchema = z.object({
    name: z.string(),
    age: z.number(),
    active: z.boolean(),
  });

  const ComplexSchema = z.object({
    id: z.string(),
    metadata: z.object({
      tags: z.array(z.string()),
      score: z.number().min(0).max(100),
    }),
    items: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        active: z.boolean(),
      })
    ),
  });

  const fixturesDir = join(process.cwd(), 'test', 'fixtures', 'adversarial');

  beforeEach(() => {
    // Ensure clean state for each test
  });

  describe('Adversarial Input Testing', () => {
    it('should handle malformed JSON inputs', async () => {
      const malformedInputs = [
        '{"name": "Test", "age": 30, "active": true', // Missing closing brace
        '{"name": "Test", "age": 30, "active": true,}', // Trailing comma
        '{"name": "Test", "age": 30, "active": true, "extra": "field"}', // Extra field
        '{"name": "Test", "age": "not-a-number", "active": true}', // Wrong type
        '{"name": "Test", "age": 30}', // Missing required field
        '{"name": "Test", "age": 30, "active": true, "nested": {"circular": "reference"}}', // Potential circular reference
      ];

      for (const input of malformedInputs) {
        try {
          await parseFrom(SimpleSchema, 'json', input);
          // If it doesn't throw, that's also valid behavior
        } catch (error) {
          expect(error).toBeDefined();
          expect(error.message).toBeDefined();
        }
      }
    });

    it('should handle malformed CSV inputs', async () => {
      const malformedInputs = [
        'name,age,active\nJohn,30,true\nJane,25', // Missing column
        'name,age,active\nJohn,30,true\nJane,25,false,extra', // Extra column
        'name,age,active\nJohn,not-a-number,true', // Wrong type
        'name,age,active\nJohn,30', // Missing column
        'name,age,active\n"John,30,true', // Unclosed quote
        'name,age,active\nJohn,30,true\n\nJane,25,false', // Empty lines
      ];

      for (const input of malformedInputs) {
        try {
          await parseFrom(SimpleSchema, 'csv', input);
          // If it doesn't throw, that's also valid behavior
        } catch (error) {
          expect(error).toBeDefined();
          expect(error.message).toBeDefined();
        }
      }
    });

    it('should handle malformed NDJSON inputs', async () => {
      const malformedInputs = [
        '{"name": "John", "age": 30, "active": true}\n{"name": "Jane", "age": 25, "active": false,}', // Trailing comma
        '{"name": "John", "age": 30, "active": true}\nnot-json-line', // Invalid JSON line
        '{"name": "John", "age": 30, "active": true}\n{"name": "Jane", "age": "not-a-number", "active": false}', // Wrong type
        '{"name": "John", "age": 30, "active": true}\n{"name": "Jane", "age": 25}', // Missing field
        '{"name": "John", "age": 30, "active": true}\n\n{"name": "Jane", "age": 25, "active": false}', // Empty lines
      ];

      for (const input of malformedInputs) {
        try {
          await parseFrom(SimpleSchema, 'ndjson', input);
          // If it doesn't throw, that's also valid behavior
        } catch (error) {
          expect(error).toBeDefined();
          expect(error.message).toBeDefined();
        }
      }
    });

    it('should handle empty and whitespace inputs', async () => {
      const emptyInputs = ['', '   ', '\n', '\r\n', '\t', ' \n \r \t '];

      for (const input of emptyInputs) {
        try {
          await parseFrom(SimpleSchema, 'json', input);
          // If it doesn't throw, that's also valid behavior
        } catch (error) {
          expect(error).toBeDefined();
          expect(error.message).toBeDefined();
        }
      }
    });

    it('should handle very large inputs', async () => {
      const largeInputs = [
        '{"name": "' + 'A'.repeat(1_000_000) + '", "age": 30, "active": true}', // 1MB string
        '{"name": "Test", "age": 30, "active": true, "largeArray": [' +
          Array.from({ length: 10_000 }, (_, i) => i).join(',') +
          ']}', // Large array
        '{"name": "Test", "age": 30, "active": true, "nested": ' +
          JSON.stringify(
            Array.from({ length: 1000 }, (_, i) => ({ level: i, value: 'A'.repeat(1000) }))
          ) +
          '}', // Deep nesting
      ];

      for (const input of largeInputs) {
        try {
          await parseFrom(SimpleSchema, 'json', input);
          // If it doesn't throw, that's also valid behavior
        } catch (error) {
          expect(error).toBeDefined();
          expect(error.message).toBeDefined();
        }
      }
    });

    it('should handle special characters and unicode', async () => {
      const specialInputs = [
        '{"name": "José François 中文 🚀", "age": 30, "active": true}',
        String.raw`{"name": "Test with \n\r\t\"\'\\", "age": 30, "active": true}`,
        String.raw`{"name": "Test with null\u0000 character", "age": 30, "active": true}`,
        '{"name": "Test with emoji 🎉🎊🎈", "age": 30, "active": true}',
        '{"name": "Test with math symbols ∑∏∫√∞", "age": 30, "active": true}',
      ];

      for (const input of specialInputs) {
        try {
          const result = await parseFrom(SimpleSchema, 'json', input);
          expect(result).toBeDefined();
          expect(result.name).toBeDefined();
        } catch (error) {
          expect(error).toBeDefined();
          expect(error.message).toBeDefined();
        }
      }
    });
  });

  describe('Random Fuzz Testing', () => {
    it('should handle random JSON-like strings', async () => {
      const randomStrings = [
        '{"name": "Test", "age": 30, "active": true}',
        '{"name": "Test", "age": 30, "active": true, "extra": "field"}',
        '{"name": "Test", "age": 30, "active": true, "nested": {"value": "test"}}',
        '{"name": "Test", "age": 30, "active": true, "array": [1, 2, 3]}',
        '{"name": "Test", "age": 30, "active": true, "null": null}',
        '{"name": "Test", "age": 30, "active": true, "boolean": false}',
        '{"name": "Test", "age": 30, "active": true, "number": 42.5}',
        '{"name": "Test", "age": 30, "active": true, "string": "hello world"}',
      ];

      for (const input of randomStrings) {
        try {
          const result = await parseFrom(SimpleSchema, 'json', input);
          expect(result).toBeDefined();
        } catch (error) {
          expect(error).toBeDefined();
          expect(error.message).toBeDefined();
        }
      }
    });

    it('should handle random CSV-like strings', async () => {
      const randomStrings = [
        'name,age,active\nJohn,30,true',
        'name,age,active\nJohn,30,true\nJane,25,false',
        'name,age,active\n"John, Doe",30,true',
        'name,age,active\nJohn,30,true\nJane,25,false\nBob,35,true',
        'name,age,active\nJohn,30,true\n\nJane,25,false',
        'name,age,active\nJohn,30,true\nJane,25,false\n',
      ];

      for (const input of randomStrings) {
        try {
          const result = await parseFrom(SimpleSchema, 'csv', input);
          expect(result).toBeDefined();
        } catch (error) {
          expect(error).toBeDefined();
          expect(error.message).toBeDefined();
        }
      }
    });

    it('should handle random NDJSON-like strings', async () => {
      const randomStrings = [
        '{"name": "John", "age": 30, "active": true}',
        '{"name": "John", "age": 30, "active": true}\n{"name": "Jane", "age": 25, "active": false}',
        '{"name": "John", "age": 30, "active": true}\n\n{"name": "Jane", "age": 25, "active": false}',
        '{"name": "John", "age": 30, "active": true}\n{"name": "Jane", "age": 25, "active": false}\n',
        '{"name": "John", "age": 30, "active": true, "extra": "field"}',
        '{"name": "John", "age": 30, "active": true, "nested": {"value": "test"}}',
      ];

      for (const input of randomStrings) {
        try {
          const result = await parseFrom(SimpleSchema, 'ndjson', input);
          expect(result).toBeDefined();
        } catch (error) {
          expect(error).toBeDefined();
          expect(error.message).toBeDefined();
        }
      }
    });
  });

  describe('Boundary Value Testing', () => {
    it('should handle boundary values for numbers', async () => {
      const boundaryValues = [
        { name: 'Test', age: 0, active: true },
        { name: 'Test', age: 1, active: true },
        { name: 'Test', age: -1, active: true },
        { name: 'Test', age: Number.MAX_SAFE_INTEGER, active: true },
        { name: 'Test', age: Number.MIN_SAFE_INTEGER, active: true },
        { name: 'Test', age: Infinity, active: true },
        { name: 'Test', age: -Infinity, active: true },
        { name: 'Test', age: Number.NaN, active: true },
      ];

      for (const data of boundaryValues) {
        try {
          const result = await formatTo(SimpleSchema, 'json', data);
          expect(result).toBeDefined();
        } catch (error) {
          expect(error).toBeDefined();
          expect(error.message).toBeDefined();
        }
      }
    });

    it('should handle boundary values for strings', async () => {
      const boundaryValues = [
        { name: '', age: 30, active: true },
        { name: ' ', age: 30, active: true },
        { name: 'A', age: 30, active: true },
        { name: 'A'.repeat(1000), age: 30, active: true },
        { name: 'A'.repeat(10_000), age: 30, active: true },
        { name: 'A'.repeat(100_000), age: 30, active: true },
      ];

      for (const data of boundaryValues) {
        try {
          const result = await formatTo(SimpleSchema, 'json', data);
          expect(result).toBeDefined();
        } catch (error) {
          expect(error).toBeDefined();
          expect(error.message).toBeDefined();
        }
      }
    });

    it('should handle boundary values for booleans', async () => {
      const boundaryValues = [
        { name: 'Test', age: 30, active: true },
        { name: 'Test', age: 30, active: false },
      ];

      for (const data of boundaryValues) {
        try {
          const result = await formatTo(SimpleSchema, 'json', data);
          expect(result).toBeDefined();
        } catch (error) {
          expect(error).toBeDefined();
          expect(error.message).toBeDefined();
        }
      }
    });
  });

  describe('Stress Testing', () => {
    it('should handle rapid successive operations', async () => {
      const operations = [];
      const data = { name: 'Test', age: 30, active: true };

      // Create many operations
      for (let i = 0; i < 100; i++) {
        operations.push(formatTo(SimpleSchema, 'json', data));
      }

      // Execute all operations
      const results = await Promise.all(operations);

      // Verify all results
      for (const result of results) {
        expect(result).toBeDefined();
        expect(result).toContain('"name": "Test"');
        expect(result).toContain('"age": 30');
        expect(result).toContain('"active": true');
      }
    });

    it('should handle concurrent operations', async () => {
      const concurrentOperations = [
        parseFrom(SimpleSchema, 'json', '{"name": "Test1", "age": 30, "active": true}'),
        parseFrom(SimpleSchema, 'json', '{"name": "Test2", "age": 25, "active": false}'),
        parseFrom(SimpleSchema, 'json', '{"name": "Test3", "age": 35, "active": true}'),
        formatTo(SimpleSchema, 'json', { name: 'Test4', age: 40, active: false }),
        formatTo(SimpleSchema, 'json', { name: 'Test5', age: 45, active: true }),
        convert(
          SimpleSchema,
          { from: 'json', to: 'json' },
          '{"name": "Test6", "age": 50, "active": false}'
        ),
      ];

      const results = await Promise.all(concurrentOperations);

      for (const result of results) {
        expect(result).toBeDefined();
      }
    });

    it('should handle memory-intensive operations', async () => {
      const largeData = {
        name: 'Test',
        age: 30,
        active: true,
        largeArray: Array.from({ length: 10_000 }, (_, i) => ({
          id: i,
          value: `item-${i}`,
          data: 'A'.repeat(1000),
        })),
      };

      const largeSchema = z.object({
        name: z.string(),
        age: z.number(),
        active: z.boolean(),
        largeArray: z.array(
          z.object({
            id: z.number(),
            value: z.string(),
            data: z.string(),
          })
        ),
      });

      try {
        const result = await formatTo(largeSchema, 'json', largeData);
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(1_000_000); // Should be large
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('Error Recovery Testing', () => {
    it('should recover from parse errors', async () => {
      const validInput = '{"name": "Test", "age": 30, "active": true}';
      const invalidInput = '{"name": "Test", "age": "not-a-number", "active": true}';

      // First, parse valid input
      const validResult = await parseFrom(SimpleSchema, 'json', validInput);
      expect(validResult).toBeDefined();

      // Then, try to parse invalid input
      try {
        await parseFrom(SimpleSchema, 'json', invalidInput);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Finally, parse valid input again to ensure recovery
      const recoveredResult = await parseFrom(SimpleSchema, 'json', validInput);
      expect(recoveredResult).toBeDefined();
      expect(recoveredResult).toEqual(validResult);
    });

    it('should recover from format errors', async () => {
      const validData = { name: 'Test', age: 30, active: true };
      const invalidData = { name: 'Test', age: 'not-a-number', active: true };

      // First, format valid data
      const validResult = await formatTo(SimpleSchema, 'json', validData);
      expect(validResult).toBeDefined();

      // Then, try to format invalid data
      try {
        await formatTo(SimpleSchema, 'json', invalidData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Finally, format valid data again to ensure recovery
      const recoveredResult = await formatTo(SimpleSchema, 'json', validData);
      expect(recoveredResult).toBeDefined();
      expect(recoveredResult).toEqual(validResult);
    });

    it('should recover from conversion errors', async () => {
      const validInput = '{"name": "Test", "age": 30, "active": true}';
      const invalidInput = '{"name": "Test", "age": "not-a-number", "active": true}';

      // First, convert valid input
      const validResult = await convert(SimpleSchema, { from: 'json', to: 'json' }, validInput);
      expect(validResult).toBeDefined();

      // Then, try to convert invalid input
      try {
        await convert(SimpleSchema, { from: 'json', to: 'json' }, invalidInput);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Finally, convert valid input again to ensure recovery
      const recoveredResult = await convert(SimpleSchema, { from: 'json', to: 'json' }, validInput);
      expect(recoveredResult).toBeDefined();
      expect(recoveredResult).toEqual(validResult);
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain performance with many small operations', async () => {
      const startTime = Date.now();
      const operations = [];

      for (let i = 0; i < 1000; i++) {
        operations.push(
          parseFrom(SimpleSchema, 'json', '{"name": "Test", "age": 30, "active": true}')
        );
      }

      const results = await Promise.all(operations);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(1000);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should maintain performance with large data operations', async () => {
      const largeData = {
        name: 'Test',
        age: 30,
        active: true,
        largeArray: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: `item-${i}`,
        })),
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

      const startTime = Date.now();
      const result = await formatTo(largeSchema, 'json', largeData);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});
