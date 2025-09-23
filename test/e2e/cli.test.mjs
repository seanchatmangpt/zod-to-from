/**
 * End-to-end tests for ZTF CLI
 * Tests the complete CLI experience as a user would use it
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runLocalCitty, setupCleanroom, runCitty, teardownCleanroom, scenario } from 'citty-test-utils';
import { readFile, writeFile, unlink, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

describe('ZTF CLI End-to-End', () => {
  const cliPath = resolve(process.cwd(), 'src/cli/cli.mjs');
  const testDir = resolve(process.cwd(), 'test/fixtures');
  const outputDir = resolve(process.cwd(), 'test/temp');

  beforeAll(async () => {
    // Ensure output directory exists
    try {
      await mkdir(outputDir, { recursive: true });
    } catch {
      // Directory might already exist
    }
  });

  afterAll(async () => {
    // Clean up test files
    const filesToClean = [
      'test-output.json',
      'test-output.yaml',
      'test-output.toml',
      'parsed.json',
      'converted.yaml',
      'step1.yaml',
      'step2.json',
      'final.json',
      'error.json',
    ];

    for (const file of filesToClean) {
      try {
        await unlink(resolve(outputDir, file));
      } catch {
        // File might not exist
      }
    }
  });

  describe('Local Environment Tests', () => {
    it('should show help information', async () => {
      const result = await runLocalCitty(['help'], {
        cwd: process.cwd(),
        cliPath: cliPath,
      });

      result.expectSuccess();
      result.expectOutput('ZTF CLI - Universal I/O conversion layer for Zod schemas');
      result.expectOutput('USAGE:');
      result.expectOutput('ztf <noun> <verb> [options]');
      result.expectOutput('NOUNS:');
      result.expectOutput('VERBS:');
      result.expectOutput('EXAMPLES:');
      result.expectOutput('OPTIONS:');
    });

    it('should list available adapters', async () => {
      const result = await runLocalCitty(['adapter', 'list'], {
        cwd: process.cwd(),
        cliPath: cliPath,
      });

      result.expectSuccess();
      result.expectOutput('📦 Available adapters:');
      result.expectOutput('• json');
      result.expectOutput('• csv');
      result.expectOutput('• ndjson');
      result.expectOutput('• sqlite');
      result.expectOutput('• parquet');
      result.expectOutput('• arrow');
      result.expectOutput('• avro');
      result.expectOutput('• protobuf');
    });

    it('should parse and validate JSON config', async () => {
      const result = await runLocalCitty([
        'artifact',
        'parse',
        '--schema',
        './schemas/config.mjs#Config',
        '--from',
        'json',
        '--in',
        resolve(testDir, 'simple-config.json'),
        '--out',
        resolve(outputDir, 'test-output.json'),
      ], {
        cwd: process.cwd(),
        cliPath: cliPath,
      });

      result.expectSuccess();
      result.expectOutput('✅ Successfully parsed');

      // Verify output file was created and contains valid data
      const output = await readFile(resolve(outputDir, 'test-output.json'), 'utf8');
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty('host', 'localhost');
      expect(parsed).toHaveProperty('port', 3000);
      expect(parsed).toHaveProperty('debug', true);
    });

    it('should convert between different formats', async () => {
      // Convert JSON to YAML
      const result1 = await runLocalCitty([
        'artifact',
        'convert',
        '--schema',
        './schemas/config.mjs#Config',
        '--from',
        'json',
        '--to',
        'yaml',
        '--in',
        resolve(testDir, 'simple-config.json'),
        '--out',
        resolve(outputDir, 'test-output.yaml'),
      ], {
        cwd: process.cwd(),
        cliPath: cliPath,
      });

      result1.expectSuccess();
      result1.expectOutput('✅ Successfully converted');

      // Verify YAML output
      const yamlOutput = await readFile(resolve(outputDir, 'test-output.yaml'), 'utf8');
      expect(yamlOutput).toContain('host: localhost');
      expect(yamlOutput).toContain('port: 3000');
      expect(yamlOutput).toContain('debug: true');

      // Convert YAML back to JSON
      const result2 = await runLocalCitty([
        'artifact',
        'convert',
        '--schema',
        './schemas/config.mjs#Config',
        '--from',
        'yaml',
        '--to',
        'json',
        '--in',
        resolve(outputDir, 'test-output.yaml'),
        '--out',
        resolve(outputDir, 'test-output.json'),
      ], {
        cwd: process.cwd(),
        cliPath: cliPath,
      });

      result2.expectSuccess();
      result2.expectOutput('✅ Successfully converted');

      // Verify JSON output
      const jsonOutput = await readFile(resolve(outputDir, 'test-output.json'), 'utf8');
      const parsed = JSON.parse(jsonOutput);
      expect(parsed).toHaveProperty('host', 'localhost');
      expect(parsed).toHaveProperty('port', 3000);
      expect(parsed).toHaveProperty('debug', true);
    });

    it('should handle CSV data conversion', async () => {
      const result = await runLocalCitty([
        'artifact',
        'parse',
        '--schema',
        './schemas/config.mjs#CsvData',
        '--from',
        'csv',
        '--in',
        resolve(testDir, 'simple-data.csv'),
        '--out',
        resolve(outputDir, 'test-output.json'),
      ], {
        cwd: process.cwd(),
        cliPath: cliPath,
      });

      result.expectSuccess();
      result.expectOutput('✅ Successfully parsed');

      // Verify CSV was parsed correctly
      const output = await readFile(resolve(outputDir, 'test-output.json'), 'utf8');
      const parsed = JSON.parse(output);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(3);
      expect(parsed[0]).toHaveProperty('name', 'Alice');
      expect(parsed[0]).toHaveProperty('age', 25);
      expect(parsed[0]).toHaveProperty('active', true);
    });

    it('should handle error cases gracefully', async () => {
      const result = await runLocalCitty([
        'artifact',
        'parse',
        '--schema',
        './schemas/config.mjs#Config',
        '--from',
        'json',
        '--in',
        resolve(testDir, 'invalid-config.json'),
        '--out',
        resolve(outputDir, 'error.json'),
      ], {
        cwd: process.cwd(),
        cliPath: cliPath,
      });

      result.expectFailure();
      result.expectStderr('❌ Parse failed');
    });

    it('should validate required options', async () => {
      const result = await runLocalCitty([
        'artifact',
        'parse',
        '--from',
        'json',
        '--in',
        resolve(testDir, 'simple-config.json'),
        '--out',
        resolve(outputDir, 'test-output.json'),
      ], {
        cwd: process.cwd(),
        cliPath: cliPath,
      });

      result.expectFailure();
      result.expectStderr('❌ Error: --schema is required for artifact operations');
    });
  });

  describe('Cleanroom Environment Tests', () => {
    beforeAll(async () => {
      await setupCleanroom({ rootDir: process.cwd() });
    });

    afterAll(async () => {
      await teardownCleanroom();
    });

    it('should work in cleanroom environment', async () => {
      const result = await runCitty(['help'], {
        env: { DEBUG: 'true' },
        cliPath: cliPath,
      });

      result.expectSuccess();
      result.expectOutput('ZTF CLI - Universal I/O conversion layer for Zod schemas');
    });

    it('should list adapters in cleanroom', async () => {
      const result = await runCitty(['adapter', 'list'], {
        env: { DEBUG: 'true' },
        cliPath: cliPath,
      });

      result.expectSuccess();
      result.expectOutput('📦 Available adapters:');
      result.expectOutput('• json');
    });
  });

  describe('Complex Workflow Scenarios', () => {
    it('should execute complete data processing workflow', async () => {
      const result = await scenario('Complete Data Processing Workflow')
        .step('Parse CSV data')
        .run('artifact', 'parse', '--schema', './schemas/config.mjs#CsvData', '--from', 'csv', '--in', resolve(testDir, 'simple-data.csv'), '--out', resolve(outputDir, 'parsed.json'))
        .expectSuccess()
        .expectOutput('✅ Successfully parsed')
        .step('Convert to NDJSON')
        .run('artifact', 'convert', '--schema', './schemas/config.mjs#CsvData', '--from', 'json', '--to', 'ndjson', '--in', resolve(outputDir, 'parsed.json'), '--out', resolve(outputDir, 'converted.ndjson'))
        .expectSuccess()
        .expectOutput('✅ Successfully converted')
        .step('List available adapters')
        .run('adapter', 'list')
        .expectSuccess()
        .expectOutput('📦 Available adapters:')
        .execute('local', { cliPath: cliPath });

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(3);
    });

    it('should handle multi-format conversion chain', async () => {
      const result = await scenario('Multi-format Conversion Chain')
        .step('JSON to YAML')
        .run('artifact', 'convert', '--schema', './schemas/config.mjs#Config', '--from', 'json', '--to', 'yaml', '--in', resolve(testDir, 'simple-config.json'), '--out', resolve(outputDir, 'step1.yaml'))
        .expectSuccess()
        .step('YAML to TOML')
        .run('artifact', 'convert', '--schema', './schemas/config.mjs#Config', '--from', 'yaml', '--to', 'toml', '--in', resolve(outputDir, 'step1.yaml'), '--out', resolve(outputDir, 'step2.toml'))
        .expectSuccess()
        .step('TOML back to JSON')
        .run('artifact', 'convert', '--schema', './schemas/config.mjs#Config', '--from', 'toml', '--to', 'json', '--in', resolve(outputDir, 'step2.toml'), '--out', resolve(outputDir, 'final.json'))
        .expectSuccess()
        .execute('local', { cliPath: cliPath });

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(3);
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle large data files', async () => {
      // Create a large test file
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        name: `User${i}`,
        age: 20 + (i % 50),
        active: i % 2 === 0,
      }));

      const largeFilePath = resolve(outputDir, 'large-data.json');
      await writeFile(largeFilePath, JSON.stringify(largeData, null, 2));

      const result = await runLocalCitty([
        'artifact',
        'parse',
        '--schema',
        './schemas/config.mjs#CsvData',
        '--from',
        'json',
        '--in',
        largeFilePath,
        '--out',
        resolve(outputDir, 'large-output.json'),
      ], {
        cwd: process.cwd(),
        cliPath: cliPath,
        timeout: 30_000, // 30 second timeout
      });

      result.expectSuccess();
      result.expectOutput('✅ Successfully parsed');
    });

    it('should handle concurrent operations', async () => {
      const promises = [
        runLocalCitty(['adapter', 'list'], { cwd: process.cwd(), cliPath: cliPath }),
        runLocalCitty(['help'], { cwd: process.cwd(), cliPath: cliPath }),
        runLocalCitty(['adapter', 'list'], { cwd: process.cwd(), cliPath: cliPath }),
      ];

      const results = await Promise.all(promises);

      for (const result of results) {
        result.expectSuccess();
      }
    });
  });
});
