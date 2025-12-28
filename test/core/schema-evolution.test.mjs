/**
 * Schema Evolution & Migration Tests
 * @fileoverview Comprehensive tests for schema evolution and migration functionality
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  createSchemaEvolution,
  addSchemaVersion,
  getSchemaVersion,
  getCurrentSchemaVersion,
  listSchemaVersions,
  checkSchemaCompatibility,
  validateMigrationPath,
  createMigrationProvenance,
  listSchemaEvolutions,
  removeSchemaEvolution,
  clearSchemaRegistry,
  findSchemaVersionByHash,
} from '../../src/core/schema-evolution.mjs';
import {
  createMigration,
  executeMigration,
  executeBidirectionalMigration,
  buildMigrationChain,
  executeMigrationChain,
  rollbackMigrationChain,
  getMigration,
  listMigrations,
  clearMigrationRegistry,
} from '../../src/core/schema-migration.mjs';

describe('Schema Evolution System', () => {
  // Clean up after each test
  afterEach(() => {
    clearSchemaRegistry();
    clearMigrationRegistry();
  });

  describe('Schema Versioning', () => {
    it('should create a new schema evolution', () => {
      const UserV1 = z.object({
        name: z.string(),
        email: z.string().email(),
      });

      const evolution = createSchemaEvolution('User', UserV1, {
        description: 'Initial user schema',
      });

      expect(evolution).toBeDefined();
      expect(evolution.name).toBe('User');
      expect(evolution.currentVersion).toBe(1);
      expect(evolution.versions.size).toBe(1);
    });

    it('should prevent duplicate schema evolution creation', () => {
      const UserV1 = z.object({ name: z.string() });

      createSchemaEvolution('User', UserV1);

      expect(() => createSchemaEvolution('User', UserV1)).toThrow(
        "Schema evolution 'User' already exists"
      );
    });

    it('should add a new version to existing schema', () => {
      const UserV1 = z.object({ name: z.string() });
      const UserV2 = z.object({
        firstName: z.string(),
        lastName: z.string(),
      });

      createSchemaEvolution('User', UserV1);
      const v2 = addSchemaVersion('User', UserV2, {
        description: 'Split name into first and last',
      });

      expect(v2.version).toBe(2);
      expect(v2.description).toBe('Split name into first and last');
    });

    it('should allow adding same schema structure with different versions', () => {
      const UserV1 = z.object({ name: z.string() });
      const UserV2 = z.object({ name: z.string() }); // Same structure, different object

      createSchemaEvolution('User', UserV1);

      // Should not throw - different versions can have same structure
      expect(() => addSchemaVersion('User', UserV2)).not.toThrow();
    });

    it('should get specific schema version', () => {
      const UserV1 = z.object({ name: z.string() });
      const UserV2 = z.object({ firstName: z.string(), lastName: z.string() });

      createSchemaEvolution('User', UserV1);
      addSchemaVersion('User', UserV2);

      const v1 = getSchemaVersion('User', 1);
      const v2 = getSchemaVersion('User', 2);

      expect(v1.version).toBe(1);
      expect(v2.version).toBe(2);
    });

    it('should get current schema version', () => {
      const UserV1 = z.object({ name: z.string() });
      const UserV2 = z.object({ firstName: z.string(), lastName: z.string() });

      createSchemaEvolution('User', UserV1);
      addSchemaVersion('User', UserV2);

      const current = getCurrentSchemaVersion('User');

      expect(current.version).toBe(2);
    });

    it('should list all schema versions', () => {
      const UserV1 = z.object({ name: z.string() });
      const UserV2 = z.object({ firstName: z.string(), lastName: z.string() });
      const UserV3 = z.object({
        firstName: z.string(),
        lastName: z.string(),
        age: z.number().optional(),
      });

      createSchemaEvolution('User', UserV1);
      addSchemaVersion('User', UserV2);
      addSchemaVersion('User', UserV3);

      const versions = listSchemaVersions('User');

      expect(versions).toHaveLength(3);
      expect(versions[0].version).toBe(1);
      expect(versions[1].version).toBe(2);
      expect(versions[2].version).toBe(3);
    });

    it('should find schema version by hash', () => {
      const UserV1 = z.object({ name: z.string() });

      const evolution = createSchemaEvolution('User', UserV1);
      const v1 = getSchemaVersion('User', 1);

      const found = findSchemaVersionByHash('User', v1.hash);

      expect(found).toBeDefined();
      expect(found.version).toBe(1);
    });

    it('should list all schema evolutions', () => {
      const UserV1 = z.object({ name: z.string() });
      const ProductV1 = z.object({ title: z.string() });

      createSchemaEvolution('User', UserV1);
      createSchemaEvolution('Product', ProductV1);

      const evolutions = listSchemaEvolutions();

      expect(evolutions).toContain('User');
      expect(evolutions).toContain('Product');
    });

    it('should remove schema evolution', () => {
      const UserV1 = z.object({ name: z.string() });

      createSchemaEvolution('User', UserV1);
      expect(listSchemaEvolutions()).toContain('User');

      const removed = removeSchemaEvolution('User');
      expect(removed).toBe(true);
      expect(listSchemaEvolutions()).not.toContain('User');
    });
  });

  describe('Schema Compatibility Checking', () => {
    it('should detect identical schemas as fully compatible', () => {
      const schema = z.object({ name: z.string() });

      const result = checkSchemaCompatibility(schema, schema);

      expect(result.compatible).toBe(true);
      expect(result.compatibilityType).toBe('full');
      expect(result.issues).toHaveLength(0);
    });

    it('should detect backward compatibility', () => {
      const v1 = z.object({
        name: z.string(),
        email: z.string(),
      });
      const v2 = z.object({
        name: z.string(),
        email: z.string().optional(),
      });

      const result = checkSchemaCompatibility(v1, v2);

      expect(result.compatible).toBe(true);
    });

    it('should detect breaking changes', () => {
      const v1 = z.object({
        name: z.string(),
      });
      const v2 = z.object({
        name: z.string(),
        email: z.string(), // New required field
      });

      const result = checkSchemaCompatibility(v1, v2);

      expect(result.compatible).toBe(false);
      expect(result.compatibilityType).toBe('breaking');
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Migration Validation', () => {
    it('should validate migration path with compatible schemas', () => {
      const UserV1 = z.object({ name: z.string() });
      const UserV2 = z.object({
        firstName: z.string(),
        lastName: z.string(),
      });

      createSchemaEvolution('User', UserV1);
      addSchemaVersion('User', UserV2);

      const testData = { name: 'John Doe' };
      const result = validateMigrationPath('User', 1, 2, testData);

      expect(result.valid).toBe(true);
      expect(result.testDataValid).toBe(true);
    });

    it('should fail validation with invalid test data', () => {
      const UserV1 = z.object({ name: z.string() });
      const UserV2 = z.object({ firstName: z.string(), lastName: z.string() });

      createSchemaEvolution('User', UserV1);
      addSchemaVersion('User', UserV2);

      const invalidData = { name: 123 }; // Should be string
      const result = validateMigrationPath('User', 1, 2, invalidData);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('validation failed');
    });
  });

  describe('Migration Creation and Execution', () => {
    it('should create a migration between schema versions', () => {
      const UserV1 = z.object({ name: z.string() });
      const UserV2 = z.object({ firstName: z.string(), lastName: z.string() });

      createSchemaEvolution('User', UserV1);
      addSchemaVersion('User', UserV2);

      const migration = createMigration(
        'User',
        2,
        data => {
          const [first, ...rest] = data.name.split(' ');
          return { firstName: first, lastName: rest.join(' ') };
        },
        { description: 'Split name into first and last' }
      );

      expect(migration).toBeDefined();
      expect(migration.schemaName).toBe('User');
      expect(migration.fromVersion).toBe(1);
      expect(migration.toVersion).toBe(2);
    });

    it('should execute a migration successfully', async () => {
      const UserV1 = z.object({ name: z.string() });
      const UserV2 = z.object({ firstName: z.string(), lastName: z.string() });

      createSchemaEvolution('User', UserV1);
      addSchemaVersion('User', UserV2);

      const migration = createMigration('User', 2, data => {
        const [first, ...rest] = data.name.split(' ');
        return { firstName: first, lastName: rest.join(' ') };
      });

      const result = await executeMigration(migration, { name: 'John Doe' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        firstName: 'John',
        lastName: 'Doe',
      });
    });

    it('should validate input data before migration', async () => {
      const UserV1 = z.object({ name: z.string() });
      const UserV2 = z.object({ firstName: z.string(), lastName: z.string() });

      createSchemaEvolution('User', UserV1);
      addSchemaVersion('User', UserV2);

      const migration = createMigration('User', 2, data => {
        const [first, ...rest] = data.name.split(' ');
        return { firstName: first, lastName: rest.join(' ') };
      });

      const result = await executeMigration(migration, { name: 123 }); // Invalid

      expect(result.success).toBe(false);
      expect(result.error).toContain('Input validation failed');
    });

    it('should validate output data after migration', async () => {
      const UserV1 = z.object({ name: z.string() });
      const UserV2 = z.object({ firstName: z.string(), lastName: z.string() });

      createSchemaEvolution('User', UserV1);
      addSchemaVersion('User', UserV2);

      const migration = createMigration('User', 2, data => {
        // Bad migration - returns invalid data
        return { firstName: 123 }; // Missing lastName, wrong type
      });

      const result = await executeMigration(migration, { name: 'John Doe' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Output validation failed');
    });

    it('should support dry-run mode', async () => {
      const UserV1 = z.object({ name: z.string() });
      const UserV2 = z.object({ firstName: z.string(), lastName: z.string() });

      createSchemaEvolution('User', UserV1);
      addSchemaVersion('User', UserV2);

      const migration = createMigration('User', 2, data => {
        const [first, ...rest] = data.name.split(' ');
        return { firstName: first, lastName: rest.join(' ') };
      });

      const result = await executeMigration(migration, { name: 'John Doe' }, { dryRun: true });

      expect(result.success).toBe(true);
      expect(result.provenance.dryRun).toBe(true);
      // In dry-run, data should not be transformed
      expect(result.data).toEqual({ name: 'John Doe' });
    });

    it('should include provenance in migration result', async () => {
      const UserV1 = z.object({ name: z.string() });
      const UserV2 = z.object({ firstName: z.string(), lastName: z.string() });

      createSchemaEvolution('User', UserV1);
      addSchemaVersion('User', UserV2);

      const migration = createMigration('User', 2, data => {
        const [first, ...rest] = data.name.split(' ');
        return { firstName: first, lastName: rest.join(' ') };
      });

      const result = await executeMigration(migration, { name: 'John Doe' }, {
        includeProvenance: true,
      });

      expect(result.provenance).toBeDefined();
      expect(result.provenance.schemaName).toBe('User');
      expect(result.provenance.fromVersion).toBe(1);
      expect(result.provenance.toVersion).toBe(2);
      expect(result.provenance.timestamp).toBeDefined();
    });
  });

  describe('Bidirectional Migrations', () => {
    it('should execute forward migration', async () => {
      const UserV1 = z.object({ name: z.string() });
      const UserV2 = z.object({ firstName: z.string(), lastName: z.string() });

      createSchemaEvolution('User', UserV1);
      addSchemaVersion('User', UserV2);

      const migration = createMigration(
        'User',
        2,
        data => {
          const [first, ...rest] = data.name.split(' ');
          return { firstName: first, lastName: rest.join(' ') };
        },
        {
          backward: data => {
            return { name: `${data.firstName} ${data.lastName}` };
          },
        }
      );

      const result = await executeBidirectionalMigration(
        migration,
        { name: 'John Doe' },
        'forward'
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        firstName: 'John',
        lastName: 'Doe',
      });
    });

    it('should execute backward migration', async () => {
      const UserV1 = z.object({ name: z.string() });
      const UserV2 = z.object({ firstName: z.string(), lastName: z.string() });

      createSchemaEvolution('User', UserV1);
      addSchemaVersion('User', UserV2);

      const migration = createMigration(
        'User',
        2,
        data => {
          const [first, ...rest] = data.name.split(' ');
          return { firstName: first, lastName: rest.join(' ') };
        },
        {
          backward: data => {
            return { name: `${data.firstName} ${data.lastName}` };
          },
        }
      );

      const result = await executeBidirectionalMigration(
        migration,
        { firstName: 'John', lastName: 'Doe' },
        'backward'
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'John Doe' });
    });

    it('should fail if backward migration not defined', async () => {
      const UserV1 = z.object({ name: z.string() });
      const UserV2 = z.object({ firstName: z.string(), lastName: z.string() });

      createSchemaEvolution('User', UserV1);
      addSchemaVersion('User', UserV2);

      const migration = createMigration('User', 2, data => {
        const [first, ...rest] = data.name.split(' ');
        return { firstName: first, lastName: rest.join(' ') };
      });

      const result = await executeBidirectionalMigration(
        migration,
        { firstName: 'John', lastName: 'Doe' },
        'backward'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Backward migration not defined');
    });
  });

  describe('Migration Chains', () => {
    it('should build migration chain for multiple versions', () => {
      const UserV1 = z.object({ name: z.string() });
      const UserV2 = z.object({ firstName: z.string(), lastName: z.string() });
      const UserV3 = z.object({
        firstName: z.string(),
        lastName: z.string(),
        age: z.number().optional(),
      });

      createSchemaEvolution('User', UserV1);
      addSchemaVersion('User', UserV2);
      addSchemaVersion('User', UserV3);

      createMigration('User', 2, data => {
        const [first, ...rest] = data.name.split(' ');
        return { firstName: first, lastName: rest.join(' ') };
      });

      createMigration('User', 3, data => {
        return { ...data, age: undefined };
      });

      const chain = buildMigrationChain('User', 1, 3);

      expect(chain).toBeDefined();
      expect(chain.migrations).toHaveLength(2);
      expect(chain.fromVersion).toBe(1);
      expect(chain.toVersion).toBe(3);
    });

    it('should execute migration chain successfully', async () => {
      const UserV1 = z.object({ name: z.string() });
      const UserV2 = z.object({ firstName: z.string(), lastName: z.string() });
      const UserV3 = z.object({
        firstName: z.string(),
        lastName: z.string(),
        age: z.number().optional(),
      });

      createSchemaEvolution('User', UserV1);
      addSchemaVersion('User', UserV2);
      addSchemaVersion('User', UserV3);

      createMigration('User', 2, data => {
        const [first, ...rest] = data.name.split(' ');
        return { firstName: first, lastName: rest.join(' ') };
      });

      createMigration('User', 3, data => {
        return { ...data, age: 30 };
      });

      const chain = buildMigrationChain('User', 1, 3);
      const result = await executeMigrationChain(chain, { name: 'John Doe' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
      });
      expect(result.versionsApplied).toEqual([1, 2, 3]);
    });

    it('should stop chain execution on error', async () => {
      const UserV1 = z.object({ name: z.string() });
      const UserV2 = z.object({ firstName: z.string(), lastName: z.string() });
      const UserV3 = z.object({
        firstName: z.string(),
        lastName: z.string(),
        age: z.number(),
      });

      createSchemaEvolution('User', UserV1);
      addSchemaVersion('User', UserV2);
      addSchemaVersion('User', UserV3);

      createMigration('User', 2, data => {
        const [first, ...rest] = data.name.split(' ');
        return { firstName: first, lastName: rest.join(' ') };
      });

      // This migration will fail validation - age is required but we return undefined
      createMigration('User', 3, data => {
        return { ...data }; // Missing required age field
      });

      const chain = buildMigrationChain('User', 1, 3);
      const result = await executeMigrationChain(chain, { name: 'John Doe' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Migration chain failed');
    });

    it('should rollback migration chain', async () => {
      const UserV1 = z.object({ name: z.string() });
      const UserV2 = z.object({ firstName: z.string(), lastName: z.string() });
      const UserV3 = z.object({
        firstName: z.string(),
        lastName: z.string(),
        age: z.number().optional(),
      });

      createSchemaEvolution('User', UserV1);
      addSchemaVersion('User', UserV2);
      addSchemaVersion('User', UserV3);

      createMigration(
        'User',
        2,
        data => {
          const [first, ...rest] = data.name.split(' ');
          return { firstName: first, lastName: rest.join(' ') };
        },
        {
          backward: data => {
            return { name: `${data.firstName} ${data.lastName}` };
          },
        }
      );

      createMigration(
        'User',
        3,
        data => {
          return { ...data, age: 30 };
        },
        {
          backward: data => {
            const { age, ...rest } = data;
            return rest;
          },
        }
      );

      const chain = buildMigrationChain('User', 1, 3);

      // First migrate forward
      const forwardResult = await executeMigrationChain(chain, { name: 'John Doe' });
      expect(forwardResult.success).toBe(true);

      // Then rollback
      const rollbackResult = await rollbackMigrationChain(chain, forwardResult.data);

      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.data).toEqual({ name: 'John Doe' });
    });
  });

  describe('Migration Registry', () => {
    it('should retrieve registered migration', () => {
      const UserV1 = z.object({ name: z.string() });
      const UserV2 = z.object({ firstName: z.string(), lastName: z.string() });

      createSchemaEvolution('User', UserV1);
      addSchemaVersion('User', UserV2);

      createMigration('User', 2, data => {
        const [first, ...rest] = data.name.split(' ');
        return { firstName: first, lastName: rest.join(' ') };
      });

      const migration = getMigration('User', 1, 2);

      expect(migration).toBeDefined();
      expect(migration.fromVersion).toBe(1);
      expect(migration.toVersion).toBe(2);
    });

    it('should list all migrations for a schema', () => {
      const UserV1 = z.object({ name: z.string() });
      const UserV2 = z.object({ firstName: z.string(), lastName: z.string() });
      const UserV3 = z.object({
        firstName: z.string(),
        lastName: z.string(),
        age: z.number().optional(),
      });

      createSchemaEvolution('User', UserV1);
      addSchemaVersion('User', UserV2);
      addSchemaVersion('User', UserV3);

      createMigration('User', 2, data => data);
      createMigration('User', 3, data => data);

      const migrations = listMigrations('User');

      expect(migrations).toHaveLength(2);
    });
  });

  describe('Migration Provenance', () => {
    it('should create migration provenance', () => {
      const UserV1 = z.object({ name: z.string() });
      const UserV2 = z.object({ firstName: z.string(), lastName: z.string() });
      const UserV3 = z.object({
        firstName: z.string(),
        lastName: z.string(),
        age: z.number().optional(),
      });

      createSchemaEvolution('User', UserV1);
      addSchemaVersion('User', UserV2);
      addSchemaVersion('User', UserV3);

      const provenance = createMigrationProvenance('User', [1, 2, 3]);

      expect(provenance.schemaName).toBe('User');
      expect(provenance.migrationsApplied).toEqual([1, 2, 3]);
      expect(provenance.versionDetails).toHaveLength(3);
      expect(provenance.migrationTimestamp).toBeDefined();
    });
  });

  describe('Direct Schema Migrations (Non-Versioned)', () => {
    it('should create migration with direct schemas', () => {
      const fromSchema = z.object({ name: z.string() });
      const toSchema = z.object({ firstName: z.string(), lastName: z.string() });

      const migration = createMigration(fromSchema, toSchema, data => {
        const [first, ...rest] = data.name.split(' ');
        return { firstName: first, lastName: rest.join(' ') };
      });

      expect(migration.fromSchema).toBe(fromSchema);
      expect(migration.toSchema).toBe(toSchema);
    });

    it('should execute direct schema migration', async () => {
      const fromSchema = z.object({ name: z.string() });
      const toSchema = z.object({ firstName: z.string(), lastName: z.string() });

      const migration = createMigration(fromSchema, toSchema, data => {
        const [first, ...rest] = data.name.split(' ');
        return { firstName: first, lastName: rest.join(' ') };
      });

      const result = await executeMigration(migration, { name: 'John Doe' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        firstName: 'John',
        lastName: 'Doe',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent schema evolution', () => {
      expect(() => addSchemaVersion('NonExistent', z.object({}))).toThrow(
        "Schema evolution 'NonExistent' not found"
      );
    });

    it('should handle migration errors gracefully', async () => {
      const UserV1 = z.object({ name: z.string() });
      const UserV2 = z.object({ firstName: z.string(), lastName: z.string() });

      createSchemaEvolution('User', UserV1);
      addSchemaVersion('User', UserV2);

      const migration = createMigration('User', 2, data => {
        throw new Error('Migration failed');
      });

      const result = await executeMigration(migration, { name: 'John Doe' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Migration execution failed');
    });

    it('should handle missing migration in chain', () => {
      const UserV1 = z.object({ name: z.string() });
      const UserV2 = z.object({ firstName: z.string(), lastName: z.string() });
      const UserV3 = z.object({
        firstName: z.string(),
        lastName: z.string(),
        age: z.number().optional(),
      });

      createSchemaEvolution('User', UserV1);
      addSchemaVersion('User', UserV2);
      addSchemaVersion('User', UserV3);

      // Only create migration for v1->v2, not v2->v3
      createMigration('User', 2, data => data);

      const chain = buildMigrationChain('User', 1, 3);

      expect(chain).toBeNull(); // No complete path exists
    });
  });

  describe('Integration with ZTF Core', () => {
    it('should work with parseFrom for versioned schemas', async () => {
      const UserV1 = z.object({ name: z.string() });
      const UserV2 = z.object({ firstName: z.string(), lastName: z.string() });

      createSchemaEvolution('User', UserV1);
      addSchemaVersion('User', UserV2);

      const migration = createMigration('User', 2, data => {
        const [first, ...rest] = data.name.split(' ');
        return { firstName: first, lastName: rest.join(' ') };
      });

      // Simulate old data in v1 format
      const v1Data = { name: 'John Doe' };

      // Execute migration to v2
      const result = await executeMigration(migration, v1Data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        firstName: 'John',
        lastName: 'Doe',
      });

      // Verify v2 schema validates the migrated data
      const v2Schema = getSchemaVersion('User', 2).schema;
      expect(() => v2Schema.parse(result.data)).not.toThrow();
    });
  });
});
