/**
 * Registry Tests - Adapter registration and management
 * @fileoverview Comprehensive tests for the adapter registry system
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  adapterSupports,
  createPackManifest,
  createProvenance,
  deterministicStringify,
  getAdapter,
  getAdapterInfo,
  listAdapters,
  listAdaptersWithInfo,
  registerAdapter,
  registerPack,
  simpleHash,
} from '../../src/core/registry.mjs';

describe('Core API - Registry Functions', () => {
  beforeEach(() => {
    // Clean state for each test
  });

  afterEach(() => {
    // Cleanup if needed
  });

  describe('Adapter Registration', () => {
    it('should register a new adapter', () => {
      const testAdapter = {
        async parse(input, opts = {}) {
          return { data: { test: input }, metadata: {} };
        },
        async format(data, opts = {}) {
          return { data: JSON.stringify(data), metadata: {} };
        },
        supportsStreaming: false,
        isAI: false,
        version: '1.0.0',
      };

      registerAdapter('test-adapter', testAdapter);
      const retrieved = getAdapter('test-adapter');

      expect(retrieved).toBe(testAdapter);
    });

    it('should overwrite existing adapter with same name', () => {
      const adapter1 = {
        async parse(input) {
          return { data: 'adapter1', metadata: {} };
        },
        async format(data) {
          return { data: 'adapter1', metadata: {} };
        },
        version: '1.0.0',
      };

      const adapter2 = {
        async parse(input) {
          return { data: 'adapter2', metadata: {} };
        },
        async format(data) {
          return { data: 'adapter2', metadata: {} };
        },
        version: '2.0.0',
      };

      registerAdapter('overwrite-test', adapter1);
      expect(getAdapter('overwrite-test')).toBe(adapter1);

      registerAdapter('overwrite-test', adapter2);
      expect(getAdapter('overwrite-test')).toBe(adapter2);
    });

    it('should return undefined for non-existent adapter', () => {
      const result = getAdapter('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('Adapter Listing', () => {
    it('should list all registered adapters', () => {
      const initialAdapters = listAdapters();
      expect(Array.isArray(initialAdapters)).toBe(true);
      expect(initialAdapters).toContain('json'); // Built-in adapter

      // Register a test adapter
      registerAdapter('list-test', {
        async parse(input) {
          return { data: input, metadata: {} };
        },
        async format(data) {
          return { data: JSON.stringify(data), metadata: {} };
        },
      });

      const updatedAdapters = listAdapters();
      expect(updatedAdapters).toContain('list-test');
      expect(updatedAdapters.length).toBe(initialAdapters.length + 1);
    });

    it('should return unique adapter names', () => {
      const adapters = listAdapters();
      const uniqueAdapters = [...new Set(adapters)];
      expect(adapters.length).toBe(uniqueAdapters.length);
    });
  });

  describe('Adapter Information', () => {
    it('should get adapter information', () => {
      const testAdapter = {
        async parse(input) {
          return { data: input, metadata: {} };
        },
        async format(data) {
          return { data: JSON.stringify(data), metadata: {} };
        },
        supportsStreaming: true,
        isAI: true,
        version: '2.1.0',
      };

      registerAdapter('info-test', testAdapter);
      const info = getAdapterInfo('info-test');

      expect(info).toEqual({
        name: 'info-test',
        version: '2.1.0',
        supportsStreaming: true,
        isAI: true,
        hasParse: true,
        hasFormat: true,
      });
    });

    it('should return undefined for non-existent adapter info', () => {
      const info = getAdapterInfo('non-existent');
      expect(info).toBeUndefined();
    });

    it('should handle adapters with missing optional properties', () => {
      const minimalAdapter = {
        async parse(input) {
          return { data: input, metadata: {} };
        },
        async format(data) {
          return { data: JSON.stringify(data), metadata: {} };
        },
      };

      registerAdapter('minimal-test', minimalAdapter);
      const info = getAdapterInfo('minimal-test');

      expect(info).toEqual({
        name: 'minimal-test',
        version: '1.0.0', // Default version
        supportsStreaming: false, // Default value
        isAI: false, // Default value
        hasParse: true,
        hasFormat: true,
      });
    });

    it('should list all adapters with information', () => {
      const adaptersWithInfo = listAdaptersWithInfo();
      expect(Array.isArray(adaptersWithInfo)).toBe(true);
      expect(adaptersWithInfo.length).toBeGreaterThan(0);

      // Check that all returned adapters have required properties
      for (const adapter of adaptersWithInfo) {
        expect(adapter).toHaveProperty('name');
        expect(adapter).toHaveProperty('version');
        expect(adapter).toHaveProperty('supportsStreaming');
        expect(adapter).toHaveProperty('isAI');
        expect(adapter).toHaveProperty('hasParse');
        expect(adapter).toHaveProperty('hasFormat');
      }

      // Check that built-in json adapter is included
      const jsonAdapter = adaptersWithInfo.find(a => a.name === 'json');
      expect(jsonAdapter).toBeDefined();
      expect(jsonAdapter.hasParse).toBe(true);
      expect(jsonAdapter.hasFormat).toBe(true);
    });
  });

  describe('Feature Support Checking', () => {
    it('should check streaming support', () => {
      const streamingAdapter = {
        async parse(input) {
          return { data: input, metadata: {} };
        },
        async format(data) {
          return { data: JSON.stringify(data), metadata: {} };
        },
        supportsStreaming: true,
      };

      const nonStreamingAdapter = {
        async parse(input) {
          return { data: input, metadata: {} };
        },
        async format(data) {
          return { data: JSON.stringify(data), metadata: {} };
        },
        supportsStreaming: false,
      };

      registerAdapter('streaming-test', streamingAdapter);
      registerAdapter('non-streaming-test', nonStreamingAdapter);

      expect(adapterSupports('streaming-test', 'streaming')).toBe(true);
      expect(adapterSupports('non-streaming-test', 'streaming')).toBe(false);
      expect(adapterSupports('non-existent', 'streaming')).toBe(false);
    });

    it('should check AI support', () => {
      const aiAdapter = {
        async parse(input) {
          return { data: input, metadata: {} };
        },
        async format(data) {
          return { data: JSON.stringify(data), metadata: {} };
        },
        isAI: true,
      };

      const nonAIAdapter = {
        async parse(input) {
          return { data: input, metadata: {} };
        },
        async format(data) {
          return { data: JSON.stringify(data), metadata: {} };
        },
        isAI: false,
      };

      registerAdapter('ai-test', aiAdapter);
      registerAdapter('non-ai-test', nonAIAdapter);

      expect(adapterSupports('ai-test', 'ai')).toBe(true);
      expect(adapterSupports('non-ai-test', 'ai')).toBe(false);
      expect(adapterSupports('non-existent', 'ai')).toBe(false);
    });

    it('should return false for unknown features', () => {
      registerAdapter('feature-test', {
        async parse(input) {
          return { data: input, metadata: {} };
        },
        async format(data) {
          return { data: JSON.stringify(data), metadata: {} };
        },
      });

      expect(adapterSupports('feature-test', 'unknown-feature')).toBe(false);
      expect(adapterSupports('non-existent', 'unknown-feature')).toBe(false);
    });
  });

  describe('Pack Management', () => {
    it('should create pack manifest', () => {
      const manifest = createPackManifest('test-pack', ['yaml', 'toml'], {
        version: '2.0.0',
        description: 'Test pack for YAML and TOML',
        dependencies: ['yaml-parser', 'toml-parser'],
      });

      expect(manifest).toEqual({
        name: 'test-pack',
        formats: ['yaml', 'toml'],
        version: '2.0.0',
        description: 'Test pack for YAML and TOML',
        dependencies: ['yaml-parser', 'toml-parser'],
      });
    });

    it('should create pack manifest with defaults', () => {
      const manifest = createPackManifest('minimal-pack', ['json']);

      expect(manifest).toEqual({
        name: 'minimal-pack',
        formats: ['json'],
        version: '1.0.0',
        description: '',
        dependencies: [],
      });
    });

    it('should register pack adapters', () => {
      const manifest = createPackManifest('test-pack', ['yaml', 'toml']);

      const testAdapters = {
        yaml: {
          async parse(input) {
            return { data: { test: 'yaml' }, metadata: {} };
          },
          async format(data) {
            return { data: 'yaml: test', metadata: {} };
          },
          supportsStreaming: true,
          isAI: false,
        },
        toml: {
          async parse(input) {
            return { data: { test: 'toml' }, metadata: {} };
          },
          async format(data) {
            return { data: 'test = "toml"', metadata: {} };
          },
          supportsStreaming: false,
          isAI: false,
        },
        // This adapter should not be registered as it's not in the manifest
        xml: {
          async parse(input) {
            return { data: { test: 'xml' }, metadata: {} };
          },
          async format(data) {
            return { data: '<test>xml</test>', metadata: {} };
          },
        },
      };

      registerPack(manifest, testAdapters);

      expect(getAdapter('yaml')).toBe(testAdapters.yaml);
      expect(getAdapter('toml')).toBe(testAdapters.toml);
      expect(getAdapter('xml')).toBeUndefined();
    });

    it('should handle empty pack registration', () => {
      const manifest = createPackManifest('empty-pack', []);
      const adapters = {};

      // Should not throw
      expect(() => registerPack(manifest, adapters)).not.toThrow();
    });
  });

  describe('Provenance Creation', () => {
    it('should create basic provenance', () => {
      const provenance = createProvenance('test-adapter');

      expect(provenance).toHaveProperty('timestamp');
      expect(provenance).toHaveProperty('adapter', 'test-adapter');
      expect(provenance).toHaveProperty('version');
      expect(provenance.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should create provenance with source and target formats', () => {
      const provenance = createProvenance('converter', 'json', 'yaml');

      expect(provenance).toHaveProperty('sourceFormat', 'json');
      expect(provenance).toHaveProperty('targetFormat', 'yaml');
      expect(provenance).toHaveProperty('adapter', 'converter');
    });

    it('should create provenance with additional options', () => {
      const options = {
        aiModel: 'gpt-4',
        promptHash: 'abc123',
        schemaHash: 'def456',
      };

      const provenance = createProvenance('ai-adapter', 'pdf', 'json', options);

      expect(provenance).toHaveProperty('aiModel', 'gpt-4');
      expect(provenance).toHaveProperty('promptHash', 'abc123');
      expect(provenance).toHaveProperty('schemaHash', 'def456');
    });

    it('should create provenance with partial options', () => {
      const options = {
        aiModel: 'gpt-3.5-turbo',
      };

      const provenance = createProvenance('ai-adapter', undefined, undefined, options);

      expect(provenance).toHaveProperty('aiModel', 'gpt-3.5-turbo');
      expect(provenance).not.toHaveProperty('promptHash');
      expect(provenance).not.toHaveProperty('schemaHash');
    });
  });

  describe('Utility Functions', () => {
    it('should generate consistent hash for same input', () => {
      const input = 'test-string';
      const hash1 = simpleHash(input);
      const hash2 = simpleHash(input);

      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = simpleHash('string1');
      const hash2 = simpleHash('string2');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string hash', () => {
      const hash = simpleHash('');
      expect(typeof hash).toBe('string');
    });

    it('should generate deterministic JSON string', () => {
      const obj = {
        c: 3,
        a: 1,
        b: 2,
        nested: {
          z: 26,
          x: 24,
          y: 25,
        },
      };

      const result1 = deterministicStringify(obj);
      const result2 = deterministicStringify(obj);

      expect(result1).toBe(result2);
      expect(result1).toContain('"a": 1');
      expect(result1).toContain('"b": 2');
      expect(result1).toContain('"c": 3');
    });

    it('should handle arrays in deterministic stringify', () => {
      const obj = {
        items: [3, 1, 2],
        name: 'test',
      };

      const result = deterministicStringify(obj);
      expect(result).toContain('"items": [3, 1, 2]');
      expect(result).toContain('"name": "test"');
    });

    it('should handle null and undefined values', () => {
      const obj = {
        nullValue: undefined,
        undefinedValue: undefined,
        normalValue: 'test',
      };

      const result = deterministicStringify(obj);
      expect(result).toContain('"nullValue": undefined');
      expect(result).toContain('"normalValue": "test"');
      // undefined values should be omitted
      expect(result).not.toContain('undefinedValue');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed adapter registration gracefully', () => {
      // Register adapter with missing methods
      const malformedAdapter = {
        async parse(input) {
          return { data: input, metadata: {} };
        },
        // Missing format method
      };

      expect(() => registerAdapter('malformed', malformedAdapter)).not.toThrow();

      const info = getAdapterInfo('malformed');
      expect(info.hasParse).toBe(true);
      expect(info.hasFormat).toBe(false);
    });

    it('should handle null/undefined adapter registration', () => {
      expect(() => registerAdapter('null-adapter', undefined)).not.toThrow();
      expect(() => registerAdapter('undefined-adapter', undefined)).not.toThrow();
    });

    it('should handle invalid pack manifest creation', () => {
      expect(() => createPackManifest(undefined, [])).not.toThrow();
      expect(() => createPackManifest('test', undefined)).not.toThrow();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large number of adapter registrations', () => {
      const startTime = Date.now();

      // Register many adapters
      for (let i = 0; i < 100; i++) {
        registerAdapter(`perf-test-${i}`, {
          async parse(input) {
            return { data: input, metadata: {} };
          },
          async format(data) {
            return { data: JSON.stringify(data), metadata: {} };
          },
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete quickly (less than 1 second for 100 adapters)
      expect(duration).toBeLessThan(1000);

      // Verify all adapters were registered
      const adapters = listAdapters();
      expect(adapters.filter(name => name.startsWith('perf-test-'))).toHaveLength(100);
    });

    it('should handle large adapter info listings efficiently', () => {
      // Register many adapters
      for (let i = 0; i < 50; i++) {
        registerAdapter(`info-perf-${i}`, {
          async parse(input) {
            return { data: input, metadata: {} };
          },
          async format(data) {
            return { data: JSON.stringify(data), metadata: {} };
          },
        });
      }

      const startTime = Date.now();
      const adaptersWithInfo = listAdaptersWithInfo();
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete quickly
      expect(duration).toBeLessThan(500);
      expect(adaptersWithInfo.length).toBeGreaterThanOrEqual(50);
    });
  });
});
