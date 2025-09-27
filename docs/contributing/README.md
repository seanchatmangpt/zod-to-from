# Contributing to ZTF

Thank you for your interest in contributing to Zod-to-From (ZTF)! This guide
will help you get started with contributing to the project.

## 📋 Table of Contents

- **[Getting Started](#getting-started)** - Setting up your development
  environment
- **[Development Workflow](#development-workflow)** - How to contribute
  effectively
- **[Code Standards](#code-standards)** - Coding conventions and best practices
- **[Testing](#testing)** - Testing guidelines and requirements
- **[Documentation](#documentation)** - Documentation standards
- **[Submitting Changes](#submitting-changes)** - How to submit your
  contributions
- **[Release Process](#release-process)** - How releases are managed

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **pnpm** (package manager)
- **Git** for version control
- **Ollama** (for AI adapter testing)

### Development Setup

1. **Fork and Clone**

   ```bash
   git clone https://github.com/your-username/zod-to-from.git
   cd zod-to-from
   ```

2. **Install Dependencies**

   ```bash
   pnpm install
   ```

3. **Set Up Ollama** (for AI adapter testing)

   ```bash
   # Install Ollama
   curl -fsSL https://ollama.ai/install.sh | sh

   # Pull required models
   ollama pull qwen3-coder
   ollama pull llama3.2
   ```

4. **Run Tests**

   ```bash
   pnpm test
   ```

5. **Start Development**
   ```bash
   pnpm dev
   ```

### Project Structure

```
zod-to-from/
├── src/
│   ├── adapters/          # Format adapters
│   ├── core/             # Core functionality
│   ├── cli/              # Command-line interface
│   └── index.mjs         # Main entry point
├── test/
│   ├── adapters/         # Adapter tests
│   ├── core/             # Core tests
│   ├── e2e/              # End-to-end tests
│   └── fixtures/         # Test data
├── docs/                 # Documentation
└── schemas/              # Configuration schemas
```

## 🔄 Development Workflow

### Branch Strategy

- **`main`** - Production-ready code
- **`develop`** - Integration branch for features
- **`feature/*`** - Feature branches
- **`bugfix/*`** - Bug fix branches
- **`hotfix/*`** - Critical fixes

### Workflow Steps

1. **Create Feature Branch**

   ```bash
   git checkout -b feature/new-adapter
   ```

2. **Make Changes**
   - Write code following our standards
   - Add tests for new functionality
   - Update documentation

3. **Test Your Changes**

   ```bash
   pnpm test
   pnpm lint
   pnpm test:coverage
   ```

4. **Commit Changes**

   ```bash
   git add .
   git commit -m "feat: add new format adapter"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/new-adapter
   ```

## 📝 Code Standards

### File Format Requirements

- **`.mjs` files only** - No TypeScript files
- **JSDoc documentation** - All functions must be documented
- **ESM modules** - Use import/export syntax

### Code Style

```javascript
/**
 * Parse input from a specified format into a Zod-validated object
 * @param {import('zod').ZodSchema} schema - The Zod schema to validate against
 * @param {string} format - The input format (e.g., 'json', 'yaml', 'csv')
 * @param {string|Buffer|ReadableStream} input - The input data to parse
 * @param {Object} [opts] - Optional configuration
 * @returns {Promise<any>} The parsed and validated data
 */
export async function parseFrom(schema, format, input, opts = {}) {
  // Implementation
}
```

### Naming Conventions

- **Functions**: `camelCase` (e.g., `parseFrom`, `formatTo`)
- **Variables**: `camelCase` (e.g., `adapterInfo`, `userData`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_OPTIONS`)
- **Files**: `kebab-case` (e.g., `data-adapter.mjs`)

### Error Handling

```javascript
// Always handle errors gracefully
try {
  const result = await parseFrom(schema, format, input);
  return { success: true, data: result };
} catch (error) {
  if (error.name === 'ZodError') {
    throw new AdapterError(`Schema validation failed: ${error.message}`);
  } else {
    throw new AdapterError(`Parsing failed: ${error.message}`);
  }
}
```

## 🧪 Testing

### Test Structure

- **Unit Tests** - Test individual functions
- **Integration Tests** - Test adapter interactions
- **E2E Tests** - Test complete workflows
- **Performance Tests** - Test with large datasets

### Writing Tests

```javascript
import { describe, it, expect } from 'vitest';
import { parseFrom, formatTo } from '../src/index.mjs';
import { z } from 'zod';

describe('CSV Adapter', () => {
  const UserSchema = z.object({
    name: z.string(),
    age: z.number(),
    email: z.string().email(),
  });

  it('should parse CSV data correctly', async () => {
    const csvData = 'name,age,email\nAlice,30,alice@example.com';
    const result = await parseFrom(UserSchema, 'csv', csvData);

    expect(result).toEqual([
      {
        name: 'Alice',
        age: 30,
        email: 'alice@example.com',
      },
    ]);
  });

  it('should handle invalid CSV data', async () => {
    const invalidCsv = 'invalid,data\n';

    await expect(parseFrom(UserSchema, 'csv', invalidCsv)).rejects.toThrow(
      'Schema validation failed'
    );
  });
});
```

### Test Requirements

- **Coverage**: Minimum 80% code coverage
- **Fixtures**: Use test fixtures for consistent data
- **Mocking**: Mock external dependencies
- **Performance**: Test with large datasets

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:unit
pnpm test:adapters
pnpm test:e2e

# Run with coverage
pnpm test:coverage

# Run in watch mode
pnpm test:watch
```

## 📚 Documentation

### Documentation Standards

- **JSDoc** - All functions must have JSDoc comments
- **Examples** - Include usage examples
- **Type Information** - Use JSDoc type annotations
- **Error Cases** - Document error conditions

### JSDoc Format

````javascript
/**
 * Parse input from a specified format into a Zod-validated object
 * @param {import('zod').ZodSchema} schema - The Zod schema to validate against
 * @param {string} format - The input format (e.g., 'json', 'yaml', 'csv')
 * @param {string|Buffer|ReadableStream} input - The input data to parse
 * @param {Object} [opts] - Optional configuration
 * @param {boolean} [opts.streaming=false] - Enable streaming mode
 * @param {boolean} [opts.includeProvenance=false] - Include provenance information
 * @param {Object} [opts.adapter] - Adapter-specific options
 * @returns {Promise<any>} The parsed and validated data
 * @throws {AdapterError} When adapter is not found or fails
 * @throws {ZodError} When data validation fails
 * @example
 * ```javascript
 * const result = await parseFrom(UserSchema, 'json', jsonData);
 * console.log(result); // { name: "Alice", age: 30 }
 * ```
 */
````

### Documentation Updates

- Update README.md for new features
- Add examples to docs/examples/
- Update API documentation
- Include migration guides for breaking changes

## 🔧 Creating Adapters

### Adapter Structure

```javascript
/**
 * Custom format adapter
 * @param {string|Buffer|ReadableStream} input - Input data
 * @param {Object} [opts] - Adapter options
 * @returns {Promise<{data: any, metadata: Object}>} Parsed data and metadata
 */
export async function parse(input, opts = {}) {
  try {
    // Parse input to structured data
    const data = await customParser(input, opts);

    return {
      data,
      metadata: {
        parsedAt: new Date().toISOString(),
        format: 'custom',
        version: '1.0.0',
      },
    };
  } catch (error) {
    throw new Error(`Failed to parse custom format: ${error.message}`);
  }
}

/**
 * Format data to custom format
 * @param {any} data - Data to format
 * @param {Object} [opts] - Formatting options
 * @returns {Promise<{data: string|Buffer, metadata: Object}>} Formatted data and metadata
 */
export async function format(data, opts = {}) {
  try {
    // Format data to output
    const formatted = await customFormatter(data, opts);

    return {
      data: formatted,
      metadata: {
        formattedAt: new Date().toISOString(),
        format: 'custom',
        version: '1.0.0',
      },
    };
  } catch (error) {
    throw new Error(`Failed to format to custom format: ${error.message}`);
  }
}

// Adapter configuration
export const adapterConfig = {
  name: 'custom',
  version: '1.0.0',
  supportsStreaming: false,
  isAI: false,
  description: 'Custom format adapter for specialized data',
};
```

### Adapter Requirements

- **Error Handling** - Graceful error handling
- **Metadata** - Include useful metadata
- **Streaming Support** - When applicable
- **Documentation** - Complete JSDoc documentation
- **Tests** - Comprehensive test coverage

### Registering Adapters

```javascript
import { registerAdapter } from '../core/registry.mjs';
import { parse, format, adapterConfig } from './custom-adapter.mjs';

registerAdapter('custom', {
  parse,
  format,
  ...adapterConfig,
});
```

## 📤 Submitting Changes

### Pull Request Process

1. **Create Pull Request**
   - Use descriptive title
   - Reference related issues
   - Include detailed description

2. **PR Template**

   ```markdown
   ## Description

   Brief description of changes

   ## Type of Change

   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing

   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Manual testing completed

   ## Checklist

   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Documentation updated
   - [ ] Tests added/updated
   ```

3. **Review Process**
   - Automated tests must pass
   - Code review required
   - Documentation review
   - Performance impact assessment

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes
- `refactor` - Code refactoring
- `test` - Test changes
- `chore` - Build process changes

**Examples:**

```
feat(adapters): add new CSV adapter
fix(core): resolve memory leak in streaming
docs(api): update parseFrom documentation
test(adapters): add CSV adapter tests
```

## 🚀 Release Process

### Version Management

- **Semantic Versioning** (SemVer)
- **Automated Releases** via GitHub Actions
- **Changelog Generation** from commit messages

### Release Steps

1. **Update Version**

   ```bash
   pnpm version patch  # or minor, major
   ```

2. **Generate Changelog**

   ```bash
   pnpm changelog
   ```

3. **Create Release**

   ```bash
   git push --tags
   ```

4. **Publish Package**
   ```bash
   pnpm publish
   ```

### Release Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] Changelog generated
- [ ] Version bumped
- [ ] Release notes prepared
- [ ] Package published

## 🤝 Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Provide constructive feedback
- Focus on the code, not the person

### Getting Help

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - Questions and ideas
- **Discord** - Real-time chat and support
- **Email** - Direct contact for sensitive issues

### Recognition

Contributors are recognized in:

- README.md contributors section
- Release notes
- GitHub contributor graph
- Annual contributor awards

## 📊 Performance Guidelines

### Optimization Principles

- **Lazy Loading** - Load adapters only when needed
- **Streaming** - Support streaming for large datasets
- **Memory Management** - Efficient memory usage
- **Caching** - Cache frequently used data

### Performance Testing

```javascript
import { performance } from 'perf_hooks';

describe('Performance Tests', () => {
  it('should parse large CSV efficiently', async () => {
    const start = performance.now();
    const result = await parseFrom(Schema, 'csv', largeCsvData);
    const end = performance.now();

    expect(end - start).toBeLessThan(1000); // Should complete in < 1 second
    expect(result.length).toBeGreaterThan(10000); // Should handle 10k+ rows
  });
});
```

## 🔍 Code Review Guidelines

### Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests are comprehensive
- [ ] Documentation is updated
- [ ] Performance impact considered
- [ ] Security implications reviewed
- [ ] Error handling is robust

### Review Process

1. **Automated Checks** - CI/CD pipeline
2. **Peer Review** - At least one reviewer
3. **Maintainer Review** - For significant changes
4. **Final Approval** - Merge after approval

---

**Thank you for contributing to ZTF! 🎉**

Your contributions help make ZTF better for everyone. If you have any questions,
don't hesitate to reach out to the maintainers or the community.


