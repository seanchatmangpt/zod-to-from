/**
 * Schema Evolution System - Version management and compatibility checking
 * @fileoverview Manages schema versions, evolution tracking, and compatibility validation
 */

import { simpleHash } from './registry.mjs';

/**
 * @typedef {import('zod').ZodSchema} ZodSchema
 */

/**
 * Schema version metadata
 * @typedef {Object} SchemaVersion
 * @property {number} version - Version number (1, 2, 3, etc.)
 * @property {ZodSchema} schema - The Zod schema for this version
 * @property {string} hash - Hash of the schema for integrity checking
 * @property {string} description - Human-readable description of changes
 * @property {string} timestamp - ISO 8601 timestamp when version was created
 * @property {Object} [metadata] - Additional version metadata
 */

/**
 * Schema evolution history
 * @typedef {Object} SchemaEvolution
 * @property {string} name - Schema name/identifier
 * @property {number} currentVersion - Current active version
 * @property {Map<number, SchemaVersion>} versions - Map of version number to SchemaVersion
 * @property {Map<string, number>} hashToVersion - Map of schema hash to version number for quick lookups
 */

/**
 * Compatibility check result
 * @typedef {Object} CompatibilityResult
 * @property {boolean} compatible - Whether schemas are compatible
 * @property {'forward'|'backward'|'full'|'breaking'|'none'} compatibilityType - Type of compatibility
 * @property {string[]} issues - List of compatibility issues
 * @property {string[]} suggestions - Suggested migration strategies
 */

/**
 * Internal registry of schema evolutions
 * @type {Map<string, SchemaEvolution>}
 */
const schemaRegistry = new Map();

/**
 * Create a new schema evolution tracker
 * @param {string} name - Schema name/identifier
 * @param {ZodSchema} initialSchema - Initial schema version
 * @param {Object} [options] - Options for schema evolution
 * @param {string} [options.description] - Description of initial version
 * @returns {SchemaEvolution} The schema evolution object
 */
export function createSchemaEvolution(name, initialSchema, options = {}) {
  if (schemaRegistry.has(name)) {
    throw new Error(`Schema evolution '${name}' already exists`);
  }

  const schemaHash = simpleHash(initialSchema.toString());
  const timestamp = new Date().toISOString();

  const evolution = {
    name,
    currentVersion: 1,
    versions: new Map(),
    hashToVersion: new Map(),
  };

  const version1 = {
    version: 1,
    schema: initialSchema,
    hash: schemaHash,
    description: options.description || 'Initial schema version',
    timestamp,
    metadata: options.metadata || {},
  };

  evolution.versions.set(1, version1);
  evolution.hashToVersion.set(schemaHash, 1);

  schemaRegistry.set(name, evolution);

  return evolution;
}

/**
 * Add a new version to an existing schema evolution
 * @param {string} name - Schema name/identifier
 * @param {ZodSchema} newSchema - New schema version
 * @param {Object} [options] - Options for new version
 * @param {string} [options.description] - Description of changes
 * @returns {SchemaVersion} The new schema version
 */
export function addSchemaVersion(name, newSchema, options = {}) {
  const evolution = schemaRegistry.get(name);
  if (!evolution) {
    throw new Error(`Schema evolution '${name}' not found`);
  }

  const newVersionNumber = evolution.currentVersion + 1;
  // Create a unique hash that includes version number to avoid collisions
  const schemaString = newSchema.toString();
  const schemaHash = simpleHash(`${schemaString}-v${newVersionNumber}-${Date.now()}`);

  const newVersion = {
    version: newVersionNumber,
    schema: newSchema,
    hash: schemaHash,
    description: options.description || `Version ${newVersionNumber}`,
    timestamp: new Date().toISOString(),
    metadata: options.metadata || {},
  };

  evolution.versions.set(newVersionNumber, newVersion);
  evolution.hashToVersion.set(schemaHash, newVersionNumber);
  evolution.currentVersion = newVersionNumber;

  return newVersion;
}

/**
 * Get a specific version of a schema
 * @param {string} name - Schema name/identifier
 * @param {number} [version] - Version number (defaults to current version)
 * @returns {SchemaVersion|undefined} The schema version
 */
export function getSchemaVersion(name, version) {
  const evolution = schemaRegistry.get(name);
  if (!evolution) {
    return undefined;
  }

  const versionNumber = version === undefined ? evolution.currentVersion : version;
  return evolution.versions.get(versionNumber);
}

/**
 * Get schema evolution history
 * @param {string} name - Schema name/identifier
 * @returns {SchemaEvolution|undefined} The schema evolution
 */
export function getSchemaEvolution(name) {
  return schemaRegistry.get(name);
}

/**
 * List all schema versions for a schema
 * @param {string} name - Schema name/identifier
 * @returns {SchemaVersion[]} Array of schema versions in order
 */
export function listSchemaVersions(name) {
  const evolution = schemaRegistry.get(name);
  if (!evolution) {
    return [];
  }

  return [...evolution.versions.values()].sort((a, b) => a.version - b.version);
}

/**
 * Get the current version of a schema
 * @param {string} name - Schema name/identifier
 * @returns {SchemaVersion|undefined} The current schema version
 */
export function getCurrentSchemaVersion(name) {
  const evolution = schemaRegistry.get(name);
  if (!evolution) {
    return undefined;
  }

  return evolution.versions.get(evolution.currentVersion);
}

/**
 * Find schema version by hash
 * @param {string} name - Schema name/identifier
 * @param {string} hash - Schema hash
 * @returns {SchemaVersion|undefined} The schema version
 */
export function findSchemaVersionByHash(name, hash) {
  const evolution = schemaRegistry.get(name);
  if (!evolution) {
    return undefined;
  }

  const versionNumber = evolution.hashToVersion.get(hash);
  if (versionNumber === undefined) {
    return undefined;
  }

  return evolution.versions.get(versionNumber);
}

/**
 * Check compatibility between two schema versions
 * @param {ZodSchema} fromSchema - Source schema
 * @param {ZodSchema} toSchema - Target schema
 * @returns {CompatibilityResult} Compatibility check result
 */
export function checkSchemaCompatibility(fromSchema, toSchema) {
  const issues = [];
  const suggestions = [];

  try {
    // For ZodObject schemas, compare the actual shape
    // For other schemas, use basic comparison
    if (fromSchema._def.typeName === 'ZodObject' && toSchema._def.typeName === 'ZodObject') {
      const fromShape = fromSchema._def.shape();
      const toShape = toSchema._def.shape();

      // Quick check: if shapes are reference-equal, schemas are identical
      if (fromShape === toShape) {
        return {
          compatible: true,
          compatibilityType: 'full',
          issues: [],
          suggestions: [],
        };
      }

      // Check if shapes are structurally identical
      const fromKeys = Object.keys(fromShape).sort();
      const toKeys = Object.keys(toShape).sort();

      if (fromKeys.length === toKeys.length && fromKeys.every((k, i) => k === toKeys[i])) {
        // Same keys, check if field types are the same
        const allFieldsSame = fromKeys.every(k => {
          return JSON.stringify(fromShape[k]._def) === JSON.stringify(toShape[k]._def);
        });

        if (allFieldsSame) {
          return {
            compatible: true,
            compatibilityType: 'full',
            issues: [],
            suggestions: [],
          };
        }
      }
    } else {
      // For non-object schemas, use basic comparison
      const fromDef = JSON.stringify(fromSchema._def);
      const toDef = JSON.stringify(toSchema._def);

      if (fromDef === toDef) {
        return {
          compatible: true,
          compatibilityType: 'full',
          issues: [],
          suggestions: [],
        };
      }
    }

    // Analyze schema definitions to detect structural changes
    // Check if toSchema has more required fields than fromSchema
    let backwardCompatible = true;
    let forwardCompatible = true;
    let schemasAreDifferent = false;

    // Try to extract shape information from ZodObject schemas
    if (fromSchema._def.typeName === 'ZodObject' && toSchema._def.typeName === 'ZodObject') {
      schemasAreDifferent = true; // We already checked they're not identical above
      const fromShape = fromSchema._def.shape();
      const toShape = toSchema._def.shape();

      const fromKeys = Object.keys(fromShape);
      const toKeys = Object.keys(toShape);

      // Check for new required fields (breaks backward compatibility)
      const newKeys = toKeys.filter(k => !fromKeys.includes(k));
      if (newKeys.length > 0) {
        const newRequiredKeys = newKeys.filter(k => !toShape[k].isOptional());
        if (newRequiredKeys.length > 0) {
          backwardCompatible = false;
          issues.push(`New required fields added: ${newRequiredKeys.join(', ')}`);
          suggestions.push('Make new fields optional or provide defaults');
        }
      }

      // Check for removed required fields (breaks forward compatibility)
      const removedKeys = fromKeys.filter(k => !toKeys.includes(k));
      if (removedKeys.length > 0) {
        const removedRequiredKeys = removedKeys.filter(k => !fromShape[k].isOptional());
        if (removedRequiredKeys.length > 0) {
          forwardCompatible = false;
          issues.push(`Required fields removed: ${removedRequiredKeys.join(', ')}`);
          suggestions.push('Consider keeping fields as optional for backward compatibility');
        }
      }

      // Check for fields that changed from required to optional (backward compatible)
      // or from optional to required (breaks backward compatibility)
      for (const key of fromKeys.filter(k => toKeys.includes(k))) {
        const fromOptional = fromShape[key].isOptional();
        const toOptional = toShape[key].isOptional();

        if (!fromOptional && toOptional) {
          // Field became optional - this is backward compatible
          // No issue
        } else if (fromOptional && !toOptional) {
          // Field became required - breaks backward compatibility
          backwardCompatible = false;
          issues.push(`Field '${key}' changed from optional to required`);
          suggestions.push(`Keep '${key}' as optional or provide default value`);
        }
      }
    } else {
      // For non-object schemas, assume they're different and breaking
      schemasAreDifferent = true;
      backwardCompatible = false;
      forwardCompatible = false;
      issues.push('Schema types differ - cannot determine compatibility');
      suggestions.push('Create migration function to transform data');
    }

    // Determine compatibility type
    let compatibilityType = 'none';
    if (backwardCompatible && forwardCompatible) {
      compatibilityType = 'full';
    } else if (backwardCompatible) {
      compatibilityType = 'backward';
    } else if (forwardCompatible) {
      // Forward-only compatibility is effectively breaking for migrations
      // because you can't migrate old data to new schema without transformation
      compatibilityType = 'breaking';
    } else {
      compatibilityType = 'breaking';
    }

    // If no issues detected but schemas differ, add a general warning
    if (issues.length === 0 && schemasAreDifferent) {
      issues.push('Schema structure changed - manual review recommended');
      suggestions.push('Create migration function to transform data');
    }

    // For migration purposes, we care about backward compatibility
    // (new schema can read old data). Schemas are only compatible if backward compatible.
    const compatible = backwardCompatible;

    return {
      compatible,
      compatibilityType,
      issues,
      suggestions,
    };
  } catch (error) {
    return {
      compatible: false,
      compatibilityType: 'breaking',
      issues: [`Error analyzing compatibility: ${error.message}`],
      suggestions: ['Review schema changes and create migration function'],
    };
  }
}

/**
 * Validate that data can migrate between versions
 * @param {string} name - Schema name/identifier
 * @param {number} fromVersion - Source version
 * @param {number} toVersion - Target version
 * @param {any} testData - Sample data to validate migration
 * @returns {Object} Validation result
 */
export function validateMigrationPath(name, fromVersion, toVersion, testData) {
  const evolution = schemaRegistry.get(name);
  if (!evolution) {
    return {
      valid: false,
      error: `Schema evolution '${name}' not found`,
    };
  }

  const fromSchemaVersion = evolution.versions.get(fromVersion);
  const toSchemaVersion = evolution.versions.get(toVersion);

  if (!fromSchemaVersion) {
    return {
      valid: false,
      error: `Version ${fromVersion} not found`,
    };
  }

  if (!toSchemaVersion) {
    return {
      valid: false,
      error: `Version ${toVersion} not found`,
    };
  }

  try {
    // Validate test data against source schema
    fromSchemaVersion.schema.parse(testData);

    // Check compatibility
    const compatibility = checkSchemaCompatibility(
      fromSchemaVersion.schema,
      toSchemaVersion.schema
    );

    return {
      valid: true,
      compatibility,
      fromVersion,
      toVersion,
      testDataValid: true,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Test data validation failed: ${error.message}`,
      fromVersion,
      toVersion,
    };
  }
}

/**
 * Get migration provenance information
 * @param {string} name - Schema name/identifier
 * @param {number[]} versions - Array of version numbers that were migrated through
 * @returns {Object} Migration provenance
 */
export function createMigrationProvenance(name, versions) {
  const evolution = schemaRegistry.get(name);
  if (!evolution) {
    throw new Error(`Schema evolution '${name}' not found`);
  }

  const versionDetails = versions.map(v => {
    const version = evolution.versions.get(v);
    return version
      ? {
          version: v,
          hash: version.hash,
          description: version.description,
          timestamp: version.timestamp,
        }
      : { version: v, error: 'Version not found' };
  });

  return {
    schemaName: name,
    migrationsApplied: versions,
    versionDetails,
    migrationTimestamp: new Date().toISOString(),
  };
}

/**
 * List all registered schema evolutions
 * @returns {string[]} Array of schema names
 */
export function listSchemaEvolutions() {
  return [...schemaRegistry.keys()];
}

/**
 * Remove a schema evolution from the registry
 * @param {string} name - Schema name/identifier
 * @returns {boolean} Whether the schema was removed
 */
export function removeSchemaEvolution(name) {
  return schemaRegistry.delete(name);
}

/**
 * Clear all schema evolutions (useful for testing)
 */
export function clearSchemaRegistry() {
  schemaRegistry.clear();
}
