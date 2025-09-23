/**
 * Audit command implementations
 * @fileoverview Commands for managing audit logs and provenance
 */

import { readFile, writeFile } from 'node:fs/promises';

/**
 * Export command - Export audit logs to specified format
 * @param {Object} options - Command options
 */
export async function exportAudit(options) {
  const { format: outputFormat, in: inputPath, out: outputPath } = options;

  try {
    // Read input provenance data
    const input = await readFile(inputPath, 'utf8');
    const provenanceData = JSON.parse(input);

    // Convert to requested format
    let output;
    switch (outputFormat) {
      case 'turtle':
      case 'ttl': {
        output = convertToTurtle(provenanceData);
        break;
      }
      case 'json': {
        output = JSON.stringify(provenanceData, undefined, 2);
        break;
      }
      case 'jsonl': {
        output = JSON.stringify(provenanceData);
        break;
      }
      default: {
        throw new Error(`Unsupported export format: ${outputFormat}`);
      }
    }

    // Write output
    await writeFile(outputPath, output, 'utf8');

    console.log(`✅ Successfully exported audit log to ${outputPath} (${outputFormat})`);
  } catch (error) {
    console.error(`❌ Export failed: ${error.message}`);
    throw error;
  }
}

/**
 * Show command - Display audit information
 * @param {Object} options - Command options
 */
export async function show(options) {
  const { in: inputPath, format: displayFormat } = options;

  try {
    // Read input provenance data
    const input = await readFile(inputPath, 'utf8');
    const provenanceData = JSON.parse(input);

    // Display in requested format
    switch (displayFormat) {
      case 'table': {
        displayAsTable(provenanceData);
        break;
      }
      case 'json': {
        console.log(JSON.stringify(provenanceData, undefined, 2));
        break;
      }
      default: {
        displayAsSummary(provenanceData);
      }
    }
  } catch (error) {
    console.error(`❌ Show failed: ${error.message}`);
    throw error;
  }
}

/**
 * Convert provenance data to Turtle format
 * @param {Object} data - Provenance data
 * @returns {string} Turtle representation
 */
function convertToTurtle(data) {
  const timestamp = data.timestamp || new Date().toISOString();
  const adapter = data.adapter || 'unknown';
  const sourceFormat = data.sourceFormat || 'unknown';
  const targetFormat = data.targetFormat || 'unknown';

  return `@prefix prov: <http://www.w3.org/ns/prov#> .
@prefix ztf: <https://github.com/unjs/zod-to-from/prov#> .

<#operation> a prov:Activity ;
    prov:startedAtTime "${timestamp}"^^xsd:dateTime ;
    ztf:adapter "${adapter}" ;
    ztf:sourceFormat "${sourceFormat}" ;
    ztf:targetFormat "${targetFormat}" ;
    ztf:version "${data.version || 'unknown'}" .
`;
}

/**
 * Display provenance data as a table
 * @param {Object} data - Provenance data
 */
function displayAsTable(data) {
  console.log('📋 Audit Information:');
  console.log('┌─────────────────┬─────────────────────────────────────┐');
  console.log(`│ Timestamp       │ ${data.timestamp || 'unknown'} │`);
  console.log(`│ Adapter         │ ${data.adapter || 'unknown'} │`);
  console.log(`│ Source Format   │ ${data.sourceFormat || 'unknown'} │`);
  console.log(`│ Target Format   │ ${data.targetFormat || 'unknown'} │`);
  console.log(`│ Version         │ ${data.version || 'unknown'} │`);
  if (data.aiModel) {
    console.log(`│ AI Model        │ ${data.aiModel} │`);
  }
  if (data.schemaHash) {
    console.log(`│ Schema Hash     │ ${data.schemaHash} │`);
  }
  console.log('└─────────────────┴─────────────────────────────────────┘');
}

/**
 * Display provenance data as a summary
 * @param {Object} data - Provenance data
 */
function displayAsSummary(data) {
  console.log('📋 Audit Summary:');
  console.log(`  Timestamp: ${data.timestamp || 'unknown'}`);
  console.log(`  Adapter: ${data.adapter || 'unknown'}`);
  console.log(`  Source: ${data.sourceFormat || 'unknown'}`);
  console.log(`  Target: ${data.targetFormat || 'unknown'}`);
  console.log(`  Version: ${data.version || 'unknown'}`);
  if (data.aiModel) {
    console.log(`  AI Model: ${data.aiModel}`);
  }
  if (data.schemaHash) {
    console.log(`  Schema Hash: ${data.schemaHash}`);
  }
}
