/**
 * Diff and Merge Tests - Schema-aware diffing and merging
 * @fileoverview Comprehensive tests for diff and merge functionality
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  diffData,
  diffFormats,
  summarizeDiff,
} from '../../src/core/diff.mjs';
import {
  createInteractiveResolver,
  mergeData,
  mergeTwoWay,
  mergeWithSchemaEvolution,
  summarizeMerge,
} from '../../src/core/merge.mjs';

describe('Diff Engine', () => {
  const SimpleSchema = z.object({
    name: z.string(),
    age: z.number(),
    email: z.string().email().optional(),
  });

  const NestedSchema = z.object({
    id: z.string(),
    profile: z.object({
      name: z.string(),
      settings: z.object({
        theme: z.string(),
        notifications: z.boolean(),
      }),
    }),
    tags: z.array(z.string()),
  });

  describe('diffData', () => {
    it('should detect added fields', async () => {
      const oldData = { name: 'John', age: 30 };
      const newData = { name: 'John', age: 30, email: 'john@example.com' };

      const result = await diffData(SimpleSchema, oldData, newData);

      expect(result.added).toContain('email');
      expect(result.statistics.fieldsAdded).toBe(1);
      expect(result.statistics.totalChanges).toBe(1);
    });

    it('should detect removed fields', async () => {
      const oldData = { name: 'John', age: 30, email: 'john@example.com' };
      const newData = { name: 'John', age: 30 };

      const result = await diffData(SimpleSchema, oldData, newData);

      expect(result.removed).toContain('email');
      expect(result.statistics.fieldsRemoved).toBe(1);
    });

    it('should detect changed fields', async () => {
      const oldData = { name: 'John', age: 30 };
      const newData = { name: 'John', age: 31 };

      const result = await diffData(SimpleSchema, oldData, newData);

      expect(result.changed).toContain('age');
      expect(result.statistics.fieldsChanged).toBe(1);
    });

    it('should detect nested changes', async () => {
      const oldData = {
        id: '123',
        profile: {
          name: 'John',
          settings: { theme: 'dark', notifications: true },
        },
        tags: ['user', 'admin'],
      };

      const newData = {
        id: '123',
        profile: {
          name: 'John',
          settings: { theme: 'light', notifications: true },
        },
        tags: ['user', 'admin'],
      };

      const result = await diffData(NestedSchema, oldData, newData);

      expect(result.changed).toContain('profile.settings.theme');
      expect(result.statistics.fieldsChanged).toBe(1);
    });

    it('should detect array changes', async () => {
      const oldData = {
        id: '123',
        profile: {
          name: 'John',
          settings: { theme: 'dark', notifications: true },
        },
        tags: ['user', 'admin'],
      };

      const newData = {
        id: '123',
        profile: {
          name: 'John',
          settings: { theme: 'dark', notifications: true },
        },
        tags: ['user', 'admin', 'moderator'],
      };

      const result = await diffData(NestedSchema, oldData, newData);

      expect(result.added.some(path => path.includes('tags'))).toBe(true);
    });

    it('should calculate statistics correctly', async () => {
      const oldData = { name: 'John', age: 30 };
      const newData = { name: 'Jane', age: 30, email: 'jane@example.com' };

      const result = await diffData(SimpleSchema, oldData, newData);

      expect(result.statistics.totalChanges).toBeGreaterThan(0);
      expect(result.statistics.percentChanged).toBeGreaterThan(0);
      expect(result.statistics.similarity).toBeLessThan(1);
    });

    it('should support semantic comparison', async () => {
      const oldData = { name: 'John  Doe', age: 30 };
      const newData = { name: 'John Doe', age: 30 };

      const result = await diffData(SimpleSchema, oldData, newData, {
        semantic: true,
      });

      // With semantic comparison, whitespace differences should be ignored
      expect(result.statistics.totalChanges).toBe(0);
    });

    it('should ignore specified paths', async () => {
      const oldData = { name: 'John', age: 30 };
      const newData = { name: 'Jane', age: 31 };

      const result = await diffData(SimpleSchema, oldData, newData, {
        ignorePaths: ['name'],
      });

      expect(result.changed).not.toContain('name');
      expect(result.changed).toContain('age');
    });

    it('should support custom comparison function', async () => {
      const oldData = { name: 'John', age: 30 };
      const newData = { name: 'JOHN', age: 30 };

      const result = await diffData(SimpleSchema, oldData, newData, {
        customCompare: (field, oldVal, newVal) => {
          if (typeof oldVal === 'string' && typeof newVal === 'string') {
            return oldVal.toLowerCase() === newVal.toLowerCase();
          }
          return oldVal === newVal;
        },
      });

      expect(result.statistics.totalChanges).toBe(0);
    });

    it('should generate unified diff format', async () => {
      const oldData = { name: 'John', age: 30 };
      const newData = { name: 'Jane', age: 30 };

      const result = await diffData(SimpleSchema, oldData, newData, {
        format: 'unified',
      });

      expect(result.unified).toBeDefined();
      expect(result.unified).toContain('- name:');
      expect(result.unified).toContain('+ name:');
    });

    it('should generate split diff format', async () => {
      const oldData = { name: 'John', age: 30 };
      const newData = { name: 'Jane', age: 30 };

      const result = await diffData(SimpleSchema, oldData, newData, {
        format: 'split',
      });

      expect(result.split).toBeDefined();
      expect(result.split.old).toBeDefined();
      expect(result.split.new).toBeDefined();
    });

    it('should generate JSON Patch format', async () => {
      const oldData = { name: 'John', age: 30 };
      const newData = { name: 'Jane', age: 30 };

      const result = await diffData(SimpleSchema, oldData, newData, {
        format: 'json-patch',
      });

      expect(result.jsonPatch).toBeDefined();
      expect(Array.isArray(result.jsonPatch)).toBe(true);
      expect(result.jsonPatch.some(op => op.op === 'replace')).toBe(true);
    });

    it('should generate JSON Merge Patch format', async () => {
      const oldData = { name: 'John', age: 30 };
      const newData = { name: 'Jane', age: 30 };

      const result = await diffData(SimpleSchema, oldData, newData, {
        format: 'json-merge-patch',
      });

      expect(result.jsonMergePatch).toBeDefined();
      expect(typeof result.jsonMergePatch).toBe('object');
    });

    it('should handle no changes', async () => {
      const data = { name: 'John', age: 30 };

      const result = await diffData(SimpleSchema, data, data);

      expect(result.statistics.totalChanges).toBe(0);
      expect(result.added).toHaveLength(0);
      expect(result.removed).toHaveLength(0);
      expect(result.changed).toHaveLength(0);
    });
  });

  describe('summarizeDiff', () => {
    it('should generate human-readable summary', async () => {
      const oldData = { name: 'John', age: 30 };
      const newData = { name: 'Jane', age: 30, email: 'jane@example.com' };

      const result = await diffData(SimpleSchema, oldData, newData);
      const summary = summarizeDiff(result);

      expect(summary).toContain('changed');
      expect(summary).toContain('added');
    });

    it('should handle no changes', async () => {
      const data = { name: 'John', age: 30 };
      const result = await diffData(SimpleSchema, data, data);
      const summary = summarizeDiff(result);

      expect(summary).toContain('No changes');
    });
  });
});

describe('Merge Engine', () => {
  const SimpleSchema = z.object({
    name: z.string(),
    age: z.number(),
    email: z.string().email().optional(),
  });

  const NestedSchema = z.object({
    id: z.string(),
    profile: z.object({
      name: z.string(),
      bio: z.string().optional(),
    }),
  });

  describe('mergeData - three-way merge', () => {
    it('should merge when only left changed', async () => {
      const base = { name: 'John', age: 30 };
      const left = { name: 'John', age: 31 };
      const right = { name: 'John', age: 30 };

      const result = await mergeData(SimpleSchema, base, left, right);

      expect(result.data.age).toBe(31);
      expect(result.hasConflicts).toBe(false);
      expect(result.statistics.fieldsFromLeft).toBeGreaterThan(0);
    });

    it('should merge when only right changed', async () => {
      const base = { name: 'John', age: 30 };
      const left = { name: 'John', age: 30 };
      const right = { name: 'Jane', age: 30 };

      const result = await mergeData(SimpleSchema, base, left, right);

      expect(result.data.name).toBe('Jane');
      expect(result.hasConflicts).toBe(false);
      expect(result.statistics.fieldsFromRight).toBeGreaterThan(0);
    });

    it('should merge when both changed to same value', async () => {
      const base = { name: 'John', age: 30 };
      const left = { name: 'Jane', age: 30 };
      const right = { name: 'Jane', age: 30 };

      const result = await mergeData(SimpleSchema, base, left, right);

      expect(result.data.name).toBe('Jane');
      expect(result.hasConflicts).toBe(false);
    });

    it('should detect conflict when both changed differently', async () => {
      const base = { name: 'John', age: 30 };
      const left = { name: 'Jane', age: 30 };
      const right = { name: 'Bob', age: 30 };

      await expect(
        mergeData(SimpleSchema, base, left, right, {
          strategy: 'fail-on-conflict',
        })
      ).rejects.toThrow('conflict');
    });

    it('should resolve conflict with prefer-left strategy', async () => {
      const base = { name: 'John', age: 30 };
      const left = { name: 'Jane', age: 30 };
      const right = { name: 'Bob', age: 30 };

      const result = await mergeData(SimpleSchema, base, left, right, {
        strategy: 'prefer-left',
      });

      expect(result.data.name).toBe('Jane');
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.hasConflicts).toBe(false);
    });

    it('should resolve conflict with prefer-right strategy', async () => {
      const base = { name: 'John', age: 30 };
      const left = { name: 'Jane', age: 30 };
      const right = { name: 'Bob', age: 30 };

      const result = await mergeData(SimpleSchema, base, left, right, {
        strategy: 'prefer-right',
      });

      expect(result.data.name).toBe('Bob');
      expect(result.hasConflicts).toBe(false);
    });

    it('should use custom conflict resolver', async () => {
      const base = { name: 'John', age: 30 };
      const left = { name: 'Jane', age: 30 };
      const right = { name: 'Bob', age: 30 };

      const result = await mergeData(SimpleSchema, base, left, right, {
        strategy: 'custom',
        onConflict: (field, base, left, right) => {
          // Always prefer longer name
          return left.length > right.length ? left : right;
        },
      });

      expect(result.data.name).toBe('Jane');
      expect(result.hasConflicts).toBe(false);
    });

    it('should apply field-specific rules', async () => {
      const base = { name: 'John', age: 30 };
      const left = { name: 'Jane', age: 31 };
      const right = { name: 'Bob', age: 32 };

      const result = await mergeData(SimpleSchema, base, left, right, {
        strategy: 'prefer-left',
        fieldRules: {
          age: 'prefer-right',
        },
      });

      expect(result.data.name).toBe('Jane');
      expect(result.data.age).toBe(32);
    });

    it('should track provenance', async () => {
      const base = { name: 'John', age: 30 };
      const left = { name: 'John', age: 31 };
      const right = { name: 'John', age: 30 };

      const result = await mergeData(SimpleSchema, base, left, right, {
        trackProvenance: true,
      });

      expect(result.provenance).toBeDefined();
      expect(result.provenance.timestamp).toBeDefined();
      expect(result.provenance.strategy).toBeDefined();
      expect(result.provenance.baseHash).toBeDefined();
    });

    it('should validate merged result', async () => {
      const base = { name: 'John', age: 30 };
      const left = { name: 'John', age: 31 };
      const right = { name: 'John', age: 30 };

      const result = await mergeData(SimpleSchema, base, left, right, {
        validate: true,
      });

      expect(result.data).toBeDefined();
      expect(() => SimpleSchema.parse(result.data)).not.toThrow();
    });

    it('should merge nested objects', async () => {
      const base = {
        id: '123',
        profile: { name: 'John', bio: 'Developer' },
      };
      const left = {
        id: '123',
        profile: { name: 'Jane', bio: 'Developer' },
      };
      const right = {
        id: '123',
        profile: { name: 'John', bio: 'Engineer' },
      };

      const result = await mergeData(NestedSchema, base, left, right, {
        strategy: 'prefer-left',
      });

      // Left changed name (John -> Jane), right changed bio (Developer -> Engineer)
      // With prefer-left and both sides changing different fields, both should be taken
      expect(result.data.profile.name).toBe('Jane');
      // bio should be 'Engineer' since only right changed it
      expect(result.data.profile.bio).toBe('Engineer');
    });

    it('should handle unchanged fields', async () => {
      const base = { name: 'John', age: 30 };
      const left = { name: 'John', age: 30 };
      const right = { name: 'John', age: 30 };

      const result = await mergeData(SimpleSchema, base, left, right);

      expect(result.data).toEqual(base);
      expect(result.statistics.fieldsFromBase).toBeGreaterThan(0);
      expect(result.hasConflicts).toBe(false);
    });
  });

  describe('mergeTwoWay', () => {
    it('should perform two-way merge', async () => {
      const left = { name: 'John', age: 30 };
      const right = { name: 'Jane', age: 30 };

      const result = await mergeTwoWay(SimpleSchema, left, right, {
        strategy: 'prefer-right',
      });

      // Two-way merge uses left as base, so right's changes are applied
      expect(result.data.name).toBe('Jane');
    });
  });

  describe('mergeWithSchemaEvolution', () => {
    it('should merge with evolved schema', async () => {
      const OldSchema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const NewSchema = z.object({
        name: z.string(),
        age: z.number(),
        email: z.string().email().optional(),
      });

      const base = { name: 'John', age: 30 };
      const left = { name: 'John', age: 31, email: 'john@example.com' };
      const right = { name: 'John', age: 30, email: 'john@test.com' };

      const result = await mergeWithSchemaEvolution(
        OldSchema,
        NewSchema,
        base,
        left,
        right,
        { strategy: 'prefer-left' }
      );

      expect(result.data.email).toBe('john@example.com');
    });
  });

  describe('summarizeMerge', () => {
    it('should generate summary', async () => {
      const base = { name: 'John', age: 30 };
      const left = { name: 'John', age: 31 };
      const right = { name: 'John', age: 30 };

      const result = await mergeData(SimpleSchema, base, left, right);
      const summary = summarizeMerge(result);

      expect(summary).toContain('Total fields');
      expect(summary).toContain('From left');
    });
  });

  describe('createInteractiveResolver', () => {
    it('should create interactive resolver', () => {
      const promptUser = async conflict => conflict.leftValue;
      const resolver = createInteractiveResolver(promptUser);

      expect(typeof resolver).toBe('function');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', async () => {
      const NullableSchema = z.object({
        name: z.string().nullable(),
        age: z.number(),
      });

      const base = { name: 'John', age: 30 };
      // eslint-disable-next-line unicorn/no-null
      const left = { name: null, age: 30 };
      const right = { name: 'John', age: 30 };

      const result = await mergeData(NullableSchema, base, left, right);

      // eslint-disable-next-line unicorn/no-null
      expect(result.data.name).toBe(null);
    });

    it('should handle empty objects', async () => {
      // Use a schema that allows optional fields
      const PartialSchema = z.object({
        name: z.string().optional(),
        age: z.number().optional(),
      });

      const base = {};
      const left = { name: 'John', age: 30 };
      const right = {};

      const result = await mergeData(PartialSchema, base, left, right);

      expect(result.data.name).toBe('John');
    });

    it('should handle array conflicts', async () => {
      const ArraySchema = z.object({
        tags: z.array(z.string()),
      });

      const base = { tags: ['a', 'b'] };
      const left = { tags: ['a', 'c'] };
      const right = { tags: ['a', 'd'] };

      await expect(
        mergeData(ArraySchema, base, left, right, {
          strategy: 'fail-on-conflict',
        })
      ).rejects.toThrow();
    });
  });
});
