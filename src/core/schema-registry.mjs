/**
 * Schema Registry - Centralized Zod schema management and versioning
 * @fileoverview Provides schema registration, versioning, discovery, and dependency management
 */

import { z } from 'zod';
import { simpleHash } from './registry.mjs';

/**
 * @typedef {import('zod').ZodSchema} ZodSchema
 * @typedef {import('zod').ZodType} ZodType
 */

/**
 * Schema metadata for registry entries
 * @typedef {Object} SchemaMetadata
 * @property {string} name - Schema name (e.g., 'User', 'Product')
 * @property {string} version - Semver version (e.g., '1.0.0', '2.1.3')
 * @property {string} [description] - Human-readable description
 * @property {string[]} [tags] - Tags for categorization and search
 * @property {string} [author] - Author email or identifier
 * @property {string} [namespace] - Namespace for scoping (e.g., 'org/project')
 * @property {string[]} [dependencies] - Names of schemas this schema references
 * @property {string} [changelog] - Version changelog entry
 * @property {Date} createdAt - Registration timestamp
 * @property {Date} updatedAt - Last update timestamp
 * @property {string} hash - Schema content hash for integrity
 * @property {boolean} published - Whether schema is published (visible to others)
 */

/**
 * Schema registry entry combining schema and metadata
 * @typedef {Object} SchemaEntry
 * @property {ZodSchema} schema - The Zod schema
 * @property {SchemaMetadata} metadata - Schema metadata
 */

/**
 * Schema version comparison result
 * @typedef {Object} VersionDiff
 * @property {boolean} compatible - Whether versions are backward compatible
 * @property {string[]} breakingChanges - List of breaking changes detected
 * @property {string[]} additions - New fields or properties
 * @property {string[]} removals - Removed fields or properties
 */

/**
 * Search criteria for schema discovery
 * @typedef {Object} SearchCriteria
 * @property {string} [name] - Name pattern (supports wildcards)
 * @property {string[]} [tags] - Tags to match (OR logic)
 * @property {string} [namespace] - Namespace filter
 * @property {string} [author] - Author filter
 * @property {boolean} [publishedOnly] - Only return published schemas
 */

/**
 * Internal registry storage
 * Map structure: name -> version -> SchemaEntry
 * @type {Map<string, Map<string, SchemaEntry>>}
 */
const schemas = new Map();

/**
 * Schema namespace index for scoping
 * @type {Map<string, Set<string>>}
 */
const namespaces = new Map();

/**
 * Tag index for fast search
 * @type {Map<string, Set<string>>}
 */
const tagIndex = new Map();

/**
 * Dependency graph for schema relationships
 * @type {Map<string, Set<string>>}
 */
const dependencyGraph = new Map();

/**
 * Parse semver version string
 * @param {string} version - Version string (e.g., '1.2.3')
 * @returns {{major: number, minor: number, patch: number}} Parsed version
 */
function parseSemver(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid semver version: ${version}`);
  }
  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
  };
}

/**
 * Compare two semver versions
 * @param {string} v1 - First version
 * @param {string} v2 - Second version
 * @returns {number} -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
function compareSemver(v1, v2) {
  const p1 = parseSemver(v1);
  const p2 = parseSemver(v2);

  if (p1.major !== p2.major) return p1.major - p2.major;
  if (p1.minor !== p2.minor) return p1.minor - p2.minor;
  return p1.patch - p2.patch;
}

/**
 * Get the latest version of a schema
 * @param {string} name - Schema name
 * @returns {string|null} Latest version or null if no versions exist
 */
function getLatestVersion(name) {
  const versions = schemas.get(name);
  if (!versions || versions.size === 0) {
    return null;
  }

  return [...versions.keys()].sort(compareSemver).pop();
}

/**
 * Register a new schema in the registry
 * @param {string} name - Schema name (must be unique within namespace)
 * @param {ZodSchema} schema - The Zod schema to register
 * @param {Object} [options] - Registration options
 * @param {string} [options.version='1.0.0'] - Schema version
 * @param {string} [options.description] - Schema description
 * @param {string[]} [options.tags] - Tags for categorization
 * @param {string} [options.author] - Author identifier
 * @param {string} [options.namespace] - Namespace for scoping
 * @param {string[]} [options.dependencies] - Referenced schema names
 * @param {string} [options.changelog] - Version changelog
 * @param {boolean} [options.published=true] - Publish immediately
 * @returns {SchemaMetadata} The registered schema metadata
 * @throws {Error} If schema validation fails or version already exists
 */
export function registerSchema(name, schema, options = {}) {
  // Validate inputs
  if (!name || typeof name !== 'string') {
    throw new Error('Schema name is required and must be a string');
  }

  if (!schema || typeof schema.parse !== 'function') {
    throw new Error('Invalid Zod schema provided');
  }

  const version = options.version || '1.0.0';

  // Validate semver format
  parseSemver(version);

  // Check if version already exists
  if (!schemas.has(name)) {
    schemas.set(name, new Map());
  }

  const versionMap = schemas.get(name);
  if (versionMap.has(version)) {
    throw new Error(`Schema ${name}@${version} already exists`);
  }

  // Verify dependencies exist
  if (options.dependencies) {
    for (const dep of options.dependencies) {
      if (!schemas.has(dep)) {
        throw new Error(`Dependency schema '${dep}' not found in registry`);
      }
    }
  }

  // Create metadata
  const now = new Date();
  const schemaString = schema.toString();
  const metadata = {
    name,
    version,
    description: options.description,
    tags: options.tags || [],
    author: options.author,
    namespace: options.namespace,
    dependencies: options.dependencies || [],
    changelog: options.changelog,
    createdAt: now,
    updatedAt: now,
    hash: simpleHash(schemaString),
    published: options.published !== false,
  };

  // Store schema entry
  versionMap.set(version, { schema, metadata });

  // Update indexes
  if (options.namespace) {
    if (!namespaces.has(options.namespace)) {
      namespaces.set(options.namespace, new Set());
    }
    namespaces.get(options.namespace).add(name);
  }

  if (options.tags) {
    for (const tag of options.tags) {
      if (!tagIndex.has(tag)) {
        tagIndex.set(tag, new Set());
      }
      tagIndex.get(tag).add(`${name}@${version}`);
    }
  }

  if (options.dependencies) {
    dependencyGraph.set(`${name}@${version}`, new Set(options.dependencies));
  }

  return metadata;
}

/**
 * Get a schema from the registry
 * @param {string} name - Schema name
 * @param {string} [version] - Specific version (defaults to latest)
 * @returns {ZodSchema|null} The schema or null if not found
 */
export function getSchema(name, version) {
  const versionMap = schemas.get(name);
  if (!versionMap) {
    return null;
  }

  const targetVersion = version || getLatestVersion(name);
  if (!targetVersion) {
    return null;
  }

  const entry = versionMap.get(targetVersion);
  return entry ? entry.schema : null;
}

/**
 * Get schema metadata
 * @param {string} name - Schema name
 * @param {string} [version] - Specific version (defaults to latest)
 * @returns {SchemaMetadata|null} Metadata or null if not found
 */
export function getSchemaMetadata(name, version) {
  const versionMap = schemas.get(name);
  if (!versionMap) {
    return null;
  }

  const targetVersion = version || getLatestVersion(name);
  if (!targetVersion) {
    return null;
  }

  const entry = versionMap.get(targetVersion);
  return entry ? entry.metadata : null;
}

/**
 * Get schema with metadata
 * @param {string} name - Schema name
 * @param {string} [version] - Specific version (defaults to latest)
 * @returns {SchemaEntry|null} Schema entry or null if not found
 */
export function getSchemaEntry(name, version) {
  const versionMap = schemas.get(name);
  if (!versionMap) {
    return null;
  }

  const targetVersion = version || getLatestVersion(name);
  if (!targetVersion) {
    return null;
  }

  return versionMap.get(targetVersion) || null;
}

/**
 * List all versions of a schema
 * @param {string} name - Schema name
 * @returns {string[]} Array of version strings, sorted
 */
export function listVersions(name) {
  const versionMap = schemas.get(name);
  if (!versionMap) {
    return [];
  }

  return [...versionMap.keys()].sort(compareSemver);
}

/**
 * List all registered schema names
 * @param {Object} [options] - Filter options
 * @param {string} [options.namespace] - Filter by namespace
 * @param {boolean} [options.publishedOnly=false] - Only published schemas
 * @returns {string[]} Array of schema names
 */
export function listSchemas(options = {}) {
  let names = [...schemas.keys()];

  if (options.namespace) {
    const nsSchemas = namespaces.get(options.namespace);
    names = nsSchemas ? [...nsSchemas] : [];
  }

  if (options.publishedOnly) {
    names = names.filter(name => {
      const latest = getLatestVersion(name);
      if (!latest) return false;
      const metadata = getSchemaMetadata(name, latest);
      return metadata && metadata.published;
    });
  }

  return names.sort();
}

/**
 * Search for schemas by criteria
 * @param {SearchCriteria} criteria - Search criteria
 * @returns {SchemaEntry[]} Array of matching schema entries
 */
export function searchSchemas(criteria) {
  const results = [];
  const seen = new Set();

  // Start with all schemas or filter by namespace
  let candidates = [];
  if (criteria.namespace) {
    const nsSchemas = namespaces.get(criteria.namespace);
    candidates = nsSchemas ? [...nsSchemas] : [];
  } else {
    candidates = [...schemas.keys()];
  }

  // Filter by name pattern
  if (criteria.name) {
    const pattern = new RegExp(criteria.name.replaceAll('*', '.*'), 'i');
    candidates = candidates.filter(name => pattern.test(name));
  }

  // Filter by tags
  if (criteria.tags && criteria.tags.length > 0) {
    const tagMatches = new Set();
    for (const tag of criteria.tags) {
      const tagged = tagIndex.get(tag);
      if (tagged) {
        for (const item of tagged) {
          tagMatches.add(item);
        }
      }
    }

    // Intersect with candidates
    const taggedNames = new Set([...tagMatches].map(item => item.split('@')[0]));
    candidates = candidates.filter(name => taggedNames.has(name));
  }

  // Collect results
  for (const name of candidates) {
    const latest = getLatestVersion(name);
    if (!latest) continue;

    const entry = getSchemaEntry(name, latest);
    if (!entry) continue;

    const { metadata } = entry;

    // Apply filters
    if (criteria.author && metadata.author !== criteria.author) {
      continue;
    }

    if (criteria.publishedOnly && !metadata.published) {
      continue;
    }

    const key = `${name}@${latest}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(entry);
    }
  }

  return results;
}

/**
 * Publish a schema (make it visible to others)
 * @param {string} name - Schema name
 * @param {string} [version] - Specific version (defaults to latest)
 * @returns {boolean} True if published successfully
 */
export function publishSchema(name, version) {
  const targetVersion = version || getLatestVersion(name);
  if (!targetVersion) {
    return false;
  }

  const entry = getSchemaEntry(name, targetVersion);
  if (!entry) {
    return false;
  }

  entry.metadata.published = true;
  entry.metadata.updatedAt = new Date();
  return true;
}

/**
 * Unpublish a schema (hide from others)
 * @param {string} name - Schema name
 * @param {string} [version] - Specific version (defaults to latest)
 * @returns {boolean} True if unpublished successfully
 */
export function unpublishSchema(name, version) {
  const targetVersion = version || getLatestVersion(name);
  if (!targetVersion) {
    return false;
  }

  const entry = getSchemaEntry(name, targetVersion);
  if (!entry) {
    return false;
  }

  entry.metadata.published = false;
  entry.metadata.updatedAt = new Date();
  return true;
}

/**
 * Update schema metadata (without changing the schema itself)
 * @param {string} name - Schema name
 * @param {string} version - Schema version
 * @param {Partial<SchemaMetadata>} updates - Metadata fields to update
 * @returns {boolean} True if updated successfully
 */
export function updateMetadata(name, version, updates) {
  const entry = getSchemaEntry(name, version);
  if (!entry) {
    return false;
  }

  // Update allowed fields
  const allowedFields = ['description', 'tags', 'author', 'changelog'];
  for (const field of allowedFields) {
    if (field in updates) {
      entry.metadata[field] = updates[field];
    }
  }

  entry.metadata.updatedAt = new Date();
  return true;
}

/**
 * Delete a schema version from the registry
 * @param {string} name - Schema name
 * @param {string} version - Schema version to delete
 * @returns {boolean} True if deleted successfully
 */
export function deleteSchema(name, version) {
  const versionMap = schemas.get(name);
  if (!versionMap) {
    return false;
  }

  const deleted = versionMap.delete(version);

  // Clean up if no versions left
  if (versionMap.size === 0) {
    schemas.delete(name);
  }

  // Clean up indexes
  const key = `${name}@${version}`;
  dependencyGraph.delete(key);

  for (const tagged of tagIndex.values()) {
    tagged.delete(key);
  }

  return deleted;
}

/**
 * Get schema dependencies (schemas this schema references)
 * @param {string} name - Schema name
 * @param {string} [version] - Schema version (defaults to latest)
 * @returns {string[]} Array of dependency schema names
 */
export function getDependencies(name, version) {
  const targetVersion = version || getLatestVersion(name);
  if (!targetVersion) {
    return [];
  }

  const key = `${name}@${targetVersion}`;
  const deps = dependencyGraph.get(key);
  return deps ? [...deps] : [];
}

/**
 * Get schemas that depend on this schema (reverse dependencies)
 * @param {string} name - Schema name
 * @returns {string[]} Array of dependent schema names (name@version)
 */
export function getDependents(name) {
  const dependents = [];

  for (const [key, deps] of dependencyGraph.entries()) {
    if (deps.has(name)) {
      dependents.push(key);
    }
  }

  return dependents;
}

/**
 * Check schema compatibility between versions
 * @param {string} name - Schema name
 * @param {string} oldVersion - Old version
 * @param {string} newVersion - New version
 * @returns {VersionDiff} Compatibility analysis
 */
export function checkCompatibility(name, oldVersion, newVersion) {
  const oldEntry = getSchemaEntry(name, oldVersion);
  const newEntry = getSchemaEntry(name, newVersion);

  if (!oldEntry || !newEntry) {
    throw new Error(`Schema versions not found: ${name}@${oldVersion} or ${name}@${newVersion}`);
  }

  // Basic compatibility check using schema structure
  // In a real implementation, this would do deep schema comparison
  const oldHash = oldEntry.metadata.hash;
  const newHash = newEntry.metadata.hash;

  const result = {
    compatible: oldHash === newHash,
    breakingChanges: [],
    additions: [],
    removals: [],
  };

  // If hashes differ, mark as potentially breaking
  if (oldHash !== newHash) {
    result.compatible = false;
    result.breakingChanges.push('Schema structure has changed');
  }

  return result;
}

/**
 * Validate that a schema is a valid Zod schema
 * @param {any} schema - Schema to validate
 * @returns {boolean} True if valid Zod schema
 */
export function validateSchema(schema) {
  try {
    // Check if it's a Zod schema by attempting to use it
    if (!schema || typeof schema.parse !== 'function') {
      return false;
    }

    // Try parsing a simple value
    schema.safeParse({});
    return true;
  } catch {
    return false;
  }
}

/**
 * Export registry to JSON (for sharing/backup)
 * @param {Object} [options] - Export options
 * @param {string} [options.namespace] - Export only this namespace
 * @param {boolean} [options.publishedOnly=false] - Export only published schemas
 * @returns {Object} Registry export data
 */
export function exportRegistry(options = {}) {
  const exported = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    schemas: [],
  };

  const names = listSchemas(options);

  for (const name of names) {
    const versions = listVersions(name);

    for (const version of versions) {
      const entry = getSchemaEntry(name, version);
      if (!entry) continue;

      if (options.publishedOnly && !entry.metadata.published) {
        continue;
      }

      exported.schemas.push({
        name,
        version,
        metadata: entry.metadata,
        // Note: Schema itself is not serializable, only metadata
        schemaHash: entry.metadata.hash,
      });
    }
  }

  return exported;
}

/**
 * Import schemas from exported registry data
 * @param {Object} data - Exported registry data
 * @param {Object} schemasMap - Map of schema names to actual Zod schemas
 * @param {Object} [options] - Import options
 * @param {boolean} [options.overwrite=false] - Overwrite existing schemas
 * @returns {number} Number of schemas imported
 */
export function importRegistry(data, schemasMap, options = {}) {
  if (!data || !data.schemas || !Array.isArray(data.schemas)) {
    throw new Error('Invalid registry export data');
  }

  let imported = 0;

  for (const item of data.schemas) {
    const { name, version, metadata } = item;

    // Get actual schema from map
    const schema = schemasMap[name];
    if (!schema) {
      console.warn(`Schema '${name}' not found in schemas map, skipping`);
      continue;
    }

    // Check if already exists
    const exists = getSchema(name, version) !== null;
    if (exists && !options.overwrite) {
      console.warn(`Schema ${name}@${version} already exists, skipping`);
      continue;
    }

    // Delete if overwriting
    if (exists && options.overwrite) {
      deleteSchema(name, version);
    }

    // Register schema with metadata
    try {
      registerSchema(name, schema, {
        version,
        description: metadata.description,
        tags: metadata.tags,
        author: metadata.author,
        namespace: metadata.namespace,
        dependencies: metadata.dependencies,
        changelog: metadata.changelog,
        published: metadata.published,
      });
      imported++;
    } catch (error) {
      console.warn(`Failed to import ${name}@${version}:`, error.message);
    }
  }

  return imported;
}

/**
 * Clear all schemas from the registry
 * @param {Object} [options] - Clear options
 * @param {string} [options.namespace] - Clear only this namespace
 */
export function clearRegistry(options = {}) {
  if (options.namespace) {
    const nsSchemas = namespaces.get(options.namespace);
    if (nsSchemas) {
      for (const name of nsSchemas) {
        schemas.delete(name);
      }
      namespaces.delete(options.namespace);
    }
  } else {
    schemas.clear();
    namespaces.clear();
    tagIndex.clear();
    dependencyGraph.clear();
  }
}

/**
 * Get registry statistics
 * @returns {Object} Registry statistics
 */
export function getRegistryStats() {
  let totalVersions = 0;
  let publishedSchemas = 0;
  const namespaceCount = namespaces.size;
  const tagCount = tagIndex.size;

  for (const [name, versionMap] of schemas.entries()) {
    totalVersions += versionMap.size;

    const latest = getLatestVersion(name);
    if (latest) {
      const metadata = getSchemaMetadata(name, latest);
      if (metadata && metadata.published) {
        publishedSchemas++;
      }
    }
  }

  return {
    totalSchemas: schemas.size,
    totalVersions,
    publishedSchemas,
    namespaces: namespaceCount,
    tags: tagCount,
    dependencies: dependencyGraph.size,
  };
}

/**
 * Create a registry instance (for multi-registry support)
 * @returns {Object} Registry instance with all methods
 */
export function createRegistry() {
  return {
    register: registerSchema,
    get: getSchema,
    getMetadata: getSchemaMetadata,
    getEntry: getSchemaEntry,
    listVersions,
    listSchemas,
    search: searchSchemas,
    publish: publishSchema,
    unpublish: unpublishSchema,
    updateMetadata,
    delete: deleteSchema,
    getDependencies,
    getDependents,
    checkCompatibility,
    validate: validateSchema,
    export: exportRegistry,
    import: importRegistry,
    clear: clearRegistry,
    stats: getRegistryStats,
  };
}
