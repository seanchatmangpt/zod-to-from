# Data Format Adapters

This section covers the core data format adapters in ZTF, including JSON, YAML,
CSV, and other essential formats.

## 📋 Available Adapters

| Adapter  | Description                     | Streaming | Use Cases                                |
| -------- | ------------------------------- | --------- | ---------------------------------------- |
| `json`   | JavaScript Object Notation      | ✅        | APIs, configuration, data exchange       |
| `yaml`   | YAML Ain't Markup Language      | ✅        | Configuration files, documentation       |
| `toml`   | Tom's Obvious, Minimal Language | ✅        | Configuration files, project settings    |
| `csv`    | Comma-Separated Values          | ✅        | Data analysis, spreadsheet import/export |
| `ndjson` | Newline Delimited JSON          | ✅        | Log files, streaming data                |

## 🔧 JSON Adapter

### Basic Usage

```javascript
import { parseFrom, formatTo } from 'zod-to-from';
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email(),
});

// Parse JSON
const jsonData = '{"name": "Alice", "age": 30, "email": "alice@example.com"}';
const user = await parseFrom(UserSchema, 'json', jsonData);

// Format to JSON
const jsonOutput = await formatTo(UserSchema, 'json', user);
```

### Advanced Options

```javascript
// Pretty-printed JSON
const prettyJson = await formatTo(UserSchema, 'json', user, {
  adapter: {
    indent: 2,
    space: '  ',
  },
});

// Compact JSON
const compactJson = await formatTo(UserSchema, 'json', user, {
  adapter: {
    compact: true,
  },
});
```

## 📝 YAML Adapter

### Basic Usage

```javascript
// Parse YAML
const yamlData = `
name: Alice
age: 30
email: alice@example.com
`;
const user = await parseFrom(UserSchema, 'yaml', yamlData);

// Format to YAML
const yamlOutput = await formatTo(UserSchema, 'yaml', user);
```

### Advanced Options

```javascript
// Custom YAML formatting
const yamlOutput = await formatTo(UserSchema, 'yaml', user, {
  adapter: {
    indent: 4,
    lineWidth: 80,
    noRefs: true,
    sortKeys: true,
  },
});
```

## 📊 CSV Adapter

### Basic Usage

```javascript
// Parse CSV
const csvData =
  'name,age,email\nAlice,30,alice@example.com\nBob,25,bob@example.com';
const users = await parseFrom(UserSchema, 'csv', csvData);

// Format to CSV
const csvOutput = await formatTo(UserSchema, 'csv', users);
```

### Advanced Options

```javascript
// Custom CSV options
const csvOutput = await formatTo(UserSchema, 'csv', users, {
  adapter: {
    delimiter: ';',
    headers: true,
    skipEmptyLines: true,
    quote: '"',
    escape: '\\',
  },
});
```

### Streaming Support

```javascript
// Process large CSV files
const csvStream = fs.createReadStream('large-file.csv');
const result = await parseFrom(UserSchema, 'csv', csvStream, {
  streaming: true,
  adapter: {
    chunkSize: 1000,
  },
});

for await (const chunk of result) {
  await processChunk(chunk);
}
```

## 📄 NDJSON Adapter

### Basic Usage

```javascript
// Parse NDJSON
const ndjsonData = '{"name": "Alice", "age": 30}\n{"name": "Bob", "age": 25}';
const users = await parseFrom(UserSchema, 'ndjson', ndjsonData);

// Format to NDJSON
const ndjsonOutput = await formatTo(UserSchema, 'ndjson', users);
```

### Streaming Support

```javascript
// Process large NDJSON files
const ndjsonStream = fs.createReadStream('large-file.ndjson');
const result = await parseFrom(UserSchema, 'ndjson', ndjsonStream, {
  streaming: true,
});

for await (const chunk of result) {
  await processChunk(chunk);
}
```

## ⚙️ TOML Adapter

### Basic Usage

```javascript
// Parse TOML
const tomlData = `
name = "Alice"
age = 30
email = "alice@example.com"
`;
const user = await parseFrom(UserSchema, 'toml', tomlData);

// Format to TOML
const tomlOutput = await formatTo(UserSchema, 'toml', user);
```

### Advanced Options

```javascript
// Custom TOML formatting
const tomlOutput = await formatTo(UserSchema, 'toml', user, {
  adapter: {
    indent: 2,
    sortKeys: true,
    preserveComments: true,
  },
});
```

## 🔄 Format Conversion Examples

### JSON to YAML

```javascript
const jsonData = '{"name": "Alice", "age": 30, "email": "alice@example.com"}';
const user = await parseFrom(UserSchema, 'json', jsonData);
const yamlOutput = await formatTo(UserSchema, 'yaml', user);
```

### CSV to JSON

```javascript
const csvData = 'name,age,email\nAlice,30,alice@example.com';
const users = await parseFrom(UserSchema, 'csv', csvData);
const jsonOutput = await formatTo(UserSchema, 'json', users);
```

### YAML to TOML

```javascript
const yamlData = `
name: Alice
age: 30
email: alice@example.com
`;
const user = await parseFrom(UserSchema, 'yaml', yamlData);
const tomlOutput = await formatTo(UserSchema, 'toml', user);
```

## 🚀 Performance Tips

### Streaming for Large Files

```javascript
// Use streaming for files > 100MB
const result = await parseFrom(Schema, 'csv', largeFile, {
  streaming: true,
  adapter: {
    chunkSize: 1000,
  },
});
```

### Memory Management

```javascript
// Process data in chunks
for await (const chunk of result) {
  await processChunk(chunk);
  // Chunk is automatically garbage collected
}
```

### Parallel Processing

```javascript
// Process multiple files in parallel
const files = ['file1.csv', 'file2.csv', 'file3.csv'];
const results = await Promise.all(
  files.map(file => parseFrom(Schema, 'csv', fs.readFileSync(file)))
);
```

## ⚠️ Error Handling

### Common Errors

```javascript
try {
  const result = await parseFrom(Schema, 'json', invalidJson);
} catch (error) {
  if (error.name === 'ZodError') {
    console.log('Schema validation failed:', error.issues);
  } else if (error.name === 'ParseError') {
    console.log('JSON parsing failed:', error.message);
  }
}
```

### Validation Errors

```javascript
// Handle CSV validation errors
try {
  const result = await parseFrom(Schema, 'csv', csvData);
} catch (error) {
  if (error.name === 'ZodError') {
    error.issues.forEach(issue => {
      console.log(`Row ${issue.path[0]}: ${issue.message}`);
    });
  }
}
```

## 🧪 Testing

### Unit Tests

```javascript
import { describe, it, expect } from 'vitest';
import { parseFrom, formatTo } from '../src/index.mjs';

describe('Data Adapters', () => {
  describe('JSON Adapter', () => {
    it('should parse valid JSON', async () => {
      const jsonData = '{"name": "Alice", "age": 30}';
      const result = await parseFrom(UserSchema, 'json', jsonData);
      expect(result).toEqual({ name: 'Alice', age: 30 });
    });
  });

  describe('CSV Adapter', () => {
    it('should parse CSV with headers', async () => {
      const csvData = 'name,age\nAlice,30\nBob,25';
      const result = await parseFrom(UserSchema, 'csv', csvData);
      expect(result).toHaveLength(2);
    });
  });
});
```

### Integration Tests

```javascript
describe('Format Conversion', () => {
  it('should convert JSON to YAML', async () => {
    const jsonData = '{"name": "Alice", "age": 30}';
    const user = await parseFrom(UserSchema, 'json', jsonData);
    const yamlOutput = await formatTo(UserSchema, 'yaml', user);
    expect(yamlOutput).toContain('name: Alice');
  });
});
```

## 🔍 Troubleshooting

### Common Issues

1. **Schema Mismatch** - Ensure schema matches data structure
2. **Encoding Issues** - Use UTF-8 encoding for text files
3. **Memory Issues** - Use streaming for large files
4. **Delimiter Problems** - Check CSV delimiter settings

### Debug Mode

```javascript
// Enable debug logging
const result = await parseFrom(Schema, 'csv', data, {
  debug: true,
  adapter: {
    verbose: true,
  },
});
```

---

**Next: [Office Adapters](office.md)**


