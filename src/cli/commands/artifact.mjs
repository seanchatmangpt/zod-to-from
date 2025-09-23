/**
 * Artifact command implementations
 * @fileoverview Commands for operating on data artifacts
 */

import { readFile, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { convert as coreConvert, formatTo, parseFrom } from '../../core/index.mjs';

/**
 * Load a schema from a file path
 * @param {string} schemaPath - Path to schema file
 * @returns {Promise<Object>} The loaded schema
 */
async function loadSchema(schemaPath) {
  if (!schemaPath) {
    throw new Error('Schema path is required');
  }

  const [filePath, exportName] = schemaPath.split('#');
  const resolvedPath = resolve(process.cwd(), filePath);

  try {
    const module = await import(resolvedPath);
    const schema = exportName ? module[exportName] : module.default;

    if (!schema) {
      throw new Error(`Schema export '${exportName || 'default'}' not found in ${filePath}`);
    }

    return schema;
  } catch (error) {
    throw new Error(`Failed to load schema from ${schemaPath}: ${error.message}`);
  }
}

/**
 * Get format from file extension
 * @param {string} filePath - File path
 * @returns {string} Format name
 */
function getFormatFromPath(filePath) {
  const ext = extname(filePath).toLowerCase();
  const formatMap = {
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.toml': 'toml',
    '.csv': 'csv',
    '.tsv': 'csv',
    '.ndjson': 'ndjson',
    '.jsonl': 'ndjson',
    '.ttl': 'ttl',
    '.turtle': 'ttl',
    '.xml': 'xml',
  };

  return formatMap[ext] || 'json';
}

/**
 * Convert command - Convert between formats
 * @param {Object} options - Command options
 */
export async function convert(options) {
  const {
    schema: schemaPath,
    from,
    to,
    in: inputPath,
    out: outputPath,
    repair,
    llmPrompt,
    provenance,
    deterministic,
    streaming,
  } = options;

  try {
    // Load schema
    const schema = await loadSchema(schemaPath);

    // Read input file
    const input = await readFile(inputPath, 'utf8');

    // Determine formats
    const sourceFormat = from || getFormatFromPath(inputPath);
    const targetFormat = to || getFormatFromPath(outputPath);

    // Convert with options
    const convertOptions = {
      includeProvenance: provenance,
      deterministic,
      streaming,
      adapter: {
        repair,
        llmPrompt,
      },
    };
    const result = await coreConvert(
      schema,
      { from: sourceFormat, to: targetFormat },
      input,
      convertOptions
    );

    // Write output
    const output = provenance ? JSON.stringify(result, undefined, 2) : result;
    await writeFile(outputPath, output, 'utf8');

    console.log(
      `✅ Successfully converted ${inputPath} (${sourceFormat}) to ${outputPath} (${targetFormat})`
    );
    if (provenance) {
      console.log(`📋 Provenance: ${result.provenance.timestamp}`);
    }
  } catch (error) {
    console.error(`❌ Convert failed: ${error.message}`);
    throw error;
  }
}

/**
 * Parse command - Parse and validate input
 * @param {Object} options - Command options
 */
export async function parse(options) {
  const {
    schema: schemaPath,
    from,
    in: inputPath,
    out: outputPath,
    repair,
    llmPrompt,
    provenance,
    streaming,
  } = options;

  try {
    // Load schema
    const schema = await loadSchema(schemaPath);

    // Read input file
    const input = await readFile(inputPath, 'utf8');

    // Determine format
    const format = from || getFormatFromPath(inputPath);

    // Parse with options
    const parseOptions = {
      includeProvenance: provenance,
      streaming,
      adapter: {
        repair,
        llmPrompt,
      },
    };
    const result = await parseFrom(schema, format, input, parseOptions);

    // Write output
    const output = provenance
      ? JSON.stringify(result, undefined, 2)
      : JSON.stringify(result.data || result, undefined, 2);
    await writeFile(outputPath, output, 'utf8');

    console.log(`✅ Successfully parsed ${inputPath} to ${outputPath}`);
    if (provenance) {
      console.log(`📋 Provenance: ${result.provenance.timestamp}`);
    }
  } catch (error) {
    console.error(`❌ Parse failed: ${error.message}`);
    throw error;
  }
}

/**
 * Format command - Format validated data
 * @param {Object} options - Command options
 */
export async function format(options) {
  const {
    schema: schemaPath,
    to,
    in: inputPath,
    out: outputPath,
    repair,
    llmPrompt,
    provenance,
    deterministic,
  } = options;

  try {
    // Load schema
    const schema = await loadSchema(schemaPath);

    // Read input file
    const input = await readFile(inputPath, 'utf8');
    const data = JSON.parse(input);

    // Determine format
    const format = to || getFormatFromPath(outputPath);

    // Format with options
    const formatOptions = {
      includeProvenance: provenance,
      deterministic,
      adapter: {
        repair,
        llmPrompt,
      },
    };
    const result = await formatTo(schema, format, data, formatOptions);

    // Write output
    const output = provenance ? JSON.stringify(result, undefined, 2) : result;
    await writeFile(outputPath, output, 'utf8');

    console.log(`✅ Successfully formatted ${inputPath} to ${outputPath}`);
    if (provenance) {
      console.log(`📋 Provenance: ${result.provenance.timestamp}`);
    }
  } catch (error) {
    console.error(`❌ Format failed: ${error.message}`);
    throw error;
  }
}
