/**
 * Streaming Validation Demo
 * Demonstrates advanced streaming validation features
 */

import { z } from 'zod';
import { Readable, Writable, pipeline } from 'node:stream';
import { promisify } from 'node:util';
import {
  createValidationStream,
  createParseStream,
  createFormatStream,
  createBackpressureStream,
  createFanOutStream,
  createMemoryEfficientStream,
} from '../src/core/streaming.mjs';
import {
  createIncrementalCompiler,
  createAggregatorStream,
  createRepairStream,
  createDeduplicationStream,
} from '../src/core/stream-validators.mjs';

const pipelineAsync = promisify(pipeline);

// Define schema
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().min(0).max(150),
});

async function demo1_basicValidation() {
  console.log('\n=== Demo 1: Basic Real-time Validation ===\n');

  const users = [
    { id: 1, name: 'Alice', email: 'alice@example.com', age: 30 },
    { id: 2, name: 'Bob', email: 'bob@example.com', age: 25 },
    { id: 3, name: 'Charlie', email: 'invalid-email', age: 35 }, // Invalid
  ];

  const validationStream = createValidationStream(UserSchema, {
    skipInvalid: true,
    onValid: (record, index) => {
      console.log(`✓ Valid record ${index}:`, record.name);
    },
    onError: (error, record, index) => {
      console.error(`✗ Error at record ${index}:`, error.message);
    },
  });

  const input = Readable.from(users);
  const output = [];

  await pipelineAsync(
    input,
    validationStream,
    new Writable({
      objectMode: true,
      write(chunk, encoding, callback) {
        output.push(chunk);
        callback();
      },
    })
  );

  const stats = validationStream.getStats();
  console.log('\nValidation Statistics:');
  console.log(`- Total records: ${stats.totalRecords}`);
  console.log(`- Valid records: ${stats.validRecords}`);
  console.log(`- Invalid records: ${stats.invalidRecords}`);
  console.log(`- Error rate: ${stats.errorRate.toFixed(2)}%`);
}

async function demo2_ndjsonConversion() {
  console.log('\n=== Demo 2: NDJSON to JSON Conversion ===\n');

  const ndjsonData = `{"id": 1, "name": "Alice", "email": "alice@example.com", "age": 30}
{"id": 2, "name": "Bob", "email": "bob@example.com", "age": 25}
{"id": 3, "name": "Charlie", "email": "charlie@example.com", "age": 35}`;

  const parseStream = createParseStream('ndjson');
  const validationStream = createValidationStream(UserSchema);
  const formatStream = createFormatStream('json');

  const input = Readable.from([ndjsonData]);
  let output = '';

  await pipelineAsync(
    input,
    parseStream,
    validationStream,
    formatStream,
    new Writable({
      write(chunk, encoding, callback) {
        output += chunk.toString();
        callback();
      },
    })
  );

  console.log('Converted JSON:');
  console.log(output);
}

async function demo3_aggregation() {
  console.log('\n=== Demo 3: Validation Aggregation ===\n');

  const users = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `User${i}`,
    email: `user${i}@example.com`,
    age: 20 + (i % 50),
  }));

  const aggregatorStream = createAggregatorStream(UserSchema, {
    trackFieldStats: true,
  });

  const input = Readable.from(users);
  const output = [];

  await pipelineAsync(
    input,
    aggregatorStream,
    new Writable({
      objectMode: true,
      write(chunk, encoding, callback) {
        output.push(chunk);
        callback();
      },
    })
  );

  const aggregation = aggregatorStream.getAggregation();
  console.log('Aggregation Results:');
  console.log(`- Total validated: ${aggregation.totalValidated}`);
  console.log(`- Passed: ${aggregation.passed}`);
  console.log(`- Failed: ${aggregation.failed}`);
  console.log('\nField Statistics:');
  for (const [field, stats] of Object.entries(aggregation.fieldStats)) {
    console.log(`  ${field}:`);
    console.log(`    - Count: ${stats.count}`);
    console.log(`    - Types: ${stats.types.join(', ')}`);
    console.log(`    - Unique values: ${stats.uniqueValues.length}`);
  }
}

async function demo4_repair() {
  console.log('\n=== Demo 4: Auto-repair Validation ===\n');

  const users = [
    { id: 1, name: '  Alice  ', email: 'ALICE@EXAMPLE.COM', age: 30 },
    { id: 2, name: 'Bob', email: 'bob@example.com  ', age: 200 }, // Age out of range
  ];

  const repairStream = createRepairStream(UserSchema, {
    repairs: {
      name: (value) => value.trim(),
      email: (value) => value.toLowerCase().trim(),
      age: (value) => Math.max(0, Math.min(150, value)),
    },
  });

  const input = Readable.from(users);
  const output = [];

  await pipelineAsync(
    input,
    repairStream,
    new Writable({
      objectMode: true,
      write(chunk, encoding, callback) {
        output.push(chunk);
        callback();
      },
    })
  );

  console.log('Repaired records:');
  for (const record of output) {
    console.log(`- ${record.name}: email="${record.email}", age=${record.age}, repaired=${record._repaired}`);
  }
}

async function demo5_deduplication() {
  console.log('\n=== Demo 5: Deduplication ===\n');

  const users = [
    { id: 1, name: 'Alice', email: 'alice@example.com', age: 30 },
    { id: 1, name: 'Alice Updated', email: 'alice2@example.com', age: 31 }, // Duplicate ID
    { id: 2, name: 'Bob', email: 'bob@example.com', age: 25 },
    { id: 2, name: 'Bob Updated', email: 'bob2@example.com', age: 26 }, // Duplicate ID
  ];

  const dedupeStream = createDeduplicationStream(UserSchema, {
    keyFields: ['id'],
  });

  const input = Readable.from(users);
  const output = [];

  await pipelineAsync(
    input,
    dedupeStream,
    new Writable({
      objectMode: true,
      write(chunk, encoding, callback) {
        output.push(chunk);
        callback();
      },
    })
  );

  console.log('Deduplicated records:');
  for (const record of output) {
    console.log(`- ID ${record.id}: ${record.name} (${record.email})`);
  }
}

async function demo6_fanOut() {
  console.log('\n=== Demo 6: Fan-out to Multiple Outputs ===\n');

  const users = [
    { id: 1, name: 'Alice', email: 'alice@example.com', age: 30 },
    { id: 2, name: 'Bob', email: 'bob@example.com', age: 25 },
  ];

  const output1 = [];
  const output2 = [];
  const output3 = [];

  const writable1 = new Writable({
    objectMode: true,
    write(chunk, encoding, callback) {
      output1.push(chunk);
      callback();
    },
  });

  const writable2 = new Writable({
    objectMode: true,
    write(chunk, encoding, callback) {
      output2.push(chunk);
      callback();
    },
  });

  const writable3 = new Writable({
    objectMode: true,
    write(chunk, encoding, callback) {
      output3.push(chunk);
      callback();
    },
  });

  const fanOutStream = createFanOutStream(UserSchema, [writable1, writable2, writable3]);
  const input = Readable.from(users);

  await pipelineAsync(input, fanOutStream);

  console.log(`Output 1 received ${output1.length} records`);
  console.log(`Output 2 received ${output2.length} records`);
  console.log(`Output 3 received ${output3.length} records`);
}

async function demo7_performance() {
  console.log('\n=== Demo 7: Performance Test ===\n');

  const largeDataset = Array.from({ length: 10_000 }, (_, i) => ({
    id: i,
    name: `User${i}`,
    email: `user${i}@example.com`,
    age: 20 + (i % 50),
  }));

  const compiler = createIncrementalCompiler(UserSchema, { cacheSize: 1000 });

  const startTime = Date.now();

  for (const user of largeDataset) {
    compiler.validate(user);
  }

  const endTime = Date.now();
  const stats = compiler.getStats();

  console.log('Performance Results:');
  console.log(`- Dataset size: ${largeDataset.length} records`);
  console.log(`- Processing time: ${endTime - startTime}ms`);
  console.log(`- Throughput: ${Math.round(largeDataset.length / ((endTime - startTime) / 1000))} records/sec`);
  console.log(`- Cache hits: ${stats.cacheHits}`);
  console.log(`- Cache misses: ${stats.cacheMisses}`);
  console.log(`- Cache hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
}

async function demo8_memoryEfficient() {
  console.log('\n=== Demo 8: Memory-Efficient Streaming ===\n');

  const largeDataset = Array.from({ length: 5000 }, (_, i) => ({
    id: i,
    name: `User${i}`,
    email: `user${i}@example.com`,
    age: 20 + (i % 50),
  }));

  const memoryStream = createMemoryEfficientStream(UserSchema, {
    batchSize: 100,
  });

  const input = Readable.from(largeDataset);
  let count = 0;

  const startTime = Date.now();

  await pipelineAsync(
    input,
    memoryStream,
    new Writable({
      objectMode: true,
      write(chunk, encoding, callback) {
        count++;
        callback();
      },
    })
  );

  const endTime = Date.now();

  console.log('Memory-Efficient Processing:');
  console.log(`- Records processed: ${count}`);
  console.log(`- Processing time: ${endTime - startTime}ms`);
  console.log(`- Throughput: ${Math.round(count / ((endTime - startTime) / 1000))} records/sec`);
}

// Run all demos
async function runAllDemos() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   ZTF v2 Streaming Validation Demonstrations           ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  await demo1_basicValidation();
  await demo2_ndjsonConversion();
  await demo3_aggregation();
  await demo4_repair();
  await demo5_deduplication();
  await demo6_fanOut();
  await demo7_performance();
  await demo8_memoryEfficient();

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   All Demonstrations Completed Successfully!          ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllDemos().catch(console.error);
}

export {
  demo1_basicValidation,
  demo2_ndjsonConversion,
  demo3_aggregation,
  demo4_repair,
  demo5_deduplication,
  demo6_fanOut,
  demo7_performance,
  demo8_memoryEfficient,
};
