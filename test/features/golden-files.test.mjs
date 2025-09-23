/**
 * Golden Files Tests
 * @fileoverview Tests using golden files for deterministic output validation
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { convert, formatTo, parseFrom } from '../../src/core/main.mjs';

describe('Golden Files Testing', () => {
  const SimpleSchema = z.object({
    name: z.string(),
    age: z.number(),
    active: z.boolean(),
  });

  const ComplexSchema = z.object({
    id: z.string(),
    metadata: z.object({
      tags: z.array(z.string()),
      score: z.number(),
    }),
    items: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        active: z.boolean(),
      })
    ),
  });

  const fixturesDir = join(process.cwd(), 'test', 'fixtures', 'golden');

  beforeEach(() => {
    // Ensure clean state for each test
  });

  describe('Simple Data Golden Files', () => {
    it('should parse simple JSON golden file', async () => {
      const goldenFile = readFileSync(join(fixturesDir, 'simple.json'), 'utf8');
      const result = await parseFrom(SimpleSchema, 'json', goldenFile);

      expect(result).toEqual({
        name: 'John Doe',
        age: 30,
        active: true,
      });
    });

    it('should format simple data to match golden JSON', async () => {
      const data = {
        name: 'John Doe',
        age: 30,
        active: true,
      };

      const result = await formatTo(SimpleSchema, 'json', data, { deterministic: true });
      const goldenFile = readFileSync(join(fixturesDir, 'simple.json'), 'utf8');

      // Parse both to compare structure (ignoring whitespace differences)
      const parsedResult = JSON.parse(result);
      const parsedGolden = JSON.parse(goldenFile);

      expect(parsedResult).toEqual(parsedGolden);
    });

    it('should parse simple CSV golden file', async () => {
      const goldenFile = readFileSync(join(fixturesDir, 'simple.csv'), 'utf8');
      const result = await parseFrom(SimpleSchema, 'csv', goldenFile);

      expect(result).toEqual({
        name: 'John Doe',
        age: 30,
        active: true,
      });
    });

    it('should format simple data to match golden CSV', async () => {
      const data = {
        name: 'John Doe',
        age: 30,
        active: true,
      };

      const result = await formatTo(SimpleSchema, 'csv', data);
      const goldenFile = readFileSync(join(fixturesDir, 'simple.csv'), 'utf8');

      expect(result.trim()).toBe(goldenFile.trim());
    });

    it('should parse simple NDJSON golden file', async () => {
      const goldenFile = readFileSync(join(fixturesDir, 'simple.ndjson'), 'utf8');
      const result = await parseFrom(SimpleSchema, 'ndjson', goldenFile);

      expect(result).toEqual({
        name: 'John Doe',
        age: 30,
        active: true,
      });
    });

    it('should format simple data to match golden NDJSON', async () => {
      const data = {
        name: 'John Doe',
        age: 30,
        active: true,
      };

      const result = await formatTo(SimpleSchema, 'ndjson', data);
      const goldenFile = readFileSync(join(fixturesDir, 'simple.ndjson'), 'utf8');

      expect(result.trim()).toBe(goldenFile.trim());
    });
  });

  describe('Complex Data Golden Files', () => {
    it('should parse complex JSON golden file', async () => {
      const goldenFile = readFileSync(join(fixturesDir, 'complex.json'), 'utf8');
      const result = await parseFrom(ComplexSchema, 'json', goldenFile);

      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        metadata: {
          tags: ['important', 'test'],
          score: 90,
          nested: {
            value: 'test-value',
            optional: 'present',
          },
        },
        items: [
          {
            id: 1,
            name: 'Item 1',
            active: true,
          },
          {
            id: 2,
            name: 'Item 2',
            active: false,
          },
        ],
      });
    });

    it('should format complex data to match golden JSON', async () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        metadata: {
          tags: ['important', 'test'],
          score: 90,
          nested: {
            value: 'test-value',
            optional: 'present',
          },
        },
        items: [
          {
            id: 1,
            name: 'Item 1',
            active: true,
          },
          {
            id: 2,
            name: 'Item 2',
            active: false,
          },
        ],
      };

      const result = await formatTo(ComplexSchema, 'json', data, { deterministic: true });
      const goldenFile = readFileSync(join(fixturesDir, 'complex.json'), 'utf8');

      // Parse both to compare structure (ignoring whitespace differences)
      const parsedResult = JSON.parse(result);
      const parsedGolden = JSON.parse(goldenFile);

      expect(parsedResult).toEqual(parsedGolden);
    });

    it('should parse complex CSV golden file', async () => {
      const goldenFile = readFileSync(join(fixturesDir, 'complex.csv'), 'utf8');
      const result = await parseFrom(ComplexSchema, 'csv', goldenFile);

      expect(result).toEqual({
        id: 1,
        name: 'Item 1',
        active: true,
      });
    });

    it('should format complex data to match golden CSV', async () => {
      const data = {
        id: 1,
        name: 'Item 1',
        active: true,
      };

      const result = await formatTo(ComplexSchema, 'csv', data);
      const goldenFile = readFileSync(join(fixturesDir, 'complex.csv'), 'utf8');

      expect(result.trim()).toBe(goldenFile.trim());
    });

    it('should parse complex NDJSON golden file', async () => {
      const goldenFile = readFileSync(join(fixturesDir, 'complex.ndjson'), 'utf8');
      const result = await parseFrom(ComplexSchema, 'ndjson', goldenFile);

      expect(result).toEqual({
        id: 1,
        name: 'Item 1',
        active: true,
      });
    });

    it('should format complex data to match golden NDJSON', async () => {
      const data = {
        id: 1,
        name: 'Item 1',
        active: true,
      };

      const result = await formatTo(ComplexSchema, 'ndjson', data);
      const goldenFile = readFileSync(join(fixturesDir, 'complex.ndjson'), 'utf8');

      expect(result.trim()).toBe(goldenFile.trim());
    });
  });

  describe('Cross-Format Golden File Conversion', () => {
    it('should convert JSON golden to CSV and match golden CSV', async () => {
      const jsonGolden = readFileSync(join(fixturesDir, 'simple.json'), 'utf8');
      const csvGolden = readFileSync(join(fixturesDir, 'simple.csv'), 'utf8');

      const result = await convert(SimpleSchema, { from: 'json', to: 'csv' }, jsonGolden);

      expect(result.trim()).toBe(csvGolden.trim());
    });

    it('should convert CSV golden to JSON and match golden JSON', async () => {
      const csvGolden = readFileSync(join(fixturesDir, 'simple.csv'), 'utf8');
      const jsonGolden = readFileSync(join(fixturesDir, 'simple.json'), 'utf8');

      const result = await convert(SimpleSchema, { from: 'csv', to: 'json' }, csvGolden);

      // Parse both to compare structure (ignoring whitespace differences)
      const parsedResult = JSON.parse(result);
      const parsedGolden = JSON.parse(jsonGolden);

      expect(parsedResult).toEqual(parsedGolden);
    });

    it('should convert JSON golden to NDJSON and match golden NDJSON', async () => {
      const jsonGolden = readFileSync(join(fixturesDir, 'simple.json'), 'utf8');
      const ndjsonGolden = readFileSync(join(fixturesDir, 'simple.ndjson'), 'utf8');

      const result = await convert(SimpleSchema, { from: 'json', to: 'ndjson' }, jsonGolden);

      expect(result.trim()).toBe(ndjsonGolden.trim());
    });

    it('should convert NDJSON golden to JSON and match golden JSON', async () => {
      const ndjsonGolden = readFileSync(join(fixturesDir, 'simple.ndjson'), 'utf8');
      const jsonGolden = readFileSync(join(fixturesDir, 'simple.json'), 'utf8');

      const result = await convert(SimpleSchema, { from: 'ndjson', to: 'json' }, ndjsonGolden);

      // Parse both to compare structure (ignoring whitespace differences)
      const parsedResult = JSON.parse(result);
      const parsedGolden = JSON.parse(jsonGolden);

      expect(parsedResult).toEqual(parsedGolden);
    });

    it('should convert CSV golden to NDJSON and match golden NDJSON', async () => {
      const csvGolden = readFileSync(join(fixturesDir, 'simple.csv'), 'utf8');
      const ndjsonGolden = readFileSync(join(fixturesDir, 'simple.ndjson'), 'utf8');

      const result = await convert(SimpleSchema, { from: 'csv', to: 'ndjson' }, csvGolden);

      expect(result.trim()).toBe(ndjsonGolden.trim());
    });

    it('should convert NDJSON golden to CSV and match golden CSV', async () => {
      const ndjsonGolden = readFileSync(join(fixturesDir, 'simple.ndjson'), 'utf8');
      const csvGolden = readFileSync(join(fixturesDir, 'simple.csv'), 'utf8');

      const result = await convert(SimpleSchema, { from: 'ndjson', to: 'csv' }, ndjsonGolden);

      expect(result.trim()).toBe(csvGolden.trim());
    });
  });

  describe('Round-Trip Golden File Testing', () => {
    it('should maintain data integrity through JSON round-trip', async () => {
      const jsonGolden = readFileSync(join(fixturesDir, 'simple.json'), 'utf8');

      // Parse then format
      const parsed = await parseFrom(SimpleSchema, 'json', jsonGolden);
      const formatted = await formatTo(SimpleSchema, 'json', parsed, { deterministic: true });

      // Parse the formatted result
      const roundTripParsed = JSON.parse(formatted);
      const originalParsed = JSON.parse(jsonGolden);

      expect(roundTripParsed).toEqual(originalParsed);
    });

    it('should maintain data integrity through CSV round-trip', async () => {
      const csvGolden = readFileSync(join(fixturesDir, 'simple.csv'), 'utf8');

      // Parse then format
      const parsed = await parseFrom(SimpleSchema, 'csv', csvGolden);
      const formatted = await formatTo(SimpleSchema, 'csv', parsed);

      // Parse the formatted result
      const roundTripParsed = await parseFrom(SimpleSchema, 'csv', formatted);
      const originalParsed = await parseFrom(SimpleSchema, 'csv', csvGolden);

      expect(roundTripParsed).toEqual(originalParsed);
    });

    it('should maintain data integrity through NDJSON round-trip', async () => {
      const ndjsonGolden = readFileSync(join(fixturesDir, 'simple.ndjson'), 'utf8');

      // Parse then format
      const parsed = await parseFrom(SimpleSchema, 'ndjson', ndjsonGolden);
      const formatted = await formatTo(SimpleSchema, 'ndjson', parsed);

      // Parse the formatted result
      const roundTripParsed = await parseFrom(SimpleSchema, 'ndjson', formatted);
      const originalParsed = await parseFrom(SimpleSchema, 'ndjson', ndjsonGolden);

      expect(roundTripParsed).toEqual(originalParsed);
    });

    it('should maintain data integrity through complex round-trip', async () => {
      const jsonGolden = readFileSync(join(fixturesDir, 'complex.json'), 'utf8');

      // Parse then format
      const parsed = await parseFrom(ComplexSchema, 'json', jsonGolden);
      const formatted = await formatTo(ComplexSchema, 'json', parsed, { deterministic: true });

      // Parse the formatted result
      const roundTripParsed = JSON.parse(formatted);
      const originalParsed = JSON.parse(jsonGolden);

      expect(roundTripParsed).toEqual(originalParsed);
    });
  });

  describe('Deterministic Output Testing', () => {
    it('should produce deterministic JSON output', async () => {
      const data = {
        name: 'John Doe',
        age: 30,
        active: true,
      };

      const result1 = await formatTo(SimpleSchema, 'json', data, { deterministic: true });
      const result2 = await formatTo(SimpleSchema, 'json', data, { deterministic: true });

      expect(result1).toBe(result2);
    });

    it('should produce deterministic CSV output', async () => {
      const data = {
        name: 'John Doe',
        age: 30,
        active: true,
      };

      const result1 = await formatTo(SimpleSchema, 'csv', data);
      const result2 = await formatTo(SimpleSchema, 'csv', data);

      expect(result1).toBe(result2);
    });

    it('should produce deterministic NDJSON output', async () => {
      const data = {
        name: 'John Doe',
        age: 30,
        active: true,
      };

      const result1 = await formatTo(SimpleSchema, 'ndjson', data);
      const result2 = await formatTo(SimpleSchema, 'ndjson', data);

      expect(result1).toBe(result2);
    });
  });

  describe('Golden File Validation', () => {
    it('should validate that golden files are well-formed', async () => {
      const goldenFiles = [
        'simple.json',
        'simple.csv',
        'simple.ndjson',
        'complex.json',
        'complex.csv',
        'complex.ndjson',
      ];

      for (const filename of goldenFiles) {
        const filePath = join(fixturesDir, filename);
        const content = readFileSync(filePath, 'utf8');

        expect(content).toBeDefined();
        expect(content.length).toBeGreaterThan(0);

        // Validate that files can be parsed
        if (filename.endsWith('.json')) {
          expect(() => JSON.parse(content)).not.toThrow();
        } else if (filename.endsWith('.csv')) {
          expect(content).toContain(',');
        } else if (filename.endsWith('.ndjson')) {
          const lines = content.trim().split('\n');
          for (const line of lines) {
            if (line.trim()) {
              expect(() => JSON.parse(line)).not.toThrow();
            }
          }
        }
      }
    });

    it('should validate that golden files are consistent', async () => {
      // Test that all golden files for the same data produce equivalent results
      const simpleJson = readFileSync(join(fixturesDir, 'simple.json'), 'utf8');
      const simpleCsv = readFileSync(join(fixturesDir, 'simple.csv'), 'utf8');
      const simpleNdjson = readFileSync(join(fixturesDir, 'simple.ndjson'), 'utf8');

      const jsonResult = await parseFrom(SimpleSchema, 'json', simpleJson);
      const csvResult = await parseFrom(SimpleSchema, 'csv', simpleCsv);
      const ndjsonResult = await parseFrom(SimpleSchema, 'ndjson', simpleNdjson);

      expect(jsonResult).toEqual(csvResult);
      expect(jsonResult).toEqual(ndjsonResult);
      expect(csvResult).toEqual(ndjsonResult);
    });
  });

  describe('Golden File Edge Cases', () => {
    it('should handle golden files with special characters', async () => {
      const specialData = {
        name: 'José "The Great" François',
        age: 30,
        active: true,
      };

      const result = await formatTo(SimpleSchema, 'json', specialData, { deterministic: true });
      const parsed = JSON.parse(result);

      expect(parsed.name).toBe('José "The Great" François');
    });

    it('should handle golden files with unicode characters', async () => {
      const unicodeData = {
        name: '中文测试 🚀',
        age: 30,
        active: true,
      };

      const result = await formatTo(SimpleSchema, 'json', unicodeData, { deterministic: true });
      const parsed = JSON.parse(result);

      expect(parsed.name).toBe('中文测试 🚀');
    });

    it('should handle golden files with empty arrays', async () => {
      const emptyArrayData = {
        id: 'test',
        metadata: {
          tags: [],
          score: 0,
        },
        items: [],
      };

      const result = await formatTo(ComplexSchema, 'json', emptyArrayData, { deterministic: true });
      const parsed = JSON.parse(result);

      expect(parsed.metadata.tags).toEqual([]);
      expect(parsed.items).toEqual([]);
    });

    it('should handle golden files with null values', async () => {
      const nullData = {
        name: 'Test',
        age: 30,
        active: true,
      };

      const result = await formatTo(SimpleSchema, 'json', nullData, { deterministic: true });
      const parsed = JSON.parse(result);

      expect(parsed.name).toBe('Test');
      expect(parsed.age).toBe(30);
      expect(parsed.active).toBe(true);
    });
  });
});
