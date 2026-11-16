/**
 * Schema Validation Edge Cases Tests
 * @fileoverview Tests for complex schema validation scenarios
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { formatTo, parseFrom } from '../../src/core/index.mjs';

describe('Schema Validation Edge Cases', () => {
  describe('Optional Fields', () => {
    const OptionalSchema = z.object({
      required: z.string(),
      optional: z.string().optional(),
      nullable: z.string().nullable(),
      optionalNullable: z.string().optional().nullable(),
    });

    it('should handle optional fields correctly on parse', async () => {
      const input = JSON.stringify({ required: 'test' });
      const result = await parseFrom(OptionalSchema, 'json', input);

      expect(result.required).toBe('test');
      expect(result.optional).toBeUndefined();
      expect(result.nullable).toBeNull();
      expect(result.optionalNullable).toBeUndefined();
    });

    it('should handle optional fields correctly on format', async () => {
      const data = {
        required: 'test',
        optional: undefined,
        nullable: null,
      };

      const result = await formatTo(OptionalSchema, 'json', data);
      const parsed = JSON.parse(result);

      expect(parsed.required).toBe('test');
      expect(parsed).not.toHaveProperty('optional');
      expect(parsed.nullable).toBeNull();
    });

    it('should validate when optional fields are present', async () => {
      const data = {
        required: 'test',
        optional: 'optional value',
        nullable: 'nullable value',
        optionalNullable: 'both',
      };

      const input = JSON.stringify(data);
      const result = await parseFrom(OptionalSchema, 'json', input);

      expect(result).toEqual(data);
    });
  });

  describe('Nested Arrays', () => {
    const NestedArraySchema = z.object({
      matrix: z.array(z.array(z.number())),
      deepNest: z.array(
        z.object({
          items: z.array(
            z.object({
              values: z.array(z.string()),
            })
          ),
        })
      ),
    });

    it('should handle 2D arrays', async () => {
      const data = {
        matrix: [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9],
        ],
        deepNest: [],
      };

      const input = JSON.stringify(data);
      const result = await parseFrom(NestedArraySchema, 'json', input);

      expect(result.matrix).toHaveLength(3);
      expect(result.matrix[0]).toEqual([1, 2, 3]);
      expect(result.matrix[2]).toEqual([7, 8, 9]);
    });

    it('should handle deeply nested arrays', async () => {
      const data = {
        matrix: [[1]],
        deepNest: [
          {
            items: [
              {
                values: ['a', 'b', 'c'],
              },
              {
                values: ['d', 'e'],
              },
            ],
          },
        ],
      };

      const input = JSON.stringify(data);
      const result = await parseFrom(NestedArraySchema, 'json', input);

      expect(result.deepNest[0].items).toHaveLength(2);
      expect(result.deepNest[0].items[0].values).toEqual(['a', 'b', 'c']);
    });

    it('should handle empty nested arrays', async () => {
      const data = {
        matrix: [[], [], []],
        deepNest: [{ items: [] }],
      };

      const input = JSON.stringify(data);
      const result = await parseFrom(NestedArraySchema, 'json', input);

      expect(result.matrix).toHaveLength(3);
      expect(result.matrix[0]).toEqual([]);
      expect(result.deepNest[0].items).toEqual([]);
    });
  });

  describe('Union Types', () => {
    const UnionSchema = z.object({
      value: z.union([z.string(), z.number(), z.boolean()]),
      arrayOrObject: z.union([z.array(z.string()), z.object({ value: z.string() })]),
    });

    it('should handle string in union', async () => {
      const data = { value: 'string', arrayOrObject: ['a', 'b'] };
      const input = JSON.stringify(data);
      const result = await parseFrom(UnionSchema, 'json', input);

      expect(result.value).toBe('string');
      expect(result.arrayOrObject).toEqual(['a', 'b']);
    });

    it('should handle number in union', async () => {
      const data = { value: 42, arrayOrObject: { value: 'test' } };
      const input = JSON.stringify(data);
      const result = await parseFrom(UnionSchema, 'json', input);

      expect(result.value).toBe(42);
      expect(result.arrayOrObject).toEqual({ value: 'test' });
    });

    it('should handle boolean in union', async () => {
      const data = { value: true, arrayOrObject: ['x'] };
      const input = JSON.stringify(data);
      const result = await parseFrom(UnionSchema, 'json', input);

      expect(result.value).toBe(true);
    });

    it('should reject invalid union values', async () => {
      const data = { value: [], arrayOrObject: ['test'] };
      const input = JSON.stringify(data);

      await expect(parseFrom(UnionSchema, 'json', input)).rejects.toThrow();
    });
  });

  describe('Discriminated Unions', () => {
    const DiscriminatedSchema = z.object({
      items: z.array(
        z.discriminatedUnion('type', [
          z.object({ type: z.literal('text'), content: z.string() }),
          z.object({ type: z.literal('number'), value: z.number() }),
          z.object({ type: z.literal('bool'), flag: z.boolean() }),
        ])
      ),
    });

    it('should handle discriminated unions correctly', async () => {
      const data = {
        items: [
          { type: 'text', content: 'Hello' },
          { type: 'number', value: 42 },
          { type: 'bool', flag: true },
        ],
      };

      const input = JSON.stringify(data);
      const result = await parseFrom(DiscriminatedSchema, 'json', input);

      expect(result.items).toHaveLength(3);
      expect(result.items[0].type).toBe('text');
      expect(result.items[1].type).toBe('number');
      expect(result.items[2].type).toBe('bool');
    });

    it('should reject incorrect discriminator', async () => {
      const data = {
        items: [{ type: 'invalid', value: 'test' }],
      };

      const input = JSON.stringify(data);
      await expect(parseFrom(DiscriminatedSchema, 'json', input)).rejects.toThrow();
    });
  });

  describe('Refinements and Transformations', () => {
    const RefinedSchema = z.object({
      email: z.string().email(),
      age: z.number().min(0).max(150),
      username: z.string().min(3).max(20),
      url: z.string().url(),
      uuid: z.string().uuid(),
    });

    it('should validate email format', async () => {
      const validData = {
        email: 'test@example.com',
        age: 25,
        username: 'user123',
        url: 'https://example.com',
        uuid: '123e4567-e89b-12d3-a456-426614174000',
      };

      const input = JSON.stringify(validData);
      const result = await parseFrom(RefinedSchema, 'json', input);

      expect(result.email).toBe('test@example.com');
    });

    it('should reject invalid email', async () => {
      const invalidData = {
        email: 'not-an-email',
        age: 25,
        username: 'user123',
        url: 'https://example.com',
        uuid: '123e4567-e89b-12d3-a456-426614174000',
      };

      const input = JSON.stringify(invalidData);
      await expect(parseFrom(RefinedSchema, 'json', input)).rejects.toThrow();
    });

    it('should reject age out of range', async () => {
      const invalidData = {
        email: 'test@example.com',
        age: 200,
        username: 'user123',
        url: 'https://example.com',
        uuid: '123e4567-e89b-12d3-a456-426614174000',
      };

      const input = JSON.stringify(invalidData);
      await expect(parseFrom(RefinedSchema, 'json', input)).rejects.toThrow();
    });

    it('should reject username too short', async () => {
      const invalidData = {
        email: 'test@example.com',
        age: 25,
        username: 'ab',
        url: 'https://example.com',
        uuid: '123e4567-e89b-12d3-a456-426614174000',
      };

      const input = JSON.stringify(invalidData);
      await expect(parseFrom(RefinedSchema, 'json', input)).rejects.toThrow();
    });

    it('should reject invalid URL', async () => {
      const invalidData = {
        email: 'test@example.com',
        age: 25,
        username: 'user123',
        url: 'not-a-url',
        uuid: '123e4567-e89b-12d3-a456-426614174000',
      };

      const input = JSON.stringify(invalidData);
      await expect(parseFrom(RefinedSchema, 'json', input)).rejects.toThrow();
    });

    it('should reject invalid UUID', async () => {
      const invalidData = {
        email: 'test@example.com',
        age: 25,
        username: 'user123',
        url: 'https://example.com',
        uuid: 'not-a-uuid',
      };

      const input = JSON.stringify(invalidData);
      await expect(parseFrom(RefinedSchema, 'json', input)).rejects.toThrow();
    });
  });

  describe('Default Values', () => {
    const DefaultSchema = z.object({
      name: z.string(),
      count: z.number().default(0),
      enabled: z.boolean().default(false),
      tags: z.array(z.string()).default([]),
    });

    it('should apply default values when fields are missing', async () => {
      const data = { name: 'test' };
      const input = JSON.stringify(data);
      const result = await parseFrom(DefaultSchema, 'json', input);

      expect(result.name).toBe('test');
      expect(result.count).toBe(0);
      expect(result.enabled).toBe(false);
      expect(result.tags).toEqual([]);
    });

    it('should use provided values over defaults', async () => {
      const data = {
        name: 'test',
        count: 5,
        enabled: true,
        tags: ['a', 'b'],
      };

      const input = JSON.stringify(data);
      const result = await parseFrom(DefaultSchema, 'json', input);

      expect(result.count).toBe(5);
      expect(result.enabled).toBe(true);
      expect(result.tags).toEqual(['a', 'b']);
    });
  });

  describe('Record Types', () => {
    const RecordSchema = z.object({
      metadata: z.record(z.string()),
      numbers: z.record(z.number()),
      nested: z.record(z.object({ value: z.string() })),
    });

    it('should handle record of strings', async () => {
      const data = {
        metadata: { key1: 'value1', key2: 'value2' },
        numbers: { a: 1, b: 2 },
        nested: { item: { value: 'test' } },
      };

      const input = JSON.stringify(data);
      const result = await parseFrom(RecordSchema, 'json', input);

      expect(result.metadata.key1).toBe('value1');
      expect(result.numbers.a).toBe(1);
      expect(result.nested.item.value).toBe('test');
    });

    it('should handle empty records', async () => {
      const data = {
        metadata: {},
        numbers: {},
        nested: {},
      };

      const input = JSON.stringify(data);
      const result = await parseFrom(RecordSchema, 'json', input);

      expect(Object.keys(result.metadata)).toHaveLength(0);
      expect(Object.keys(result.numbers)).toHaveLength(0);
      expect(Object.keys(result.nested)).toHaveLength(0);
    });
  });

  describe('Recursive Schemas', () => {
    const TreeNode = z.lazy(() =>
      z.object({
        value: z.string(),
        children: z.array(TreeNode).optional(),
      })
    );

    const TreeSchema = z.object({
      root: TreeNode,
    });

    it('should handle recursive tree structures', async () => {
      const data = {
        root: {
          value: 'root',
          children: [
            {
              value: 'child1',
              children: [{ value: 'grandchild1' }, { value: 'grandchild2' }],
            },
            {
              value: 'child2',
            },
          ],
        },
      };

      const input = JSON.stringify(data);
      const result = await parseFrom(TreeSchema, 'json', input);

      expect(result.root.value).toBe('root');
      expect(result.root.children).toHaveLength(2);
      expect(result.root.children[0].children).toHaveLength(2);
    });
  });
});
