/**
 * CSV Adapter Edge Cases Tests
 * @fileoverview Comprehensive edge case tests for CSV adapter
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { fromCsv, toCsv } from '../../src/index.mjs';

describe('CSV Adapter - Edge Cases', () => {
  describe('Boolean Conversion Edge Cases', () => {
    const BooleanSchema = z.object({
      active: z.boolean(),
      enabled: z.boolean(),
      valid: z.boolean(),
    });

    it('should convert "1" to true for boolean fields', async () => {
      const csv = 'active,enabled,valid\n1,1,1';
      const result = await fromCsv(BooleanSchema, csv);

      expect(result).toEqual({
        active: true,
        enabled: true,
        valid: true,
      });
    });

    it('should convert empty string to false for boolean fields', async () => {
      const csv = 'active,enabled,valid\n,,';
      const result = await fromCsv(BooleanSchema, csv);

      expect(result).toEqual({
        active: false,
        enabled: false,
        valid: false,
      });
    });

    it('should convert "true" string to true (case-insensitive)', async () => {
      const csv = 'active,enabled,valid\ntrue,TRUE,True';
      const result = await fromCsv(BooleanSchema, csv);

      expect(result).toEqual({
        active: true,
        enabled: true,
        valid: true,
      });
    });

    it('should convert "false" string to false (case-insensitive)', async () => {
      const csv = 'active,enabled,valid\nfalse,FALSE,False';
      const result = await fromCsv(BooleanSchema, csv);

      expect(result).toEqual({
        active: false,
        enabled: false,
        valid: false,
      });
    });

    it('should convert boolean to "1" or empty string on format', async () => {
      const data = { active: true, enabled: false, valid: true };
      const result = await toCsv(BooleanSchema, data);

      expect(result).toContain('active,enabled,valid');
      expect(result).toContain('1,,1');
    });
  });

  describe('Numeric Conversion Edge Cases', () => {
    const NumericSchema = z.object({
      count: z.number(),
      score: z.number(),
      rating: z.number(),
    });

    it('should convert numeric strings to numbers', async () => {
      const csv = 'count,score,rating\n42,98.5,4.5';
      const result = await fromCsv(NumericSchema, csv);

      expect(result).toEqual({
        count: 42,
        score: 98.5,
        rating: 4.5,
      });
    });

    it('should handle negative numbers', async () => {
      const csv = 'count,score,rating\n-10,-5.5,-1';
      const result = await fromCsv(NumericSchema, csv);

      expect(result).toEqual({
        count: -10,
        score: -5.5,
        rating: -1,
      });
    });

    it('should handle scientific notation', async () => {
      const csv = 'count,score,rating\n1e3,2.5e2,1e-2';
      const result = await fromCsv(NumericSchema, csv);

      expect(result).toEqual({
        count: 1000,
        score: 250,
        rating: 0.01,
      });
    });

    it('should handle zero values', async () => {
      const csv = 'count,score,rating\n0,0.0,-0';
      const result = await fromCsv(NumericSchema, csv);

      expect(result).toEqual({
        count: 0,
        score: 0,
        rating: 0,
      });
    });
  });

  describe('Empty and Null Value Handling', () => {
    const MixedSchema = z.object({
      name: z.string(),
      age: z.number(),
      active: z.boolean(),
    });

    it('should handle empty CSV input', async () => {
      await expect(fromCsv(MixedSchema, '')).rejects.toThrow('CSV input cannot be empty');
    });

    it('should handle whitespace-only input', async () => {
      await expect(fromCsv(MixedSchema, '   \n   \n   ')).rejects.toThrow(
        'CSV input cannot be empty'
      );
    });

    it('should handle empty array on format', async () => {
      const ArraySchema = z.array(MixedSchema);
      const result = await toCsv(ArraySchema, []);

      expect(result).toContain('name,age,active');
    });
  });

  describe('Special Characters and Escaping', () => {
    const StringSchema = z.object({
      text: z.string(),
      description: z.string(),
    });

    it('should handle CSV with quoted fields containing commas', async () => {
      const csv = 'text,description\n"Hello, World","A, B, C"';
      const result = await fromCsv(StringSchema, csv);

      expect(result).toEqual({
        text: 'Hello, World',
        description: 'A, B, C',
      });
    });

    it('should handle CSV with quoted fields containing newlines', async () => {
      const csv = 'text,description\n"Line 1\nLine 2","Multi\nLine"';
      const result = await fromCsv(StringSchema, csv);

      expect(result).toEqual({
        text: 'Line 1\nLine 2',
        description: 'Multi\nLine',
      });
    });

    it('should handle CSV with quotes inside quotes', async () => {
      const csv = 'text,description\n"She said ""Hello""","Quote: ""test"""';
      const result = await fromCsv(StringSchema, csv);

      expect(result).toEqual({
        text: 'She said "Hello"',
        description: 'Quote: "test"',
      });
    });
  });

  describe('Array Data Handling', () => {
    const PersonSchema = z.object({
      name: z.string(),
      age: z.number(),
      active: z.boolean(),
    });

    const ArraySchema = z.array(PersonSchema);

    it('should parse multiple CSV records into array', async () => {
      const csv = 'name,age,active\nAlice,30,1\nBob,25,\nCharlie,35,true';
      const result = await fromCsv(ArraySchema, csv);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ name: 'Alice', age: 30, active: true });
      expect(result[1]).toEqual({ name: 'Bob', age: 25, active: false });
      expect(result[2]).toEqual({ name: 'Charlie', age: 35, active: true });
    });

    it('should format array of objects to CSV', async () => {
      const data = [
        { name: 'Alice', age: 30, active: true },
        { name: 'Bob', age: 25, active: false },
      ];

      const result = await toCsv(ArraySchema, data);

      expect(result).toContain('name,age,active');
      expect(result).toContain('Alice,30,1');
      expect(result).toContain('Bob,25,');
    });
  });

  describe('Large Data Handling', () => {
    it('should handle large CSV files efficiently', async () => {
      const PersonSchema = z.object({
        id: z.number(),
        name: z.string(),
        value: z.number(),
      });
      const ArraySchema = z.array(PersonSchema);

      // Generate large CSV with 1000 rows
      const rows = ['id,name,value'];
      for (let i = 0; i < 1000; i++) {
        rows.push(`${i},Person${i},${i * 10}`);
      }
      const largeCsv = rows.join('\n');

      const result = await fromCsv(ArraySchema, largeCsv);

      expect(result).toHaveLength(1000);
      expect(result[0]).toEqual({ id: 0, name: 'Person0', value: 0 });
      expect(result[999]).toEqual({ id: 999, name: 'Person999', value: 9990 });
    });

    it('should handle wide CSV with many columns', async () => {
      const WideSchema = z.object({
        col1: z.string(),
        col2: z.string(),
        col3: z.string(),
        col4: z.string(),
        col5: z.string(),
        col6: z.string(),
        col7: z.string(),
        col8: z.string(),
        col9: z.string(),
        col10: z.string(),
      });

      const csv = 'col1,col2,col3,col4,col5,col6,col7,col8,col9,col10\nA,B,C,D,E,F,G,H,I,J';
      const result = await fromCsv(WideSchema, csv);

      expect(result).toEqual({
        col1: 'A',
        col2: 'B',
        col3: 'C',
        col4: 'D',
        col5: 'E',
        col6: 'F',
        col7: 'G',
        col8: 'H',
        col9: 'I',
        col10: 'J',
      });
    });
  });

  describe('Metadata Validation', () => {
    it('should include record count in metadata on parse', async () => {
      const PersonSchema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const ArraySchema = z.array(PersonSchema);

      const csv = 'name,age\nAlice,30\nBob,25';

      // Use internal adapter to check metadata
      const { csvAdapter } = await import('../../src/adapters/data.mjs');
      const result = await csvAdapter.parse(csv);

      expect(result.metadata).toHaveProperty('recordCount', 2);
      expect(result.metadata).toHaveProperty('columnCount', 2);
      expect(result.metadata).toHaveProperty('format', 'csv');
    });

    it('should include output size in metadata on format', async () => {
      const PersonSchema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const data = { name: 'Alice', age: 30 };

      // Use internal adapter to check metadata
      const { csvAdapter } = await import('../../src/adapters/data.mjs');
      const result = await csvAdapter.format(data);

      expect(result.metadata).toHaveProperty('outputSize');
      expect(result.metadata).toHaveProperty('recordCount', 1);
      expect(result.metadata).toHaveProperty('format', 'csv');
    });
  });
});
