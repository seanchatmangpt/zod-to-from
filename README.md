# Zod-to-From (ZTF) v1.0.1

> **A comprehensive format conversion library with Zod schema validation**

ZTF is a powerful, extensible library that provides seamless conversion between
various data formats while ensuring type safety through Zod schema validation.
Whether you're working with JSON, YAML, CSV, or specialized formats like GPX,
KML, or Office documents, ZTF has you covered.

## 🆕 What's New in v1.0.1

- **New `from/to` API** - Clean, intuitive function naming with Zod schema validation
- **47 Format Adapters** - Comprehensive format support
- **94 Export Functions** - Direct access to all adapters with schema validation
- **Improved Type Safety** - Better JSDoc documentation and runtime validation
- **Enhanced Testing** - Comprehensive test coverage with schema validation

## 🚀 Features

- **47 Format Adapters** - Support for JSON, YAML, CSV, XML, Office documents,
  geospatial data, and more
- **Zod Schema Validation** - Type-safe data conversion with runtime validation
- **New `from/to` API** - Clean, intuitive function naming with schema validation
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

### New `from/to` API (v1.0.1)

```javascript
import {
  fromJson,
  toJson,
  fromCsv,
  toCsv,
  fromYaml,
  toYaml,
} from 'zod-to-from';
import { z } from 'zod';

// Define your schema
const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email(),
});

// Parse JSON to structured data with schema validation
const jsonData = '{"name": "Alice", "age": 30, "email": "alice@example.com"}';
const user = await fromJson(UserSchema, jsonData);
console.log(user); // { name: "Alice", age: 30, email: "alice@example.com" }

// Format structured data to JSON with schema validation
const jsonOutput = await toJson(UserSchema, {
  name: 'Bob',
  age: 25,
  email: 'bob@example.com',
});
console.log(jsonOutput);
// {
//   "name": "Bob",
//   "age": 25,
//   "email": "bob@example.com"
// }

// Parse CSV to structured data with schema validation
const csvData = 'name,age,email\nCharlie,35,charlie@example.com';
const csvResult = await fromCsv(UserSchema, csvData);
console.log(csvResult.items); // [{ name: "Charlie", age: 35, email: "charlie@example.com" }]

// Format structured data to CSV with schema validation
const csvOutput = await toCsv(UserSchema, {
  items: [
    { name: 'David', age: 40, email: 'david@example.com' },
  ],
});
console.log(csvOutput);
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

## 💡 Real-World Use Cases

### 1. API Data Migration

Migrate data between different API formats with schema validation:

```javascript
import { fromJson, toYaml, fromCsv, toJson } from 'zod-to-from';
import { z } from 'zod';

const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  inStock: z.boolean(),
  tags: z.array(z.string()),
});

// Convert REST API JSON response to YAML config
const apiResponse = await fetch('/api/products').then((r) => r.text());
const products = await fromJson(ProductSchema, apiResponse);
const yamlConfig = await toYaml(ProductSchema, products);
fs.writeFileSync('config/products.yaml', yamlConfig);

// Import CSV from legacy system to modern API
const legacyCsv = fs.readFileSync('legacy/products.csv', 'utf8');
const importData = await fromCsv(ProductSchema, legacyCsv);
const apiPayload = await toJson(ProductSchema, importData);
await fetch('/api/bulk-import', {
  method: 'POST',
  body: apiPayload,
});
```

### 2. Configuration Management

Convert between different config formats for multi-environment deployments:

```javascript
import { fromYaml, toToml, fromEnv, toDockerCompose } from 'zod-to-from';
import { z } from 'zod';

const ConfigSchema = z.object({
  database: z.object({
    host: z.string(),
    port: z.number(),
    name: z.string(),
  }),
  redis: z.object({
    url: z.string(),
  }),
  api: z.object({
    port: z.number(),
    cors: z.boolean(),
  }),
});

// Convert YAML config to TOML for different tooling
const yamlConfig = fs.readFileSync('config.yaml', 'utf8');
const config = await fromYaml(ConfigSchema, yamlConfig);
const tomlConfig = await toToml(ConfigSchema, config);
fs.writeFileSync('config.toml', tomlConfig);

// Generate Docker Compose from environment variables
const envVars = await fromEnv(ConfigSchema, process.env);
const dockerCompose = await toDockerCompose(ConfigSchema, envVars);
fs.writeFileSync('docker-compose.yml', dockerCompose);
```

### 3. Geospatial Data Processing

Work with GPS tracks, maps, and location data:

```javascript
import { fromGpx, toKml, fromGeoJson, toTopoJson } from 'zod-to-from';
import { z } from 'zod';

const RouteSchema = z.object({
  name: z.string(),
  points: z.array(
    z.object({
      lat: z.number(),
      lon: z.number(),
      elevation: z.number().optional(),
      timestamp: z.string().optional(),
    })
  ),
});

// Convert GPS track to Google Earth format
const gpxData = fs.readFileSync('morning-run.gpx', 'utf8');
const route = await fromGpx(RouteSchema, gpxData);
const kmlData = await toKml(RouteSchema, route);
fs.writeFileSync('morning-run.kml', kmlData);

// Optimize map data with TopoJSON
const geoJsonMap = fs.readFileSync('city-map.geojson', 'utf8');
const mapData = await fromGeoJson(RouteSchema, geoJsonMap);
const optimizedMap = await toTopoJson(RouteSchema, mapData);
// TopoJSON is typically 80% smaller than GeoJSON
fs.writeFileSync('city-map.topojson', optimizedMap);
```

### 4. Document Processing & Extraction

Extract structured data from office documents:

```javascript
import { fromDocx, fromPdf, fromXlsx, toJson } from 'zod-to-from';
import { z } from 'zod';

const InvoiceSchema = z.object({
  invoiceNumber: z.string(),
  date: z.string(),
  customer: z.string(),
  items: z.array(
    z.object({
      description: z.string(),
      quantity: z.number(),
      price: z.number(),
    })
  ),
  total: z.number(),
});

// Extract invoice data from PDF with AI assistance
const pdfBuffer = fs.readFileSync('invoice-2024-01.pdf');
const invoice = await fromPdf(InvoiceSchema, pdfBuffer, {
  adapter: {
    model: 'qwen3-coder',
    prompt: 'Extract invoice details including items and total',
  },
});

// Process Excel reports to structured data
const xlsxBuffer = fs.readFileSync('sales-report.xlsx');
const salesData = await fromXlsx(InvoiceSchema, xlsxBuffer);
const jsonReport = await toJson(InvoiceSchema, salesData);
await storeInDatabase(JSON.parse(jsonReport));
```

### 5. DevOps & Infrastructure Automation

Convert between IaC and container formats:

```javascript
import {
  fromTerraform,
  toKubernetes,
  fromDockerfile,
  toDockerCompose,
} from 'zod-to-from';
import { z } from 'zod';

const ServiceSchema = z.object({
  name: z.string(),
  image: z.string(),
  ports: z.array(z.number()),
  env: z.record(z.string()),
  resources: z.object({
    cpu: z.string(),
    memory: z.string(),
  }),
});

// Convert Terraform config to Kubernetes manifest
const tfConfig = fs.readFileSync('infrastructure.tf', 'utf8');
const services = await fromTerraform(ServiceSchema, tfConfig);
const k8sManifest = await toKubernetes(ServiceSchema, services);
fs.writeFileSync('deployment.yaml', k8sManifest);

// Generate Docker Compose from Dockerfile
const dockerfile = fs.readFileSync('Dockerfile', 'utf8');
const containerConfig = await fromDockerfile(ServiceSchema, dockerfile);
const dockerCompose = await toDockerCompose(ServiceSchema, containerConfig);
fs.writeFileSync('docker-compose.yml', dockerCompose);
```

### 6. Communication & Calendar Integration

Work with emails, calendar events, and contacts:

```javascript
import { fromIcs, toJson, fromVcard, toEml } from 'zod-to-from';
import { z } from 'zod';

const EventSchema = z.object({
  title: z.string(),
  start: z.string(),
  end: z.string(),
  location: z.string().optional(),
  attendees: z.array(z.string()),
});

// Parse calendar invites
const icsData = fs.readFileSync('meeting.ics', 'utf8');
const event = await fromIcs(EventSchema, icsData);
const jsonEvent = await toJson(EventSchema, event);

// Send meeting invite via email
await sendEmail({
  to: event.attendees,
  subject: event.title,
  body: `Meeting scheduled for ${event.start}`,
  attachment: icsData,
});

// Import contacts from vCard
const vcardData = fs.readFileSync('contacts.vcf', 'utf8');
const ContactSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
});
const contacts = await fromVcard(ContactSchema, vcardData);
await importToDatabase(contacts);
```

### 7. Data Analysis & Reporting

Process large datasets with streaming support:

```javascript
import { fromCsv, toNdjson, fromXlsx, toParquet } from 'zod-to-from';
import { z } from 'zod';

const SalesSchema = z.object({
  date: z.string(),
  product: z.string(),
  quantity: z.number(),
  revenue: z.number(),
  region: z.string(),
});

// Stream large CSV files efficiently
const largeCsv = fs.createReadStream('sales-2024.csv');
const salesData = await fromCsv(SalesSchema, largeCsv, {
  streaming: true,
});

// Convert to NDJSON for log processing
const ndjsonOutput = await toNdjson(SalesSchema, salesData);
fs.writeFileSync('sales-2024.ndjson', ndjsonOutput);

// Export to Parquet for data warehousing
const parquetOutput = await toParquet(SalesSchema, salesData);
fs.writeFileSync('sales-2024.parquet', parquetOutput);
```

## 🔄 Streaming Support

Handle large datasets efficiently with streaming:

```javascript
import { fromCsv, toJson } from 'zod-to-from';

// Process large files without loading everything into memory
const result = await fromCsv(Schema, largeCsvData, {
  streaming: true,
  chunkSize: 1000, // Process 1000 rows at a time
});

// Transform and stream output
for await (const chunk of result.stream) {
  await processChunk(chunk);
}
```

## 📊 Provenance Tracking

Track the history of your data transformations for audit trails:

```javascript
import { fromJson, toYaml } from 'zod-to-from';

const result = await fromJson(Schema, data, {
  includeProvenance: true,
});

console.log(result.provenance);
// {
//   timestamp: "2024-01-01T12:00:00.000Z",
//   adapter: "json",
//   version: "1.0.1",
//   schemaHash: "abc123...",
//   transformations: [
//     { from: "json", to: "yaml", timestamp: "..." }
//   ]
// }

// Chain transformations with full audit trail
const yamlOutput = await toYaml(Schema, result.data, {
  includeProvenance: true,
  parentProvenance: result.provenance,
});
```

## 🧠 AI-Powered Document Understanding

Use AI to extract structured data from unstructured documents:

```javascript
import { fromDocx, fromPdf } from 'zod-to-from';
import { z } from 'zod';

const ResumeSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  skills: z.array(z.string()),
  experience: z.array(
    z.object({
      company: z.string(),
      role: z.string(),
      duration: z.string(),
      responsibilities: z.array(z.string()),
    })
  ),
});

// Extract structured resume data from DOCX
const docxBuffer = fs.readFileSync('resume.docx');
const resume = await fromDocx(ResumeSchema, docxBuffer, {
  adapter: {
    model: 'qwen3-coder',
    prompt: 'Extract candidate information including skills and work history',
  },
});

// Extract contract terms from PDF
const ContractSchema = z.object({
  parties: z.array(z.string()),
  terms: z.array(z.string()),
  effectiveDate: z.string(),
  duration: z.string(),
});

const pdfBuffer = fs.readFileSync('contract.pdf');
const contract = await fromPdf(ContractSchema, pdfBuffer, {
  adapter: {
    model: 'llama3',
    prompt: 'Identify all parties, key terms, dates, and obligations',
  },
});
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
import { fromJson } from 'zod-to-from';
import { z } from 'zod';

try {
  const result = await fromJson(Schema, invalidData);
} catch (error) {
  if (error.name === 'ZodError') {
    // Schema validation failed - detailed error messages
    console.log('Validation errors:', error.issues);
    for (const issue of error.issues) {
      console.log(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
  } else if (error.code === 'PARSE_ERROR') {
    // Format parsing failed
    console.log('Invalid format:', error.message);
  } else {
    // Other errors (network, file system, etc.)
    console.log('Error:', error.message);
  }
}
```

### Best Practices

#### 1. Schema Design

```javascript
import { z } from 'zod';

// ✅ Good: Specific, descriptive schemas
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().int().positive().max(150),
  role: z.enum(['admin', 'user', 'guest']),
  createdAt: z.string().datetime(),
});

// ❌ Bad: Too loose, no validation
const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  age: z.number(),
  role: z.string(),
  createdAt: z.string(),
});
```

#### 2. Type Safety

```javascript
import { fromJson, toYaml } from 'zod-to-from';
import { z } from 'zod';

const ConfigSchema = z.object({
  apiKey: z.string(),
  timeout: z.number(),
});

// ✅ Type-safe: TypeScript infers the correct type
const config = await fromJson(ConfigSchema, jsonData);
// config is typed as { apiKey: string; timeout: number }

const yamlConfig = await toYaml(ConfigSchema, config);
// TypeScript ensures config matches the schema
```

#### 3. Performance Optimization

```javascript
// ✅ Use streaming for large files
const result = await fromCsv(Schema, largeFile, {
  streaming: true,
  chunkSize: 1000,
});

// ✅ Lazy load adapters (automatic)
import { fromJson } from 'zod-to-from'; // Only JSON adapter loaded

// ❌ Avoid loading everything into memory
const hugeFile = fs.readFileSync('10gb-file.csv'); // Bad!
```

#### 4. Security Considerations

```javascript
import { fromJson } from 'zod-to-from';
import { z } from 'zod';

// ✅ Always validate untrusted input
const UntrustedSchema = z.object({
  content: z.string().max(10_000), // Limit size
  url: z.string().url(), // Validate format
  email: z.string().email(),
});

const userInput = await fromJson(UntrustedSchema, untrustedData);
// Schema ensures data is safe

// ❌ Never trust external data without validation
const unsafe = JSON.parse(untrustedData); // Dangerous!
```

## 🔧 Troubleshooting

### Common Issues

#### Issue: "Schema validation failed"

```javascript
// Problem: Data doesn't match schema
const UserSchema = z.object({
  age: z.number(), // Expects number
});

const data = '{"age": "25"}'; // String instead of number

// Solution: Use transform or preprocess
const FlexibleUserSchema = z.object({
  age: z.string().transform(Number), // Convert string to number
});

const user = await fromJson(FlexibleUserSchema, data);
```

#### Issue: "Adapter not found"

```javascript
// Problem: Adapter name typo or not installed
await fromJson(Schema, data); // ✅ Correct
await fromJson(Schema, data, { adapter: 'jsn' }); // ❌ Typo

// Solution: Check available adapters
import { getAvailableAdapters } from 'zod-to-from';
console.log(getAvailableAdapters()); // List all adapters
```

#### Issue: "Out of memory" with large files

```javascript
// Problem: Loading entire file into memory
const data = fs.readFileSync('huge.csv'); // ❌ Bad

// Solution: Use streaming
const stream = fs.createReadStream('huge.csv');
const result = await fromCsv(Schema, stream, {
  streaming: true,
  chunkSize: 1000,
});
```

#### Issue: "AI adapter timeout"

```javascript
// Problem: AI model taking too long
const result = await fromPdf(Schema, pdfBuffer, {
  adapter: {
    model: 'llama3',
    timeout: 5000, // Default might be too short
  },
});

// Solution: Increase timeout or use faster model
const result = await fromPdf(Schema, pdfBuffer, {
  adapter: {
    model: 'qwen3-coder', // Faster model
    timeout: 30_000, // 30 seconds
  },
});
```

#### Issue: "Cannot convert between formats"

```javascript
// Problem: Direct conversion not supported
await convert(Schema, data, 'csv', 'pdf'); // ❌ Not supported

// Solution: Use intermediate format (JSON)
const jsonData = await fromCsv(Schema, csvData);
const pdfData = await toPdf(Schema, jsonData);
```

### Debug Mode

Enable detailed logging for troubleshooting:

```javascript
import { fromJson } from 'zod-to-from';

const result = await fromJson(Schema, data, {
  debug: true, // Enable debug mode
});

// Output shows:
// - Adapter selection
// - Validation steps
// - Transformation pipeline
// - Performance metrics
```

### Validation Tips

```javascript
// Tip 1: Use .passthrough() for unknown fields
const FlexibleSchema = z
  .object({
    name: z.string(),
  })
  .passthrough(); // Allows extra fields

// Tip 2: Provide defaults for optional fields
const DefaultSchema = z.object({
  name: z.string(),
  age: z.number().default(0),
  role: z.string().default('user'),
});

// Tip 3: Use .catch() for fallback values
const SafeSchema = z.object({
  count: z.number().catch(0), // Use 0 if validation fails
});
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
