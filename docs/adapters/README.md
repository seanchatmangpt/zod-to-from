# Adapter Guide

ZTF provides 42+ format adapters for seamless data conversion. This guide covers
all available adapters, their capabilities, and usage examples.

## 📋 Table of Contents

- **[Data Formats](data.md)** - JSON, YAML, CSV, NDJSON, etc.
- **[Office Formats](office.md)** - DOCX, PPTX, XLSX, PDF, HTML
- **[Geospatial](geo.md)** - GPX, KML, TopoJSON, WKT
- **[Communications](communications.md)** - Email, Calendar, cURL, vCard
- **[AI Adapters](ai.md)** - AI-powered document parsing
- **[DevOps & Config](devops.md)** - Docker, Kubernetes, Terraform, etc.
- **[Graph & Knowledge](graph.md)** - RDF, JSON-LD, Turtle, N-Quads
- **[Media & Archives](media.md)** - EXIF, ID3, TAR, ZIP
- **[Templating](templating.md)** - Nunjucks, Frontmatter

## 🔍 Adapter Categories

### Core Data Formats

Essential formats for data exchange and storage.

| Adapter  | Description                     | Streaming | AI  | Use Cases                                |
| -------- | ------------------------------- | --------- | --- | ---------------------------------------- |
| `json`   | JavaScript Object Notation      | ✅        | ❌  | APIs, configuration, data exchange       |
| `yaml`   | YAML Ain't Markup Language      | ✅        | ❌  | Configuration files, documentation       |
| `toml`   | Tom's Obvious, Minimal Language | ✅        | ❌  | Configuration files, project settings    |
| `csv`    | Comma-Separated Values          | ✅        | ❌  | Data analysis, spreadsheet import/export |
| `ndjson` | Newline Delimited JSON          | ✅        | ❌  | Log files, streaming data                |

### Office & Documents

Professional document formats and presentations.

| Adapter    | Description               | Streaming | AI  | Use Cases                            |
| ---------- | ------------------------- | --------- | --- | ------------------------------------ |
| `docx`     | Microsoft Word documents  | ❌        | ❌  | Document processing, text extraction |
| `pptx`     | PowerPoint presentations  | ❌        | ❌  | Presentation data extraction         |
| `xlsx`     | Excel spreadsheets        | ❌        | ❌  | Spreadsheet data processing          |
| `pdf`      | PDF documents             | ❌        | ❌  | Document text extraction             |
| `html`     | HyperText Markup Language | ✅        | ❌  | Web content, document conversion     |
| `markdown` | Markdown formatting       | ✅        | ❌  | Documentation, content management    |

### Geospatial

Geographic and mapping data formats.

| Adapter    | Description             | Streaming | AI  | Use Cases                          |
| ---------- | ----------------------- | --------- | --- | ---------------------------------- |
| `gpx`      | GPS Exchange Format     | ✅        | ❌  | GPS tracks, waypoints, routes      |
| `kml`      | Keyhole Markup Language | ✅        | ❌  | Google Earth, mapping applications |
| `topojson` | Topological JSON        | ✅        | ❌  | Web mapping, geospatial analysis   |
| `wkt`      | Well-Known Text         | ✅        | ❌  | Geometry representation, GIS       |

### Communications

Communication and messaging formats.

| Adapter   | Description           | Streaming | AI  | Use Cases                         |
| --------- | --------------------- | --------- | --- | --------------------------------- |
| `curl`    | HTTP request commands | ❌        | ❌  | API testing, request generation   |
| `eml`     | Email messages        | ❌        | ❌  | Email processing, archiving       |
| `ics`     | Calendar events       | ❌        | ❌  | Calendar integration, scheduling  |
| `vcard`   | Contact information   | ❌        | ❌  | Contact management, address books |
| `msgpack` | MessagePack binary    | ✅        | ❌  | High-performance serialization    |

### AI-Powered Adapters

Intelligent document parsing using Ollama.

| Adapter   | Description              | Streaming | AI  | Use Cases                       |
| --------- | ------------------------ | --------- | --- | ------------------------------- |
| `docx-ai` | AI-assisted DOCX parsing | ❌        | ✅  | Intelligent document analysis   |
| `pptx-ai` | AI-assisted PPTX parsing | ❌        | ✅  | Presentation content extraction |
| `xlsx-ai` | AI-assisted XLSX parsing | ❌        | ✅  | Spreadsheet data interpretation |

### DevOps & Configuration

Infrastructure and configuration management.

| Adapter         | Description           | Streaming | AI  | Use Cases                |
| --------------- | --------------------- | --------- | --- | ------------------------ |
| `compose`       | Docker Compose        | ✅        | ❌  | Container orchestration  |
| `dockerfile`    | Dockerfile            | ✅        | ❌  | Container definitions    |
| `k8s`           | Kubernetes manifests  | ✅        | ❌  | Container orchestration  |
| `terraform-hcl` | Terraform HCL         | ✅        | ❌  | Infrastructure as code   |
| `env`           | Environment variables | ✅        | ❌  | Configuration management |
| `ini`           | INI configuration     | ✅        | ❌  | Configuration files      |

### Graph & Knowledge

Linked data and knowledge representation.

| Adapter    | Description | Streaming | AI  | Use Cases                   |
| ---------- | ----------- | --------- | --- | --------------------------- |
| `jsonld`   | JSON-LD     | ✅        | ❌  | Linked data, semantic web   |
| `ttl`      | Turtle RDF  | ✅        | ❌  | RDF serialization           |
| `nq`       | N-Quads     | ✅        | ❌  | RDF quads, knowledge graphs |
| `rdfxml`   | RDF/XML     | ✅        | ❌  | RDF serialization           |
| `plantuml` | PlantUML    | ❌        | ❌  | Diagram generation          |

### Media & Archives

Media metadata and archive formats.

| Adapter | Description    | Streaming | AI  | Use Cases                             |
| ------- | -------------- | --------- | --- | ------------------------------------- |
| `exif`  | Image metadata | ❌        | ❌  | Photo processing, metadata extraction |
| `id3`   | Audio metadata | ❌        | ❌  | Music processing, metadata management |
| `tar`   | TAR archives   | ✅        | ❌  | File archiving, backup                |
| `zip`   | ZIP archives   | ✅        | ❌  | File compression, distribution        |

### Templating

Template engines and document processing.

| Adapter       | Description          | Streaming | AI  | Use Cases                                |
| ------------- | -------------------- | --------- | --- | ---------------------------------------- |
| `nunjucks`    | Nunjucks templates   | ✅        | ❌  | Template processing, document generation |
| `frontmatter` | Document frontmatter | ✅        | ❌  | Content management, documentation        |

## 🚀 Quick Start Examples

### Basic Data Conversion

```javascript
import { parseFrom, formatTo } from 'zod-to-from';
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email(),
});

// JSON to YAML
const jsonData = '{"name": "Alice", "age": 30, "email": "alice@example.com"}';
const user = await parseFrom(UserSchema, 'json', jsonData);
const yamlOutput = await formatTo(UserSchema, 'yaml', user);

// CSV to JSON
const csvData = 'name,age,email\nBob,25,bob@example.com';
const users = await parseFrom(UserSchema, 'csv', csvData);
const jsonOutput = await formatTo(UserSchema, 'json', users);
```

### AI-Powered Document Processing

```javascript
import { parseFrom } from 'zod-to-from';
import { z } from 'zod';

const DocumentSchema = z.object({
  title: z.string(),
  summary: z.string(),
  keyPoints: z.array(z.string()),
  author: z.string().optional(),
});

// AI-assisted DOCX parsing
const docxBuffer = fs.readFileSync('document.docx');
const parsed = await parseFrom(DocumentSchema, 'docx-ai', docxBuffer, {
  adapter: {
    model: 'qwen3-coder',
    prompt: 'Extract the main points and summary from this document',
  },
});
```

### Geospatial Data Processing

```javascript
import { parseFrom, formatTo } from 'zod-to-from';
import { z } from 'zod';

const GPXSchema = z.object({
  tracks: z.array(
    z.object({
      name: z.string(),
      points: z.array(
        z.object({
          lat: z.number(),
          lon: z.number(),
          elevation: z.number().optional(),
          time: z.string().optional(),
        })
      ),
    })
  ),
});

// Parse GPX file
const gpxData = fs.readFileSync('track.gpx', 'utf8');
const track = await parseFrom(GPXSchema, 'gpx', gpxData);

// Convert to TopoJSON
const topojson = await formatTo(GPXSchema, 'topojson', track);
```

## 🔧 Adapter Configuration

### Streaming Support

```javascript
// Check if adapter supports streaming
import { getAdapterInfo } from 'zod-to-from';

const info = getAdapterInfo('csv');
if (info?.supportsStreaming) {
  const result = await parseFrom(Schema, 'csv', largeData, {
    streaming: true,
  });
}
```

### AI Adapter Options

```javascript
// Configure AI adapters
const result = await parseFrom(Schema, 'docx-ai', docxBuffer, {
  adapter: {
    model: 'qwen3-coder', // Ollama model
    prompt: 'Extract key data', // Custom prompt
    temperature: 0.7, // AI temperature
    maxTokens: 1000, // Max response tokens
  },
});
```

### Format-Specific Options

```javascript
// CSV options
const result = await parseFrom(Schema, 'csv', csvData, {
  adapter: {
    delimiter: ';', // Custom delimiter
    headers: true, // Include headers
    skipEmptyLines: true, // Skip empty lines
  },
});

// YAML options
const result = await parseFrom(Schema, 'yaml', yamlData, {
  adapter: {
    indent: 2, // Indentation level
    lineWidth: 80, // Line width
    noRefs: true, // Disable references
  },
});
```

## 📊 Performance Considerations

### Streaming for Large Datasets

```javascript
// Use streaming for large files
const result = await parseFrom(Schema, 'csv', largeCsvFile, {
  streaming: true,
});

// Process data in chunks
for await (const chunk of result) {
  processChunk(chunk);
}
```

### Memory Management

```javascript
// For large documents, consider AI adapters
const result = await parseFrom(Schema, 'docx-ai', largeDocx, {
  adapter: {
    model: 'qwen3-coder',
    chunkSize: 1000, // Process in chunks
  },
});
```

## 🛠️ Custom Adapters

### Creating a Custom Adapter

```javascript
import { registerAdapter } from 'zod-to-from';

registerAdapter('custom-format', {
  async parse(input, opts = {}) {
    // Parse input to structured data
    const parsed = customParser(input, opts);
    return { data: parsed, metadata: {} };
  },

  async format(data, opts = {}) {
    // Format structured data to output
    const formatted = customFormatter(data, opts);
    return { data: formatted, metadata: {} };
  },

  supportsStreaming: true,
  isAI: false,
  version: '1.0.0',
});
```

### Adapter Best Practices

1. **Error Handling** - Always handle parsing errors gracefully
2. **Metadata** - Include useful metadata in responses
3. **Streaming** - Support streaming for large datasets when possible
4. **Validation** - Validate input data before processing
5. **Documentation** - Document adapter-specific options

## 🔍 Troubleshooting

### Common Issues

1. **Unsupported Format** - Check if adapter is registered
2. **Schema Mismatch** - Ensure schema matches data structure
3. **Memory Issues** - Use streaming for large datasets
4. **AI Model Errors** - Check Ollama model availability

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

**Next: [Examples](../examples/README.md)**


