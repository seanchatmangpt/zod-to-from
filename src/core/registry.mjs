/**
 * Adapter Registry - Manages format converters and their metadata
 * @fileoverview Core registry system for ZTF adapters
 */

/**
 * @typedef {import('zod').ZodSchema} ZodSchema
 * @typedef {import('zod').ZodType} ZodType
 */

/**
 * Enhanced adapter interface for format conversion
 * @typedef {Object} Adapter
 * @property {function(string, Object): Promise<{data: unknown, metadata?: Object}>} parse - Parse input string to data with metadata
 * @property {function(unknown, Object): Promise<{data: string, metadata?: Object}>} format - Format data to string with metadata
 * @property {boolean} [supportsStreaming] - Whether adapter supports streaming for large datasets
 * @property {boolean} [isAI] - Whether adapter uses AI (for provenance tracking)
 * @property {string} [version] - Adapter version
 */

/**
 * Provenance metadata for auditable operations
 * @typedef {Object} Provenance
 * @property {string} timestamp - ISO 8601 timestamp of operation
 * @property {string} [sourceFormat] - Input format used
 * @property {string} [targetFormat] - Output format used (for formatTo/convert)
 * @property {string} adapter - Adapter name used
 * @property {string} [aiModel] - AI model used (for AI adapters)
 * @property {string} [promptHash] - Hash of prompt used (for AI adapters)
 * @property {string} version - ZTF version
 * @property {string} [schemaHash] - Hash of the schema used
 */

/**
 * Result wrapper with data and provenance
 * @typedef {Object} ZTFResult
 * @property {any} data - The parsed/formatted data
 * @property {Provenance} provenance - Provenance metadata
 */

/**
 * Options for parsing and formatting operations
 * @typedef {Object} ZTFOptions
 * @property {Record<string, unknown>} [adapter] - Custom options for the specific adapter
 * @property {boolean} [validate] - Whether to validate the output against the schema
 * @property {boolean} [includeProvenance] - Whether to include provenance metadata in result
 * @property {boolean} [deterministic] - Whether to enforce deterministic output (stable key ordering, canonical formats)
 * @property {boolean} [streaming] - Whether to use streaming for large datasets
 */

/**
 * Internal adapter registry
 * @type {Map<string, Adapter>}
 */
const adapters = new Map();

/**
 * ZTF version constant
 */
const ZTF_VERSION = '0.1.0';

/**
 * Register a new adapter for a specific format
 * @param {string} name - The format name (e.g., 'json', 'yaml', 'csv')
 * @param {Adapter} adapter - The adapter implementation
 */
export function registerAdapter(name, adapter) {
  adapters.set(name, adapter);
}

/**
 * Get a registered adapter by name
 * @param {string} name - The adapter name
 * @returns {Adapter|undefined} The adapter or undefined if not found
 */
export function getAdapter(name) {
  return adapters.get(name);
}

/**
 * List all registered adapter names
 * @returns {string[]} Array of adapter names
 */
export function listAdapters() {
  return [...adapters.keys()];
}

/**
 * Get detailed information about a specific adapter
 * @param {string} name - The adapter name
 * @returns {Object|undefined} Adapter information or undefined if not found
 */
export function getAdapterInfo(name) {
  const adapter = adapters.get(name);
  if (!adapter) {
    return undefined;
  }

  return {
    name,
    version: adapter.version || '1.0.0',
    supportsStreaming: adapter.supportsStreaming || false,
    isAI: adapter.isAI || false,
    hasParse: typeof adapter.parse === 'function',
    hasFormat: typeof adapter.format === 'function',
  };
}

/**
 * List all adapters with their information
 * @returns {Object[]} Array of adapter information objects
 */
export function listAdaptersWithInfo() {
  return listAdapters()
    .map(name => getAdapterInfo(name))
    .filter(Boolean);
}

/**
 * Check if an adapter supports a specific feature
 * @param {string} name - The adapter name
 * @param {string} feature - The feature to check ('streaming', 'ai', etc.)
 * @returns {boolean} Whether the adapter supports the feature
 */
export function adapterSupports(name, feature) {
  const adapter = adapters.get(name);
  if (!adapter) {
    return false;
  }

  switch (feature) {
    case 'streaming': {
      return adapter.supportsStreaming === true;
    }
    case 'ai': {
      return adapter.isAI === true;
    }
    default: {
      return false;
    }
  }
}

/**
 * Create a pack manifest for adapter collections
 * @param {string} packName - The pack name
 * @param {string[]} formats - Array of format names in the pack
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Pack manifest object
 */
export function createPackManifest(packName, formats, metadata = {}) {
  return {
    name: packName,
    formats,
    version: metadata.version || '1.0.0',
    description: metadata.description || '',
    dependencies: metadata.dependencies || [],
    ...metadata,
  };
}

/**
 * Register multiple adapters from a pack
 * @param {Object} packManifest - The pack manifest
 * @param {Object} adaptersMap - Object mapping format names to adapters
 */
export function registerPack(packManifest, adaptersMap) {
  for (const [format, adapter] of Object.entries(adaptersMap)) {
    if (packManifest.formats.includes(format)) {
      registerAdapter(format, adapter);
    }
  }
}

/**
 * Create provenance metadata for an operation
 * @param {string} adapter - Adapter name used
 * @param {string} [sourceFormat] - Source format
 * @param {string} [targetFormat] - Target format
 * @param {Object} [options] - Additional options
 * @returns {Provenance} Provenance metadata
 */
export function createProvenance(adapter, sourceFormat, targetFormat, options = {}) {
  const provenance = {
    timestamp: new Date().toISOString(),
    sourceFormat,
    targetFormat,
    adapter,
    version: ZTF_VERSION,
  };

  // Only include optional properties if they are defined
  if (options.aiModel !== undefined) {
    provenance.aiModel = options.aiModel;
  }
  if (options.promptHash !== undefined) {
    provenance.promptHash = options.promptHash;
  }
  if (options.schemaHash !== undefined) {
    provenance.schemaHash = options.schemaHash;
  }

  return provenance;
}

/**
 * Simple hash function for strings
 * @param {string} str - String to hash
 * @returns {string} Hash string
 */
export function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.codePointAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}

/**
 * Deterministic stringify for stable JSON output
 * @param {any} obj - Object to stringify
 * @returns {string} Deterministic JSON string
 */
export function deterministicStringify(obj) {
  return JSON.stringify(
    obj,
    (key, value) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Sort object keys for deterministic output
        const sorted = {};
        for (const k of Object.keys(value).sort()) {
          sorted[k] = value[k];
        }
        return sorted;
      }
      return value;
    },
    2
  );
}
