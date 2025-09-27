# API Reference

This section provides comprehensive documentation for all ZTF core functions and
APIs.

## 📋 Table of Contents

- **[Core Functions](#core-functions)**
  - [parseFrom](#parsefrom)
  - [formatTo](#formatto)
  - [convert](#convert)
  - [listAdapters](#listadapters)
  - [getAdapterInfo](#getadapterinfo)
- **[Registry Management](#registry-management)**
  - [registerAdapter](#registeradapter)
  - [unregisterAdapter](#unregisteradapter)
  - [getRegisteredAdapters](#getregisteredadapters)
- **[Types and Interfaces](#types-and-interfaces)**
- **[Error Handling](#error-handling)**
- **[Configuration Options](#configuration-options)**

## 🔧 Core Functions

### parseFrom

Parse input data from a specified format into a Zod-validated object.

```javascript
import { parseFrom } from 'zod-to-from';
import { z } from 'zod';

const result = await parseFrom(schema, format, input, options);
```

#### Parameters

- **`schema`** (`ZodSchema`) - The Zod schema to validate against
- **`format`** (`string`) - The input format (e.g., 'json', 'yaml', 'csv')
- **`input`** (`string | Buffer | ReadableStream`) - The input data to parse
- **`options`** (`ZTFOptions`, optional) - Configuration options

#### Returns

- **`Promise<any>`** - The parsed and validated data

#### Example

```javascript
import { parseFrom } from 'zod-to-from';
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email(),
});

// Parse JSON
const jsonData = '{"name": "Alice", "age": 30, "email": "alice@example.com"}';
const user = await parseFrom(UserSchema, 'json', jsonData);
console.log(user); // { name: "Alice", age: 30, email: "alice@example.com" }

// Parse CSV
const csvData = 'name,age,email\nBob,25,bob@example.com';
const users = await parseFrom(UserSchema, 'csv', csvData);
console.log(users); // [{ name: "Bob", age: 25, email: "bob@example.com" }]
```

### formatTo

Format data to a specified output format.

```javascript
import { formatTo } from 'zod-to-from';

const result = await formatTo(schema, format, data, options);
```

#### Parameters

- **`schema`** (`ZodSchema`) - The Zod schema for validation
- **`format`** (`string`) - The output format (e.g., 'json', 'yaml', 'csv')
- **`data`** (`any`) - The data to format
- **`options`** (`ZTFOptions`, optional) - Configuration options

#### Returns

- **`Promise<string | Buffer>`** - The formatted data

#### Example

```javascript
import { formatTo } from 'zod-to-from';

const user = { name: 'Alice', age: 30, email: 'alice@example.com' };

// Format to YAML
const yamlOutput = await formatTo(UserSchema, 'yaml', user);
console.log(yamlOutput);
// name: Alice
// age: 30
// email: alice@example.com

// Format to CSV
const csvOutput = await formatTo(UserSchema, 'csv', [user]);
console.log(csvOutput);
// name,age,email
// Alice,30,alice@example.com
```

### convert

Convert data between two formats in a single operation.

```javascript
import { convert } from 'zod-to-from';

const result = await convert(schema, conversion, input, options);
```

#### Parameters

- **`schema`** (`ZodSchema`) - The Zod schema for validation
- **`conversion`** (`ConversionConfig`) - Source and target formats
- **`input`** (`string | Buffer | ReadableStream`) - The input data
- **`options`** (`ZTFOptions`, optional) - Configuration options

#### Returns

- **`Promise<string | Buffer>`** - The converted data

#### Example

```javascript
import { convert } from 'zod-to-from';

const csvInput = 'name,age,email\nBob,25,bob@example.com';
const jsonOutput = await convert(
  UserSchema,
  { from: 'csv', to: 'json' },
  csvInput
);
console.log(jsonOutput);
// [{"name": "Bob", "age": 25, "email": "bob@example.com"}]
```

### listAdapters

Get a list of all available adapters.

```javascript
import { listAdapters } from 'zod-to-from';

const adapters = listAdapters();
```

#### Returns

- **`string[]`** - Array of adapter names

#### Example

```javascript
import { listAdapters } from 'zod-to-from';

const adapters = listAdapters();
console.log(adapters);
// ['json', 'yaml', 'csv', 'docx', 'pptx', 'xlsx', ...]
```

### getAdapterInfo

Get detailed information about a specific adapter.

```javascript
import { getAdapterInfo } from 'zod-to-from';

const info = getAdapterInfo(adapterName);
```

#### Parameters

- **`adapterName`** (`string`) - The name of the adapter

#### Returns

- **`AdapterInfo | null`** - Adapter information or null if not found

#### Example

```javascript
import { getAdapterInfo } from 'zod-to-from';

const info = getAdapterInfo('csv');
console.log(info);
// {
//   name: 'csv',
//   version: '1.0.0',
//   supportsStreaming: true,
//   isAI: false,
//   description: 'CSV data parsing and formatting'
// }
```

## 🔧 Registry Management

### registerAdapter

Register a custom adapter.

```javascript
import { registerAdapter } from 'zod-to-from';

registerAdapter(name, adapter);
```

#### Parameters

- **`name`** (`string`) - The adapter name
- **`adapter`** (`Adapter`) - The adapter implementation

#### Example

```javascript
import { registerAdapter } from 'zod-to-from';

registerAdapter('custom', {
  async parse(input, opts = {}) {
    // Custom parsing logic
    return { data: parsedData, metadata: {} };
  },
  async format(data, opts = {}) {
    // Custom formatting logic
    return { data: formattedString, metadata: {} };
  },
  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
});
```

### unregisterAdapter

Unregister an adapter.

```javascript
import { unregisterAdapter } from 'zod-to-from';

unregisterAdapter(adapterName);
```

#### Parameters

- **`adapterName`** (`string`) - The adapter name to unregister

### getRegisteredAdapters

Get information about all registered adapters.

```javascript
import { getRegisteredAdapters } from 'zod-to-from';

const adapters = getRegisteredAdapters();
```

#### Returns

- **`Record<string, AdapterInfo>`** - Map of adapter names to their information

## 📝 Types and Interfaces

### ZTFOptions

Configuration options for ZTF operations.

```javascript
/**
 * @typedef {Object} ZTFOptions
 * @property {boolean} [streaming=false] - Enable streaming mode
 * @property {boolean} [includeProvenance=false] - Include provenance information
 * @property {Object} [adapter] - Adapter-specific options
 * @property {Object} [schema] - Schema-specific options
 */
```

### ConversionConfig

Configuration for format conversion.

```javascript
/**
 * @typedef {Object} ConversionConfig
 * @property {string} from - Source format
 * @property {string} to - Target format
 */
```

### AdapterInfo

Information about an adapter.

```javascript
/**
 * @typedef {Object} AdapterInfo
 * @property {string} name - Adapter name
 * @property {string} version - Adapter version
 * @property {boolean} supportsStreaming - Whether streaming is supported
 * @property {boolean} isAI - Whether this is an AI-powered adapter
 * @property {string} description - Adapter description
 */
```

### Adapter

Adapter implementation interface.

```javascript
/**
 * @typedef {Object} Adapter
 * @property {Function} parse - Parse function
 * @property {Function} format - Format function
 * @property {boolean} supportsStreaming - Streaming support flag
 * @property {boolean} isAI - AI adapter flag
 * @property {string} version - Adapter version
 */
```

## ⚠️ Error Handling

ZTF provides comprehensive error handling with specific error types:

### ZodError

Schema validation errors.

```javascript
import { parseFrom } from 'zod-to-from';
import { z } from 'zod';

try {
  const result = await parseFrom(Schema, 'json', invalidData);
} catch (error) {
  if (error.name === 'ZodError') {
    console.log('Schema validation failed:', error.issues);
    // Handle validation errors
  }
}
```

### AdapterError

Adapter-specific errors.

```javascript
try {
  const result = await parseFrom(Schema, 'unknown-format', data);
} catch (error) {
  if (error.name === 'AdapterError') {
    console.log('Adapter error:', error.message);
    // Handle adapter errors
  }
}
```

### ParseError

General parsing errors.

```javascript
try {
  const result = await parseFrom(Schema, 'json', malformedJson);
} catch (error) {
  if (error.name === 'ParseError') {
    console.log('Parse error:', error.message);
    // Handle parsing errors
  }
}
```

## ⚙️ Configuration Options

### Streaming Mode

Enable streaming for large datasets:

```javascript
const result = await parseFrom(Schema, 'csv', largeCsvData, {
  streaming: true,
});
```

### Provenance Tracking

Include provenance information:

```javascript
const result = await parseFrom(Schema, 'json', data, {
  includeProvenance: true,
});

console.log(result.provenance);
// {
//   timestamp: "2024-01-01T12:00:00.000Z",
//   adapter: "json",
//   version: "0.1.0",
//   schemaHash: "abc123..."
// }
```

### Adapter-Specific Options

Pass options to specific adapters:

```javascript
// AI adapter options
const result = await parseFrom(Schema, 'docx-ai', docxBuffer, {
  adapter: {
    model: 'qwen3-coder',
    prompt: 'Extract key information',
  },
});

// CSV adapter options
const result = await parseFrom(Schema, 'csv', csvData, {
  adapter: {
    delimiter: ';',
    headers: true,
  },
});
```

## 🔍 Best Practices

### Schema Design

```javascript
// Use descriptive schemas
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  createdAt: z.date(),
  preferences: z
    .object({
      theme: z.enum(['light', 'dark']),
      notifications: z.boolean(),
    })
    .optional(),
});
```

### Error Handling

```javascript
// Always handle errors appropriately
try {
  const result = await parseFrom(Schema, format, input);
  return result;
} catch (error) {
  if (error.name === 'ZodError') {
    // Log validation errors for debugging
    console.error('Validation failed:', error.issues);
    throw new Error('Invalid data format');
  } else {
    // Re-throw other errors
    throw error;
  }
}
```

### Performance Optimization

```javascript
// Use streaming for large datasets
const result = await parseFrom(Schema, 'csv', largeData, {
  streaming: true,
});

// Cache adapter info for repeated use
const adapterInfo = getAdapterInfo('csv');
if (adapterInfo?.supportsStreaming) {
  // Use streaming
}
```

---

**Next: [Adapter Guide](../adapters/README.md)**


