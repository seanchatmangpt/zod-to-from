# Examples & Tutorials

This section provides practical examples and tutorials for using ZTF in
real-world scenarios.

## 📋 Table of Contents

- **[Quick Start](#quick-start)** - Your first ZTF conversion
- **[Data Processing](#data-processing)** - Common data transformation patterns
- **[Document Processing](#document-processing)** - Working with office
  documents
- **[Geospatial Data](#geospatial-data)** - GPS and mapping data
- **[Configuration Management](#configuration-management)** - Config file
  conversions
- **[AI-Powered Processing](#ai-powered-processing)** - Intelligent document
  analysis
- **[Streaming & Performance](#streaming--performance)** - Handling large
  datasets
- **[Error Handling](#error-handling)** - Robust error management
- **[Custom Adapters](#custom-adapters)** - Building your own adapters

## 🚀 Quick Start

### Your First Conversion

```javascript
import { parseFrom, formatTo } from 'zod-to-from';
import { z } from 'zod';

// Define a simple schema
const PersonSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email(),
});

// Parse JSON data
const jsonData = '{"name": "Alice", "age": 30, "email": "alice@example.com"}';
const person = await parseFrom(PersonSchema, 'json', jsonData);
console.log(person); // { name: "Alice", age: 30, email: "alice@example.com" }

// Format to YAML
const yamlOutput = await formatTo(PersonSchema, 'yaml', person);
console.log(yamlOutput);
// name: Alice
// age: 30
// email: alice@example.com
```

### CSV to JSON Conversion

```javascript
import { parseFrom, formatTo } from 'zod-to-from';
import { z } from 'zod';

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  department: z.string(),
});

// Parse CSV data
const csvData = `id,name,email,department
1,Alice Johnson,alice@company.com,Engineering
2,Bob Smith,bob@company.com,Marketing
3,Carol Davis,carol@company.com,Sales`;

const users = await parseFrom(UserSchema, 'csv', csvData);
console.log(users);
// [
//   { id: 1, name: "Alice Johnson", email: "alice@company.com", department: "Engineering" },
//   { id: 2, name: "Bob Smith", email: "bob@company.com", department: "Marketing" },
//   { id: 3, name: "Carol Davis", email: "carol@company.com", department: "Sales" }
// ]

// Convert to JSON
const jsonOutput = await formatTo(UserSchema, 'json', users);
console.log(jsonOutput);
// [{"id":1,"name":"Alice Johnson","email":"alice@company.com","department":"Engineering"},...]
```

## 📊 Data Processing

### Multi-Format Data Pipeline

```javascript
import { parseFrom, formatTo, convert } from 'zod-to-from';
import { z } from 'zod';

const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  category: z.string(),
  inStock: z.boolean(),
});

// Step 1: Parse CSV input
const csvData = `id,name,price,category,inStock
P001,Laptop,999.99,Electronics,true
P002,Book,19.99,Education,true
P003,Phone,699.99,Electronics,false`;

const products = await parseFrom(ProductSchema, 'csv', csvData);

// Step 2: Filter and transform data
const electronics = products.filter(p => p.category === 'Electronics');
const expensive = electronics.filter(p => p.price > 500);

// Step 3: Convert to different formats
const yamlOutput = await formatTo(ProductSchema, 'yaml', expensive);
const jsonOutput = await formatTo(ProductSchema, 'json', expensive);

// Step 4: Direct conversion
const tomlOutput = await convert(
  ProductSchema,
  { from: 'json', to: 'toml' },
  jsonOutput
);
```

### Configuration File Management

```javascript
import { parseFrom, formatTo } from 'zod-to-from';
import { z } from 'zod';

const ConfigSchema = z.object({
  database: z.object({
    host: z.string(),
    port: z.number(),
    name: z.string(),
    ssl: z.boolean(),
  }),
  server: z.object({
    port: z.number(),
    host: z.string(),
    cors: z.array(z.string()),
  }),
  features: z.object({
    auth: z.boolean(),
    logging: z.boolean(),
    metrics: z.boolean(),
  }),
});

// Parse YAML config
const yamlConfig = `
database:
  host: localhost
  port: 5432
  name: myapp
  ssl: true
server:
  port: 3000
  host: 0.0.0.0
  cors: ["http://localhost:3000", "https://myapp.com"]
features:
  auth: true
  logging: true
  metrics: false
`;

const config = await parseFrom(ConfigSchema, 'yaml', yamlConfig);

// Convert to different formats for different environments
const jsonConfig = await formatTo(ConfigSchema, 'json', config);
const tomlConfig = await formatTo(ConfigSchema, 'toml', config);
const envConfig = await formatTo(ConfigSchema, 'env', config);
```

## 📄 Document Processing

### Office Document Processing

```javascript
import { parseFrom, formatTo } from 'zod-to-from';
import { z } from 'zod';
import fs from 'fs';

const DocumentSchema = z.object({
  title: z.string(),
  content: z.string(),
  metadata: z.object({
    author: z.string(),
    created: z.string(),
    modified: z.string(),
  }),
});

// Process DOCX file
const docxBuffer = fs.readFileSync('document.docx');
const docxData = await parseFrom(DocumentSchema, 'docx', docxBuffer);

// Convert to different formats
const htmlOutput = await formatTo(DocumentSchema, 'html', docxData);
const markdownOutput = await formatTo(DocumentSchema, 'markdown', docxData);

// Save outputs
fs.writeFileSync('document.html', htmlOutput);
fs.writeFileSync('document.md', markdownOutput);
```

### Spreadsheet Data Processing

```javascript
import { parseFrom, formatTo } from 'zod-to-from';
import { z } from 'zod';

const SalesSchema = z.object({
  date: z.string(),
  product: z.string(),
  quantity: z.number(),
  price: z.number(),
  total: z.number(),
});

// Parse XLSX file
const xlsxBuffer = fs.readFileSync('sales.xlsx');
const salesData = await parseFrom(SalesSchema, 'xlsx', xlsxBuffer);

// Process and analyze data
const totalSales = salesData.reduce((sum, sale) => sum + sale.total, 0);
const productSales = salesData.reduce((acc, sale) => {
  acc[sale.product] = (acc[sale.product] || 0) + sale.total;
  return acc;
}, {});

// Export processed data
const summary = {
  totalSales,
  productSales,
  recordCount: salesData.length,
};

const summaryOutput = await formatTo(z.any(), 'json', summary);
fs.writeFileSync('sales-summary.json', summaryOutput);
```

## 🗺️ Geospatial Data

### GPS Track Processing

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

// Calculate track statistics
const totalPoints = track.tracks.reduce((sum, t) => sum + t.points.length, 0);
const elevationGain =
  track.tracks[0]?.points.reduce((gain, point, i, arr) => {
    if (i === 0) return 0;
    const prev = arr[i - 1];
    const diff = point.elevation - prev.elevation;
    return gain + (diff > 0 ? diff : 0);
  }, 0) || 0;

// Convert to different formats
const kmlOutput = await formatTo(GPXSchema, 'kml', track);
const topojsonOutput = await formatTo(GPXSchema, 'topojson', track);

// Save outputs
fs.writeFileSync('track.kml', kmlOutput);
fs.writeFileSync('track.topojson', topojsonOutput);
```

### Geographic Data Analysis

```javascript
import { parseFrom, formatTo } from 'zod-to-from';
import { z } from 'zod';

const LocationSchema = z.object({
  name: z.string(),
  coordinates: z.object({
    lat: z.number(),
    lon: z.number(),
  }),
  type: z.enum(['city', 'landmark', 'restaurant', 'hotel']),
  rating: z.number().optional(),
});

// Parse KML file
const kmlData = fs.readFileSync('locations.kml', 'utf8');
const locations = await parseFrom(LocationSchema, 'kml', kmlData);

// Filter and analyze
const restaurants = locations.filter(l => l.type === 'restaurant');
const highlyRated = restaurants.filter(r => r.rating && r.rating >= 4.5);

// Convert to different formats
const csvOutput = await formatTo(LocationSchema, 'csv', highlyRated);
const jsonOutput = await formatTo(LocationSchema, 'json', highlyRated);
```

## ⚙️ Configuration Management

### Environment Configuration

```javascript
import { parseFrom, formatTo } from 'zod-to-from';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.number(),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string(),
  CORS_ORIGINS: z.array(z.string()),
});

// Parse environment variables
const envData = `
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/db
JWT_SECRET=your-secret-key
CORS_ORIGINS=http://localhost:3000,https://myapp.com
`;

const config = await parseFrom(EnvSchema, 'env', envData);

// Convert to different formats for different tools
const dockerEnv = await formatTo(EnvSchema, 'env', config);
const kubernetesConfig = await formatTo(EnvSchema, 'k8s', config);
const terraformVars = await formatTo(EnvSchema, 'terraform-hcl', config);
```

### Multi-Environment Configuration

```javascript
import { parseFrom, formatTo } from 'zod-to-from';
import { z } from 'zod';

const AppConfigSchema = z.object({
  app: z.object({
    name: z.string(),
    version: z.string(),
    environment: z.string(),
  }),
  database: z.object({
    host: z.string(),
    port: z.number(),
    name: z.string(),
  }),
  redis: z.object({
    host: z.string(),
    port: z.number(),
  }),
});

// Base configuration
const baseConfig = {
  app: { name: 'MyApp', version: '1.0.0' },
  database: { host: 'localhost', port: 5432, name: 'myapp' },
  redis: { host: 'localhost', port: 6379 },
};

// Environment-specific overrides
const environments = {
  development: { app: { environment: 'development' } },
  staging: {
    app: { environment: 'staging' },
    database: { host: 'staging-db.example.com' },
  },
  production: {
    app: { environment: 'production' },
    database: { host: 'prod-db.example.com' },
    redis: { host: 'prod-redis.example.com' },
  },
};

// Generate configurations for each environment
for (const [env, overrides] of Object.entries(environments)) {
  const config = { ...baseConfig, ...overrides };
  const yamlConfig = await formatTo(AppConfigSchema, 'yaml', config);
  const jsonConfig = await formatTo(AppConfigSchema, 'json', config);

  fs.writeFileSync(`config.${env}.yaml`, yamlConfig);
  fs.writeFileSync(`config.${env}.json`, jsonConfig);
}
```

## 🤖 AI-Powered Processing

### Intelligent Document Analysis

```javascript
import { parseFrom } from 'zod-to-from';
import { z } from 'zod';

const DocumentAnalysisSchema = z.object({
  title: z.string(),
  summary: z.string(),
  keyPoints: z.array(z.string()),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  entities: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      confidence: z.number(),
    })
  ),
  topics: z.array(z.string()),
});

// Analyze DOCX document with AI
const docxBuffer = fs.readFileSync('report.docx');
const analysis = await parseFrom(
  DocumentAnalysisSchema,
  'docx-ai',
  docxBuffer,
  {
    adapter: {
      model: 'qwen3-coder',
      prompt:
        'Analyze this document and extract key information, sentiment, entities, and topics',
      temperature: 0.7,
      maxTokens: 2000,
    },
  }
);

console.log('Document Analysis:', analysis);
// {
//   title: "Quarterly Sales Report",
//   summary: "The report shows strong growth in Q3...",
//   keyPoints: ["Revenue increased 15%", "New markets opened", "Customer satisfaction improved"],
//   sentiment: "positive",
//   entities: [
//     { name: "John Smith", type: "PERSON", confidence: 0.95 },
//     { name: "Acme Corp", type: "ORGANIZATION", confidence: 0.89 }
//   ],
//   topics: ["sales", "growth", "market expansion", "customer satisfaction"]
// }
```

### Presentation Content Extraction

```javascript
import { parseFrom } from 'zod-to-from';
import { z } from 'zod';

const PresentationSchema = z.object({
  title: z.string(),
  slides: z.array(
    z.object({
      number: z.number(),
      title: z.string(),
      content: z.string(),
      bulletPoints: z.array(z.string()),
      images: z.array(z.string()),
    })
  ),
  summary: z.string(),
  keyMessages: z.array(z.string()),
});

// Extract content from PowerPoint presentation
const pptxBuffer = fs.readFileSync('presentation.pptx');
const presentation = await parseFrom(
  PresentationSchema,
  'pptx-ai',
  pptxBuffer,
  {
    adapter: {
      model: 'qwen3-coder',
      prompt:
        'Extract all slide content, bullet points, and key messages from this presentation',
      temperature: 0.5,
    },
  }
);

// Generate summary report
const report = {
  totalSlides: presentation.slides.length,
  keyMessages: presentation.keyMessages,
  summary: presentation.summary,
  slideTitles: presentation.slides.map(s => s.title),
};

const reportOutput = await formatTo(z.any(), 'markdown', report);
fs.writeFileSync('presentation-summary.md', reportOutput);
```

## 🌊 Streaming & Performance

### Large Dataset Processing

```javascript
import { parseFrom } from 'zod-to-from';
import { z } from 'zod';

const LogEntrySchema = z.object({
  timestamp: z.string(),
  level: z.enum(['info', 'warn', 'error']),
  message: z.string(),
  source: z.string(),
});

// Process large log file with streaming
const logFile = fs.createReadStream('large-app.log');
const result = await parseFrom(LogEntrySchema, 'ndjson', logFile, {
  streaming: true,
});

// Process data in chunks
let errorCount = 0;
let infoCount = 0;
let warnCount = 0;

for await (const chunk of result) {
  for (const entry of chunk) {
    switch (entry.level) {
      case 'error':
        errorCount++;
        break;
      case 'warn':
        warnCount++;
        break;
      case 'info':
        infoCount++;
        break;
    }
  }
}

console.log('Log Statistics:', { errorCount, warnCount, infoCount });
```

### Memory-Efficient CSV Processing

```javascript
import { parseFrom } from 'zod-to-from';
import { z } from 'zod';

const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  category: z.string(),
});

// Process large CSV file
const csvStream = fs.createReadStream('products.csv');
const result = await parseFrom(ProductSchema, 'csv', csvStream, {
  streaming: true,
  adapter: {
    chunkSize: 1000, // Process 1000 rows at a time
  },
});

// Aggregate data efficiently
const categoryStats = new Map();
let totalProducts = 0;

for await (const chunk of result) {
  for (const product of chunk) {
    totalProducts++;
    const current = categoryStats.get(product.category) || {
      count: 0,
      totalPrice: 0,
    };
    current.count++;
    current.totalPrice += product.price;
    categoryStats.set(product.category, current);
  }
}

// Generate summary
const summary = Array.from(categoryStats.entries()).map(
  ([category, stats]) => ({
    category,
    count: stats.count,
    averagePrice: stats.totalPrice / stats.count,
    percentage: (stats.count / totalProducts) * 100,
  })
);

const summaryOutput = await formatTo(z.any(), 'json', summary);
fs.writeFileSync('category-summary.json', summaryOutput);
```

## ⚠️ Error Handling

### Robust Error Management

```javascript
import { parseFrom } from 'zod-to-from';
import { z } from 'zod';

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});

async function processUserData(input, format) {
  try {
    const result = await parseFrom(UserSchema, format, input);
    return { success: true, data: result };
  } catch (error) {
    if (error.name === 'ZodError') {
      // Schema validation errors
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Data does not match expected schema',
        details: error.issues,
      };
    } else if (error.name === 'AdapterError') {
      // Adapter-specific errors
      return {
        success: false,
        error: 'ADAPTER_ERROR',
        message: `Failed to parse ${format} data`,
        details: error.message,
      };
    } else {
      // Unexpected errors
      return {
        success: false,
        error: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        details: error.message,
      };
    }
  }
}

// Usage
const result = await processUserData(invalidData, 'json');
if (!result.success) {
  console.error('Processing failed:', result.message);
  if (result.details) {
    console.error('Details:', result.details);
  }
}
```

### Batch Processing with Error Recovery

```javascript
import { parseFrom } from 'zod-to-from';
import { z } from 'zod';

const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
});

async function processBatch(files) {
  const results = [];
  const errors = [];

  for (const file of files) {
    try {
      const data = fs.readFileSync(file, 'utf8');
      const result = await parseFrom(ProductSchema, 'json', data);
      results.push({ file, success: true, data: result });
    } catch (error) {
      errors.push({ file, error: error.message });
      console.warn(`Failed to process ${file}:`, error.message);
    }
  }

  return { results, errors };
}

// Process multiple files
const files = ['products1.json', 'products2.json', 'products3.json'];
const batchResult = await processBatch(files);

console.log(`Processed ${batchResult.results.length} files successfully`);
console.log(`Failed to process ${batchResult.errors.length} files`);

// Save successful results
const allProducts = batchResult.results.flatMap(r => r.data);
const output = await formatTo(ProductSchema, 'json', allProducts);
fs.writeFileSync('all-products.json', output);
```

## 🛠️ Custom Adapters

### Building a Custom Adapter

```javascript
import { registerAdapter } from 'zod-to-from';

// Custom XML adapter
registerAdapter('custom-xml', {
  async parse(input, opts = {}) {
    try {
      // Parse XML to JavaScript object
      const parser = new DOMParser();
      const doc = parser.parseFromString(input, 'text/xml');

      // Convert to structured data
      const data = xmlToObject(doc.documentElement);

      return { data, metadata: { parsedAt: new Date().toISOString() } };
    } catch (error) {
      throw new Error(`Failed to parse XML: ${error.message}`);
    }
  },

  async format(data, opts = {}) {
    try {
      // Convert JavaScript object to XML
      const xml = objectToXml(data, opts.rootElement || 'root');
      return { data: xml, metadata: { formattedAt: new Date().toISOString() } };
    } catch (error) {
      throw new Error(`Failed to format XML: ${error.message}`);
    }
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
});

// Helper functions
function xmlToObject(node) {
  const result = {};

  if (node.nodeType === Node.ELEMENT_NODE) {
    if (
      node.childNodes.length === 1 &&
      node.childNodes[0].nodeType === Node.TEXT_NODE
    ) {
      return node.childNodes[0].textContent;
    }

    for (const child of node.childNodes) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const key = child.nodeName;
        const value = xmlToObject(child);

        if (result[key]) {
          if (!Array.isArray(result[key])) {
            result[key] = [result[key]];
          }
          result[key].push(value);
        } else {
          result[key] = value;
        }
      }
    }
  }

  return result;
}

function objectToXml(obj, rootElement = 'root') {
  let xml = `<${rootElement}>`;

  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        xml += `<${key}>${objectToXml(item, key)}</${key}>`;
      }
    } else if (typeof value === 'object' && value !== null) {
      xml += `<${key}>${objectToXml(value, key)}</${key}>`;
    } else {
      xml += `<${key}>${value}</${key}>`;
    }
  }

  xml += `</${rootElement}>`;
  return xml;
}

// Usage
const xmlData = '<users><user><name>Alice</name><age>30</age></user></users>';
const result = await parseFrom(UserSchema, 'custom-xml', xmlData);
```

---

**Next: [Guides](../guides/README.md)**


