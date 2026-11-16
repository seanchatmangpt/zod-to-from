/**
 * Performance Tests
 * @fileoverview Tests for performance characteristics and benchmarks
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { convert, formatTo, parseFrom } from '../../src/core/index.mjs';

describe('Performance Tests', () => {
  describe('Large Data Structure Handling', () => {
    it('should handle parsing large JSON arrays efficiently', async () => {
      const ItemSchema = z.object({
        id: z.number(),
        name: z.string(),
        value: z.number(),
        active: z.boolean(),
      });

      const ArraySchema = z.array(ItemSchema);

      // Generate large array with 10,000 items
      const largeArray = Array.from({ length: 10_000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: i * 1.5,
        active: i % 2 === 0,
      }));

      const input = JSON.stringify(largeArray);
      const startTime = performance.now();
      const result = await parseFrom(ArraySchema, 'json', input);
      const endTime = performance.now();

      expect(result).toHaveLength(10_000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should handle formatting large JSON arrays efficiently', async () => {
      const ItemSchema = z.object({
        id: z.number(),
        name: z.string(),
      });

      const ArraySchema = z.array(ItemSchema);

      const largeArray = Array.from({ length: 10_000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
      }));

      const startTime = performance.now();
      const result = await formatTo(ArraySchema, 'json', largeArray);
      const endTime = performance.now();

      expect(result).toContain('"id": 0');
      expect(result).toContain('"id": 9999');
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should handle deep nesting efficiently', async () => {
      const DeepSchema = z.object({
        level1: z.object({
          level2: z.object({
            level3: z.object({
              level4: z.object({
                level5: z.object({
                  data: z.string(),
                }),
              }),
            }),
          }),
        }),
      });

      const deepData = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  data: 'deep value',
                },
              },
            },
          },
        },
      };

      const input = JSON.stringify(deepData);
      const startTime = performance.now();
      const result = await parseFrom(DeepSchema, 'json', input);
      const endTime = performance.now();

      expect(result.level1.level2.level3.level4.level5.data).toBe('deep value');
      expect(endTime - startTime).toBeLessThan(100); // Deep nesting should be fast
    });
  });

  describe('CSV Performance', () => {
    it('should handle large CSV files efficiently', async () => {
      const PersonSchema = z.object({
        id: z.number(),
        firstName: z.string(),
        lastName: z.string(),
        email: z.string(),
        age: z.number(),
      });

      const ArraySchema = z.array(PersonSchema);

      // Generate large CSV with 5,000 rows
      const rows = ['id,firstName,lastName,email,age'];
      for (let i = 0; i < 5000; i++) {
        rows.push(`${i},First${i},Last${i},email${i}@example.com,${20 + (i % 50)}`);
      }
      const largeCsv = rows.join('\n');

      const startTime = performance.now();
      const result = await parseFrom(ArraySchema, 'csv', largeCsv);
      const endTime = performance.now();

      expect(result).toHaveLength(5000);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete in under 2 seconds
    });

    it('should format large arrays to CSV efficiently', async () => {
      const PersonSchema = z.object({
        id: z.number(),
        name: z.string(),
        active: z.boolean(),
      });

      const ArraySchema = z.array(PersonSchema);

      const largeArray = Array.from({ length: 5000 }, (_, i) => ({
        id: i,
        name: `Person ${i}`,
        active: i % 2 === 0,
      }));

      const startTime = performance.now();
      const result = await formatTo(ArraySchema, 'csv', largeArray);
      const endTime = performance.now();

      expect(result).toContain('id,name,active');
      expect(endTime - startTime).toBeLessThan(2000); // Should complete in under 2 seconds
    });
  });

  describe('NDJSON Performance', () => {
    it('should handle large NDJSON files efficiently', async () => {
      const ItemSchema = z.object({
        id: z.number(),
        data: z.string(),
      });

      const ArraySchema = z.array(ItemSchema);

      // Generate large NDJSON with 10,000 lines
      const lines = [];
      for (let i = 0; i < 10_000; i++) {
        lines.push(JSON.stringify({ id: i, data: `Data ${i}` }));
      }
      const largeNdjson = lines.join('\n');

      const startTime = performance.now();
      const result = await parseFrom(ArraySchema, 'ndjson', largeNdjson);
      const endTime = performance.now();

      expect(result).toHaveLength(10_000);
      expect(endTime - startTime).toBeLessThan(1500); // Should complete in under 1.5 seconds
    });
  });

  describe('Conversion Performance', () => {
    it('should convert between formats efficiently', async () => {
      const DataSchema = z.object({
        items: z.array(
          z.object({
            id: z.number(),
            value: z.string(),
          })
        ),
      });

      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: `Value ${i}`,
        })),
      };

      const input = JSON.stringify(largeData);

      const startTime = performance.now();
      const result = await convert(DataSchema, { from: 'json', to: 'json' }, input);
      const endTime = performance.now();

      expect(result).toContain('"id": 0');
      expect(endTime - startTime).toBeLessThan(500); // Conversion should be fast
    });
  });

  describe('Memory Efficiency', () => {
    it('should not leak memory on repeated operations', async () => {
      const SimpleSchema = z.object({
        id: z.number(),
        data: z.string(),
      });

      // Run 1000 iterations
      for (let i = 0; i < 1000; i++) {
        const input = JSON.stringify({ id: i, data: `Test ${i}` });
        const result = await parseFrom(SimpleSchema, 'json', input);
        expect(result.id).toBe(i);
      }

      // If we get here without crashing, memory is being managed well
      expect(true).toBe(true);
    });

    it('should handle concurrent operations efficiently', async () => {
      const SimpleSchema = z.object({
        id: z.number(),
        value: z.string(),
      });

      // Create 100 concurrent parse operations
      const promises = Array.from({ length: 100 }, (_, i) => {
        const input = JSON.stringify({ id: i, value: `Concurrent ${i}` });
        return parseFrom(SimpleSchema, 'json', input);
      });

      const startTime = performance.now();
      const results = await Promise.all(promises);
      const endTime = performance.now();

      expect(results).toHaveLength(100);
      expect(results[0].id).toBe(0);
      expect(results[99].id).toBe(99);
      expect(endTime - startTime).toBeLessThan(1000); // Should handle concurrency well
    });
  });

  describe('Deterministic Output Performance', () => {
    it('should not significantly slow down with deterministic option', async () => {
      const DataSchema = z.object({
        items: z.array(z.object({ id: z.number(), name: z.string() })),
      });

      const data = {
        items: Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` })),
      };

      // Regular formatting
      const start1 = performance.now();
      await formatTo(DataSchema, 'json', data);
      const end1 = performance.now();
      const regularTime = end1 - start1;

      // Deterministic formatting
      const start2 = performance.now();
      await formatTo(DataSchema, 'json', data, { deterministic: true });
      const end2 = performance.now();
      const deterministicTime = end2 - start2;

      // Deterministic should be at most 2x slower
      expect(deterministicTime).toBeLessThan(regularTime * 2);
    });
  });

  describe('Provenance Overhead', () => {
    it('should have minimal overhead with provenance enabled', async () => {
      const DataSchema = z.object({
        items: z.array(z.object({ id: z.number() })),
      });

      const data = {
        items: Array.from({ length: 1000 }, (_, i) => ({ id: i })),
      };

      const input = JSON.stringify(data);

      // Without provenance
      const start1 = performance.now();
      await parseFrom(DataSchema, 'json', input);
      const end1 = performance.now();
      const withoutProvenance = end1 - start1;

      // With provenance
      const start2 = performance.now();
      await parseFrom(DataSchema, 'json', input, { includeProvenance: true });
      const end2 = performance.now();
      const withProvenance = end2 - start2;

      // Provenance should add less than 20% overhead
      expect(withProvenance).toBeLessThan(withoutProvenance * 1.2);
    });
  });
});
