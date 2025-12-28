/**
 * Transform Engine Tests
 * @fileoverview Comprehensive tests for declarative transforms
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  applyTransform,
  testTransform,
  composeTransforms,
  createTransformTemplate,
  registerTransform,
  listTransforms,
} from '../../src/core/transforms.mjs';

describe('Transform Engine', () => {
  describe('Field Mappings', () => {
    it('should map simple field names', async () => {
      const config = {
        mapping: {
          oldName: 'newName',
          oldEmail: 'newEmail',
        },
      };

      const data = { oldName: 'John', oldEmail: 'john@example.com', age: 30 };
      const result = await applyTransform(data, config);

      expect(result.data).toEqual({
        newName: 'John',
        newEmail: 'john@example.com',
        age: 30,
      });
    });

    it('should map nested field paths', async () => {
      const config = {
        mapping: {
          'user.firstName': 'first_name',
          'user.lastName': 'last_name',
        },
      };

      const data = {
        user: { firstName: 'John', lastName: 'Doe' },
        age: 30,
      };

      const result = await applyTransform(data, config);

      expect(result.data.first_name).toBe('John');
      expect(result.data.last_name).toBe('Doe');
    });
  });

  describe('String Transforms', () => {
    it('should uppercase strings', async () => {
      const config = {
        transforms: [{ field: 'name', fn: 'uppercase' }],
      };

      const data = { name: 'john doe' };
      const result = await applyTransform(data, config);

      expect(result.data.name).toBe('JOHN DOE');
    });

    it('should convert to camelCase', async () => {
      const config = {
        transforms: [{ field: 'userName', fn: 'camelCase' }],
      };

      const data = { userName: 'user_name' };
      const result = await applyTransform(data, config);

      expect(result.data.userName).toBe('userName');
    });

    it('should truncate strings', async () => {
      const config = {
        transforms: [
          {
            field: 'description',
            fn: 'truncate',
            value: 10,
            options: { suffix: '...' },
          },
        ],
      };

      const data = { description: 'This is a very long description' };
      const result = await applyTransform(data, config);

      expect(result.data.description).toBe('This is...');
    });
  });

  describe('Number Transforms', () => {
    it('should multiply numbers', async () => {
      const config = {
        transforms: [{ field: 'price', fn: 'multiply', value: 1.1 }],
      };

      const data = { price: 100 };
      const result = await applyTransform(data, config);

      expect(result.data.price).toBeCloseTo(110, 10);
    });

    it('should round numbers', async () => {
      const config = {
        transforms: [{ field: 'value', fn: 'round', value: 2 }],
      };

      const data = { value: 3.141_59 };
      const result = await applyTransform(data, config);

      expect(result.data.value).toBe(3.14);
    });

    it('should clamp numbers', async () => {
      const config = {
        transforms: [
          {
            field: 'rating',
            fn: 'clamp',
            value: 0,
            options: { max: 5 },
          },
        ],
      };

      const data = { rating: 10 };
      const result = await applyTransform(data, config);

      expect(result.data.rating).toBe(5);
    });
  });

  describe('Date Transforms', () => {
    it('should format date to ISO', async () => {
      const config = {
        transforms: [{ field: 'createdAt', fn: 'toISO' }],
      };

      const date = new Date('2024-01-01T00:00:00.000Z');
      const data = { createdAt: date };
      const result = await applyTransform(data, config);

      expect(result.data.createdAt).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should add time to date', async () => {
      const config = {
        transforms: [
          {
            field: 'expiresAt',
            fn: 'addTime',
            value: 7,
            options: { unit: 'days' },
          },
        ],
      };

      const date = new Date('2024-01-01');
      const data = { expiresAt: date };
      const result = await applyTransform(data, config);

      const expected = new Date('2024-01-08');
      expect(result.data.expiresAt.getTime()).toBe(expected.getTime());
    });
  });

  describe('Array Transforms', () => {
    it('should map array elements', async () => {
      const config = {
        transforms: [
          {
            field: 'tags',
            fn: 'map',
            value: (tag) => tag.toUpperCase(),
          },
        ],
      };

      const data = { tags: ['javascript', 'nodejs', 'testing'] };
      const result = await applyTransform(data, config);

      expect(result.data.tags).toEqual(['JAVASCRIPT', 'NODEJS', 'TESTING']);
    });

    it('should get unique array elements', async () => {
      const config = {
        transforms: [{ field: 'numbers', fn: 'unique' }],
      };

      const data = { numbers: [1, 2, 2, 3, 3, 3, 4] };
      const result = await applyTransform(data, config);

      expect(result.data.numbers).toEqual([1, 2, 3, 4]);
    });

    it('should chunk arrays', async () => {
      const config = {
        transforms: [{ field: 'items', fn: 'chunk', value: 2 }],
      };

      const data = { items: [1, 2, 3, 4, 5] };
      const result = await applyTransform(data, config);

      expect(result.data.items).toEqual([[1, 2], [3, 4], [5]]);
    });
  });

  describe('Object Transforms', () => {
    it('should pick object properties', async () => {
      const config = {
        transforms: [
          { field: 'user', fn: 'pick', value: ['name', 'email'] },
        ],
      };

      const data = {
        user: { name: 'John', email: 'john@example.com', password: 'secret' },
      };
      const result = await applyTransform(data, config);

      expect(result.data.user).toEqual({
        name: 'John',
        email: 'john@example.com',
      });
    });

    it('should omit object properties', async () => {
      const config = {
        transforms: [{ field: 'user', fn: 'omit', value: ['password'] }],
      };

      const data = {
        user: { name: 'John', email: 'john@example.com', password: 'secret' },
      };
      const result = await applyTransform(data, config);

      expect(result.data.user).toEqual({
        name: 'John',
        email: 'john@example.com',
      });
    });

    it('should flatten nested objects', async () => {
      const config = {
        transforms: [
          {
            field: 'data',
            fn: 'flattenObject',
            options: { separator: '.' },
          },
        ],
      };

      const data = {
        data: {
          user: { name: 'John', profile: { age: 30 } },
        },
      };
      const result = await applyTransform(data, config);

      expect(result.data.data).toEqual({
        'user.name': 'John',
        'user.profile.age': 30,
      });
    });
  });

  describe('Conditional Transforms', () => {
    it('should apply transforms based on condition', async () => {
      const config = {
        conditionals: [
          {
            if: (data) => data.status === 'active',
            then: [{ field: 'priority', fn: 'multiply', value: 2 }],
          },
        ],
      };

      const data1 = { status: 'active', priority: 5 };
      const result1 = await applyTransform(data1, config);
      expect(result1.data.priority).toBe(10);

      const data2 = { status: 'inactive', priority: 5 };
      const result2 = await applyTransform(data2, config);
      expect(result2.data.priority).toBe(5);
    });

    it('should apply else transforms', async () => {
      const config = {
        conditionals: [
          {
            if: (data) => data.type === 'premium',
            then: [{ field: 'discount', fn: 'multiply', value: 0.2 }],
            else: [{ field: 'discount', fn: 'multiply', value: 0.1 }],
          },
        ],
      };

      const data1 = { type: 'premium', discount: 100 };
      const result1 = await applyTransform(data1, config);
      expect(result1.data.discount).toBe(20);

      const data2 = { type: 'basic', discount: 100 };
      const result2 = await applyTransform(data2, config);
      expect(result2.data.discount).toBe(10);
    });
  });

  describe('Schema Validation', () => {
    it('should validate output with schema', async () => {
      const schema = z.object({
        name: z.string(),
        email: z.string().email(),
        age: z.number().min(0).max(120),
      });

      const config = {
        transforms: [{ field: 'age', fn: 'multiply', value: 2 }],
        validate: schema,
      };

      const data = { name: 'John', email: 'john@example.com', age: 15 };
      const result = await applyTransform(data, config);

      expect(result.data.age).toBe(30);
      expect(result.errors).toBeUndefined();
    });

    it('should report validation errors', async () => {
      const schema = z.object({
        age: z.number().max(100),
      });

      const config = {
        transforms: [{ field: 'age', fn: 'multiply', value: 10 }],
        validate: schema,
      };

      const data = { age: 20 };
      const result = await applyTransform(data, config);

      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Custom Transforms', () => {
    it('should apply custom transform functions', async () => {
      const config = {
        custom: {
          double: (value) => value * 2,
        },
        transforms: [{ field: 'count', fn: 'double' }],
      };

      const data = { count: 5 };
      const result = await applyTransform(data, config);

      expect(result.data.count).toBe(10);
    });

    it('should register global custom transforms', async () => {
      registerTransform('triple', (value) => value * 3);

      const config = {
        transforms: [{ field: 'value', fn: 'triple' }],
      };

      const data = { value: 10 };
      const result = await applyTransform(data, config);

      expect(result.data.value).toBe(30);
    });
  });

  describe('Transform Composition', () => {
    it('should compose multiple transform configs', async () => {
      const config1 = {
        mapping: { oldName: 'newName' },
        transforms: [{ field: 'newName', fn: 'uppercase' }],
      };

      const config2 = {
        mapping: { oldAge: 'newAge' },
        transforms: [{ field: 'newAge', fn: 'multiply', value: 2 }],
      };

      const composed = composeTransforms(config1, config2);

      const data = { oldName: 'john', oldAge: 15 };
      const result = await applyTransform(data, composed);

      expect(result.data.newName).toBe('JOHN');
      expect(result.data.newAge).toBe(30);
    });
  });

  describe('Transform Templates', () => {
    it('should create and use transform templates', async () => {
      const template = createTransformTemplate('userTransform', {
        mapping: { firstName: 'first_name', lastName: 'last_name' },
        transforms: [
          { field: 'first_name', fn: 'capitalize' },
          { field: 'last_name', fn: 'capitalize' },
        ],
      });

      const data = { firstName: 'john', lastName: 'doe' };
      const result = await template.apply(data);

      expect(result.data.first_name).toBe('John');
      expect(result.data.last_name).toBe('Doe');
    });
  });

  describe('Transform Testing', () => {
    it('should test transforms with samples', async () => {
      const config = {
        transforms: [{ field: 'age', fn: 'multiply', value: 2 }],
        validate: z.object({ age: z.number().max(100) }),
      };

      const samples = [
        { age: 20 }, // Valid: 20 * 2 = 40
        { age: 30 }, // Valid: 30 * 2 = 60
        { age: 60 }, // Invalid: 60 * 2 = 120 > 100
      ];

      const testResult = await testTransform(config, samples);

      expect(testResult.summary.total).toBe(3);
      expect(testResult.summary.success).toBe(2);
      expect(testResult.summary.failure).toBe(1);
      expect(testResult.summary.successRate).toBeCloseTo(66.67, 1);
    });
  });

  describe('Bidirectional Transforms', () => {
    it('should create reverse mapping config', async () => {
      const config = {
        mapping: { oldName: 'newName', oldAge: 'newAge' },
        bidirectional: true,
      };

      const data = { oldName: 'John', oldAge: 30 };
      const result = await applyTransform(data, config);

      expect(result.reverseConfig).toBeDefined();
      expect(result.reverseConfig.mapping).toEqual({
        newName: 'oldName',
        newAge: 'oldAge',
      });
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle complete transformation pipeline', async () => {
      const config = {
        mapping: {
          user_name: 'userName',
          user_email: 'email',
          created_timestamp: 'createdAt',
        },
        transforms: [
          { field: 'userName', fn: 'titleCase' },
          { field: 'email', fn: 'lowercase' },
          { field: 'createdAt', fn: 'toISO' },
        ],
        validate: z.object({
          userName: z.string(),
          email: z.string().email(),
          createdAt: z.string(),
        }),
      };

      const data = {
        user_name: 'john DOE',
        user_email: 'JOHN@EXAMPLE.COM',
        created_timestamp: new Date('2024-01-01'),
      };

      const result = await applyTransform(data, config);

      expect(result.data.userName).toBe('John Doe');
      expect(result.data.email).toBe('john@example.com');
      expect(result.data.createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(result.errors).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should collect transform errors', async () => {
      const config = {
        transforms: [
          { field: 'value', fn: 'nonExistentFunction' },
        ],
      };

      const data = { value: 10 };
      const result = await applyTransform(data, config);

      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.metadata.hasErrors).toBe(true);
    });
  });

  describe('List Transforms', () => {
    it('should list all available transforms', () => {
      const transforms = listTransforms();

      expect(transforms).toContain('uppercase');
      expect(transforms).toContain('multiply');
      expect(transforms).toContain('toISO');
      expect(transforms).toContain('map');
      expect(transforms).toContain('pick');
    });
  });
});
