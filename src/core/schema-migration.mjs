/**
 * Schema Migration System - Migration builder and execution engine
 * @fileoverview Provides migration creation, validation, and execution capabilities
 */

import {
  getSchemaVersion,
  getSchemaEvolution,
  checkSchemaCompatibility,
  createMigrationProvenance,
} from './schema-evolution.mjs';

/**
 * @typedef {import('zod').ZodSchema} ZodSchema
 * @typedef {import('./schema-evolution.mjs').SchemaVersion} SchemaVersion
 */

/**
 * Migration function type
 * @typedef {function(any): any|Promise<any>} MigrationFunction
 */

/**
 * Migration definition
 * @typedef {Object} Migration
 * @property {string} [schemaName] - Schema name (if using versioned schemas)
 * @property {number} [fromVersion] - Source version number
 * @property {number} [toVersion] - Target version number
 * @property {ZodSchema} [fromSchema] - Source schema (if not using versioned schemas)
 * @property {ZodSchema} [toSchema] - Target schema (if not using versioned schemas)
 * @property {MigrationFunction} forward - Forward migration function
 * @property {MigrationFunction} [backward] - Backward migration function (optional)
 * @property {string} description - Migration description
 * @property {boolean} [validateInput] - Whether to validate input data (default: true)
 * @property {boolean} [validateOutput] - Whether to validate output data (default: true)
 */

/**
 * Migration execution result
 * @typedef {Object} MigrationResult
 * @property {any} data - Migrated data
 * @property {Object} provenance - Migration provenance information
 * @property {number[]} [versionsApplied] - Version numbers that were migrated through
 * @property {string[]} [migrationsApplied] - Migration descriptions
 * @property {boolean} success - Whether migration succeeded
 * @property {string} [error] - Error message if migration failed
 */

/**
 * Migration chain for executing multiple migrations
 * @typedef {Object} MigrationChain
 * @property {string} schemaName - Schema name
 * @property {number} fromVersion - Starting version
 * @property {number} toVersion - Target version
 * @property {Migration[]} migrations - Ordered list of migrations to apply
 */

/**
 * Internal registry of migrations
 * @type {Map<string, Map<string, Migration>>}
 * Key format: schemaName -> "fromVersion->toVersion" -> Migration
 */
const migrationRegistry = new Map();

/**
 * Create a new migration between schema versions
 * @param {ZodSchema|string} fromSchemaOrName - Source schema or schema name (if using versioned schemas)
 * @param {ZodSchema|number} toSchemaOrVersion - Target schema or version number
 * @param {MigrationFunction} transformFn - Transformation function
 * @param {Object} [options] - Migration options
 * @param {string} [options.description] - Migration description
 * @param {MigrationFunction} [options.backward] - Backward migration function
 * @param {boolean} [options.validateInput=true] - Validate input data
 * @param {boolean} [options.validateOutput=true] - Validate output data
 * @returns {Migration} The migration object
 */
export function createMigration(fromSchemaOrName, toSchemaOrVersion, transformFn, options = {}) {
  const migration = {
    forward: transformFn,
    backward: options.backward,
    description: options.description || 'Schema migration',
    validateInput: options.validateInput !== false,
    validateOutput: options.validateOutput !== false,
  };

  // Handle versioned schema migrations
  if (typeof fromSchemaOrName === 'string' && typeof toSchemaOrVersion === 'number') {
    const schemaName = fromSchemaOrName;
    const toVersion = toSchemaOrVersion;

    const evolution = getSchemaEvolution(schemaName);
    if (!evolution) {
      throw new Error(`Schema evolution '${schemaName}' not found`);
    }

    // Assume migrating from previous version
    const fromVersion = toVersion - 1;

    const fromSchemaVersion = getSchemaVersion(schemaName, fromVersion);
    const toSchemaVersion = getSchemaVersion(schemaName, toVersion);

    if (!fromSchemaVersion) {
      throw new Error(`Version ${fromVersion} not found for schema '${schemaName}'`);
    }

    if (!toSchemaVersion) {
      throw new Error(`Version ${toVersion} not found for schema '${schemaName}'`);
    }

    migration.schemaName = schemaName;
    migration.fromVersion = fromVersion;
    migration.toVersion = toVersion;
    migration.fromSchema = fromSchemaVersion.schema;
    migration.toSchema = toSchemaVersion.schema;

    // Register in migration registry
    if (!migrationRegistry.has(schemaName)) {
      migrationRegistry.set(schemaName, new Map());
    }

    const schemaKey = `${fromVersion}->${toVersion}`;
    migrationRegistry.get(schemaName).set(schemaKey, migration);
  } else {
    // Handle direct schema migrations
    migration.fromSchema = fromSchemaOrName;
    migration.toSchema = toSchemaOrVersion;
  }

  return migration;
}

/**
 * Execute a migration on data
 * @param {Migration} migration - Migration to execute
 * @param {any} data - Data to migrate
 * @param {Object} [options] - Execution options
 * @param {boolean} [options.dryRun=false] - Preview migration without applying
 * @param {boolean} [options.includeProvenance=true] - Include provenance in result
 * @returns {Promise<MigrationResult>} Migration result
 */
export async function executeMigration(migration, data, options = {}) {
  const dryRun = options.dryRun || false;
  const includeProvenance = options.includeProvenance !== false;

  try {
    // Validate input if requested
    if (migration.validateInput && migration.fromSchema) {
      try {
        migration.fromSchema.parse(data);
      } catch (error) {
        return {
          data: undefined,
          provenance: {},
          success: false,
          error: `Input validation failed: ${error.message}`,
        };
      }
    }

    // Execute migration (unless dry run)
    let migratedData = data;
    if (!dryRun) {
      migratedData = await migration.forward(data);

      // Validate output if requested
      if (migration.validateOutput && migration.toSchema) {
        try {
          migration.toSchema.parse(migratedData);
        } catch (error) {
          return {
            data: undefined,
            provenance: {},
            success: false,
            error: `Output validation failed: ${error.message}`,
          };
        }
      }
    }

    // Build provenance
    const provenance = {
      migrationDescription: migration.description,
      timestamp: new Date().toISOString(),
      dryRun,
    };

    if (migration.schemaName) {
      provenance.schemaName = migration.schemaName;
      provenance.fromVersion = migration.fromVersion;
      provenance.toVersion = migration.toVersion;
    }

    return {
      data: migratedData,
      provenance: includeProvenance ? provenance : undefined,
      success: true,
    };
  } catch (error) {
    return {
      data: undefined,
      provenance: {},
      success: false,
      error: `Migration execution failed: ${error.message}`,
    };
  }
}

/**
 * Execute a bidirectional migration (with rollback capability)
 * @param {Migration} migration - Migration to execute
 * @param {any} data - Data to migrate
 * @param {'forward'|'backward'} direction - Migration direction
 * @param {Object} [options] - Execution options
 * @returns {Promise<MigrationResult>} Migration result
 */
export async function executeBidirectionalMigration(migration, data, direction, options = {}) {
  if (direction === 'backward') {
    if (!migration.backward) {
      return {
        data: undefined,
        provenance: {},
        success: false,
        error: 'Backward migration not defined',
      };
    }

    // Create temporary migration object for backward direction
    const backwardMigration = {
      forward: migration.backward,
      fromSchema: migration.toSchema,
      toSchema: migration.fromSchema,
      description: `${migration.description} (backward)`,
      validateInput: migration.validateOutput,
      validateOutput: migration.validateInput,
    };

    return executeMigration(backwardMigration, data, options);
  }

  return executeMigration(migration, data, options);
}

/**
 * Build a migration chain between two versions
 * @param {string} schemaName - Schema name
 * @param {number} fromVersion - Starting version
 * @param {number} toVersion - Target version
 * @returns {MigrationChain|null} Migration chain or null if no path exists
 */
export function buildMigrationChain(schemaName, fromVersion, toVersion) {
  const schemaMigrations = migrationRegistry.get(schemaName);
  if (!schemaMigrations) {
    return null;
  }

  const migrations = [];
  const direction = fromVersion < toVersion ? 1 : -1;
  let currentVersion = fromVersion;

  while (currentVersion !== toVersion) {
    const nextVersion = currentVersion + direction;
    const key =
      direction > 0
        ? `${currentVersion}->${nextVersion}`
        : `${nextVersion}->${currentVersion}`;

    const migration = schemaMigrations.get(key);
    if (!migration) {
      return null; // No path exists
    }

    migrations.push(migration);
    currentVersion = nextVersion;
  }

  return {
    schemaName,
    fromVersion,
    toVersion,
    migrations,
  };
}

/**
 * Execute a migration chain
 * @param {MigrationChain} chain - Migration chain to execute
 * @param {any} data - Data to migrate
 * @param {Object} [options] - Execution options
 * @param {boolean} [options.dryRun=false] - Preview migration without applying
 * @param {boolean} [options.stopOnError=true] - Stop chain execution on first error
 * @returns {Promise<MigrationResult>} Migration result
 */
export async function executeMigrationChain(chain, data, options = {}) {
  const dryRun = options.dryRun || false;
  const stopOnError = options.stopOnError !== false;

  let currentData = data;
  const versionsApplied = [chain.fromVersion];
  const migrationsApplied = [];
  const errors = [];

  for (const migration of chain.migrations) {
    const result = await executeMigration(migration, currentData, { dryRun });

    if (result.success) {
      currentData = result.data;
      if (migration.toVersion) {
        versionsApplied.push(migration.toVersion);
      }
      migrationsApplied.push(migration.description);
    } else {
      errors.push(result.error);
      if (stopOnError) {
        return {
          data: undefined,
          provenance: {
            schemaName: chain.schemaName,
            fromVersion: chain.fromVersion,
            toVersion: chain.toVersion,
            versionsApplied,
            migrationsApplied,
            errors,
          },
          versionsApplied,
          migrationsApplied,
          success: false,
          error: `Migration chain failed: ${errors.join(', ')}`,
        };
      }
    }
  }

  // Build final provenance
  const provenance = createMigrationProvenance(chain.schemaName, versionsApplied);

  return {
    data: currentData,
    provenance: {
      ...provenance,
      migrationsApplied,
      errors: errors.length > 0 ? errors : undefined,
    },
    versionsApplied,
    migrationsApplied,
    success: errors.length === 0,
  };
}

/**
 * Rollback a migration chain
 * @param {MigrationChain} chain - Migration chain to rollback
 * @param {any} data - Data to rollback
 * @param {Object} [options] - Execution options
 * @returns {Promise<MigrationResult>} Rollback result
 */
export async function rollbackMigrationChain(chain, data, options = {}) {
  const reversedChain = {
    schemaName: chain.schemaName,
    fromVersion: chain.toVersion,
    toVersion: chain.fromVersion,
    migrations: [...chain.migrations].reverse(),
  };

  let currentData = data;
  const versionsApplied = [chain.toVersion];
  const migrationsApplied = [];

  for (const migration of reversedChain.migrations) {
    const result = await executeBidirectionalMigration(migration, currentData, 'backward', options);

    if (!result.success) {
      return {
        data: undefined,
        provenance: {
          schemaName: chain.schemaName,
          versionsApplied,
          migrationsApplied,
        },
        versionsApplied,
        migrationsApplied,
        success: false,
        error: `Rollback failed: ${result.error}`,
      };
    }

    currentData = result.data;
    if (migration.fromVersion) {
      versionsApplied.push(migration.fromVersion);
    }
    migrationsApplied.push(`${migration.description} (rollback)`);
  }

  return {
    data: currentData,
    provenance: {
      schemaName: chain.schemaName,
      versionsApplied,
      migrationsApplied,
      rollback: true,
    },
    versionsApplied,
    migrationsApplied,
    success: true,
  };
}

/**
 * Get a registered migration
 * @param {string} schemaName - Schema name
 * @param {number} fromVersion - Source version
 * @param {number} toVersion - Target version
 * @returns {Migration|undefined} The migration or undefined if not found
 */
export function getMigration(schemaName, fromVersion, toVersion) {
  const schemaMigrations = migrationRegistry.get(schemaName);
  if (!schemaMigrations) {
    return undefined;
  }

  const key = `${fromVersion}->${toVersion}`;
  return schemaMigrations.get(key);
}

/**
 * List all migrations for a schema
 * @param {string} schemaName - Schema name
 * @returns {Migration[]} Array of migrations
 */
export function listMigrations(schemaName) {
  const schemaMigrations = migrationRegistry.get(schemaName);
  if (!schemaMigrations) {
    return [];
  }

  return [...schemaMigrations.values()];
}

/**
 * Clear migration registry (useful for testing)
 */
export function clearMigrationRegistry() {
  migrationRegistry.clear();
}
