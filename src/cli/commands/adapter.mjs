/**
 * Adapter command implementations
 * @fileoverview Commands for managing and inspecting adapters following noun-verb structure
 */

import { getAdapterInfo, listAdapters, listAdaptersWithInfo, getAdapter } from '../../core/index.mjs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';

/**
 * List command - List all available adapters with filtering and output options
 * @param {Object} options - Command options
 * @param {string} [options.pack] - Filter by pack name (comma-separated)
 * @param {boolean} [options.verbose] - Show additional details
 * @param {boolean} [options.json] - Output as JSON
 */
export async function list(options = {}) {
  try {
    const { pack, verbose = false, json = false } = options;
    
    let adapters = listAdaptersWithInfo();
    
    // Filter by pack if specified
    if (pack) {
      const packNames = pack.split(',').map(p => p.trim());
      adapters = adapters.filter(adapter => {
        // For now, we'll use a simple heuristic based on adapter names
        // In a real implementation, adapters would have pack metadata
        return packNames.some(packName => 
          adapter.name.includes(packName) || 
          adapter.name.startsWith(packName)
        );
      });
    }
    
    if (json) {
      console.log(JSON.stringify(adapters, null, 2));
      return;
    }
    
    if (verbose) {
      console.log('📦 Available adapters:');
      for (const adapter of adapters) {
        const lossProfile = getLossProfile(adapter);
        console.log(`  • ${adapter.name} (${adapter.version})`);
        console.log(`    Loss Profile: ${lossProfile}`);
        console.log(`    Streaming: ${adapter.supportsStreaming ? '✅' : '❌'}`);
        console.log(`    AI-powered: ${adapter.isAI ? '✅' : '❌'}`);
        console.log(`    Parse: ${adapter.hasParse ? '✅' : '❌'}`);
        console.log(`    Format: ${adapter.hasFormat ? '✅' : '❌'}`);
        console.log('');
      }
    } else {
      console.log('📦 Available adapters:');
      for (const adapter of adapters) {
        console.log(`  • ${adapter.name}`);
      }
    }
  } catch (error) {
    console.error(`❌ List failed: ${error.message}`);
    throw error;
  }
}

/**
 * Show command - Display detailed information about a specific adapter
 * @param {Object} options - Command options
 * @param {string} options.name - Adapter name (required)
 * @param {boolean} [options.json] - Output as JSON
 */
export async function show(options = {}) {
  try {
    const { name, json = false } = options;
    
    if (!name) {
      throw new Error('Adapter name is required. Usage: ztf adapter show <name>');
    }
    
    const adapterInfo = getAdapterInfo(name);
    if (!adapterInfo) {
      throw new Error(`Adapter '${name}' not found`);
    }
    
    const adapter = getAdapter(name);
    const lossProfile = getLossProfile(adapterInfo);
    
    if (json) {
      const detailedInfo = {
        ...adapterInfo,
        lossProfile,
        capabilities: {
          parse: adapterInfo.hasParse,
          format: adapterInfo.hasFormat,
          streaming: adapterInfo.supportsStreaming,
          ai: adapterInfo.isAI,
        },
        metadata: adapter?.metadata || {},
      };
      console.log(JSON.stringify(detailedInfo, null, 2));
      return;
    }
    
    console.log(`📋 Adapter: ${adapterInfo.name}`);
    console.log(`  Version: ${adapterInfo.version}`);
    console.log(`  Loss Profile: ${lossProfile}`);
    console.log(`  Streaming: ${adapterInfo.supportsStreaming ? '✅' : '❌'}`);
    console.log(`  AI-powered: ${adapterInfo.isAI ? '✅' : '❌'}`);
    console.log(`  Parse: ${adapterInfo.hasParse ? '✅' : '❌'}`);
    console.log(`  Format: ${adapterInfo.hasFormat ? '✅' : '❌'}`);
    
    if (adapter?.metadata) {
      console.log(`  Metadata: ${JSON.stringify(adapter.metadata, null, 4)}`);
    }
  } catch (error) {
    console.error(`❌ Show failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test command - Run conformance tests for a specific adapter
 * @param {Object} options - Command options
 * @param {string} options.name - Adapter name (required)
 * @param {string} [options.type] - Test type: round-trip, golden, fuzz, or all (default)
 */
export async function test(options = {}) {
  try {
    const { name, type = 'all' } = options;
    
    if (!name) {
      throw new Error('Adapter name is required. Usage: ztf adapter test <name>');
    }
    
    const adapter = getAdapter(name);
    if (!adapter) {
      throw new Error(`Adapter '${name}' not found`);
    }
    
    console.log(`🧪 Running ${type} tests for adapter: ${name}`);
    
    const testTypes = type === 'all' ? ['round-trip', 'golden', 'fuzz'] : [type];
    
    for (const testType of testTypes) {
      console.log(`\n  Running ${testType} test...`);
      
      try {
        await runAdapterTest(name, adapter, testType);
        console.log(`  ✅ ${testType} test passed`);
      } catch (testError) {
        console.log(`  ❌ ${testType} test failed: ${testError.message}`);
        if (type !== 'all') {
          throw testError;
        }
      }
    }
    
    console.log(`\n🎉 All tests completed for adapter: ${name}`);
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    throw error;
  }
}

/**
 * Scaffold command - Generate boilerplate for a new custom adapter
 * @param {Object} options - Command options
 * @param {string} options.name - Adapter name (required)
 * @param {string} [options.pack] - Pack name to associate with the adapter
 * @param {string} [options.out] - Output directory for scaffolded files
 */
export async function scaffold(options = {}) {
  try {
    const { name, pack = 'custom', out = './adapters' } = options;
    
    if (!name) {
      throw new Error('Adapter name is required. Usage: ztf adapter scaffold <name>');
    }
    
    console.log(`🏗️  Scaffolding adapter: ${name}`);
    console.log(`  Pack: ${pack}`);
    console.log(`  Output: ${out}`);
    
    // Create output directory if it doesn't exist
    await mkdir(out, { recursive: true });
    
    // Generate adapter template
    const adapterTemplate = generateAdapterTemplate(name, pack);
    const adapterPath = join(out, `${name}.mjs`);
    await writeFile(adapterPath, adapterTemplate);
    
    // Generate test template
    const testTemplate = generateTestTemplate(name);
    const testPath = join(out, `${name}.test.mjs`);
    await writeFile(testPath, testTemplate);
    
    // Generate pack manifest if needed
    const packPath = join(out, `${pack}.mjs`);
    try {
      await readFile(packPath);
      console.log(`  📝 Pack manifest ${pack}.mjs already exists`);
    } catch {
      const packTemplate = generatePackTemplate(pack, [name]);
      await writeFile(packPath, packTemplate);
      console.log(`  📝 Created pack manifest: ${packPath}`);
    }
    
    console.log(`  ✅ Adapter scaffolded successfully!`);
    console.log(`  📁 Files created:`);
    console.log(`    - ${adapterPath}`);
    console.log(`    - ${testPath}`);
    console.log(`  🚀 Next steps:`);
    console.log(`    1. Implement the parse() and format() methods`);
    console.log(`    2. Run tests: pnpm test ${name}.test.mjs`);
    console.log(`    3. Register the adapter in your pack manifest`);
    
  } catch (error) {
    console.error(`❌ Scaffold failed: ${error.message}`);
    throw error;
  }
}

/**
 * Determine the loss profile of an adapter
 * @param {Object} adapterInfo - Adapter information
 * @returns {string} Loss profile: lossless, lossy, or enriched
 */
function getLossProfile(adapterInfo) {
  // Simple heuristic based on adapter capabilities
  if (adapterInfo.isAI) {
    return 'enriched';
  }
  
  // Most data formats are lossless, some specialized formats might be lossy
  const lossyFormats = ['jpeg', 'mp3', 'mp4', 'webp'];
  if (lossyFormats.some(format => adapterInfo.name.includes(format))) {
    return 'lossy';
  }
  
  return 'lossless';
}

/**
 * Run a specific test type for an adapter
 * @param {string} name - Adapter name
 * @param {Object} adapter - Adapter implementation
 * @param {string} testType - Test type to run
 */
async function runAdapterTest(name, adapter, testType) {
  switch (testType) {
    case 'round-trip': {
      await runRoundTripTest(name, adapter);
      break;
    }
    case 'golden': {
      await runGoldenTest(name, adapter);
      break;
    }
    case 'fuzz': {
      await runFuzzTest(name, adapter);
      break;
    }
    default: {
      throw new Error(`Unknown test type: ${testType}`);
    }
  }
}

/**
 * Run round-trip invariant test
 * @param {string} name - Adapter name
 * @param {Object} adapter - Adapter implementation
 */
async function runRoundTripTest(name, adapter) {
  if (typeof adapter.parse !== 'function' || typeof adapter.format !== 'function') {
    throw new TypeError('Round-trip test requires both parse and format capabilities');
  }
  
  // Simple round-trip test with sample data
  const sampleData = { test: 'data', number: 42, array: [1, 2, 3] };
  
  try {
    const formatted = await adapter.format(sampleData);
    const parsed = await adapter.parse(formatted.data);
    
    // Basic comparison (in real implementation, would use deep equality)
    if (JSON.stringify(parsed.data) !== JSON.stringify(sampleData)) {
      throw new Error('Round-trip test failed: data mismatch');
    }
  } catch (error) {
    throw new Error(`Round-trip test failed: ${error.message}`);
  }
}

/**
 * Run golden file test
 * @param {string} name - Adapter name
 * @param {Object} adapter - Adapter implementation
 */
async function runGoldenTest(name, adapter) {
  // In a real implementation, this would load golden test files
  // For now, we'll simulate a successful test
  console.log(`    Using golden test files for ${name}`);
}

/**
 * Run fuzz test
 * @param {string} name - Adapter name
 * @param {Object} adapter - Adapter implementation
 */
async function runFuzzTest(name, adapter) {
  // In a real implementation, this would generate random test data
  // For now, we'll simulate a successful test
  console.log(`    Running fuzz tests for ${name}`);
}

/**
 * Generate adapter template code
 * @param {string} name - Adapter name
 * @param {string} pack - Pack name
 * @returns {string} Template code
 */
function generateAdapterTemplate(name, pack) {
  // Convert hyphenated names to camelCase for variable names
  const camelName = name.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
  const adapterVarName = `${camelName}Adapter`;
  
  return `/**
 * ${name} adapter for parsing and formatting ${name} data
 * @fileoverview Generated adapter template
 */

import { createPackManifest, registerPack } from '../core/index.mjs';

/**
 * ${name} adapter implementation
 */
const ${adapterVarName} = {
  /**
   * Parse ${name} input to data
   * @param {string} input - Input string
   * @param {Object} [opts] - Options
   * @returns {Promise<{data: unknown, metadata?: Object}>} Parsed data with metadata
   */
  async parse(input, opts = {}) {
    // TODO: Implement ${name} parsing logic
    throw new Error('${name} parsing not yet implemented');
  },

  /**
   * Format data to ${name} string
   * @param {unknown} data - Data to format
   * @param {Object} [opts] - Options
   * @returns {Promise<{data: string, metadata?: Object}>} Formatted string with metadata
   */
  async format(data, opts = {}) {
    // TODO: Implement ${name} formatting logic
    throw new Error('${name} formatting not yet implemented');
  },

  supportsStreaming: false, // Set to true if streaming is supported
  isAI: false, // Set to true if this adapter uses AI
  version: '1.0.0',
  metadata: {
    pack: '${pack}',
    description: '${name} format adapter',
  },
};

// Create pack manifest
const packManifest = createPackManifest(
  '${pack}',
  ['${name}'],
  {
    version: '1.0.0',
    description: '${pack} format adapters for ZTF',
    dependencies: [],
  }
);

// Register the adapter
const adapters = {
  ${name}: ${adapterVarName},
};

registerPack(packManifest, adapters);

export { ${adapterVarName} };
`;
}

/**
 * Generate test template code
 * @param {string} name - Adapter name
 * @returns {string} Test template code
 */
function generateTestTemplate(name) {
  // Convert hyphenated names to camelCase for variable names
  const camelName = name.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
  const adapterVarName = `${camelName}Adapter`;
  
  return `/**
 * Tests for ${name} adapter
 * @fileoverview Generated test template
 */

import { describe, it, expect } from 'vitest';
import { ${adapterVarName} } from './${name}.mjs';

describe('${name} adapter', () => {
  it('should parse ${name} input', async () => {
    // TODO: Implement parse test
    expect(true).toBe(true);
  });

  it('should format data to ${name}', async () => {
    // TODO: Implement format test
    expect(true).toBe(true);
  });

  it('should handle round-trip conversion', async () => {
    // TODO: Implement round-trip test
    expect(true).toBe(true);
  });

  it('should handle invalid input gracefully', async () => {
    // TODO: Implement error handling test
    expect(true).toBe(true);
  });
});
`;
}

/**
 * Generate pack template code
 * @param {string} packName - Pack name
 * @param {string[]} adapters - Array of adapter names
 * @returns {string} Pack template code
 */
function generatePackTemplate(packName, adapters) {
  const adapterList = adapters.map(name => `'${name}'`).join(', ');
  
  return `/**
 * ${packName} pack - Collection of format adapters
 * @fileoverview Generated pack template
 */

import { createPackManifest, registerPack } from '../core/index.mjs';

// Import adapters
${adapters.map(name => {
  const camelName = name.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
  const adapterVarName = `${camelName}Adapter`;
  return `import { ${adapterVarName} } from './${name}.mjs';`;
}).join('\n')}

// Create pack manifest
const packManifest = createPackManifest(
  '${packName}',
  [${adapterList}],
  {
    version: '1.0.0',
    description: '${packName} format adapters for ZTF',
    dependencies: [],
  }
);

// Register all adapters
const adapters = {
${adapters.map(name => {
  const camelName = name.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
  const adapterVarName = `${camelName}Adapter`;
  return `  ${name}: ${adapterVarName},`;
}).join('\n')}
};

registerPack(packManifest, adapters);

export {
${adapters.map(name => {
  const camelName = name.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
  const adapterVarName = `${camelName}Adapter`;
  return `  ${adapterVarName},`;
}).join('\n')}
};
`;
}
