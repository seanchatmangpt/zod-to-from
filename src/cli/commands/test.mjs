/**
 * Test command implementations
 * @fileoverview Commands for running validation and integrity tests
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { formatTo, parseFrom } from '../../core/index.mjs';

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
 * Run command - Execute a named test contract
 * @param {Object} options - Command options
 */
export async function run(options) {
  const {
    type: testType,
    schema: schemaPath,
    format: testFormat,
    in: inputPath,
    out: outputPath,
  } = options;

  try {
    // Load schema
    const schema = await loadSchema(schemaPath);

    // Read input data
    const input = await readFile(inputPath, 'utf8');

    switch (testType) {
      case 'round-trip': {
        await runRoundTripTest(schema, testFormat, input, outputPath);
        break;
      }
      case 'fuzz': {
        await runFuzzTest(schema, testFormat, input, outputPath);
        break;
      }
      case 'validation': {
        await runValidationTest(schema, testFormat, input, outputPath);
        break;
      }
      default: {
        throw new Error(`Unknown test type: ${testType}`);
      }
    }
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    throw error;
  }
}

/**
 * Run a round-trip test to check for data loss
 * @param {Object} schema - Zod schema
 * @param {string} format - Test format
 * @param {string} input - Input data
 * @param {string} outputPath - Output path for results
 */
async function runRoundTripTest(schema, format, input, outputPath) {
  console.log(`🔄 Running round-trip test for format: ${format}`);

  try {
    // Parse input
    const parsed = await parseFrom(schema, format, input);

    // Format back to same format
    const formatted = await formatTo(schema, format, parsed);

    // Parse again to check for consistency
    const reparsed = await parseFrom(schema, format, formatted);

    // Compare results
    const originalJson = JSON.stringify(parsed);
    const roundTripJson = JSON.stringify(reparsed);

    if (originalJson === roundTripJson) {
      console.log('✅ Round-trip test passed: No data loss detected');
    } else {
      console.log('⚠️  Round-trip test warning: Minor data differences detected');
      console.log('   This may be expected for some formats (e.g., comment preservation)');
    }

    // Write test results
    const results = {
      testType: 'round-trip',
      format,
      passed: originalJson === roundTripJson,
      originalSize: originalJson.length,
      roundTripSize: roundTripJson.length,
      timestamp: new Date().toISOString(),
    };

    await writeFile(outputPath, JSON.stringify(results, undefined, 2), 'utf8');
    console.log(`📋 Test results written to: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Round-trip test failed: ${error.message}`);
    throw error;
  }
}

/**
 * Run a fuzz test with random data
 * @param {Object} schema - Zod schema
 * @param {string} format - Test format
 * @param {string} input - Input data
 * @param {string} outputPath - Output path for results
 */
async function runFuzzTest(schema, format, input, outputPath) {
  console.log(`🎲 Running fuzz test for format: ${format}`);

  try {
    // Parse input to get valid data structure
    const validData = await parseFrom(schema, format, input);

    // Generate variations (placeholder for actual fuzzing)
    const variations = [
      validData,
      // Add more variations here
    ];

    let passed = 0;
    let failed = 0;

    for (const variation of variations) {
      try {
        // Try to format and parse back
        const formatted = await formatTo(schema, format, variation);
        const reparsed = await parseFrom(schema, format, formatted);

        // Validate the result
        schema.parse(reparsed);
        passed++;
      } catch (error) {
        failed++;
        console.log(`⚠️  Fuzz test variation failed: ${error.message}`);
      }
    }

    console.log(`✅ Fuzz test completed: ${passed} passed, ${failed} failed`);

    // Write test results
    const results = {
      testType: 'fuzz',
      format,
      passed,
      failed,
      total: variations.length,
      timestamp: new Date().toISOString(),
    };

    await writeFile(outputPath, JSON.stringify(results, undefined, 2), 'utf8');
    console.log(`📋 Test results written to: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Fuzz test failed: ${error.message}`);
    throw error;
  }
}

/**
 * Run a validation test
 * @param {Object} schema - Zod schema
 * @param {string} format - Test format
 * @param {string} input - Input data
 * @param {string} outputPath - Output path for results
 */
async function runValidationTest(schema, format, input, outputPath) {
  console.log(`✅ Running validation test for format: ${format}`);

  try {
    // Parse and validate
    const parsed = await parseFrom(schema, format, input);

    // Additional validation checks
    const isValid = schema.safeParse(parsed).success;

    if (isValid) {
      console.log('✅ Validation test passed: Data is valid against schema');
    } else {
      console.log('❌ Validation test failed: Data is invalid against schema');
    }

    // Write test results
    const results = {
      testType: 'validation',
      format,
      passed: isValid,
      timestamp: new Date().toISOString(),
    };

    await writeFile(outputPath, JSON.stringify(results, undefined, 2), 'utf8');
    console.log(`📋 Test results written to: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Validation test failed: ${error.message}`);
    throw error;
  }
}
