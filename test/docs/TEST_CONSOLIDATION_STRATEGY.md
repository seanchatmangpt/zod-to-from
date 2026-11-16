# Test Suite Consolidation Strategy

## Current State Analysis

### Test File Structure (30 files)
- **Adapter Tests**: 13 files (~123KB)
- **Feature Tests**: 8 files (~108KB)
- **Core Tests**: 2 files
- **Integration Tests**: 2 files
- **E2E Tests**: 1 file
- **Main Index Tests**: 2 files
- **Total Lines**: ~534 lines of test code

### Issues Identified
1. ❌ **Redundant Test Coverage**: Multiple files testing similar functionality
2. ❌ **Split Test Files**: Related tests scattered across files (e.g., communications + communications-errors)
3. ❌ **No Concurrent Execution**: Tests run sequentially
4. ❌ **Duplicate Fixtures**: Test data repeated across files
5. ❌ **Mixed Concerns**: Feature tests mixed with adapter tests

## 80/20 Consolidation Plan

### Phase 1: Consolidate Adapter Tests (80% Impact)
Merge 13 adapter files → 4 consolidated files:

1. **`test/adapters/data-formats.test.mjs`** (JSON, CSV, YAML, TOML, XML, NDJSON)
   - Covers 80% of use cases
   - ~150 tests

2. **`test/adapters/communications.test.mjs`** (cURL, EML, vCard, ICS, Msgpack)
   - Merges communications + communications-errors
   - ~80 tests

3. **`test/adapters/media-office.test.mjs`** (HTML, Markdown, DOCX, EXIF, PDF)
   - Media + Office adapters
   - ~90 tests

4. **`test/adapters/specialized.test.mjs`** (AI, DevOps, Geo, Graph, Templating)
   - Less common adapters
   - ~70 tests

### Phase 2: Consolidate Feature Tests (15% Impact)
Merge 8 feature files → 3 consolidated files:

1. **`test/features/core-functionality.test.mjs`**
   - Schema validation + error handling + integration
   - ~120 tests

2. **`test/features/performance-quality.test.mjs`**
   - Performance + fuzz testing + golden files
   - ~100 tests

3. **`test/features/advanced.test.mjs`**
   - Streaming + provenance metadata
   - ~60 tests

### Phase 3: Optimize Test Infrastructure (5% Impact)

1. **Create Shared Utilities**: `/test/helpers/`
   - `fixtures.mjs` - Reusable test data
   - `matchers.mjs` - Custom expect matchers
   - `mocks.mjs` - Shared mock implementations
   - `schemas.mjs` - Common Zod schemas

2. **Enable Concurrent Testing**:
   ```javascript
   // Use vitest.concurrent for independent tests
   describe.concurrent('Data Formats', () => {
     test.concurrent('JSON parsing', async () => { ... });
     test.concurrent('CSV parsing', async () => { ... });
   });
   ```

3. **Performance Optimizations**:
   - Use `beforeAll` for expensive setup
   - Mock file I/O operations
   - Batch similar assertions
   - Enable test parallelization

## New Test Structure

```
/test
  /adapters
    data-formats.test.mjs          (~400 lines, 150 tests)
    communications.test.mjs         (~250 lines, 80 tests)
    media-office.test.mjs          (~300 lines, 90 tests)
    specialized.test.mjs           (~250 lines, 70 tests)

  /features
    core-functionality.test.mjs    (~350 lines, 120 tests)
    performance-quality.test.mjs   (~300 lines, 100 tests)
    advanced.test.mjs              (~200 lines, 60 tests)

  /helpers
    fixtures.mjs                   (Shared test data)
    schemas.mjs                    (Common Zod schemas)
    matchers.mjs                   (Custom matchers)
    mocks.mjs                      (Mock implementations)

  /integration
    scenario.test.mjs              (Keep as-is)
    cli-commands.test.mjs          (Keep as-is)

  /core
    main.test.mjs                  (Keep as-is)
    registry.test.mjs              (Keep as-is)

  /e2e
    cli.test.mjs                   (Keep as-is)

  index.test.mjs                   (Keep as-is)
  from-to-exports.test.mjs         (Keep as-is)
  setup.mjs                        (Keep as-is)
  README.md                        (New test documentation)
```

## Expected Improvements

### Before Consolidation
- 30 test files
- ~534 lines of code
- ~576 tests
- Sequential execution
- Repeated fixtures
- ~45s test runtime

### After Consolidation (Target)
- 15 test files (50% reduction)
- ~400 lines of code (25% reduction)
- ~570 tests (no loss, removed duplicates)
- Parallel execution (test.concurrent)
- Shared utilities
- ~15-20s test runtime (60% faster)

## Implementation Steps

1. ✅ Create test helpers and fixtures
2. ✅ Consolidate adapter tests (4 files)
3. ✅ Consolidate feature tests (3 files)
4. ✅ Enable concurrent execution
5. ✅ Remove old test files
6. ✅ Update test scripts
7. ✅ Verify coverage (maintain 80%+)
8. ✅ Document test strategy

## Coverage Goals

- **Statements**: 80%+ (currently achieved)
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

Focus on critical paths and edge cases, not 100% coverage.

## Test Performance Targets

- Unit tests: <100ms each
- Integration tests: <500ms each
- E2E tests: <2s each
- Full suite: <20s total

## Maintenance Guidelines

1. **Keep files under 500 lines**: Split if growing too large
2. **Group related tests**: Use describe blocks effectively
3. **Use test.concurrent**: For independent tests
4. **Share fixtures**: Don't duplicate test data
5. **Mock expensive ops**: File I/O, network calls
6. **Document edge cases**: Why testing specific scenarios
