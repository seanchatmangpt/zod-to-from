/**
 * Smoke test for Schema Discovery - Basic functionality verification
 */

import { inferSchema, inferSchemaFromSample } from '../../src/core/schema-inference.mjs';
import { suggestImprovements, generateReport } from '../../src/core/schema-suggestion.mjs';

console.log('🧪 Running Schema Discovery Smoke Tests...\n');

// Test 1: Basic inference from single sample
console.log('Test 1: Single sample inference');
try {
  const schema = inferSchemaFromSample({ name: 'Alice', age: 30 });
  console.log('✓ Single sample inference works');
} catch (error_) {
  console.error('✗ Error:', error_.message);
}

// Test 2: Multi-sample inference
console.log('\nTest 2: Multi-sample inference');
try {
  const samples = [
    { name: 'Alice', age: 30, email: 'alice@example.com' },
    { name: 'Bob', age: 25 },
    { name: 'Charlie', age: 35, email: 'charlie@test.com' },
  ];

  const result = inferSchema(samples, { includeMetadata: true });
  console.log('✓ Multi-sample inference works');
  console.log(`  - Confidence: ${(result.metadata.confidence * 100).toFixed(1)}%`);
  console.log(`  - Samples: ${result.metadata.sampleCount}`);
  console.log(`  - Warnings: ${result.metadata.warnings.length}`);
} catch (error_) {
  console.error('✗ Error:', error_.message);
}

// Test 3: Pattern detection
console.log('\nTest 3: Pattern detection');
try {
  const schema = inferSchemaFromSample('test@example.com', { detectPatterns: true });
  console.log('✓ Pattern detection works');
} catch (error_) {
  console.error('✗ Error:', error_.message);
}

// Test 4: Schema suggestions
console.log('\nTest 4: Schema suggestions');
try {
  const samples = [
    { email: 'alice@example.com', status: 'active' },
    { email: 'bob@test.com', status: 'inactive' },
    { email: 'charlie@demo.org', status: 'active' },
  ];

  const { schema } = inferSchema(samples);
  const suggestions = suggestImprovements(schema, samples, { minConfidence: 0.7 });
  console.log('✓ Suggestions work');
  console.log(`  - Found ${suggestions.length} suggestions`);

  if (suggestions.length > 0) {
    console.log(`  - Types: ${[...new Set(suggestions.map(s => s.type))].join(', ')}`);
  }
} catch (error_) {
  console.error('✗ Error:', error_.message);
}

// Test 5: Report generation
console.log('\nTest 5: Report generation');
try {
  const samples = [{ email: 'test@example.com' }];
  const { schema } = inferSchema(samples);
  const suggestions = suggestImprovements(schema, samples);
  const report = generateReport(suggestions);
  console.log('✓ Report generation works');
  console.log(`  - Report length: ${report.length} characters`);
} catch (error_) {
  console.error('✗ Error:', error_.message);
}

console.log('\n✅ All smoke tests completed!');
