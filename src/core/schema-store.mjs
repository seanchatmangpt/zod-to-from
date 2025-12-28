/**
 * Schema Store - Persistent storage and caching for schema registry
 * @fileoverview Handles persistent storage, remote registries, caching, and synchronization
 */

import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * @typedef {import('./schema-registry.mjs').SchemaEntry} SchemaEntry
 * @typedef {import('./schema-registry.mjs').SchemaMetadata} SchemaMetadata
 */

/**
 * Storage backend interface
 * @typedef {Object} StorageBackend
 * @property {function(string, any): Promise<void>} save - Save data
 * @property {function(string): Promise<any>} load - Load data
 * @property {function(string): Promise<boolean>} exists - Check if data exists
 * @property {function(string): Promise<void>} delete - Delete data
 * @property {function(): Promise<string[]>} list - List all keys
 */

/**
 * Remote registry configuration
 * @typedef {Object} RemoteRegistryConfig
 * @property {string} url - Registry URL
 * @property {string} [apiKey] - API key for authentication
 * @property {number} [timeout=5000] - Request timeout in ms
 * @property {Object<string, string>} [headers] - Custom headers
 */

/**
 * Cache entry with TTL
 * @typedef {Object} CacheEntry
 * @property {any} data - Cached data
 * @property {number} expiresAt - Expiration timestamp
 */

/**
 * File system storage backend
 */
class FileSystemStorage {
  /**
   * @param {string} baseDir - Base directory for storage
   */
  constructor(baseDir) {
    this.baseDir = baseDir;
  }

  /**
   * Get file path for key
   * @param {string} key - Storage key
   * @returns {string} File path
   */
  getPath(key) {
    return join(this.baseDir, `${key}.json`);
  }

  /**
   * Save data to file
   * @param {string} key - Storage key
   * @param {any} data - Data to save
   */
  async save(key, data) {
    const path = this.getPath(key);
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(path, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Load data from file
   * @param {string} key - Storage key
   * @returns {Promise<any>} Loaded data
   */
  async load(key) {
    try {
      const path = this.getPath(key);
      const content = await fs.readFile(path, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Check if file exists
   * @param {string} key - Storage key
   * @returns {Promise<boolean>} True if exists
   */
  async exists(key) {
    try {
      const path = this.getPath(key);
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete file
   * @param {string} key - Storage key
   */
  async delete(key) {
    try {
      const path = this.getPath(key);
      await fs.unlink(path);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * List all stored keys
   * @returns {Promise<string[]>} Array of keys
   */
  async list() {
    try {
      const files = await fs.readdir(this.baseDir);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
}

/**
 * In-memory storage backend (for testing/temporary use)
 */
class MemoryStorage {
  constructor() {
    this.data = new Map();
  }

  async save(key, data) {
    this.data.set(key, data);
  }

  async load(key) {
    return this.data.get(key) || null;
  }

  async exists(key) {
    return this.data.has(key);
  }

  async delete(key) {
    this.data.delete(key);
  }

  async list() {
    return [...this.data.keys()];
  }
}

/**
 * Schema store with caching and persistence
 */
export class SchemaStore {
  /**
   * @param {Object} [options] - Store options
   * @param {StorageBackend} [options.storage] - Storage backend
   * @param {boolean} [options.cache=true] - Enable caching
   * @param {number} [options.cacheTTL=3600000] - Cache TTL in ms (default 1 hour)
   * @param {string} [options.storageDir] - Directory for file storage
   */
  constructor(options = {}) {
    this.cache = options.cache === false ? null : new Map();
    this.cacheTTL = options.cacheTTL || 3_600_000; // 1 hour default

    // Set up storage backend
    if (options.storage) {
      this.storage = options.storage;
    } else if (options.storageDir) {
      this.storage = new FileSystemStorage(options.storageDir);
    } else {
      // Default to memory storage
      this.storage = new MemoryStorage();
    }
  }

  /**
   * Generate cache key
   * @param {string} name - Schema name
   * @param {string} [version] - Schema version
   * @returns {string} Cache key
   */
  getCacheKey(name, version) {
    return version ? `${name}@${version}` : name;
  }

  /**
   * Get from cache
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null
   */
  getFromCache(key) {
    if (!this.cache) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set in cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   */
  setInCache(key, data) {
    if (!this.cache) return;

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.cacheTTL,
    });
  }

  /**
   * Clear cache entry
   * @param {string} key - Cache key
   */
  clearCacheEntry(key) {
    if (this.cache) {
      this.cache.delete(key);
    }
  }

  /**
   * Clear all cache
   */
  clearCache() {
    if (this.cache) {
      this.cache.clear();
    }
  }

  /**
   * Save schema metadata to storage
   * @param {string} name - Schema name
   * @param {string} version - Schema version
   * @param {SchemaMetadata} metadata - Schema metadata
   */
  async saveMetadata(name, version, metadata) {
    const key = this.getCacheKey(name, version);

    // Save to storage
    await this.storage.save(key, {
      name,
      version,
      metadata,
      savedAt: new Date().toISOString(),
    });

    // Update cache
    this.setInCache(key, metadata);
  }

  /**
   * Load schema metadata from storage
   * @param {string} name - Schema name
   * @param {string} version - Schema version
   * @returns {Promise<SchemaMetadata|null>} Metadata or null
   */
  async loadMetadata(name, version) {
    const key = this.getCacheKey(name, version);

    // Check cache first
    const cached = this.getFromCache(key);
    if (cached) {
      return cached;
    }

    // Load from storage
    const stored = await this.storage.load(key);
    if (!stored) {
      return null;
    }

    // Update cache
    this.setInCache(key, stored.metadata);

    return stored.metadata;
  }

  /**
   * Delete schema metadata from storage
   * @param {string} name - Schema name
   * @param {string} version - Schema version
   */
  async deleteMetadata(name, version) {
    const key = this.getCacheKey(name, version);

    // Delete from storage
    await this.storage.delete(key);

    // Clear cache
    this.clearCacheEntry(key);
  }

  /**
   * List all stored schemas
   * @returns {Promise<Array<{name: string, version: string}>>} Array of schema identifiers
   */
  async listStored() {
    const keys = await this.storage.list();
    return keys.map(key => {
      const [name, version] = key.split('@');
      return { name, version };
    });
  }

  /**
   * Export all stored schemas
   * @returns {Promise<Object>} Export data
   */
  async exportAll() {
    const keys = await this.storage.list();
    const schemas = [];

    for (const key of keys) {
      const data = await this.storage.load(key);
      if (data) {
        schemas.push(data);
      }
    }

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      count: schemas.length,
      schemas,
    };
  }

  /**
   * Import schemas into storage
   * @param {Object} data - Import data
   * @param {Object} [options] - Import options
   * @param {boolean} [options.overwrite=false] - Overwrite existing
   * @returns {Promise<number>} Number of schemas imported
   */
  async importAll(data, options = {}) {
    if (!data || !data.schemas || !Array.isArray(data.schemas)) {
      throw new Error('Invalid import data format');
    }

    let imported = 0;

    for (const item of data.schemas) {
      const { name, version } = item;
      const key = this.getCacheKey(name, version);

      // Check if exists
      const exists = await this.storage.exists(key);
      if (exists && !options.overwrite) {
        continue;
      }

      // Save to storage
      await this.storage.save(key, item);

      // Clear cache to force reload
      this.clearCacheEntry(key);

      imported++;
    }

    return imported;
  }
}

/**
 * Remote registry client for fetching schemas from HTTP API
 */
export class RemoteRegistry {
  /**
   * @param {RemoteRegistryConfig} config - Remote registry configuration
   */
  constructor(config) {
    this.config = {
      timeout: 5000,
      ...config,
    };
  }

  /**
   * Fetch schema from remote registry
   * @param {string} name - Schema name
   * @param {string} [version] - Schema version (defaults to latest)
   * @returns {Promise<any>} Schema metadata
   */
  async fetchSchema(name, version) {
    const url = version
      ? `${this.config.url}/schemas/${name}/${version}`
      : `${this.config.url}/schemas/${name}/latest`;

    const headers = {
      'Content-Type': 'application/json',
      ...this.config.headers,
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Remote registry error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Search schemas in remote registry
   * @param {Object} criteria - Search criteria
   * @returns {Promise<any[]>} Array of matching schemas
   */
  async searchSchemas(criteria) {
    const url = new URL(`${this.config.url}/schemas/search`);

    // Add query parameters
    for (const [key, value] of Object.entries(criteria)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          url.searchParams.append(key, item);
        }
      } else {
        url.searchParams.set(key, value);
      }
    }

    const headers = {
      'Content-Type': 'application/json',
      ...this.config.headers,
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url.toString(), {
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Remote registry error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Publish schema to remote registry
   * @param {string} name - Schema name
   * @param {string} version - Schema version
   * @param {any} metadata - Schema metadata
   * @returns {Promise<any>} Publish response
   */
  async publishSchema(name, version, metadata) {
    const url = `${this.config.url}/schemas/${name}/${version}`;

    const headers = {
      'Content-Type': 'application/json',
      ...this.config.headers,
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ metadata }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Remote registry error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }
}

/**
 * Registry synchronizer for multi-registry support
 */
export class RegistrySynchronizer {
  /**
   * @param {Object} options - Synchronizer options
   * @param {SchemaStore} options.local - Local schema store
   * @param {RemoteRegistry[]} [options.remotes] - Remote registries
   */
  constructor(options) {
    this.local = options.local;
    this.remotes = options.remotes || [];
  }

  /**
   * Add remote registry
   * @param {RemoteRegistry} remote - Remote registry
   */
  addRemote(remote) {
    this.remotes.push(remote);
  }

  /**
   * Sync schema from remote to local
   * @param {string} name - Schema name
   * @param {string} [version] - Schema version
   * @param {number} [remoteIndex=0] - Remote registry index
   * @returns {Promise<boolean>} True if synced successfully
   */
  async syncFromRemote(name, version, remoteIndex = 0) {
    const remote = this.remotes[remoteIndex];
    if (!remote) {
      throw new Error(`No remote registry at index ${remoteIndex}`);
    }

    try {
      const metadata = await remote.fetchSchema(name, version);
      if (!metadata) {
        return false;
      }

      // Save to local store
      await this.local.saveMetadata(name, version || metadata.version, metadata);
      return true;
    } catch (error) {
      console.error(`Failed to sync ${name}@${version}:`, error.message);
      return false;
    }
  }

  /**
   * Sync schema from local to remote
   * @param {string} name - Schema name
   * @param {string} version - Schema version
   * @param {any} metadata - Schema metadata
   * @param {number} [remoteIndex=0] - Remote registry index
   * @returns {Promise<boolean>} True if synced successfully
   */
  async syncToRemote(name, version, metadata, remoteIndex = 0) {
    const remote = this.remotes[remoteIndex];
    if (!remote) {
      throw new Error(`No remote registry at index ${remoteIndex}`);
    }

    try {
      await remote.publishSchema(name, version, metadata);
      return true;
    } catch (error) {
      console.error(`Failed to publish ${name}@${version}:`, error.message);
      return false;
    }
  }

  /**
   * Search across all remote registries
   * @param {Object} criteria - Search criteria
   * @returns {Promise<any[]>} Combined search results
   */
  async searchAllRemotes(criteria) {
    const results = [];

    for (const remote of this.remotes) {
      try {
        const remoteResults = await remote.searchSchemas(criteria);
        results.push(...remoteResults);
      } catch (error) {
        console.error('Remote search failed:', error.message);
      }
    }

    return results;
  }
}

/**
 * Create a schema store with file system storage
 * @param {string} storageDir - Storage directory path
 * @param {Object} [options] - Additional options
 * @returns {SchemaStore} Schema store instance
 */
export function createFileStore(storageDir, options = {}) {
  return new SchemaStore({
    storageDir,
    ...options,
  });
}

/**
 * Create a schema store with memory storage
 * @param {Object} [options] - Additional options
 * @returns {SchemaStore} Schema store instance
 */
export function createMemoryStore(options = {}) {
  return new SchemaStore({
    storage: new MemoryStorage(),
    ...options,
  });
}

/**
 * Create a remote registry client
 * @param {string} url - Registry URL
 * @param {Object} [options] - Additional options
 * @returns {RemoteRegistry} Remote registry instance
 */
export function createRemoteRegistry(url, options = {}) {
  return new RemoteRegistry({ url, ...options });
}

/**
 * Create a registry synchronizer
 * @param {SchemaStore} local - Local schema store
 * @param {RemoteRegistry[]} [remotes] - Remote registries
 * @returns {RegistrySynchronizer} Synchronizer instance
 */
export function createSynchronizer(local, remotes = []) {
  return new RegistrySynchronizer({ local, remotes });
}
