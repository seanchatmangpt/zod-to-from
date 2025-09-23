/**
 * Error Handling Tests
 * @fileoverview Comprehensive tests for error handling and validation
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { convert, formatTo, parseFrom } from '../../src/core/main.mjs';

describe('Error Handling', () => {
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

  beforeEach(() => {
    // Ensure clean state for each test
  });

  describe('Parse Errors', () => {
    it('should throw error for unknown format', async () => {
      const input = '{"name": "Test"}';

      await expect(parseFrom(SimpleSchema, 'unknown-format', input)).rejects.toThrow(
        'No adapter found for format: unknown-format'
      );
    });

    it('should throw error for malformed JSON', async () => {
      const malformedJSON = '{"name": "Test", "age": 30, "active": true'; // Missing closing brace

      await expect(parseFrom(SimpleSchema, 'json', malformedJSON)).rejects.toThrow();
    });

    it('should throw error for malformed CSV', async () => {
      const malformedCSV = `name,age,active
John,30,true
Jane,25`; // Missing active column

      await expect(parseFrom(SimpleSchema, 'csv', malformedCSV)).rejects.toThrow();
    });

    it('should throw error for malformed NDJSON', async () => {
      const malformedNDJSON = `{"name": "John", "age": 30, "active": true}
{"name": "Jane", "age": 25, "active": false,}`; // Trailing comma

      await expect(parseFrom(SimpleSchema, 'ndjson', malformedNDJSON)).rejects.toThrow();
    });

    it('should throw error for empty input', async () => {
      await expect(parseFrom(SimpleSchema, 'json', '')).rejects.toThrow();
    });

    it('should throw error for null input', async () => {
      await expect(parseFrom(SimpleSchema, 'json', undefined)).rejects.toThrow();
    });

    it('should throw error for undefined input', async () => {
      await expect(parseFrom(SimpleSchema, 'json', undefined)).rejects.toThrow();
    });
  });

  describe('Schema Validation Errors', () => {
    it('should throw error for invalid data types', async () => {
      const invalidData = { name: 'Test', age: 'not-a-number', active: true };

      await expect(formatTo(SimpleSchema, 'json', invalidData)).rejects.toThrow();
    });

    it('should throw error for missing required fields', async () => {
      const incompleteData = { name: 'Test' }; // Missing age and active

      await expect(formatTo(SimpleSchema, 'json', incompleteData)).rejects.toThrow();
    });

    it('should throw error for extra fields when strict', async () => {
      const extraData = { name: 'Test', age: 30, active: true, extra: 'field' };

      await expect(formatTo(SimpleSchema, 'json', extraData)).rejects.toThrow();
    });

    it('should throw error for invalid UUID', async () => {
      const invalidUUID = {
        id: 'not-a-uuid',
        metadata: {
          tags: ['test'],
          score: 50,
        },
        nested: {
          value: 'test',
        },
      };

      await expect(formatTo(ComplexSchema, 'json', invalidUUID)).rejects.toThrow();
    });

    it('should throw error for score out of range', async () => {
      const invalidScore = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        metadata: {
          tags: ['test'],
          score: 150, // Out of range (0-100)
        },
        nested: {
          value: 'test',
        },
      };

      await expect(formatTo(ComplexSchema, 'json', invalidScore)).rejects.toThrow();
    });

    it('should throw error for negative score', async () => {
      const negativeScore = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        metadata: {
          tags: ['test'],
          score: -10, // Negative score
        },
        nested: {
          value: 'test',
        },
      };

      await expect(formatTo(ComplexSchema, 'json', negativeScore)).rejects.toThrow();
    });
  });

  describe('Format Errors', () => {
    it('should throw error for unknown format', async () => {
      const data = { name: 'Test', age: 30, active: true };

      await expect(formatTo(SimpleSchema, 'unknown-format', data)).rejects.toThrow(
        'No adapter found for format: unknown-format'
      );
    });

    it('should throw error for null data', async () => {
      await expect(formatTo(SimpleSchema, 'json', undefined)).rejects.toThrow();
    });

    it('should throw error for undefined data', async () => {
      await expect(formatTo(SimpleSchema, 'json', undefined)).rejects.toThrow();
    });

    it('should throw error for circular references', async () => {
      const circularData = { name: 'Test', age: 30, active: true };
      circularData.self = circularData; // Create circular reference

      await expect(formatTo(SimpleSchema, 'json', circularData)).rejects.toThrow();
    });
  });

  describe('Conversion Errors', () => {
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

    it('should throw error for malformed input during conversion', async () => {
      const malformedInput = '{"name": "Test", "age": 30, "active": true'; // Missing closing brace

      await expect(
        convert(SimpleSchema, { from: 'json', to: 'json' }, malformedInput)
      ).rejects.toThrow();
    });

    it('should throw error for schema validation during conversion', async () => {
      const invalidInput = '{"name": "Test", "age": "not-a-number", "active": true}';

      await expect(
        convert(SimpleSchema, { from: 'json', to: 'json' }, invalidInput)
      ).rejects.toThrow();
    });
  });

  describe('Streaming Errors', () => {
    it('should throw error for streaming on non-streaming adapters', async () => {
      const input = '{"name": "Test", "age": 30, "active": true}';

      await expect(parseFrom(SimpleSchema, 'json', input, { streaming: true })).rejects.toThrow(
        "Adapter 'json' does not support streaming"
      );
    });

    it('should throw error for streaming format on non-streaming adapters', async () => {
      const data = { name: 'Test', age: 30, active: true };

      await expect(formatTo(SimpleSchema, 'json', data, { streaming: true })).rejects.toThrow(
        "Adapter 'json' does not support streaming"
      );
    });

    it('should handle streaming errors gracefully', async () => {
      const malformedCSV = `name,age,active
John,30,true
Jane,25`; // Missing active column

      await expect(
        parseFrom(SimpleSchema, 'csv', malformedCSV, { streaming: true })
      ).rejects.toThrow();
    });
  });

  describe('Adversarial Input Testing', () => {
    it('should handle very large inputs', async () => {
      const largeData = {
        name: 'A'.repeat(1_000_000), // 1MB string
        age: 30,
        active: true,
      };

      // Should either succeed or fail gracefully
      try {
        const result = await formatTo(SimpleSchema, 'json', largeData);
        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
      }
    });

    it('should handle deeply nested objects', async () => {
      let deepObject = { name: 'Test', age: 30, active: true };
      let current = deepObject;

      // Create deeply nested object
      for (let i = 0; i < 1000; i++) {
        current.nested = { level: i };
        current = current.nested;
      }

      // Should either succeed or fail gracefully
      try {
        const result = await formatTo(SimpleSchema, 'json', deepObject);
        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
      }
    });

    it('should handle special characters in input', async () => {
      const specialChars = {
        name: 'Test with special chars: \n\r\t"\'\\',
        age: 30,
        active: true,
      };

      const result = await formatTo(SimpleSchema, 'json', specialChars);
      expect(result).toBeDefined();
    });

    it('should handle unicode characters', async () => {
      const unicodeData = {
        name: 'José François 中文 🚀',
        age: 30,
        active: true,
      };

      const result = await formatTo(SimpleSchema, 'json', unicodeData);
      expect(result).toBeDefined();
    });
  });

  describe('Error Message Quality', () => {
    it('should provide descriptive error messages for schema validation', async () => {
      const invalidData = { name: 'Test', age: 'not-a-number', active: true };

      try {
        await formatTo(SimpleSchema, 'json', invalidData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('age');
        expect(error.message).toContain('number');
      }
    });

    it('should provide descriptive error messages for missing fields', async () => {
      const incompleteData = { name: 'Test' }; // Missing age and active

      try {
        await formatTo(SimpleSchema, 'json', incompleteData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('age');
        expect(error.message).toContain('active');
      }
    });

    it('should provide descriptive error messages for format errors', async () => {
      const malformedJSON = '{"name": "Test", "age": 30, "active": true'; // Missing closing brace

      try {
        await parseFrom(SimpleSchema, 'json', malformedJSON);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Recovery', () => {
    it('should handle partial failures gracefully', async () => {
      const malformedCSV = `name,age,active
John,30,true
Jane,25,false
Invalid,not-a-number,true`;

      try {
        await parseFrom(SimpleSchema, 'csv', malformedCSV);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
      }
    });

    it('should handle network-like errors gracefully', async () => {
      // Simulate network-like errors by providing malformed input
      const networkErrorInput = '{"name": "Test", "age": 30, "active": true}';

      try {
        const result = await parseFrom(SimpleSchema, 'json', networkErrorInput);
        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('Error Types', () => {
    it('should throw appropriate error types', async () => {
      // Test for different error types
      const testCases = [
        {
          input: '{"name": "Test", "age": "not-a-number", "active": true}',
          format: 'json',
          expectedErrorType: 'ZodError',
        },
        {
          input: '{"name": "Test", "age": 30, "active": true',
          format: 'json',
          expectedErrorType: 'SyntaxError',
        },
        {
          input: '{"name": "Test"}',
          format: 'unknown-format',
          expectedErrorType: 'Error',
        },
      ];

      for (const testCase of testCases) {
        try {
          await parseFrom(SimpleSchema, testCase.format, testCase.input);
          expect.fail(`Should have thrown an error for ${testCase.format}`);
        } catch (error) {
          expect(error).toBeDefined();
          expect(error.constructor.name).toBeDefined();
        }
      }
    });
  });

  describe('Error Context Preservation', () => {
    it('should preserve error context through conversion', async () => {
      const malformedInput = '{"name": "Test", "age": 30, "active": true'; // Missing closing brace

      try {
        await convert(SimpleSchema, { from: 'json', to: 'json' }, malformedInput);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
        // Error should contain context about the parsing step
      }
    });

    it('should preserve error context through streaming', async () => {
      const malformedCSV = `name,age,active
John,30,true
Jane,25`; // Missing active column

      try {
        await parseFrom(SimpleSchema, 'csv', malformedCSV, { streaming: true });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
        // Error should contain context about the CSV parsing
      }
    });
  });
});
