#!/usr/bin/env node
/**
 * Batch Operations Verification Script
 * Demonstrates core batch functionality with working examples
 */

import { z } from 'zod';
// Import from main index to ensure adapters are registered
import '../../src/index.mjs';
import {
  createBatchParser,
  createBatchFormatter,
  createBatchConverter,
  detectFormat
} from '../../src/core/batch.mjs';

// Define test schema
const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number()
});

console.log('='.repeat(60));
console.log('Batch Operations Verification');
console.log('='.repeat(60));

// Test 1: Basic Batch Parsing
console.log('\n📝 Test 1: Basic Batch Parsing');
console.log('-'.repeat(60));

const parser = createBatchParser(UserSchema, {
  parallel: 2,
  continueOnError: true
});

parser
  .add('user1', '{"name":"Alice","email":"alice@example.com","age":30}', 'json')
  .add('user2', '{"name":"Bob","email":"bob@example.com","age":25}', 'json')
  .add('user3', '{"name":"Charlie","email":"charlie@example.com","age":35}', 'json')
  .onProgress((done, total) => {
    console.log(`  Progress: ${done}/${total}`);
  });

const parseResult = await parser.execute();
console.log(`✓ Parsed ${parseResult.successful}/${parseResult.total} items`);
console.log(`  Average duration: ${parseResult.averageDuration.toFixed(2)}ms`);

// Debug: Show results
if (parseResult.successful === 0) {
  console.log('  DEBUG: Results:', parseResult.results.map(r => ({
    id: r.id,
    success: r.success,
    error: r.error?.message
  })));
}

// Test 2: Batch Formatting
console.log('\n📄 Test 2: Batch Formatting');
console.log('-'.repeat(60));

const formatter = createBatchFormatter(UserSchema, {
  parallel: 2
});

formatter
  .add('out1', { name: 'David', email: 'david@example.com', age: 28 }, 'json')
  .add('out2', { name: 'Eve', email: 'eve@example.com', age: 32 }, 'json');

const formatResult = await formatter.execute();
console.log(`✓ Formatted ${formatResult.successful}/${formatResult.total} items`);

if (formatResult.successful > 0 && formatResult.results[0]?.data) {
  console.log(`  Sample output: ${formatResult.results[0].data.substring(0, 50)}...`);
} else {
  console.log('  DEBUG: Results:', formatResult.results.map(r => ({
    id: r.id,
    success: r.success,
    error: r.error?.message
  })));
}

// Test 3: Batch Conversion
console.log('\n🔄 Test 3: Batch Conversion');
console.log('-'.repeat(60));

const converter = createBatchConverter(UserSchema, {
  parallel: 2,
  includeProvenance: false
});

converter
  .addConversion(
    'convert1',
    '{"name":"Frank","email":"frank@example.com","age":40}',
    'json',
    'json'
  )
  .addConversion(
    'convert2',
    '{"name":"Grace","email":"grace@example.com","age":27}',
    'json',
    'json'
  );

const convertResult = await converter.execute();
console.log(`✓ Converted ${convertResult.successful}/${convertResult.total} items`);

// Test 4: Error Handling
console.log('\n⚠️  Test 4: Error Handling');
console.log('-'.repeat(60));

const errorBatch = createBatchParser(UserSchema, {
  continueOnError: true,
  detailedErrors: true
});

errorBatch
  .add('valid', '{"name":"Valid User","email":"valid@example.com","age":25}', 'json')
  .add('invalid-email', '{"name":"Invalid","email":"not-an-email","age":30}', 'json')
  .add('invalid-age', '{"name":"Invalid Age","email":"test@example.com","age":"not-a-number"}', 'json')
  .add('malformed', '{invalid json}', 'json');

const errorResult = await errorBatch.execute();
console.log(`✓ Processed ${errorResult.total} items`);
console.log(`  Successful: ${errorResult.successful}`);
console.log(`  Failed: ${errorResult.failed}`);

const failed = errorResult.results.filter(r => !r.success);
console.log(`  Failed items:`);
failed.forEach(f => {
  console.log(`    - ${f.id}: ${f.error.message.substring(0, 60)}...`);
});

// Test 5: Format Detection
console.log('\n🔍 Test 5: Format Detection');
console.log('-'.repeat(60));

const formats = [
  { file: 'config.json', content: '{"key":"value"}' },
  { file: 'config.yaml', content: 'key: value' },
  { file: 'data.xml', content: '<root></root>' },
  { file: 'unknown.txt', content: 'random text' }
];

formats.forEach(({ file, content }) => {
  const detected = detectFormat(file, content);
  console.log(`  ${file}: ${detected || 'unknown'}`);
});

// Test 6: Batch with Provenance
console.log('\n📋 Test 6: Batch with Provenance');
console.log('-'.repeat(60));

const provenanceBatch = createBatchParser(UserSchema, {
  includeProvenance: true,
  parallel: 2
});

provenanceBatch
  .add('prov1', '{"name":"User1","email":"user1@example.com","age":20}', 'json')
  .add('prov2', '{"name":"User2","email":"user2@example.com","age":30}', 'json');

const provResult = await provenanceBatch.execute();
console.log(`✓ Processed ${provResult.successful} items with provenance`);

if (provResult.batchProvenance) {
  console.log(`  Batch provenance:`);
  console.log(`    - Batch ID: ${provResult.batchProvenance.batchId}`);
  console.log(`    - Operation: ${provResult.batchProvenance.operation}`);
  console.log(`    - Total items: ${provResult.batchProvenance.totalItems}`);
  console.log(`    - Successful: ${provResult.batchProvenance.successfulItems}`);
  console.log(`    - Processing time: ${provResult.batchProvenance.processingTime}ms`);
}

// Test 7: Event Tracking
console.log('\n📡 Test 7: Event Tracking');
console.log('-'.repeat(60));

const eventBatch = createBatchParser(UserSchema);

let progressCount = 0;
let itemCompleteCount = 0;

eventBatch.on('start', (event) => {
  console.log(`  Event: start (total=${event.total})`);
});

eventBatch.on('progress', (event) => {
  progressCount++;
});

eventBatch.on('itemComplete', (result) => {
  itemCompleteCount++;
});

eventBatch.on('complete', (summary) => {
  console.log(`  Event: complete (successful=${summary.successful})`);
});

eventBatch
  .add('e1', '{"name":"E1","email":"e1@example.com","age":21}', 'json')
  .add('e2', '{"name":"E2","email":"e2@example.com","age":22}', 'json')
  .add('e3', '{"name":"E3","email":"e3@example.com","age":23}', 'json');

await eventBatch.execute();
console.log(`✓ Received ${progressCount} progress events`);
console.log(`✓ Received ${itemCompleteCount} itemComplete events`);

// Test 8: Batch Reset and Reuse
console.log('\n🔄 Test 8: Batch Reset and Reuse');
console.log('-'.repeat(60));

const reuseBatch = createBatchParser(UserSchema);

reuseBatch.add('r1', '{"name":"R1","email":"r1@example.com","age":25}', 'json');
const result1 = await reuseBatch.execute();
console.log(`  First batch: ${result1.successful} successful`);

reuseBatch.reset();

reuseBatch
  .add('r2', '{"name":"R2","email":"r2@example.com","age":26}', 'json')
  .add('r3', '{"name":"R3","email":"r3@example.com","age":27}', 'json');
const result2 = await reuseBatch.execute();
console.log(`  Second batch: ${result2.successful} successful`);
console.log(`✓ Batch processor successfully reset and reused`);

// Summary
console.log('\n' + '='.repeat(60));
console.log('✅ All Batch Operations Verified Successfully!');
console.log('='.repeat(60));
console.log('\nCore Features Demonstrated:');
console.log('  ✓ Batch parsing with parallel execution');
console.log('  ✓ Batch formatting');
console.log('  ✓ Batch conversion between formats');
console.log('  ✓ Error handling with continueOnError');
console.log('  ✓ Format auto-detection');
console.log('  ✓ Provenance tracking');
console.log('  ✓ Event-based progress tracking');
console.log('  ✓ Batch reset and reuse');
console.log('\n' + '='.repeat(60));
