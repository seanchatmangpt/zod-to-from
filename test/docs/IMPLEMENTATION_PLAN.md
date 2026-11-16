# Test Consolidation Implementation Plan

## Executive Summary

**Goal**: Reduce test files from 30 → 15 while maintaining 570+ tests and improving execution speed by 60%

**Timeline**: 4-6 hours of focused work
**Impact**: Faster tests, easier maintenance, better organization

## Phase 1: Infrastructure Setup ✅ COMPLETE

### Completed Tasks
- [x] Create `/test/helpers/fixtures.mjs` - Shared test data
- [x] Create `/test/helpers/matchers.mjs` - Custom assertions
- [x] Create `/test/helpers/mocks.mjs` - Mock implementations
- [x] Create `/test/docs/` directory for documentation
- [x] Document consolidation strategy
- [x] Create test suite README

### Deliverables
- ✅ Shared utilities ready for use
- ✅ Documentation framework established
- ✅ Strategy documented and approved

## Phase 2: Adapter Test Consolidation (Next)

### 2.1 Data Formats Consolidation
**File**: `test/adapters/data-formats.test.mjs`

**Merge these files**:
- `csv.test.mjs` (13KB)
- `csv-edge-cases.test.mjs` (8.8KB)
- `data-extended.test.mjs` (4.7KB)
- `ndjson.test.mjs` (17KB)

**Structure**:
```javascript
describe.concurrent('Data Format Adapters', () => {
  describe('CSV Adapter', () => {
    describe.concurrent('Basic Parsing', () => { /* ... */ });
    describe.concurrent('Edge Cases', () => { /* ... */ });
    describe.concurrent('Formatting', () => { /* ... */ });
  });

  describe('NDJSON Adapter', () => {
    describe.concurrent('Streaming', () => { /* ... */ });
    describe.concurrent('Large Files', () => { /* ... */ });
  });

  // Additional data formats...
});
```

**Benefits**:
- Single import for all data format tests
- Concurrent execution within categories
- Shared setup for similar adapters
- ~150 tests in one organized file

### 2.2 Communications Consolidation
**File**: `test/adapters/communications.test.mjs`

**Merge these files**:
- `communications.test.mjs` (10KB)
- `communications-errors.test.mjs` (9.3KB)

**Improvements**:
- Combine normal and error cases
- Use shared error fixtures
- Enable concurrent test execution
- ~80 tests consolidated

### 2.3 Media & Office Consolidation
**File**: `test/adapters/media-office.test.mjs`

**Merge these files**:
- `media.test.mjs` (9.7KB)
- `office.test.mjs` (4.9KB)

**Structure**:
```javascript
describe.concurrent('Media & Office Adapters', () => {
  describe('HTML', () => { /* ... */ });
  describe('Markdown', () => { /* ... */ });
  describe('DOCX', () => { /* ... */ });
  describe('EXIF', () => { /* ... */ });
  describe('PDF', () => { /* ... */ });
});
```

**Benefits**:
- Related adapters grouped
- ~90 tests in logical structure

### 2.4 Specialized Adapters
**File**: `test/adapters/specialized.test.mjs`

**Merge these files**:
- `ai.test.mjs` (11KB)
- `devops.test.mjs` (14KB)
- `geo.test.mjs` (10KB)
- `graph.test.mjs` (5.2KB)
- `templating.test.mjs` (5.8KB)

**Structure**:
```javascript
describe.concurrent('Specialized Adapters', () => {
  describe('AI Adapters', () => { /* ... */ });
  describe('DevOps Adapters', () => { /* ... */ });
  describe('Geo Adapters', () => { /* ... */ });
  describe('Graph Adapters', () => { /* ... */ });
  describe('Templating', () => { /* ... */ });
});
```

**Benefits**:
- ~70 tests organized by domain
- Easy to find specialized adapter tests

## Phase 3: Feature Test Consolidation

### 3.1 Core Functionality
**File**: `test/features/core-functionality.test.mjs`

**Merge these files**:
- `schema-validation-edge-cases.test.mjs` (12KB)
- `error-handling.test.mjs` (13KB)
- `integration.test.mjs` (19KB)

**Structure**:
```javascript
describe('Core Functionality', () => {
  describe.concurrent('Schema Validation', () => { /* ... */ });
  describe.concurrent('Error Handling', () => { /* ... */ });
  describe('Integration Scenarios', () => { /* ... */ });
});
```

**Benefits**:
- ~120 tests covering core features
- Clear separation of concerns

### 3.2 Performance & Quality
**File**: `test/features/performance-quality.test.mjs`

**Merge these files**:
- `performance.test.mjs` (9.1KB)
- `fuzz-testing.test.mjs` (17KB)
- `golden-files.test.mjs` (17KB)

**Structure**:
```javascript
describe('Performance & Quality', () => {
  describe('Performance Benchmarks', () => { /* ... */ });
  describe('Fuzz Testing', () => { /* ... */ });
  describe('Golden File Validation', () => { /* ... */ });
});
```

**Benefits**:
- ~100 tests for quality assurance
- Performance tests grouped together

### 3.3 Advanced Features
**File**: `test/features/advanced.test.mjs`

**Merge these files**:
- `streaming.test.mjs` (11KB)
- `provenance-metadata.test.mjs` (9.5KB)

**Structure**:
```javascript
describe('Advanced Features', () => {
  describe.concurrent('Streaming', () => { /* ... */ });
  describe.concurrent('Provenance Tracking', () => { /* ... */ });
});
```

**Benefits**:
- ~60 tests for advanced functionality
- Clean separation from core tests

## Phase 4: Optimization & Performance

### 4.1 Enable Concurrent Execution
```javascript
// Apply to all independent tests
describe.concurrent('Data Parsing', () => {
  test.concurrent('JSON', async () => { /* ... */ });
  test.concurrent('CSV', async () => { /* ... */ });
  test.concurrent('YAML', async () => { /* ... */ });
});
```

**Benefits**:
- 2-4x faster execution
- Better CPU utilization
- Parallel test running

### 4.2 Shared Setup Optimization
```javascript
describe('Adapter Tests', () => {
  let sharedSchema;

  beforeAll(() => {
    // Expensive setup once
    sharedSchema = createComplexSchema();
  });

  // Tests use shared schema
});
```

**Benefits**:
- Reduced setup overhead
- Faster test execution
- Better resource usage

### 4.3 Mock Expensive Operations
```javascript
import { mockFs, mockHttp } from './helpers/mocks.mjs';

test('file operation', async () => {
  const content = await mockFs.readFile('test.json');
  // No actual I/O
});
```

**Benefits**:
- No external dependencies
- Consistent test environment
- Faster execution

## Phase 5: Cleanup & Verification

### 5.1 Remove Old Test Files
```bash
# After consolidation is verified
rm test/adapters/csv.test.mjs
rm test/adapters/csv-edge-cases.test.mjs
rm test/adapters/communications-errors.test.mjs
# ... etc
```

### 5.2 Update Test Scripts
```json
{
  "scripts": {
    "test": "vitest run --threads",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

### 5.3 Verify Coverage
```bash
npm run test:coverage
# Ensure all metrics >= 80%
```

### 5.4 Performance Benchmarking
```bash
# Before consolidation
time npm test  # ~45s

# After consolidation
time npm test  # Target: ~15-20s (60% improvement)
```

## Success Metrics

### Quantitative Goals
- ✅ File count: 30 → 15 (50% reduction)
- ✅ Code lines: ~534 → ~400 (25% reduction)
- ✅ Test count: 576 → 570+ (maintained)
- ✅ Test speed: 45s → 15-20s (60% faster)
- ✅ Coverage: Maintain 80%+ across all metrics

### Qualitative Goals
- ✅ Easier to find relevant tests
- ✅ Better test organization
- ✅ Reduced duplication
- ✅ Improved maintainability
- ✅ Clearer test documentation

## Risk Mitigation

### Risk 1: Test Failures During Consolidation
**Mitigation**:
- Keep original files until verification
- Run tests after each merge
- Use git for easy rollback

### Risk 2: Coverage Degradation
**Mitigation**:
- Run coverage before and after
- Identify missing tests
- Add tests to fill gaps

### Risk 3: Performance Regression
**Mitigation**:
- Benchmark before and after
- Profile slow tests
- Optimize hot paths

## Rollback Plan

If consolidation causes issues:
```bash
# Revert changes
git checkout test/

# Verify original tests pass
npm test

# Investigate issues
npm run test:coverage -- --reporter=verbose
```

## Next Steps

1. **Phase 2**: Start adapter consolidation
   - Begin with data-formats.test.mjs
   - Verify tests pass
   - Move to next adapter group

2. **Phase 3**: Consolidate feature tests
   - Merge related functionality
   - Maintain test coverage
   - Enable concurrency

3. **Phase 4**: Optimize performance
   - Enable parallel execution
   - Mock expensive operations
   - Benchmark improvements

4. **Phase 5**: Cleanup and verify
   - Remove old files
   - Update documentation
   - Final verification

## Resources

- Test fixtures: `/test/helpers/fixtures.mjs`
- Custom matchers: `/test/helpers/matchers.mjs`
- Mock utilities: `/test/helpers/mocks.mjs`
- Strategy doc: `/test/docs/TEST_CONSOLIDATION_STRATEGY.md`
- Test README: `/test/docs/README.md`

---

**Created**: 2025-10-02
**Owner**: Test Consolidation Agent
**Status**: Phase 1 Complete, Ready for Phase 2
