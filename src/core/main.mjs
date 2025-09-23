/**
 * Main API Implementation - Core ZTF functions
 * @fileoverview Implementation of parseFrom, formatTo, and convert functions
 */

import { getAdapter, createProvenance, simpleHash, deterministicStringify } from './registry.mjs';

/**
 * @typedef {import('zod').ZodSchema} ZodSchema
 * @typedef {import('zod').ZodType} ZodType
 * @typedef {import('./registry.mjs').ZTFOptions} ZTFOptions
 * @typedef {import('./registry.mjs').ZTFResult} ZTFResult
 */

/**
 * Parse input from a specified format into a Zod-validated object
 * @param {ZodSchema} schema - The Zod schema to validate against
 * @param {string} format - The input format (e.g., 'json', 'yaml', 'toml')
 * @param {string} input - The input string to parse
 * @param {ZTFOptions} [opts] - Optional configuration
 * @returns {Promise<any|ZTFResult>} The parsed and validated object, or ZTFResult if provenance requested
 */
export async function parseFrom(schema, format, input, opts = {}) {
  const adapter = getAdapter(format);
  if (!adapter) {
    throw new Error(`No adapter found for format: ${format}`);
  }

  // Check streaming support
  if (opts.streaming && !adapter.supportsStreaming) {
    throw new Error(`Adapter '${format}' does not support streaming`);
  }

  // Parse using the adapter
  const result = await adapter.parse(input, opts.adapter || {});

  // Validate against schema
  const validatedData = schema.parse(result.data);

  // Return result with or without provenance
  if (opts.includeProvenance) {
    const provenance = createProvenance(format, format, undefined, {
      schemaHash: simpleHash(schema.toString()),
    });
    return {
      data: validatedData,
      provenance,
    };
  }

  return validatedData;
}

/**
 * Format a Zod-validated object to a specified output format
 * @param {ZodSchema} schema - The Zod schema to validate against
 * @param {string} format - The output format (e.g., 'json', 'yaml', 'toml')
 * @param {any} data - The data to format
 * @param {ZTFOptions} [opts] - Optional configuration
 * @returns {Promise<string|ZTFResult>} The formatted string, or ZTFResult if provenance requested
 */
export async function formatTo(schema, format, data, opts = {}) {
  const adapter = getAdapter(format);
  if (!adapter) {
    throw new Error(`No adapter found for format: ${format}`);
  }

  // Check streaming support
  if (opts.streaming && !adapter.supportsStreaming) {
    throw new Error(`Adapter '${format}' does not support streaming`);
  }

  // Validate data against schema
  const validatedData = schema.parse(data);

  // Format using the adapter
  const result = await adapter.format(validatedData, opts.adapter || {});

  // Apply deterministic formatting if requested
  let formattedOutput = result.data;
  if (opts.deterministic && format === 'json') {
    formattedOutput = deterministicStringify(JSON.parse(result.data));
  }

  // Return result with or without provenance
  if (opts.includeProvenance) {
    const provenance = createProvenance(format, undefined, format, {
      schemaHash: simpleHash(schema.toString()),
    });
    return {
      data: formattedOutput,
      provenance,
    };
  }

  return formattedOutput;
}

/**
 * Convert data from one format to another with schema validation
 * @param {ZodSchema} schema - The Zod schema to validate against
 * @param {Object} conversion - Conversion configuration
 * @param {string} conversion.from - Source format
 * @param {string} conversion.to - Target format
 * @param {string} input - The input string to convert
 * @param {ZTFOptions} [opts] - Optional configuration
 * @returns {Promise<string|ZTFResult>} The converted string, or ZTFResult if provenance requested
 */
export async function convert(schema, conversion, input, opts = {}) {
  // Parse from source format
  const parseResult = await parseFrom(schema, conversion.from, input, opts);

  // Extract data from result (handle both direct data and ZTFResult)
  const parsedData = parseResult.data || parseResult;

  // Format to target format
  const formatResult = await formatTo(schema, conversion.to, parsedData, opts);

  // If provenance was requested, combine the metadata
  if (opts.includeProvenance && parseResult.provenance && formatResult.provenance) {
    return {
      data: formatResult.data,
      provenance: {
        ...formatResult.provenance,
        sourceFormat: conversion.from,
        targetFormat: conversion.to,
      },
    };
  }

  return formatResult;
}
