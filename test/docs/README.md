# Test Suite Documentation

## Overview

This test suite validates the **zod-to-from** library's ability to convert data between 47 different formats with Zod schema validation. The suite is organized for maximum efficiency, maintainability, and performance.

## Test Organization

### Current Structure

```
/test
  /adapters              # Format adapter tests (13 files → 4 consolidated)
  /features              # Feature-specific tests (8 files → 3 consolidated)
  /core                  # Core functionality (2 files)
  /integration           # Integration tests (2 files)
  /e2e                   # End-to-end CLI tests (1 file)
  /helpers               # Shared utilities ✨ NEW
  /fixtures              # Test data fixtures
  /docs                  # Test documentation ✨ NEW
  index.test.mjs         # Main API tests
  from-to-exports.test.mjs  # Export naming tests
  setup.mjs              # Test configuration
```

### Consolidation Plan (80/20 Principle)

#### Phase 1: Adapter Tests (80% Impact)
- **data-formats.test.mjs**: JSON, CSV, YAML, TOML, XML, NDJSON (150 tests)
- **communications.test.mjs**: cURL, EML, vCard, ICS, Msgpack (80 tests)
- **media-office.test.mjs**: HTML, Markdown, DOCX, EXIF, PDF (90 tests)
- **specialized.test.mjs**: AI, DevOps, Geo, Graph, Templating (70 tests)

#### Phase 2: Feature Tests (15% Impact)
- **core-functionality.test.mjs**: Schema validation + error handling (120 tests)
- **performance-quality.test.mjs**: Performance + fuzz + golden files (100 tests)
- **advanced.test.mjs**: Streaming + provenance metadata (60 tests)

#### Phase 3: Infrastructure (5% Impact)
- Shared fixtures and schemas
- Custom test matchers
- Mock implementations
- Performance utilities

## Test Helpers

### fixtures.mjs
Reusable test data and schemas:
```javascript
import { UserSchema, sampleUser, testInputs } from './helpers/fixtures.mjs';

test('parse JSON', async () => {
  const result = await fromJson(UserSchema, testInputs.json);
  expect(result).toEqual(sampleUser);
});
```

### matchers.mjs
Custom assertions:
```javascript
import './helpers/matchers.mjs';

test('valid metadata', async () => {
  const result = await adapter.parse(input);
  expect(result).toHaveValidMetadata();
  expect(result.data).toBeValidFormat('json');
});
```

### mocks.mjs
Shared mocks:
```javascript
import { createMockAdapter, mockFs } from './helpers/mocks.mjs';

test('with mock adapter', async () => {
  const adapter = createMockAdapter({ parseResult: { data: {}, metadata: {} } });
  // Test adapter integration
});
```

## Running Tests

### Basic Commands
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific suite
npx vitest run test/adapters/data-formats.test.mjs

# Watch mode
npx vitest watch

# Run concurrent tests
npx vitest run --threads
```

### Performance Testing
```bash
# Run performance benchmarks
npm run test:perf

# Profile slow tests
npx vitest run --reporter=verbose --testTimeout=30000
```

## Test Categories

### 1. Unit Tests (Fast, <100ms)
- Individual adapter parse/format operations
- Schema validation
- Error handling
- Edge cases

### 2. Integration Tests (Medium, <500ms)
- Round-trip conversions
- CLI command integration
- Multi-adapter scenarios
- Streaming operations

### 3. E2E Tests (Slow, <2s)
- Full CLI workflows
- File I/O operations
- Complex conversion pipelines

## Writing Tests

### Best Practices

1. **Use Shared Fixtures**
```javascript
import { UserSchema, sampleUser } from './helpers/fixtures.mjs';

test('parse user data', async () => {
  const result = await fromJson(UserSchema, testInputs.json);
  expect(result).toEqual(sampleUser);
});
```

2. **Enable Concurrency for Independent Tests**
```javascript
describe.concurrent('Format Parsing', () => {
  test.concurrent('JSON', async () => { /* ... */ });
  test.concurrent('CSV', async () => { /* ... */ });
  test.concurrent('YAML', async () => { /* ... */ });
});
```

3. **Group Related Tests**
```javascript
describe('JSON Adapter', () => {
  describe('Parsing', () => {
    test('valid input', async () => { /* ... */ });
    test('invalid input', async () => { /* ... */ });
  });

  describe('Formatting', () => {
    test('simple object', async () => { /* ... */ });
    test('nested object', async () => { /* ... */ });
  });
});
```

4. **Test Edge Cases**
```javascript
import { edgeCases } from './helpers/fixtures.mjs';

test('handles special characters', async () => {
  const result = await fromJson(UserSchema, edgeCases.specialChars);
  expect(result).toBeDefined();
});
```

5. **Mock Expensive Operations**
```javascript
import { mockFs } from './helpers/mocks.mjs';

test('file operations', async () => {
  const content = await mockFs.readFile('test.json');
  // Test without actual I/O
});
```

## Coverage Goals

| Metric      | Target | Current |
|-------------|--------|---------|
| Statements  | >80%   | 85%     |
| Branches    | >75%   | 78%     |
| Functions   | >80%   | 82%     |
| Lines       | >80%   | 84%     |

### Coverage Strategy
- **Critical Paths**: 100% coverage (parse, format, validate)
- **Edge Cases**: 90% coverage (error handling, boundary conditions)
- **Nice-to-Have**: 70% coverage (optional features, experimental)

## Performance Targets

### Individual Tests
- Unit tests: <100ms
- Integration tests: <500ms
- E2E tests: <2s

### Full Suite
- **Before**: ~45s (sequential)
- **Target**: ~15-20s (concurrent)
- **Improvement**: 60% faster

## Common Test Patterns

### 1. Round-Trip Conversion
```javascript
test('round-trip JSON → YAML → JSON', async () => {
  const original = sampleUser;
  const yaml = await toYaml(UserSchema, original);
  const parsed = await fromYaml(UserSchema, yaml);
  const json = await toJson(UserSchema, parsed);

  expect(JSON.parse(json)).toEqual(original);
});
```

### 2. Error Validation
```javascript
test('throws on invalid data', async () => {
  await expect(
    fromJson(UserSchema, errorCases.invalidJson)
  ).rejects.toThrow();
});
```

### 3. Provenance Tracking
```javascript
test('includes provenance metadata', async () => {
  const result = await fromJson(UserSchema, testInputs.json, {
    includeProvenance: true
  });

  expect(result.provenance).toBeDefined();
  expect(result.provenance.sourceFormat).toBe('json');
});
```

### 4. Performance Benchmarking
```javascript
test('processes 1000 items under 100ms', async () => {
  const start = Date.now();
  await processLarge(performanceData.large);
  const duration = Date.now() - start;

  expect(duration).toBeLessThan(100);
});
```

## Debugging Tests

### Verbose Output
```bash
npx vitest run --reporter=verbose
```

### Single Test Debugging
```bash
npx vitest run -t "specific test name"
```

### Coverage Report
```bash
npx vitest run --coverage
open coverage/index.html
```

## Maintenance

### When Adding New Adapters
1. Add test data to `fixtures.mjs`
2. Add tests to appropriate consolidated file
3. Verify coverage meets targets
4. Run full suite to check for regressions

### When Refactoring
1. Run tests in watch mode
2. Maintain or improve coverage
3. Keep individual files <500 lines
4. Update documentation

### File Size Limits
- Test files: <500 lines
- Helper files: <200 lines
- If exceeding, split by domain

## CI/CD Integration

### GitHub Actions
```yaml
- name: Run Tests
  run: |
    npm test
    npm run test:coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

### Pre-commit Hooks
```bash
# .husky/pre-commit
npm test
```

## Troubleshooting

### Slow Tests
- Use `test.concurrent` for independent tests
- Mock file I/O and network calls
- Profile with `--reporter=verbose`

### Flaky Tests
- Remove time-dependent logic
- Use deterministic test data
- Avoid shared state between tests

### Memory Issues
- Use `beforeAll` for expensive setup
- Clean up after tests with `afterEach`
- Limit test data size

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Zod Documentation](https://zod.dev/)
- [Test Consolidation Strategy](./TEST_CONSOLIDATION_STRATEGY.md)
- [Project README](../../README.md)

---

**Last Updated**: 2025-10-02
**Maintainer**: Test Architecture Team
