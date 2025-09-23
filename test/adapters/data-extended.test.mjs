/**
 * Unit tests for extended Data & Analytics adapters
 */

import { describe, expect, it } from 'vitest';
import { jsonAdapter } from '../../src/adapters/data.mjs';

describe('Extended Data & Analytics Adapters', () => {
  describe('JSON Adapter', () => {
    it('should parse JSON content', async () => {
      const input = JSON.stringify({
        name: 'John Doe',
        age: 30,
        active: true,
        tags: ['developer', 'javascript'],
        address: {
          street: '123 Main St',
          city: 'Anytown',
          country: 'USA',
        },
      });

      const result = await jsonAdapter.parse(input);

      expect(result.data.name).toBe('John Doe');
      expect(result.data.age).toBe(30);
      expect(result.data.active).toBe(true);
      expect(result.data.tags).toEqual(['developer', 'javascript']);
      expect(result.data.address.street).toBe('123 Main St');
      expect(result.metadata.format).toBe('json');
      expect(result.metadata.size).toBe(input.length);
    });

    it('should format data to JSON', async () => {
      const data = {
        name: 'John Doe',
        age: 30,
        active: true,
        tags: ['developer', 'javascript'],
        address: {
          street: '123 Main St',
          city: 'Anytown',
          country: 'USA',
        },
      };

      const result = await jsonAdapter.format(data);

      expect(result.data).toContain('"name": "John Doe"');
      expect(result.data).toContain('"age": 30');
      expect(result.data).toContain('"active": true');
      expect(result.data).toContain('"tags": [');
      expect(result.data).toContain('"address": {');
      expect(result.metadata.format).toBe('json');
      expect(result.metadata.outputSize).toBeGreaterThan(0);
    });

    it('should format data with deterministic option', async () => {
      const data = {
        c: 3,
        a: 1,
        b: 2,
        nested: {
          z: 26,
          x: 24,
          y: 25,
        },
      };

      const result = await jsonAdapter.format(data, { deterministic: true });

      // Check that keys are sorted
      expect(result.data).toContain('"a": 1');
      expect(result.data).toContain('"b": 2');
      expect(result.data).toContain('"c": 3');
      expect(result.metadata.deterministic).toBe(true);
    });

    it('should handle empty JSON object', async () => {
      const input = '{}';
      const result = await jsonAdapter.parse(input);

      expect(result.data).toEqual({});
      expect(result.metadata.format).toBe('json');
    });

    it('should handle JSON array', async () => {
      const input = '[1, 2, 3, "four", true]';
      const result = await jsonAdapter.parse(input);

      expect(result.data).toEqual([1, 2, 3, 'four', true]);
      expect(result.metadata.format).toBe('json');
    });

    it('should handle JSON with null values', async () => {
      const input = '{"name": "John", "age": null, "active": true}';
      const result = await jsonAdapter.parse(input);

      expect(result.data.name).toBe('John');
      expect(result.data.age).toBeNull();
      expect(result.data.active).toBe(true);
    });

    it('should handle JSON with nested arrays and objects', async () => {
      const input = JSON.stringify({
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
        metadata: {
          total: 2,
          page: 1,
        },
      });

      const result = await jsonAdapter.parse(input);

      expect(result.data.users).toHaveLength(2);
      expect(result.data.users[0].name).toBe('Alice');
      expect(result.data.users[1].name).toBe('Bob');
      expect(result.data.metadata.total).toBe(2);
    });

    it('should throw error for invalid JSON', async () => {
      const input = '{"name": "John", "age": 30,}'; // Trailing comma

      await expect(jsonAdapter.parse(input)).rejects.toThrow('Invalid JSON');
    });

    it('should throw error for malformed JSON', async () => {
      const input = '{"name": "John" "age": 30}'; // Missing comma

      await expect(jsonAdapter.parse(input)).rejects.toThrow('Invalid JSON');
    });

    it('should handle JSON with special characters', async () => {
      const input = JSON.stringify({
        message: 'Hello "world" with \n newlines and \t tabs',
        unicode: '🚀 emoji and ñ special chars',
      });

      const result = await jsonAdapter.parse(input);

      expect(result.data.message).toBe('Hello "world" with \n newlines and \t tabs');
      expect(result.data.unicode).toBe('🚀 emoji and ñ special chars');
    });

    it('should format with custom options', async () => {
      const data = { name: 'John', age: 30 };
      const result = await jsonAdapter.format(data, { custom: 'option' });

      expect(result.metadata.custom).toBe('option');
    });
  });
});
