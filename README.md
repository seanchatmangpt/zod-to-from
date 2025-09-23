# zod-to-from (ZTF)

[![npm version](https://img.shields.io/npm/v/zod-to-from.svg)](https://www.npmjs.com/package/zod-to-from)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/unjs/zod-to-from)

ZTF is a universal I/O conversion layer centered on Zod schemas. The core
philosophy is that Zod is the single source of truth, and all other formats are
merely views of that truth. It aims to make Zod the universal intermediate
representation for all application I/O.

## Core Philosophy

The library operates on two primary primitives: `from(format) -> zod` and
`to(format) <- zod`. All transformations are deterministic, using canonical
ordering and stable serialization to ensure reproducibility. The system is built
on the invariant that for any given data, `to(X, from(X, data))` is
approximately equal to the original data, with any lossiness being explicitly
declared and tracked.

## ✨ Features

- **Zod at the Center**: Your Zod schema is the canonical model; all I/O is
  validated against it
- **Deterministic I/O**: Transformations are designed to be reproducible with
  canonical ordering and stable serialization
- **First-Class Provenance**: Automatically capture the source, transform chain,
  and checksums for any operation
- **Content Addressing**: Artifacts can be keyed by a hash of their schema,
  options, and content for verifiable storage
- **Streaming First**: The API is designed around async iterable decoders and
  encoders to handle large payloads efficiently
- **Integrated Validation & Repair**: Parsing and validation occur in a single
  pass, with an optional repair loop to auto-fix and re-validate data
- **Partial Parsing**: Selectively extract a subset of data by projecting a
  partial Zod schema
- **Composable Pipeline**: Adapters are designed as composable functors,
  allowing for pipelines like `from(A) |> map |> to(B)`
- **Schema Versioning**: Includes support for typed transforms to migrate
  schemas from vN to vN+1
- **Typed Error Model**: Errors are explicitly typed as DecodeError,
  ValidateError, or LossyWarning
- **Security by Design**: Features safe parsers, resource caps, sandboxable
  runners, and deterministic timeouts for untrusted inputs
- **Governance & Observability**: Produces exportable audit logs (JSONL, Turtle)
  and provides per-stage timings and anomaly flags

## 🚀 Quick Start

The programmatic core is pure ESM, with side effects isolated in adapters.

### Programmatic API

```javascript
// Two primitives: parseFrom() and formatTo()
import { parseFrom, formatTo, convert } from 'zod-to-from';
import { z } from 'zod';

// Define your schema
const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
  active: z.boolean().default(true),
});

// Parse and validate in one pass
const userObject = await parseFrom(
  UserSchema,
  'json',
  '{"name":"Alice","age":30}'
);

// Format a validated object to another format
const userYaml = await formatTo(UserSchema, 'yaml', userObject);

// Convert between formats
const userCsv = await convert(
  UserSchema,
  { from: 'json', to: 'csv' },
  '{"name":"Alice","age":30}'
);
```

### CLI

ZTF provides a simple noun-verb command-line interface.

```bash
# Convert a source file from one format to another through a schema
ztf convert --from json --to yaml --schema ./schemas/user.mjs#UserSchema --in input.json --out output.yaml

# Parse a file with schema validation
ztf parse --schema ./schemas/config.mjs#Config --from yaml --in config.yaml --out config.json

# Format data to a specific format
ztf format --schema ./schemas/data.mjs#DataSchema --to csv --in data.json --out data.csv

# List available adapters
ztf list
```

## 📦 Supported Formats (The 80/20)

ZTF prioritizes broad coverage of high-value "dark matter" formats before
tackling the long tail.

### Text Formats

- **JSON**, **JSONL/NDJSON**, **YAML**, **TOML**, **CSV/TSV**, **INI**

### Binary Formats

- **Parquet**, **Arrow IPC**, **Avro**, **Protobuf**, **MessagePack**, **CBOR**,
  **Ion**

### Web & API Schemas

- **OpenAPI/Swagger** ↔ Zod
- **JSON Schema** ↔ Zod
- **GraphQL SDL** ↔ Zod

### Database & ORM Mappings

- **SQL DDL** ↔ Zod
- **Prisma**, **Drizzle**, **TypeORM**, **Mongoose** mappings

### Search & Index Schemas

- **Elasticsearch** mappings ↔ Zod
- **Meilisearch** & **Algolia** shapes

### Files & Office Documents (LLM-Assisted)

- **PDF**, **Docx**, **XLSX**, and **HTML** can be parsed into Zod objects using
  Vercel AI SDK guardrails

### Knowledge & Graph Layer

- **Turtle/N3** ↔ Zod
- **RDF triples** ↔ Zod records
- **SHACL** ↔ Zod constraints

### Diagrams

- **PlantUML** structural views (e.g., class diagrams) ↔ Zod projections

## 🏗️ Architecture

ZTF follows a monolithic structure with clear separation of concerns:

```
src/
├── core/                    # Core API and registry
│   ├── registry.mjs        # Adapter registry and utilities
│   └── main.mjs           # Main API functions (parseFrom, formatTo, convert)
├── adapters/               # Format converters
│   ├── json.mjs           # JSON adapter
│   ├── yaml.mjs           # YAML adapter
│   ├── csv.mjs            # CSV adapter
│   ├── data.mjs           # Data analytics formats
│   ├── office.mjs         # Office document formats
│   ├── graph.mjs          # Knowledge graph formats
│   └── nunjucks.mjs       # Template rendering
├── mappers/                # Schema bridges
│   ├── workflow.mjs       # Workflow-specific mappings
│   └── kpi.mjs            # KPI-specific mappings
├── cli/                    # Command-line interface
│   ├── cli.mjs            # Main CLI entry point
│   └── commands/          # Individual command implementations
└── index.mjs              # Main library entry point
```

## 🛡️ Security and Governance

- **Safe Execution**: Adapters are designed with safe parsers and can be run in
  sandboxed environments with deterministic timeouts and size limits for
  untrusted inputs
- **Typed Configuration**: All configuration, including for adapters, is handled
  via Zod schemas to prevent untyped options
- **Auditability**: Governance audit logs are exportable as JSONL or Turtle,
  making them ready for board-level reporting
- **Stability**: Adapters follow strict semantic versioning, and schemas can be
  frozen per tag to ensure stability

## 🛠️ Extensibility

ZTF is designed to be extensible from the ground up. An adapter kit provides
scaffolds, conformance tests, and fixtures to help you quickly add support for
new formats.

### Creating Custom Adapters

```javascript
import { registerAdapter } from 'zod-to-from';

const customAdapter = {
  async parse(input, opts = {}) {
    // Parse input to data
    const data = parseCustomFormat(input);
    return {
      data,
      metadata: {
        format: 'custom',
        inputSize: input.length,
        ...opts,
      },
    };
  },

  async format(data, opts = {}) {
    // Format data to string
    const output = formatCustomFormat(data);
    return {
      data: output,
      metadata: {
        format: 'custom',
        outputSize: output.length,
        ...opts,
      },
    };
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

registerAdapter('custom', customAdapter);
```

## 📋 API Reference

### Core Functions

#### `parseFrom(schema, format, input, options?)`

Parse input from a specified format into a Zod-validated object.

#### `formatTo(schema, format, data, options?)`

Format a Zod-validated object to a specified output format.

#### `convert(schema, conversion, input, options?)`

Convert data from one format to another with schema validation.

#### `registerAdapter(name, adapter)`

Register a new adapter for a specific format.

#### `listAdapters()`

List all registered adapter names.

### Options

```typescript
interface ZTFOptions {
  adapter?: Record<string, unknown>; // Custom options for the specific adapter
  validate?: boolean; // Whether to validate the output against the schema
  includeProvenance?: boolean; // Whether to include provenance metadata in result
  deterministic?: boolean; // Whether to enforce deterministic output
  streaming?: boolean; // Whether to use streaming for large datasets
}
```

## 🧪 Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test --coverage

# Run linting
pnpm lint

# Fix linting issues
pnpm lint:fix
```

### 🤖 AI Adapter Testing

The AI adapters include comprehensive tests that verify integration with Ollama
models. These tests are **opt-in only** to keep the regular test suite fast:

```bash
# Run AI adapter tests (requires Ollama running locally)
pnpm test:ai

# Run AI adapter tests in watch mode
pnpm test:ai:watch

# Run regular tests (AI tests are skipped by default)
pnpm test
```

**Prerequisites for AI tests:**

- Ollama installed and running locally
- At least one model available (e.g., `qwen3-coder`, `qwen3:8b`)
- Test files available in
  `node_modules/.pnpm/mammoth@*/node_modules/mammoth/test/test-data/`

The AI tests verify:

- ✅ Real document processing (DOCX files)
- ✅ Multiple model support
- ✅ Custom prompt handling
- ✅ Schema validation
- ✅ Error handling

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit
pull requests to our repository.

## 📚 Documentation

- [API Reference](./docs/api.md)
- [Adapter Development Guide](./docs/adapters.md)
- [CLI Usage Guide](./docs/cli.md)
- [Security Best Practices](./docs/security.md)

---

**zod-to-from** - Making Zod the universal intermediate representation for all
application I/O.
