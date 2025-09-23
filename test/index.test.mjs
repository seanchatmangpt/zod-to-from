import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  adapterSupports,
  convert,
  createPackManifest,
  formatTo,
  getAdapterInfo,
  listAdapters,
  listAdaptersWithInfo,
  parseFrom,
  registerAdapter,
  registerPack,
} from '../src/core/index.mjs';

describe('zod-to-from', () => {
  const TestSchema = z.object({
    name: z.string(),
    age: z.number(),
    active: z.boolean(),
  });

  it('should parse JSON input', async () => {
    const input = '{"name": "John", "age": 30, "active": true}';
    const result = await parseFrom(TestSchema, 'json', input);

    expect(result).toEqual({
      name: 'John',
      age: 30,
      active: true,
    });
  });

  it('should format data to JSON', async () => {
    const data = { name: 'Jane', age: 25, active: false };
    const result = await formatTo(TestSchema, 'json', data);

    expect(result).toContain('"name": "Jane"');
    expect(result).toContain('"age": 25');
    expect(result).toContain('"active": false');
  });

  it('should convert between formats', async () => {
    const input = '{"name": "Bob", "age": 35, "active": true}';
    const result = await convert(TestSchema, { from: 'json', to: 'json' }, input);

    expect(result).toContain('"name": "Bob"');
    expect(result).toContain('"age": 35');
    expect(result).toContain('"active": true');
  });

  it('should register and list adapters', () => {
    const initialAdapters = listAdapters();
    expect(initialAdapters).toContain('json');

    registerAdapter('test', {
      async parse(input) {
        return { data: { test: input }, metadata: {} };
      },
      async format(data) {
        return { data: JSON.stringify(data), metadata: {} };
      },
    });

    const updatedAdapters = listAdapters();
    expect(updatedAdapters).toContain('test');
  });

  it('should throw error for unknown format', async () => {
    const input = '{"name": "Test"}';

    await expect(parseFrom(TestSchema, 'unknown-format', input)).rejects.toThrow(
      'No adapter found for format: unknown-format'
    );
  });

  it('should validate data against schema', async () => {
    const invalidData = { name: 'Test', age: 'not-a-number' };

    await expect(formatTo(TestSchema, 'json', invalidData)).rejects.toThrow();
  });

  it('should include provenance metadata when requested', async () => {
    const input = '{"name": "John", "age": 30, "active": true}';
    const result = await parseFrom(TestSchema, 'json', input, { includeProvenance: true });

    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('provenance');
    expect(result.provenance).toHaveProperty('timestamp');
    expect(result.provenance).toHaveProperty('sourceFormat', 'json');
    expect(result.provenance).toHaveProperty('adapter', 'json');
    expect(result.provenance).toHaveProperty('version');
  });

  it('should provide deterministic output when requested', async () => {
    const data = { name: 'Test', age: 25, active: true };
    const result1 = await formatTo(TestSchema, 'json', data, { deterministic: true });
    const result2 = await formatTo(TestSchema, 'json', data, { deterministic: true });

    expect(result1).toBe(result2);
    expect(result1).toContain('"name": "Test"');
    expect(result1).toContain('"age": 25');
    expect(result1).toContain('"active": true');
  });

  it('should get adapter information', () => {
    const info = getAdapterInfo('json');

    expect(info).toHaveProperty('name', 'json');
    expect(info).toHaveProperty('version');
    expect(info).toHaveProperty('supportsStreaming', false);
    expect(info).toHaveProperty('isAI', false);
  });

  it('should list adapters with information', () => {
    const adapters = listAdaptersWithInfo();

    expect(adapters.length).toBeGreaterThanOrEqual(1);
    const jsonAdapter = adapters.find(a => a.name === 'json');
    expect(jsonAdapter).toHaveProperty('name', 'json');
    expect(jsonAdapter).toHaveProperty('version');
  });

  it('should check adapter feature support', () => {
    expect(adapterSupports('json', 'streaming')).toBe(false);
    expect(adapterSupports('json', 'ai')).toBe(false);
    expect(adapterSupports('nonexistent', 'streaming')).toBe(false);
  });

  it('should create pack manifests', () => {
    const manifest = createPackManifest('test-pack', ['yaml', 'toml'], {
      version: '2.0.0',
      description: 'Test pack for YAML and TOML',
    });

    expect(manifest).toHaveProperty('name', 'test-pack');
    expect(manifest).toHaveProperty('version', '2.0.0');
    expect(manifest).toHaveProperty('formats', ['yaml', 'toml']);
    expect(manifest).toHaveProperty('description', 'Test pack for YAML and TOML');
  });

  it('should register packs', () => {
    const manifest = createPackManifest('test-pack', ['yaml'], {
      version: '1.0.0',
    });

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
    };

    registerPack(manifest, testAdapters);

    expect(listAdapters()).toContain('yaml');
    expect(getAdapterInfo('yaml')).toHaveProperty('supportsStreaming', true);
  });

  it('should handle streaming requests', async () => {
    // Test that streaming is properly handled
    const input = '{"name": "Test", "age": 25, "active": true}';

    // Should work for non-streaming adapters
    await expect(parseFrom(TestSchema, 'json', input, { streaming: false })).resolves.toBeDefined();

    // Should throw for streaming requests on non-streaming adapters
    await expect(parseFrom(TestSchema, 'json', input, { streaming: true })).rejects.toThrow(
      "Adapter 'json' does not support streaming"
    );
  });
});
