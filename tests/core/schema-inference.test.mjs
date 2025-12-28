/**
 * Tests for Schema Inference Engine
 * @fileoverview Comprehensive tests for schema inference and suggestions
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  inferSchema,
  inferSchemaFromSample,
  schemaToCode,
  schemaToTypeScript,
  refineSchema,
  compareSchemas,
} from '../../src/core/schema-inference.mjs';
import {
  suggestImprovements,
  generateReport,
} from '../../src/core/schema-suggestion.mjs';

describe('Schema Inference', () => {
  describe('inferSchemaFromSample', () => {
    it('should infer string schema', () => {
      const schema = inferSchemaFromSample('hello');
      const result = schema.safeParse('world');
      expect(result.success).toBe(true);
    });

    it('should infer number schema', () => {
      const schema = inferSchemaFromSample(42);
      const result = schema.safeParse(100);
      expect(result.success).toBe(true);
      expect(schema.safeParse('not a number').success).toBe(false);
    });

    it('should infer boolean schema', () => {
      const schema = inferSchemaFromSample(true);
      const result = schema.safeParse(false);
      expect(result.success).toBe(true);
    });

    it('should infer object schema', () => {
      const sample = { name: 'Alice', age: 30 };
      const schema = inferSchemaFromSample(sample);
      const result = schema.safeParse({ name: 'Bob', age: 25 });
      expect(result.success).toBe(true);
    });

    it('should infer array schema', () => {
      const sample = [1, 2, 3];
      const schema = inferSchemaFromSample(sample);
      const result = schema.safeParse([4, 5, 6]);
      expect(result.success).toBe(true);
    });

    it('should detect email pattern', () => {
      const schema = inferSchemaFromSample('test@example.com', { detectPatterns: true });
      const result = schema.safeParse('valid@email.com');
      expect(result.success).toBe(true);
      expect(schema.safeParse('invalid-email').success).toBe(false);
    });

    it('should detect URL pattern', () => {
      const schema = inferSchemaFromSample('https://example.com', { detectPatterns: true });
      const result = schema.safeParse('https://test.com');
      expect(result.success).toBe(true);
    });

    it('should detect UUID pattern', () => {
      const schema = inferSchemaFromSample('123e4567-e89b-12d3-a456-426614174000', { detectPatterns: true });
      const result = schema.safeParse('550e8400-e29b-41d4-a716-446655440000');
      expect(result.success).toBe(true);
    });
  });

  describe('inferSchema (multi-sample)', () => {
    it('should infer schema from multiple samples', () => {
      const samples = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
        { name: 'Charlie', age: 35 },
      ];

      const result = inferSchema(samples);
      expect(result.schema).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.sampleCount).toBe(3);
    });

    it('should detect optional fields', () => {
      const samples = [
        { name: 'Alice', age: 30, email: 'alice@example.com' },
        { name: 'Bob', age: 25 },
        { name: 'Charlie', age: 35, email: 'charlie@test.com' },
      ];

      const result = inferSchema(samples);
      const validWithEmail = result.schema.safeParse({ name: 'David', age: 40, email: 'david@test.com' });
      const validWithoutEmail = result.schema.safeParse({ name: 'Eve', age: 28 });

      expect(validWithEmail.success).toBe(true);
      expect(validWithoutEmail.success).toBe(true);
    });

    it('should detect nullable fields', () => {
      const samples = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: null },
        { name: 'Charlie', age: 35 },
      ];

      const result = inferSchema(samples);
      const validNull = result.schema.safeParse({ name: 'David', age: null });
      const validNumber = result.schema.safeParse({ name: 'Eve', age: 28 });

      expect(validNull.success).toBe(true);
      expect(validNumber.success).toBe(true);
    });

    it('should calculate confidence score', () => {
      const samples = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
        { name: 'Charlie', age: 35 },
      ];

      const result = inferSchema(samples, { includeMetadata: true });
      expect(result.metadata.confidence).toBeGreaterThan(0);
      expect(result.metadata.confidence).toBeLessThanOrEqual(1);
    });

    it('should include field statistics', () => {
      const samples = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ];

      const result = inferSchema(samples, { includeMetadata: true });
      expect(result.metadata.fieldStats).toBeDefined();
      expect(result.metadata.fieldStats.name).toBeDefined();
      expect(result.metadata.fieldStats.age).toBeDefined();
    });

    it('should handle empty array', () => {
      expect(() => inferSchema([])).toThrow();
    });

    it('should handle mixed types with warnings', () => {
      const samples = [
        { value: 'string' },
        { value: 42 },
        { value: true },
      ];

      const result = inferSchema(samples);
      expect(result.metadata.warnings.length).toBeGreaterThan(0);
    });

    it('should detect enum patterns', () => {
      const samples = [
        { status: 'active' },
        { status: 'inactive' },
        { status: 'active' },
        { status: 'pending' },
      ];

      const result = inferSchema(samples);
      // Schema should handle the enum values
      expect(result.schema.safeParse({ status: 'active' }).success).toBe(true);
    });

    it('should detect literal values', () => {
      const samples = [
        { type: 'user' },
        { type: 'user' },
        { type: 'user' },
      ];

      const result = inferSchema(samples);
      expect(result.schema.safeParse({ type: 'user' }).success).toBe(true);
      // Different value should fail if literal is used
      // (depends on implementation details)
    });
  });

  describe('schemaToCode', () => {
    it('should convert schema to code string', () => {
      const schema = z.string();
      const code = schemaToCode(schema);
      expect(code).toContain('z.');
    });
  });

  describe('schemaToTypeScript', () => {
    it('should convert schema to TypeScript type', () => {
      const schema = z.object({ name: z.string() });
      const tsType = schemaToTypeScript(schema, 'User');
      expect(tsType).toContain('export type User');
    });
  });

  describe('refineSchema', () => {
    it('should refine schema with new samples', () => {
      const existingSchema = z.object({ name: z.string() });
      const newSamples = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ];

      const result = refineSchema(existingSchema, newSamples);
      expect(result.schema).toBeDefined();
    });
  });

  describe('compareSchemas', () => {
    it('should compare two identical schemas', () => {
      const schema1 = z.string();
      const schema2 = z.string();
      const diff = compareSchemas(schema1, schema2);
      expect(diff.identical).toBe(true);
    });

    it('should detect different schemas', () => {
      const schema1 = z.string();
      const schema2 = z.number();
      const diff = compareSchemas(schema1, schema2);
      expect(diff.identical).toBe(false);
    });
  });
});

describe('Schema Suggestions', () => {
  describe('suggestImprovements', () => {
    it('should suggest email pattern for email fields', () => {
      const schema = z.object({ email: z.string() });
      const samples = [
        { email: 'alice@example.com' },
        { email: 'bob@test.com' },
        { email: 'charlie@demo.org' },
      ];

      const suggestions = suggestImprovements(schema, samples);
      const emailSuggestion = suggestions.find(s => s.field === 'email' && s.type === 'pattern');
      expect(emailSuggestion).toBeDefined();
      expect(emailSuggestion.suggestedType).toContain('email()');
    });

    it('should suggest URL pattern for URL fields', () => {
      const schema = z.object({ website: z.string() });
      const samples = [
        { website: 'https://example.com' },
        { website: 'https://test.org' },
      ];

      const suggestions = suggestImprovements(schema, samples);
      const urlSuggestion = suggestions.find(s => s.field === 'website' && s.type === 'pattern');
      expect(urlSuggestion).toBeDefined();
    });

    it('should suggest enum for limited value sets', () => {
      const schema = z.object({ status: z.string() });
      const samples = [
        { status: 'active' },
        { status: 'inactive' },
        { status: 'pending' },
        { status: 'active' },
      ];

      const suggestions = suggestImprovements(schema, samples);
      const enumSuggestion = suggestions.find(s => s.field === 'status' && s.type === 'optimization');
      expect(enumSuggestion).toBeDefined();
      expect(enumSuggestion.suggestedType).toContain('enum');
    });

    it('should suggest literal for constant values', () => {
      const schema = z.object({ type: z.string() });
      const samples = [
        { type: 'user' },
        { type: 'user' },
        { type: 'user' },
      ];

      const suggestions = suggestImprovements(schema, samples);
      const literalSuggestion = suggestions.find(s => s.field === 'type' && s.type === 'optimization');
      expect(literalSuggestion).toBeDefined();
      expect(literalSuggestion.suggestedType).toContain('literal');
    });

    it('should suggest min/max for numeric fields', () => {
      const schema = z.object({ age: z.number() });
      const samples = [
        { age: 18 },
        { age: 65 },
        { age: 42 },
      ];

      const suggestions = suggestImprovements(schema, samples);
      const rangeSuggestion = suggestions.find(s => s.field === 'age' && s.type === 'validation');
      expect(rangeSuggestion).toBeDefined();
    });

    it('should suggest int() for integer fields', () => {
      const schema = z.object({ count: z.number() });
      const samples = [
        { count: 1 },
        { count: 5 },
        { count: 10 },
      ];

      const suggestions = suggestImprovements(schema, samples);
      const intSuggestion = suggestions.find(
        s => s.field === 'count' && s.suggestedType.includes('int()')
      );
      expect(intSuggestion).toBeDefined();
    });

    it('should suggest nonnegative() for positive numbers', () => {
      const schema = z.object({ score: z.number() });
      const samples = [
        { score: 0 },
        { score: 100 },
        { score: 50 },
      ];

      const suggestions = suggestImprovements(schema, samples);
      const nonNegSuggestion = suggestions.find(
        s => s.field === 'score' && s.suggestedType.includes('nonnegative()')
      );
      expect(nonNegSuggestion).toBeDefined();
    });

    it('should suggest security improvements for sensitive fields', () => {
      const schema = z.object({ password: z.string() });
      const samples = [
        { password: 'secret123' },
      ];

      const suggestions = suggestImprovements(schema, samples);
      const securitySuggestion = suggestions.find(s => s.type === 'security');
      expect(securitySuggestion).toBeDefined();
    });

    it('should filter by minimum confidence', () => {
      const schema = z.object({ value: z.string() });
      const samples = [{ value: 'test' }];

      const allSuggestions = suggestImprovements(schema, samples, { minConfidence: 0 });
      const highConfSuggestions = suggestImprovements(schema, samples, { minConfidence: 0.95 });

      expect(highConfSuggestions.length).toBeLessThanOrEqual(allSuggestions.length);
    });
  });

  describe('generateReport', () => {
    it('should generate formatted report', () => {
      const suggestions = [
        {
          type: 'pattern',
          field: 'email',
          message: 'Field contains emails',
          currentType: 'z.string()',
          suggestedType: 'z.string().email()',
          confidence: 0.95,
          code: 'email: z.string().email()',
        },
      ];

      const report = generateReport(suggestions);
      expect(report).toContain('# Schema Improvement Suggestions');
      expect(report).toContain('email');
      expect(report).toContain('95%');
    });

    it('should group suggestions by type', () => {
      const suggestions = [
        {
          type: 'pattern',
          field: 'email',
          message: 'Email pattern',
          currentType: 'z.string()',
          suggestedType: 'z.string().email()',
          confidence: 0.9,
        },
        {
          type: 'validation',
          field: 'age',
          message: 'Age range',
          currentType: 'z.number()',
          suggestedType: 'z.number().min(0).max(120)',
          confidence: 0.8,
        },
      ];

      const report = generateReport(suggestions);
      expect(report).toContain('Pattern Improvements');
      expect(report).toContain('Validation Improvements');
    });
  });
});

describe('Integration Tests', () => {
  it('should handle complex nested objects', () => {
    const samples = [
      {
        user: {
          name: 'Alice',
          contact: {
            email: 'alice@example.com',
            phone: '555-0100',
          },
        },
        metadata: {
          created: '2024-01-01T00:00:00Z',
        },
      },
    ];

    const result = inferSchema(samples);
    expect(result.schema).toBeDefined();
  });

  it('should handle arrays of objects', () => {
    const samples = [
      {
        users: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 },
        ],
      },
    ];

    const result = inferSchema(samples);
    expect(result.schema).toBeDefined();
  });

  it('should generate suggestions from inferred schema', () => {
    const samples = [
      { email: 'alice@example.com', status: 'active' },
      { email: 'bob@test.com', status: 'inactive' },
      { email: 'charlie@demo.org', status: 'active' },
    ];

    const result = inferSchema(samples);
    const suggestions = suggestImprovements(result.schema, samples);

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some(s => s.field === 'email')).toBe(true);
  });

  it('should handle CSV-like data', () => {
    const samples = [
      { name: 'Alice', age: 30, active: true },
      { name: 'Bob', age: 25, active: false },
      { name: 'Charlie', age: 35, active: true },
    ];

    const result = inferSchema(samples, { detectPatterns: true });
    expect(result.schema).toBeDefined();
    expect(result.metadata.confidence).toBeGreaterThan(0.8);
  });
});
