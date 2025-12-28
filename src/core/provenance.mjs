/**
 * Enhanced Provenance System - Detailed audit trails and data lineage
 * @fileoverview Comprehensive provenance tracking with graphs, queries, and compliance exports
 */

import crypto from 'node:crypto';
import { createProvenance as createBasicProvenance } from './registry.mjs';

/**
 * Enhanced provenance entry with full audit trail
 * @typedef {Object} EnhancedProvenance
 * @property {string} id - Unique provenance ID
 * @property {string} timestamp - ISO 8601 timestamp
 * @property {string} adapter - Adapter name used
 * @property {string} [sourceFormat] - Source format
 * @property {string} [targetFormat] - Target format
 * @property {string} version - ZTF version
 * @property {Object} environment - Environment information
 * @property {string} environment.os - Operating system
 * @property {string} environment.runtime - Node.js runtime version
 * @property {string} environment.platform - Platform (linux, darwin, win32)
 * @property {Object} [user] - User attribution
 * @property {string} [user.id] - User ID
 * @property {string} [user.name] - User name
 * @property {Object} performance - Performance metrics
 * @property {number} performance.duration - Operation duration in ms
 * @property {number} [performance.memory] - Memory used in bytes
 * @property {number} [performance.inputSize] - Input size in bytes
 * @property {number} [performance.outputSize] - Output size in bytes
 * @property {Object} [ai] - AI-specific metadata
 * @property {string} [ai.model] - AI model used
 * @property {string} [ai.promptHash] - Hash of prompt
 * @property {number} [ai.cost] - Estimated cost
 * @property {number} [ai.tokens] - Tokens used
 * @property {string} [schemaHash] - Hash of Zod schema
 * @property {string} [dataHash] - Hash of data
 * @property {string[]} transformations - Chain of transformations
 * @property {string} [signature] - Cryptographic signature
 * @property {Object} metadata - Additional metadata
 */

/**
 * Internal provenance registry
 * @type {Map<string, EnhancedProvenance>}
 */
const provenanceRegistry = new Map();

/**
 * Configuration for provenance tracking
 * @type {Object}
 */
const config = {
  enableSignatures: false,
  signatureAlgorithm: 'sha256',
  trackPerformance: true,
  trackEnvironment: true,
  maxRegistrySize: 10_000,
  enablePersistence: false,
};

/**
 * Configure provenance tracking
 * @param {Object} options - Configuration options
 */
export function configureProvenance(options) {
  Object.assign(config, options);
}

/**
 * Generate a unique provenance ID
 * @returns {string} Unique ID
 */
function generateProvenanceId() {
  return `prov-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Get environment information
 * @returns {Object} Environment details
 */
function getEnvironmentInfo() {
  if (!config.trackEnvironment) {
    return {};
  }

  return {
    os: process.platform,
    runtime: process.version,
    platform: process.platform,
    arch: process.arch,
  };
}

/**
 * Create cryptographic signature for provenance
 * @param {Object} data - Data to sign
 * @returns {string} Signature
 */
function createSignature(data) {
  if (!config.enableSignatures) {
    return undefined;
  }

  const hash = crypto.createHash(config.signatureAlgorithm);
  hash.update(JSON.stringify(data));
  return hash.digest('hex');
}

/**
 * Hash data for provenance tracking
 * @param {any} data - Data to hash
 * @returns {string} Hash
 */
export function hashData(data) {
  const hash = crypto.createHash('sha256');
  const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
  hash.update(dataStr);
  return hash.digest('hex');
}

/**
 * Create enhanced provenance entry
 * @param {Object} operation - Operation details
 * @param {string} operation.adapter - Adapter name
 * @param {string} [operation.sourceFormat] - Source format
 * @param {string} [operation.targetFormat] - Target format
 * @param {Object} [operation.options] - Additional options
 * @param {Object} [operation.user] - User information
 * @param {Object} [operation.performance] - Performance metrics
 * @param {Object} [operation.ai] - AI metadata
 * @param {string} [operation.schemaHash] - Schema hash
 * @param {string} [operation.dataHash] - Data hash
 * @param {string[]} [operation.transformations] - Transformation chain
 * @returns {EnhancedProvenance} Enhanced provenance entry
 */
export function createEnhancedProvenance(operation) {
  const id = generateProvenanceId();
  const timestamp = new Date().toISOString();

  const provenance = {
    id,
    timestamp,
    adapter: operation.adapter,
    version: '1.0.1',
    environment: getEnvironmentInfo(),
    transformations: operation.transformations || [],
    metadata: operation.metadata || operation.options || {},
  };

  // Add optional fields
  if (operation.sourceFormat) provenance.sourceFormat = operation.sourceFormat;
  if (operation.targetFormat) provenance.targetFormat = operation.targetFormat;
  if (operation.user) provenance.user = operation.user;
  if (operation.schemaHash) provenance.schemaHash = operation.schemaHash;
  if (operation.dataHash) provenance.dataHash = operation.dataHash;

  // Add performance metrics
  if (config.trackPerformance && operation.performance) {
    provenance.performance = {
      duration: operation.performance.duration || 0,
      memory: operation.performance.memory,
      inputSize: operation.performance.inputSize,
      outputSize: operation.performance.outputSize,
    };
  }

  // Add AI metadata
  if (operation.ai) {
    provenance.ai = {
      model: operation.ai.model,
      promptHash: operation.ai.promptHash,
      cost: operation.ai.cost,
      tokens: operation.ai.tokens,
    };
  }

  // Create signature
  if (config.enableSignatures) {
    const signableData = { ...provenance };
    delete signableData.signature;
    provenance.signature = createSignature(signableData);
  }

  return provenance;
}

/**
 * Register provenance entry in the registry
 * @param {EnhancedProvenance} provenance - Provenance entry
 * @returns {string} Provenance ID
 */
export function registerProvenance(provenance) {
  // Enforce max registry size (LRU-style)
  if (provenanceRegistry.size >= config.maxRegistrySize) {
    const firstKey = provenanceRegistry.keys().next().value;
    provenanceRegistry.delete(firstKey);
  }

  provenanceRegistry.set(provenance.id, provenance);
  return provenance.id;
}

/**
 * Get provenance entry by ID
 * @param {string} id - Provenance ID
 * @returns {EnhancedProvenance|undefined} Provenance entry
 */
export function getProvenance(id) {
  return provenanceRegistry.get(id);
}

/**
 * Get all provenance entries
 * @returns {EnhancedProvenance[]} All provenance entries
 */
export function getAllProvenance() {
  return [...provenanceRegistry.values()];
}

/**
 * Clear provenance registry
 */
export function clearProvenanceRegistry() {
  provenanceRegistry.clear();
}

/**
 * Verify provenance signature
 * @param {EnhancedProvenance} provenance - Provenance entry
 * @returns {boolean} Whether signature is valid
 */
export function verifySignature(provenance) {
  if (!provenance.signature) {
    return false;
  }

  const signableData = { ...provenance };
  const originalSignature = signableData.signature;
  delete signableData.signature;

  const computedSignature = createSignature(signableData);
  return originalSignature === computedSignature;
}

/**
 * Create data lineage graph
 * @param {string} provenanceId - Starting provenance ID
 * @returns {Object} Lineage graph
 */
export function createLineageGraph(provenanceId) {
  const provenance = getProvenance(provenanceId);
  if (!provenance) {
    return null;
  }

  const graph = {
    root: provenanceId,
    nodes: [provenance],
    edges: [],
  };

  // Build graph from transformation chain
  const transformations = provenance.transformations || [];
  for (let i = 0; i < transformations.length - 1; i++) {
    graph.edges.push({
      from: transformations[i],
      to: transformations[i + 1],
      type: 'transformation',
    });
  }

  return graph;
}

/**
 * Get provenance statistics
 * @returns {Object} Statistics
 */
export function getProvenanceStats() {
  const entries = getAllProvenance();

  const stats = {
    totalEntries: entries.length,
    adapters: {},
    formats: {},
    aiModels: {},
    avgDuration: 0,
    totalCost: 0,
    totalTokens: 0,
  };

  let totalDuration = 0;
  let durationCount = 0;

  for (const entry of entries) {
    // Count by adapter
    stats.adapters[entry.adapter] = (stats.adapters[entry.adapter] || 0) + 1;

    // Count by format
    if (entry.sourceFormat) {
      stats.formats[entry.sourceFormat] = (stats.formats[entry.sourceFormat] || 0) + 1;
    }
    if (entry.targetFormat) {
      stats.formats[entry.targetFormat] = (stats.formats[entry.targetFormat] || 0) + 1;
    }

    // AI metrics
    if (entry.ai) {
      if (entry.ai.model) {
        stats.aiModels[entry.ai.model] = (stats.aiModels[entry.ai.model] || 0) + 1;
      }
      if (entry.ai.cost) {
        stats.totalCost += entry.ai.cost;
      }
      if (entry.ai.tokens) {
        stats.totalTokens += entry.ai.tokens;
      }
    }

    // Performance metrics
    if (entry.performance?.duration) {
      totalDuration += entry.performance.duration;
      durationCount++;
    }
  }

  if (durationCount > 0) {
    stats.avgDuration = totalDuration / durationCount;
  }

  return stats;
}

/**
 * Export provenance registry to JSON
 * @returns {string} JSON string
 */
export function exportToJSON() {
  const entries = getAllProvenance();
  return JSON.stringify(entries, null, 2);
}

/**
 * Import provenance from JSON
 * @param {string} json - JSON string
 */
export function importFromJSON(json) {
  const entries = JSON.parse(json);
  for (const entry of entries) {
    provenanceRegistry.set(entry.id, entry);
  }
}

/**
 * Track operation with automatic provenance
 * @param {Function} operation - Async operation to track
 * @param {Object} context - Operation context
 * @returns {Promise<{result: any, provenance: EnhancedProvenance}>} Result with provenance
 */
export async function trackOperation(operation, context) {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;

  try {
    const result = await operation();
    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;

    const provenance = createEnhancedProvenance({
      ...context,
      performance: {
        duration: endTime - startTime,
        memory: endMemory - startMemory,
        ...context.performance,
      },
    });

    registerProvenance(provenance);

    return { result, provenance };
  } catch (error) {
    const endTime = Date.now();

    const provenance = createEnhancedProvenance({
      ...context,
      performance: {
        duration: endTime - startTime,
      },
      metadata: {
        ...context.metadata,
        error: error.message,
        failed: true,
      },
    });

    registerProvenance(provenance);
    throw error;
  }
}
