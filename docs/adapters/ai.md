# AI-Powered Adapters

ZTF includes AI-powered adapters that use Ollama for intelligent document
parsing and analysis. These adapters can extract structured data from complex
documents like Word, PowerPoint, and Excel files.

## 📋 Available AI Adapters

| Adapter   | Description              | Streaming | AI Model | Use Cases                                 |
| --------- | ------------------------ | --------- | -------- | ----------------------------------------- |
| `docx-ai` | AI-assisted DOCX parsing | ❌        | Ollama   | Document analysis, content extraction     |
| `pptx-ai` | AI-assisted PPTX parsing | ❌        | Ollama   | Presentation analysis, slide extraction   |
| `xlsx-ai` | AI-assisted XLSX parsing | ❌        | Ollama   | Spreadsheet analysis, data interpretation |

## 🤖 Prerequisites

### Ollama Installation

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull required models
ollama pull qwen3-coder
ollama pull llama3.2
ollama pull codellama
```

### Model Requirements

- **qwen3-coder** - Recommended for document analysis
- **llama3.2** - General purpose model
- **codellama** - Code-focused model

## 📄 DOCX AI Adapter

### Basic Usage

```javascript
import { parseFrom } from 'zod-to-from';
import { z } from 'zod';
import fs from 'fs';

const DocumentSchema = z.object({
  title: z.string(),
  summary: z.string(),
  keyPoints: z.array(z.string()),
  author: z.string().optional(),
  date: z.string().optional(),
});

// Parse DOCX with AI
const docxBuffer = fs.readFileSync('document.docx');
const result = await parseFrom(DocumentSchema, 'docx-ai', docxBuffer, {
  adapter: {
    model: 'qwen3-coder',
    prompt: 'Extract the main points and summary from this document',
  },
});

console.log(result);
// {
//   title: "Quarterly Sales Report",
//   summary: "The report shows strong growth in Q3...",
//   keyPoints: ["Revenue increased 15%", "New markets opened"],
//   author: "John Smith",
//   date: "2024-01-15"
// }
```

### Advanced Configuration

```javascript
const result = await parseFrom(DocumentSchema, 'docx-ai', docxBuffer, {
  adapter: {
    model: 'qwen3-coder',
    prompt: 'Extract key information from this document',
    temperature: 0.7,
    maxTokens: 2000,
    systemPrompt: 'You are a document analysis expert',
    chunkSize: 1000,
    overlap: 200,
  },
});
```

### Custom Prompts

```javascript
// Extract specific information
const result = await parseFrom(DocumentSchema, 'docx-ai', docxBuffer, {
  adapter: {
    model: 'qwen3-coder',
    prompt: `
      Analyze this document and extract:
      1. Main title and subtitle
      2. Executive summary (2-3 sentences)
      3. Key findings (bullet points)
      4. Author and date if available
      5. Recommendations or next steps
    `,
  },
});
```

## 📊 PPTX AI Adapter

### Basic Usage

```javascript
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

// Parse PowerPoint with AI
const pptxBuffer = fs.readFileSync('presentation.pptx');
const result = await parseFrom(PresentationSchema, 'pptx-ai', pptxBuffer, {
  adapter: {
    model: 'qwen3-coder',
    prompt: 'Extract all slide content and key messages from this presentation',
  },
});
```

### Slide-by-Slide Analysis

```javascript
const result = await parseFrom(PresentationSchema, 'pptx-ai', pptxBuffer, {
  adapter: {
    model: 'qwen3-coder',
    prompt:
      'Analyze each slide and extract content, bullet points, and key messages',
    slideAnalysis: true,
    includeImages: true,
  },
});

// Process each slide
result.slides.forEach(slide => {
  console.log(`Slide ${slide.number}: ${slide.title}`);
  console.log('Content:', slide.content);
  console.log('Key Points:', slide.bulletPoints);
});
```

## 📈 XLSX AI Adapter

### Basic Usage

```javascript
const SpreadsheetSchema = z.object({
  title: z.string(),
  sheets: z.array(
    z.object({
      name: z.string(),
      data: z.array(z.record(z.any())),
      summary: z.string(),
      insights: z.array(z.string()),
    })
  ),
  overallSummary: z.string(),
  keyMetrics: z.record(z.number()),
});

// Parse Excel with AI
const xlsxBuffer = fs.readFileSync('spreadsheet.xlsx');
const result = await parseFrom(SpreadsheetSchema, 'xlsx-ai', xlsxBuffer, {
  adapter: {
    model: 'qwen3-coder',
    prompt: 'Analyze this spreadsheet and extract key metrics and insights',
  },
});
```

### Data Analysis

```javascript
const result = await parseFrom(SpreadsheetSchema, 'xlsx-ai', xlsxBuffer, {
  adapter: {
    model: 'qwen3-coder',
    prompt: `
      Analyze this spreadsheet and provide:
      1. Summary of each sheet
      2. Key metrics and trends
      3. Data insights and patterns
      4. Recommendations based on the data
    `,
    includeCharts: true,
    dataAnalysis: true,
  },
});
```

## ⚙️ Configuration Options

### Model Selection

```javascript
// Use different models for different tasks
const models = {
  'qwen3-coder': 'Best for document analysis and code extraction',
  'llama3.2': 'Good for general text analysis',
  codellama: 'Specialized for code and technical content',
};

// Select model based on content type
const model = contentType === 'technical' ? 'codellama' : 'qwen3-coder';
```

### Temperature and Tokens

```javascript
const result = await parseFrom(Schema, 'docx-ai', docxBuffer, {
  adapter: {
    model: 'qwen3-coder',
    temperature: 0.3, // Lower = more focused, Higher = more creative
    maxTokens: 1000, // Limit response length
    topP: 0.9, // Nucleus sampling
    topK: 40, // Top-k sampling
  },
});
```

### Chunking and Overlap

```javascript
// For large documents, process in chunks
const result = await parseFrom(Schema, 'docx-ai', largeDocxBuffer, {
  adapter: {
    model: 'qwen3-coder',
    chunkSize: 2000, // Process 2000 characters at a time
    overlap: 200, // 200 character overlap between chunks
    mergeStrategy: 'concatenate', // How to merge chunk results
  },
});
```

## 🚀 Performance Optimization

### Model Caching

```javascript
// Cache model responses for similar documents
const result = await parseFrom(Schema, 'docx-ai', docxBuffer, {
  adapter: {
    model: 'qwen3-coder',
    cache: true,
    cacheKey: 'document-analysis-v1',
  },
});
```

### Parallel Processing

```javascript
// Process multiple documents in parallel
const documents = ['doc1.docx', 'doc2.docx', 'doc3.docx'];
const results = await Promise.all(
  documents.map(doc =>
    parseFrom(Schema, 'docx-ai', fs.readFileSync(doc), {
      adapter: { model: 'qwen3-coder' },
    })
  )
);
```

### Streaming Responses

```javascript
// Stream AI responses for real-time processing
const result = await parseFrom(Schema, 'docx-ai', docxBuffer, {
  adapter: {
    model: 'qwen3-coder',
    stream: true,
    onChunk: chunk => {
      console.log('Received chunk:', chunk);
    },
  },
});
```

## ⚠️ Error Handling

### Model Errors

```javascript
try {
  const result = await parseFrom(Schema, 'docx-ai', docxBuffer, {
    adapter: { model: 'qwen3-coder' },
  });
} catch (error) {
  if (error.name === 'ModelError') {
    console.log('AI model error:', error.message);
    // Fallback to non-AI parsing
    const fallback = await parseFrom(Schema, 'docx', docxBuffer);
  }
}
```

### Timeout Handling

```javascript
const result = await parseFrom(Schema, 'docx-ai', docxBuffer, {
  adapter: {
    model: 'qwen3-coder',
    timeout: 30000, // 30 second timeout
    retries: 3, // Retry up to 3 times
  },
});
```

### Validation Errors

```javascript
try {
  const result = await parseFrom(Schema, 'docx-ai', docxBuffer);
} catch (error) {
  if (error.name === 'ZodError') {
    console.log('AI response validation failed:', error.issues);
    // Handle validation errors
  }
}
```

## 🧪 Testing AI Adapters

### Mock Testing

```javascript
// Mock AI responses for testing
const mockAIResponse = {
  title: 'Test Document',
  summary: 'This is a test summary',
  keyPoints: ['Point 1', 'Point 2'],
};

// Test with mocked response
const result = await parseFrom(Schema, 'docx-ai', docxBuffer, {
  adapter: {
    model: 'qwen3-coder',
    mock: true,
    mockResponse: mockAIResponse,
  },
});
```

### Integration Testing

```javascript
describe('AI Adapters', () => {
  it('should parse DOCX with AI', async () => {
    const docxBuffer = fs.readFileSync('test-document.docx');
    const result = await parseFrom(DocumentSchema, 'docx-ai', docxBuffer, {
      adapter: { model: 'qwen3-coder' },
    });

    expect(result.title).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(result.keyPoints).toBeInstanceOf(Array);
  });
});
```

## 🔍 Troubleshooting

### Common Issues

1. **Model Not Found** - Ensure Ollama model is installed
2. **Timeout Errors** - Increase timeout or reduce chunk size
3. **Memory Issues** - Use smaller chunk sizes
4. **Validation Errors** - Check schema matches AI response

### Debug Mode

```javascript
// Enable debug logging
const result = await parseFrom(Schema, 'docx-ai', docxBuffer, {
  adapter: {
    model: 'qwen3-coder',
    debug: true,
    verbose: true,
  },
});
```

### Model Status

```javascript
// Check model availability
import { checkModelStatus } from 'zod-to-from';

const status = await checkModelStatus('qwen3-coder');
console.log('Model status:', status);
// { available: true, version: '1.0.0', size: '4.2GB' }
```

## 📊 Best Practices

### Prompt Engineering

```javascript
// Use specific, clear prompts
const prompt = `
  Analyze this document and extract:
  1. Main title (string)
  2. Executive summary (2-3 sentences)
  3. Key findings (array of strings)
  4. Author name (string, optional)
  5. Date (string, optional)
  
  Return the result as a JSON object matching the schema.
`;
```

### Schema Design

```javascript
// Design schemas that match expected AI output
const DocumentSchema = z.object({
  title: z.string().describe('Main document title'),
  summary: z.string().describe('2-3 sentence summary'),
  keyPoints: z.array(z.string()).describe('Key findings as bullet points'),
  author: z.string().optional().describe('Document author if available'),
  date: z.string().optional().describe('Document date if available'),
});
```

### Error Recovery

```javascript
// Implement fallback strategies
async function parseWithFallback(schema, format, input, options) {
  try {
    return await parseFrom(schema, format, input, options);
  } catch (error) {
    if (error.name === 'ModelError') {
      // Fallback to non-AI parsing
      const nonAIFormat = format.replace('-ai', '');
      return await parseFrom(schema, nonAIFormat, input);
    }
    throw error;
  }
}
```

---

**Next: [Office Adapters](office.md)**


