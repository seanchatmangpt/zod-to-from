/**
 * CSV Adapter Tests
 * @fileoverview Comprehensive tests for CSV parsing and formatting
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { convert, formatTo, parseFrom } from '../setup.mjs';

describe('CSV Adapter', () => {
  const SimpleCSVSchema = z.object({
    name: z.string(),
    age: z.number(),
    active: z.boolean(),
  });

  const ArrayCSVSchema = z.object({
    items: z.array(
      z.object({
        name: z.string(),
        age: z.number(),
        active: z.boolean(),
      })
    ),
  });

  beforeEach(() => {
    // Ensure clean state for each test
  });

  describe('CSV Parsing', () => {
    it('should parse simple CSV with headers', async () => {
      const csvInput = `name,age,active
John,30,true
Jane,25,false`;

      const result = await parseFrom(ArrayCSVSchema, 'csv', csvInput);

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

    it('should handle CSV with quoted values', async () => {
      const csvInput = `name,age,active
"John Doe",30,true
"Jane, Smith",25,false`;

      const result = await parseFrom(ArrayCSVSchema, 'csv', csvInput);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].name).toBe('John Doe');
      expect(result.items[1].name).toBe('Jane, Smith');
    });

    it('should handle CSV with empty values', async () => {
      const csvInput = `name,age,active
John,30,
Jane,,false`;

      // Use a schema that allows empty strings for this test
      const EmptyValuesSchema = z.object({
        items: z.array(
          z.object({
            name: z.string(),
            age: z.union([z.number(), z.string()]),
            active: z.union([z.boolean(), z.string()]),
          })
        ),
      });

      const result = await parseFrom(EmptyValuesSchema, 'csv', csvInput);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].active).toBe('');
      expect(result.items[1].age).toBe('');
    });

    it('should handle CSV with custom delimiter', async () => {
      const csvInput = `name;age;active
John;30;true
Jane;25;false`;

      const result = await parseFrom(ArrayCSVSchema, 'csv', csvInput, {
        adapter: { delimiter: ';' },
      });

      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({
        name: 'John',
        age: 30,
        active: true,
      });
    });

    it('should handle CSV with skip empty lines', async () => {
      const csvInput = `name,age,active
John,30,true

Jane,25,false
`;

      const result = await parseFrom(ArrayCSVSchema, 'csv', csvInput);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].name).toBe('John');
      expect(result.items[1].name).toBe('Jane');
    });

    it('should throw error for malformed CSV', async () => {
      const malformedCSV = `name,age,active
John,30,true
Jane,25`; // Missing column

      await expect(parseFrom(ArrayCSVSchema, 'csv', malformedCSV)).rejects.toThrow();
    });

    it('should handle CSV with different data types', async () => {
      const csvInput = `name,age,active,score
John,30,true,85.5
Jane,25,false,92.0`;

      const schema = z.object({
        items: z.array(
          z.object({
            name: z.string(),
            age: z.number(),
            active: z.boolean(),
            score: z.number(),
          })
        ),
      });

      const result = await parseFrom(schema, 'csv', csvInput);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].score).toBe(85.5);
      expect(result.items[1].score).toBe(92);
    });
  });

  describe('CSV Formatting', () => {
    it('should format array data to CSV', async () => {
      const data = {
        items: [
          { name: 'John', age: 30, active: true },
          { name: 'Jane', age: 25, active: false },
        ],
      };

      const result = await formatTo(ArrayCSVSchema, 'csv', data);

      expect(result).toContain('name,age,active');
      expect(result).toContain('John,30,true');
      expect(result).toContain('Jane,25,false');
    });

    it('should format single object to CSV', async () => {
      const data = {
        items: [{ name: 'Single', age: 42, active: true }],
      };

      const result = await formatTo(ArrayCSVSchema, 'csv', data);

      expect(result).toContain('name,age,active');
      expect(result).toContain('Single,42,true');
    });

    it('should handle CSV formatting with custom options', async () => {
      const data = {
        items: [
          { name: 'John', age: 30, active: true },
          { name: 'Jane', age: 25, active: false },
        ],
      };

      const result = await formatTo(ArrayCSVSchema, 'csv', data, {
        adapter: { delimiter: ';' },
      });

      expect(result).toContain('name;age;active');
      expect(result).toContain('John;30;true');
    });

    it('should handle CSV formatting without headers', async () => {
      const data = {
        items: [
          { name: 'John', age: 30, active: true },
          { name: 'Jane', age: 25, active: false },
        ],
      };

      const result = await formatTo(ArrayCSVSchema, 'csv', data, {
        adapter: { header: false },
      });

      expect(result).not.toContain('name,age,active');
      expect(result).toContain('John,30,true');
      expect(result).toContain('Jane,25,false');
    });

    it('should handle empty array formatting', async () => {
      const data = { items: [] };

      const result = await formatTo(ArrayCSVSchema, 'csv', data);

      expect(result).toContain('name,age,active');
      expect(result.split('\n').length).toBe(2); // Header + empty line
    });

    it('should handle CSV formatting with quoted values', async () => {
      const data = {
        items: [
          { name: 'John, Doe', age: 30, active: true },
          { name: 'Jane "Smith"', age: 25, active: false },
        ],
      };

      const result = await formatTo(ArrayCSVSchema, 'csv', data);

      expect(result).toContain('"John, Doe"');
      expect(result).toContain('"Jane ""Smith"""');
    });
  });

  describe('CSV Round-Trip Testing', () => {
    it('should maintain data integrity through parse-format round-trip', async () => {
      const originalCSV = `name,age,active
John,30,true
Jane,25,false`;

      // Parse then format
      const parsed = await parseFrom(ArrayCSVSchema, 'csv', originalCSV);
      const formatted = await formatTo(ArrayCSVSchema, 'csv', parsed);

      // Parse the formatted result
      const roundTripParsed = await parseFrom(ArrayCSVSchema, 'csv', formatted);

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

    it('should handle round-trip with custom delimiter', async () => {
      const originalCSV = `name;age;active
John;30;true
Jane;25;false`;

      const options = { adapter: { delimiter: ';' } };

      // Parse then format
      const parsed = await parseFrom(ArrayCSVSchema, 'csv', originalCSV, options);
      const formatted = await formatTo(ArrayCSVSchema, 'csv', parsed, options);

      // Parse the formatted result
      const roundTripParsed = await parseFrom(ArrayCSVSchema, 'csv', formatted, options);

      expect(roundTripParsed.items).toHaveLength(2);
      expect(roundTripParsed.items[0].name).toBe('John');
      expect(roundTripParsed.items[1].name).toBe('Jane');
    });

    it('should handle round-trip with quoted values', async () => {
      const originalCSV = `name,age,active
"John, Doe",30,true
"Jane ""Smith""",25,false`;

      // Parse then format
      const parsed = await parseFrom(ArrayCSVSchema, 'csv', originalCSV);
      const formatted = await formatTo(ArrayCSVSchema, 'csv', parsed);

      // Parse the formatted result
      const roundTripParsed = await parseFrom(ArrayCSVSchema, 'csv', formatted);

      expect(roundTripParsed.items).toHaveLength(2);
      expect(roundTripParsed.items[0].name).toBe('John, Doe');
      expect(roundTripParsed.items[1].name).toBe('Jane "Smith"');
    });
  });

  describe('CSV Conversion', () => {
    it('should convert CSV to JSON', async () => {
      const csvInput = `name,age,active
John,30,true
Jane,25,false`;

      const result = await convert(ArrayCSVSchema, { from: 'csv', to: 'json' }, csvInput);

      const parsedResult = JSON.parse(result);
      expect(parsedResult.items).toHaveLength(2);
      expect(parsedResult.items[0]).toEqual({
        name: 'John',
        age: 30,
        active: true,
      });
    });

    it('should convert JSON to CSV', async () => {
      const jsonInput = JSON.stringify({
        items: [
          { name: 'John', age: 30, active: true },
          { name: 'Jane', age: 25, active: false },
        ],
      });

      const result = await convert(ArrayCSVSchema, { from: 'json', to: 'csv' }, jsonInput);

      expect(result).toContain('name,age,active');
      expect(result).toContain('John,30,true');
      expect(result).toContain('Jane,25,false');
    });

    it('should handle CSV to CSV conversion (round-trip)', async () => {
      const csvInput = `name,age,active
John,30,true
Jane,25,false`;

      const result = await convert(ArrayCSVSchema, { from: 'csv', to: 'csv' }, csvInput);

      expect(result).toContain('name,age,active');
      expect(result).toContain('John,30,true');
      expect(result).toContain('Jane,25,false');
    });
  });

  describe('CSV Error Handling', () => {
    it('should handle empty CSV input', async () => {
      await expect(parseFrom(ArrayCSVSchema, 'csv', '')).rejects.toThrow();
    });

    it('should handle CSV with only headers', async () => {
      const csvInput = 'name,age,active';

      const result = await parseFrom(ArrayCSVSchema, 'csv', csvInput);

      expect(result.items).toHaveLength(0);
    });

    it('should handle CSV with inconsistent columns', async () => {
      const csvInput = `name,age,active
John,30,true
Jane,25`; // Missing active column

      await expect(parseFrom(ArrayCSVSchema, 'csv', csvInput)).rejects.toThrow();
    });

    it('should handle CSV with invalid data types', async () => {
      const csvInput = `name,age,active
John,not-a-number,true`;

      await expect(parseFrom(ArrayCSVSchema, 'csv', csvInput)).rejects.toThrow();
    });

    it('should handle malformed CSV with unclosed quotes', async () => {
      const csvInput = `name,age,active
"John,30,true
Jane,25,false`;

      await expect(parseFrom(ArrayCSVSchema, 'csv', csvInput)).rejects.toThrow();
    });
  });

  describe('CSV Streaming Support', () => {
    it('should support streaming operations', async () => {
      const csvInput = `name,age,active
John,30,true
Jane,25,false`;

      // Should work with streaming enabled
      await expect(
        parseFrom(ArrayCSVSchema, 'csv', csvInput, { streaming: true })
      ).resolves.toBeDefined();
      await expect(
        formatTo(ArrayCSVSchema, 'csv', { items: [] }, { streaming: true })
      ).resolves.toBeDefined();
    });

    it('should handle large CSV files efficiently', async () => {
      // Generate large CSV
      const headers = 'name,age,active\n';
      const rows = Array.from(
        { length: 1000 },
        (_, i) => `Person${i},${20 + i},${i % 2 === 0}`
      ).join('\n');
      const largeCSV = headers + rows;

      const startTime = Date.now();
      const result = await parseFrom(ArrayCSVSchema, 'csv', largeCSV);
      const endTime = Date.now();

      expect(result.items).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('CSV Metadata', () => {
    it('should include metadata in parse results', async () => {
      const csvInput = `name,age,active
John,30,true
Jane,25,false`;

      const result = await parseFrom(ArrayCSVSchema, 'csv', csvInput, { includeProvenance: true });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('provenance');
      expect(result.provenance).toHaveProperty('adapter', 'csv');
      expect(result.provenance).toHaveProperty('sourceFormat', 'csv');
    });

    it('should include metadata in format results', async () => {
      const data = {
        items: [{ name: 'John', age: 30, active: true }],
      };

      const result = await formatTo(ArrayCSVSchema, 'csv', data, { includeProvenance: true });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('provenance');
      expect(result.provenance).toHaveProperty('adapter', 'csv');
      expect(result.provenance).toHaveProperty('targetFormat', 'csv');
    });
  });
});
