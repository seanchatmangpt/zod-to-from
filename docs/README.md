# ZTF Documentation

Welcome to the comprehensive documentation for Zod-to-From (ZTF). This
documentation covers everything you need to know to effectively use ZTF in your
projects.

## 📚 Documentation Structure

### Core Documentation

- **[API Reference](api/README.md)** - Complete API documentation for all core
  functions
- **[Adapter Guide](adapters/README.md)** - Detailed documentation for all 42+
  format adapters
- **[Examples](examples/README.md)** - Practical examples and tutorials
- **[Guides](guides/README.md)** - Advanced usage patterns and best practices

### Development Resources

- **[Contributing Guide](contributing/README.md)** - How to contribute to ZTF
- **[Architecture](guides/architecture.md)** - Internal architecture and design
  decisions
- **[Testing](guides/testing.md)** - Testing strategies and guidelines

## 🚀 Quick Navigation

### Getting Started

1. **[Installation](api/README.md#installation)** - How to install ZTF
2. **[Quick Start](examples/README.md#quick-start)** - Your first ZTF conversion
3. **[Basic Concepts](guides/README.md#basic-concepts)** - Understanding schemas
   and adapters

### Core Functions

- **[parseFrom](api/parseFrom.md)** - Parse data from any format
- **[formatTo](api/formatTo.md)** - Format data to any format
- **[convert](api/convert.md)** - Convert between formats
- **[Registry](api/registry.md)** - Adapter management

### Format Adapters

- **[Data Formats](adapters/data.md)** - JSON, YAML, CSV, etc.
- **[Office Formats](adapters/office.md)** - DOCX, PPTX, XLSX, PDF
- **[Geospatial](adapters/geo.md)** - GPX, KML, TopoJSON, WKT
- **[Communications](adapters/communications.md)** - Email, Calendar, cURL
- **[AI Adapters](adapters/ai.md)** - AI-powered document parsing

## 🎯 Common Use Cases

### Data Processing Pipeline

```javascript
// Parse CSV → Validate → Convert to JSON
const csvData = 'name,age\nAlice,30\nBob,25';
const users = await parseFrom(UserSchema, 'csv', csvData);
const jsonOutput = await formatTo(UserSchema, 'json', users);
```

### Document Processing

```javascript
// Extract structured data from DOCX using AI
const docxBuffer = fs.readFileSync('report.docx');
const structured = await parseFrom(ReportSchema, 'docx-ai', docxBuffer);
```

### Configuration Management

```javascript
// Convert between config formats
const yamlConfig = await convert(
  ConfigSchema,
  { from: 'yaml', to: 'json' },
  yamlContent
);
```

## 🔍 Finding What You Need

### By Format

- **JSON/YAML/TOML** → [Data Adapters](adapters/data.md)
- **CSV/Excel** → [Office Adapters](adapters/office.md)
- **PDF/DOCX** → [Office Adapters](adapters/office.md)
- **GPX/KML** → [Geospatial Adapters](adapters/geo.md)
- **Email/Calendar** → [Communications Adapters](adapters/communications.md)

### By Use Case

- **Data Validation** → [API Reference](api/README.md)
- **Format Conversion** → [Examples](examples/README.md)
- **Large Datasets** → [Streaming Guide](guides/streaming.md)
- **AI Processing** → [AI Adapters](adapters/ai.md)
- **Custom Formats** → [Contributing Guide](contributing/README.md)

## 🆘 Need Help?

1. **Check the Examples** - [Examples](examples/README.md) for common patterns
2. **API Reference** - [API Docs](api/README.md) for function details
3. **Adapter Guide** - [Adapters](adapters/README.md) for format-specific help
4. **GitHub Issues** - Report bugs or request features
5. **Discussions** - Ask questions and share ideas

## 📖 Documentation Standards

This documentation follows these principles:

- **Completeness** - Every function and adapter is documented
- **Clarity** - Examples for every concept
- **Accuracy** - All code examples are tested
- **Accessibility** - Clear structure and navigation
- **Maintainability** - Easy to update and extend

## 🔄 Keeping Updated

The documentation is updated with every release. Check the
[Changelog](CHANGELOG.md) for recent updates and new features.

---

**Happy converting with ZTF! 🎉**


