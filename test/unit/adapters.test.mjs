/**
 * Unit tests for adapter functionality
 * Tests individual adapters in isolation
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { csvAdapter, ndjsonAdapter } from '../../src/adapters/data.mjs';

describe('Data Adapters', () => {
  const csvSchema = z.array(
    z.object({
      name: z.string(),
      age: z.coerce.number(),
      active: z.coerce.boolean(),
    })
  );

  describe('CSV Adapter', () => {
    it('should parse CSV data', async () => {
      const input = 'name,age,active\nAlice,25,true\nBob,30,false';
      const result = await csvAdapter.parse(input);

      expect(result.data).toEqual([
        { name: 'Alice', age: 25, active: true },
        { name: 'Bob', age: 30, active: false },
      ]);
      expect(result.metadata).toHaveProperty('format', 'csv');
      expect(result.metadata).toHaveProperty('recordCount', 2);
    });

    it('should format data to CSV', async () => {
      const data = [
        { name: 'Alice', age: 25, active: true },
        { name: 'Bob', age: 30, active: false },
      ];
      const result = await csvAdapter.format(data);

      expect(result.data).toContain('name,age,active');
      expect(result.data).toContain('Alice,25,1');
      expect(result.data).toContain('Bob,30,');
    });

    it('should handle empty CSV', async () => {
      const input = 'name,age,active\n';
      const result = await csvAdapter.parse(input);

      expect(result.data).toEqual([]);
      expect(result.metadata).toHaveProperty('recordCount', 0);
    });

    it('should handle CSV with headers only', async () => {
      const input = 'name,age,active';
      const result = await csvAdapter.parse(input);

      expect(result.data).toEqual([]);
      expect(result.metadata).toHaveProperty('recordCount', 0);
    });
  });

  describe('NDJSON Adapter', () => {
    it('should parse NDJSON data', async () => {
      const input =
        '{"name": "Alice", "age": 25, "active": true}\n{"name": "Bob", "age": 30, "active": false}';
      const result = await ndjsonAdapter.parse(input);

      expect(result.data).toEqual([
        { name: 'Alice', age: 25, active: true },
        { name: 'Bob', age: 30, active: false },
      ]);
      expect(result.metadata).toHaveProperty('format', 'ndjson');
      expect(result.metadata).toHaveProperty('recordCount', 2);
    });

    it('should format data to NDJSON', async () => {
      const data = [
        { name: 'Alice', age: 25, active: true },
        { name: 'Bob', age: 30, active: false },
      ];
      const result = await ndjsonAdapter.format(data);

      expect(result.data).toContain('{"name":"Alice","age":25,"active":true}');
      expect(result.data).toContain('{"name":"Bob","age":30,"active":false}');
    });

    it('should handle empty NDJSON', async () => {
      const input = '';
      const result = await ndjsonAdapter.parse(input);

      expect(result.data).toEqual([]);
      expect(result.metadata).toHaveProperty('recordCount', 0);
    });

    it('should handle single line NDJSON', async () => {
      const input = '{"name": "Alice", "age": 25, "active": true}';
      const result = await ndjsonAdapter.parse(input);

      expect(result.data).toEqual([{ name: 'Alice', age: 25, active: true }]);
      expect(result.metadata).toHaveProperty('recordCount', 1);
    });
  });
});
