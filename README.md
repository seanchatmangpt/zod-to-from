# Zod-to-From (ZTF) v1.0.0

> **A comprehensive format conversion library with Zod schema validation**

ZTF is a powerful, extensible library that provides seamless conversion between
various data formats while ensuring type safety through Zod schema validation.
Whether you're working with JSON, YAML, CSV, or specialized formats like GPX,
KML, or Office documents, ZTF has you covered.

## 🆕 What's New in v1.0.0

- **New `from/to` API** - Clean, intuitive function naming
- **47 Format Adapters** - Comprehensive format support
- **94 Export Functions** - Direct access to all adapters
- **Improved Type Safety** - Better JSDoc documentation
- **Enhanced Testing** - Comprehensive test coverage

## 🚀 Features

- **47 Format Adapters** - Support for JSON, YAML, CSV, XML, Office documents,
  geospatial data, and more
- **Zod Schema Validation** - Type-safe data conversion with runtime validation
- **AI-Powered Adapters** - Intelligent parsing for complex documents using
  Ollama
- **Streaming Support** - Handle large datasets efficiently
- **Provenance Tracking** - Audit trail for all conversions
- **Extensible Architecture** - Easy to add custom adapters
- **Zero Dependencies** - Core library has no external dependencies
- **JSDoc Documentation** - Comprehensive type information

## 📦 Installation

```bash
# Using pnpm (recommended)
pnpm add zod-to-from

# Using npm
npm install zod-to-from

# Using yarn
yarn add zod-to-from
```

## 🎯 Quick Start

### New `from/to` API (v1.0.0)

```javascript
import {
  fromJson,
  toJson,
  fromCsv,
  toCsv,
  fromYaml,
  toYaml,
} from 'zod-to-from';

// Parse JSON to structured data
const jsonData = '{"name": "Alice", "age": 30, "email": "alice@example.com"}';
const user = await fromJson(jsonData);
console.log(user.data); // { name: "Alice", age: 30, email: "alice@example.com" }

// Format structured data to JSON
const jsonOutput = await toJson({
  name: 'Bob',
  age: 25,
  email: 'bob@example.com',
});
console.log(jsonOutput.data);
// {
//   "name": "Bob",
//   "age": 25,
//   "email": "bob@example.com"
// }

// Parse CSV to structured data
const csvData = 'name,age,email\nCharlie,35,charlie@example.com';
const csvResult = await fromCsv(csvData);
console.log(csvResult.data.data); // [{ name: "Charlie", age: 35, email: "charlie@example.com" }]

// Format structured data to CSV
const csvOutput = await toCsv([
  { name: 'David', age: 40, email: 'david@example.com' },
]);
console.log(csvOutput.data);
// name,age,email
// David,40,david@example.com
```

### Legacy API (still supported)

```javascript
import { parseFrom, formatTo, convert } from 'zod-to-from';
import { z } from 'zod';

// Define your schema
const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email(),
});

// Parse JSON data
const jsonData = '{"name": "Alice", "age": 30, "email": "alice@example.com"}';
const user = await parseFrom(UserSchema, 'json', jsonData);
console.log(user); // { name: "Alice", age: 30, email: "alice@example.com" }

// Format to YAML
const yamlOutput = await formatTo(UserSchema, 'yaml', user);
console.log(yamlOutput);
// name: Alice
// age: 30
// email: alice@example.com
```

## 📚 Documentation

- **[API Reference](docs/api/README.md)** - Complete API documentation
- **[Adapter Guide](docs/adapters/README.md)** - All available format adapters
- **[Examples](docs/examples/README.md)** - Usage examples and tutorials
- **[Guides](docs/guides/README.md)** - Advanced usage patterns
- **[Contributing](docs/contributing/README.md)** - How to contribute

## 🔌 Available Adapters

### Core Data Formats

- **JSON** - JavaScript Object Notation
- **YAML** - YAML Ain't Markup Language
- **TOML** - Tom's Obvious, Minimal Language
- **CSV** - Comma-Separated Values
- **NDJSON** - Newline Delimited JSON

### Office & Documents

- **DOCX** - Microsoft Word documents (with AI assistance)
- **PPTX** - PowerPoint presentations
- **XLSX** - Excel spreadsheets
- **PDF** - PDF text extraction and table support
- **HTML** - HyperText Markup Language
- **Markdown** - Markdown formatting

### Geospatial

- **GPX** - GPS Exchange Format
- **KML** - Keyhole Markup Language
- **TopoJSON** - Topological JSON
- **WKT** - Well-Known Text geometries

### Communications

- **cURL** - HTTP request commands
- **EML** - Email messages
- **ICS** - Calendar events
- **vCard** - Contact information
- **MessagePack** - Binary serialization

### DevOps & Config

- **Docker Compose** - Container orchestration
- **Dockerfile** - Container definitions
- **Kubernetes** - K8s manifests
- **Terraform HCL** - Infrastructure as code
- **Environment Variables** - .env files
- **INI** - Configuration files

### Graph & Knowledge

- **JSON-LD** - Linked Data
- **Turtle** - RDF serialization
- **N-Quads** - RDF quads
- **PlantUML** - Diagram definitions

### Media & Archives

- **EXIF** - Image metadata
- **ID3** - Audio metadata
- **TAR** - Archive format
- **ZIP** - Compressed archives

### Templating

- **Nunjucks** - Template engine
- **Frontmatter** - Document metadata

## 🧠 AI-Powered Adapters

ZTF includes AI-powered adapters that use Ollama for intelligent document
parsing:

```javascript
import { parseFrom } from 'zod-to-from';
import { z } from 'zod';

const DocumentSchema = z.object({
  title: z.string(),
  summary: z.string(),
  keyPoints: z.array(z.string()),
});

// AI-assisted DOCX parsing
const docxBuffer = fs.readFileSync('document.docx');
const parsed = await parseFrom(DocumentSchema, 'docx-ai', docxBuffer, {
  adapter: {
    model: 'qwen3-coder',
    prompt: 'Extract the main points from this document',
  },
});
```

## 🔄 Streaming Support

Handle large datasets efficiently with streaming:

```javascript
import { parseFrom } from 'zod-to-from';

const result = await parseFrom(Schema, 'csv', largeCsvData, {
  streaming: true,
});
```

## 📊 Provenance Tracking

Track the history of your data transformations:

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

## 🛠️ Advanced Usage

### Custom Adapters

```javascript
import { registerAdapter } from 'zod-to-from';

registerAdapter('custom', {
  async parse(input, opts = {}) {
    // Your parsing logic
    return { data: parsedData, metadata: {} };
  },
  async format(data, opts = {}) {
    // Your formatting logic
    return { data: formattedString, metadata: {} };
  },
  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
});
```

### Error Handling

```javascript
import { parseFrom } from 'zod-to-from';
import { z } from 'zod';

try {
  const result = await parseFrom(Schema, 'json', invalidData);
} catch (error) {
  if (error.name === 'ZodError') {
    console.log('Schema validation failed:', error.issues);
  } else {
    console.log('Parsing failed:', error.message);
  }
}
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:unit
pnpm test:adapters
pnpm test:e2e

# Run with coverage
pnpm test:coverage
```

## 📈 Performance

ZTF is designed for performance:

- **Zero Dependencies** - Core library has no external dependencies
- **Lazy Loading** - Adapters are loaded only when needed
- **Streaming Support** - Handle large datasets without memory issues
- **Efficient Parsing** - Optimized for common use cases

## 🤝 Contributing

We welcome contributions! Please see our
[Contributing Guide](docs/contributing/README.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/seanchatmangpt/zod-to-from.git
cd zod-to-from

# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run tests
pnpm test
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Zod](https://github.com/colinhacks/zod) for schema validation
- [Ollama](https://ollama.ai/) for AI capabilities
- All the open-source libraries that power our adapters

## 📞 Support

- 📖 [Documentation](docs/README.md)
- 🐛 [Issue Tracker](https://github.com/seanchatmangpt/zod-to-from/issues)
- 💬 [Discussions](https://github.com/seanchatmangpt/zod-to-from/discussions)

---

**Made with ❤️ by the ZTF Team**
