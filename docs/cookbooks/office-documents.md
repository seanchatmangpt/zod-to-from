# Office Documents Cookbook

> **The 80/20 Pattern: Word, Excel, PowerPoint Processing**

This cookbook covers the most common office document processing patterns -
extracting data from Word, Excel, and PowerPoint files, converting between
formats, and generating reports. This pattern handles 80% of document processing
use cases.

## 🎯 Use Case

**Problem**: You have office documents (DOCX, XLSX, PPTX) and need to extract
data, convert between formats, and process content for different systems.

**Solution**: Use ZTF to create robust document processing pipelines with schema
validation, content extraction, and format conversion.

## 📋 Prerequisites

- Understanding of office document formats
- ZTF installed and configured
- Zod schemas for document validation
- Basic knowledge of document structure

## 🍳 Recipe

### Step 1: Define Document Schemas

```javascript
import { z } from 'zod';

// Word document schema
const WordDocumentSchema = z.object({
  title: z.string(),
  content: z.string(),
  paragraphs: z.array(z.string()),
  headings: z.array(
    z.object({
      level: z.number(),
      text: z.string(),
    })
  ),
  tables: z.array(z.array(z.array(z.string()))),
  images: z.array(z.string()),
  metadata: z.object({
    author: z.string().optional(),
    created: z.string().optional(),
    modified: z.string().optional(),
    pages: z.number().optional(),
    words: z.number().optional(),
  }),
});

// Excel spreadsheet schema
const ExcelSpreadsheetSchema = z.object({
  sheets: z.array(
    z.object({
      name: z.string(),
      data: z.array(z.record(z.any())),
      headers: z.array(z.string()),
      rows: z.number(),
      columns: z.number(),
    })
  ),
  metadata: z.object({
    author: z.string().optional(),
    created: z.string().optional(),
    modified: z.string().optional(),
    totalSheets: z.number(),
  }),
});

// PowerPoint presentation schema
const PowerPointSchema = z.object({
  title: z.string(),
  slides: z.array(
    z.object({
      number: z.number(),
      title: z.string(),
      content: z.string(),
      bulletPoints: z.array(z.string()),
      images: z.array(z.string()),
      notes: z.string().optional(),
    })
  ),
  metadata: z.object({
    author: z.string().optional(),
    created: z.string().optional(),
    modified: z.string().optional(),
    totalSlides: z.number(),
  }),
});

// Document processing result schema
const DocumentProcessingResultSchema = z.object({
  success: z.boolean(),
  document: z.any(),
  extractedData: z.any(),
  metadata: z.object({
    processingTime: z.number(),
    fileSize: z.number(),
    format: z.string(),
  }),
  errors: z.array(z.string()).optional(),
});
```

### Step 2: Basic Document Processing

```javascript
import { parseFrom, formatTo } from 'zod-to-from';
import fs from 'fs';

async function processDocument(documentFile, schema, outputFormat) {
  try {
    // Read document file
    const documentBuffer = fs.readFileSync(documentFile);

    // Parse document based on file extension
    const fileExtension = documentFile.split('.').pop().toLowerCase();
    let parsedDocument;

    switch (fileExtension) {
      case 'docx':
        parsedDocument = await parseFrom(schema, 'docx', documentBuffer);
        break;
      case 'xlsx':
        parsedDocument = await parseFrom(schema, 'xlsx', documentBuffer);
        break;
      case 'pptx':
        parsedDocument = await parseFrom(schema, 'pptx', documentBuffer);
        break;
      default:
        throw new Error(`Unsupported file format: ${fileExtension}`);
    }

    // Process document content
    const processedDocument = await processDocumentContent(parsedDocument);

    // Convert to desired format
    const outputData = await formatTo(schema, outputFormat, processedDocument);

    // Save output
    const outputFile = `processed-${documentFile.replace(/\.[^/.]+$/, '')}.${outputFormat}`;
    fs.writeFileSync(outputFile, outputData);

    return {
      success: true,
      document: processedDocument,
      outputFile,
      format: outputFormat,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function processDocumentContent(document) {
  // Add processing metadata
  return {
    ...document,
    processedAt: new Date().toISOString(),
    processingVersion: '1.0.0',
    // Add computed fields
    wordCount: document.content ? document.content.split(' ').length : 0,
    paragraphCount: document.paragraphs ? document.paragraphs.length : 0,
    headingCount: document.headings ? document.headings.length : 0,
    tableCount: document.tables ? document.tables.length : 0,
    imageCount: document.images ? document.images.length : 0,
  };
}

// Usage
const result = await processDocument('report.docx', WordDocumentSchema, 'json');
```

### Step 3: Document Content Extraction

```javascript
async function extractDocumentContent(documentFile, extractionType) {
  try {
    const documentBuffer = fs.readFileSync(documentFile);
    const fileExtension = documentFile.split('.').pop().toLowerCase();

    let extractedData;

    switch (extractionType) {
      case 'text':
        extractedData = await extractTextContent(documentBuffer, fileExtension);
        break;
      case 'tables':
        extractedData = await extractTableContent(
          documentBuffer,
          fileExtension
        );
        break;
      case 'images':
        extractedData = await extractImageContent(
          documentBuffer,
          fileExtension
        );
        break;
      case 'metadata':
        extractedData = await extractMetadata(documentBuffer, fileExtension);
        break;
      case 'all':
        extractedData = await extractAllContent(documentBuffer, fileExtension);
        break;
      default:
        throw new Error(`Unknown extraction type: ${extractionType}`);
    }

    return {
      success: true,
      extractionType,
      data: extractedData,
      file: documentFile,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      extractionType,
    };
  }
}

async function extractTextContent(documentBuffer, fileExtension) {
  const schema =
    fileExtension === 'docx'
      ? WordDocumentSchema
      : fileExtension === 'pptx'
        ? PowerPointSchema
        : ExcelSpreadsheetSchema;

  const document = await parseFrom(schema, fileExtension, documentBuffer);

  if (fileExtension === 'docx') {
    return {
      title: document.title,
      content: document.content,
      paragraphs: document.paragraphs,
      headings: document.headings,
    };
  } else if (fileExtension === 'pptx') {
    return {
      title: document.title,
      slides: document.slides.map(slide => ({
        number: slide.number,
        title: slide.title,
        content: slide.content,
        bulletPoints: slide.bulletPoints,
      })),
    };
  } else if (fileExtension === 'xlsx') {
    return {
      sheets: document.sheets.map(sheet => ({
        name: sheet.name,
        headers: sheet.headers,
        data: sheet.data,
      })),
    };
  }
}

async function extractTableContent(documentBuffer, fileExtension) {
  if (fileExtension === 'docx') {
    const document = await parseFrom(
      WordDocumentSchema,
      'docx',
      documentBuffer
    );
    return {
      tables: document.tables,
      tableCount: document.tables.length,
    };
  } else if (fileExtension === 'xlsx') {
    const document = await parseFrom(
      ExcelSpreadsheetSchema,
      'xlsx',
      documentBuffer
    );
    return {
      sheets: document.sheets.map(sheet => ({
        name: sheet.name,
        data: sheet.data,
        headers: sheet.headers,
      })),
    };
  }

  return { tables: [], tableCount: 0 };
}

async function extractImageContent(documentBuffer, fileExtension) {
  if (fileExtension === 'docx') {
    const document = await parseFrom(
      WordDocumentSchema,
      'docx',
      documentBuffer
    );
    return {
      images: document.images,
      imageCount: document.images.length,
    };
  } else if (fileExtension === 'pptx') {
    const document = await parseFrom(PowerPointSchema, 'pptx', documentBuffer);
    const allImages = document.slides.flatMap(slide => slide.images);
    return {
      images: allImages,
      imageCount: allImages.length,
    };
  }

  return { images: [], imageCount: 0 };
}

async function extractMetadata(documentBuffer, fileExtension) {
  const schema =
    fileExtension === 'docx'
      ? WordDocumentSchema
      : fileExtension === 'pptx'
        ? PowerPointSchema
        : ExcelSpreadsheetSchema;

  const document = await parseFrom(schema, fileExtension, documentBuffer);

  return {
    title: document.title,
    metadata: document.metadata,
    fileExtension,
    extractedAt: new Date().toISOString(),
  };
}

async function extractAllContent(documentBuffer, fileExtension) {
  const textContent = await extractTextContent(documentBuffer, fileExtension);
  const tableContent = await extractTableContent(documentBuffer, fileExtension);
  const imageContent = await extractImageContent(documentBuffer, fileExtension);
  const metadata = await extractMetadata(documentBuffer, fileExtension);

  return {
    text: textContent,
    tables: tableContent,
    images: imageContent,
    metadata,
  };
}
```

### Step 4: Document Format Conversion

```javascript
async function convertDocumentFormat(inputFile, outputFormat) {
  try {
    const documentBuffer = fs.readFileSync(inputFile);
    const fileExtension = inputFile.split('.').pop().toLowerCase();

    // Parse document
    const schema =
      fileExtension === 'docx'
        ? WordDocumentSchema
        : fileExtension === 'pptx'
          ? PowerPointSchema
          : ExcelSpreadsheetSchema;

    const document = await parseFrom(schema, fileExtension, documentBuffer);

    // Convert to desired format
    let outputData;
    let outputExtension;

    switch (outputFormat) {
      case 'json':
        outputData = await formatTo(schema, 'json', document);
        outputExtension = 'json';
        break;
      case 'yaml':
        outputData = await formatTo(schema, 'yaml', document);
        outputExtension = 'yaml';
        break;
      case 'csv':
        if (fileExtension === 'xlsx') {
          // Convert Excel to CSV
          const csvData = await formatTo(
            ExcelSpreadsheetSchema,
            'csv',
            document
          );
          outputData = csvData;
          outputExtension = 'csv';
        } else {
          throw new Error('CSV conversion only supported for Excel files');
        }
        break;
      case 'html':
        outputData = await formatTo(schema, 'html', document);
        outputExtension = 'html';
        break;
      case 'markdown':
        outputData = await formatTo(schema, 'markdown', document);
        outputExtension = 'md';
        break;
      default:
        throw new Error(`Unsupported output format: ${outputFormat}`);
    }

    // Save converted document
    const outputFile =
      inputFile.replace(/\.[^/.]+$/, '') + `.${outputExtension}`;
    fs.writeFileSync(outputFile, outputData);

    return {
      success: true,
      inputFile,
      outputFile,
      inputFormat: fileExtension,
      outputFormat,
      fileSize: outputData.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      inputFile,
      outputFormat,
    };
  }
}
```

## 🔧 Variations

### Variation 1: Document Analysis and Reporting

```javascript
async function analyzeDocument(documentFile) {
  try {
    const documentBuffer = fs.readFileSync(documentFile);
    const fileExtension = documentFile.split('.').pop().toLowerCase();

    const schema =
      fileExtension === 'docx'
        ? WordDocumentSchema
        : fileExtension === 'pptx'
          ? PowerPointSchema
          : ExcelSpreadsheetSchema;

    const document = await parseFrom(schema, fileExtension, documentBuffer);

    const analysis = {
      file: documentFile,
      format: fileExtension,
      analysis: {
        basic: {
          title: document.title,
          wordCount: 0,
          paragraphCount: 0,
          headingCount: 0,
          tableCount: 0,
          imageCount: 0,
        },
        content: {
          readability: 0,
          complexity: 0,
          topics: [],
          keywords: [],
        },
        structure: {
          hasTitle: !!document.title,
          hasHeadings: false,
          hasTables: false,
          hasImages: false,
        },
        metadata: document.metadata || {},
      },
    };

    // Analyze content based on document type
    if (fileExtension === 'docx') {
      analysis.analysis.basic.wordCount = document.content
        ? document.content.split(' ').length
        : 0;
      analysis.analysis.basic.paragraphCount = document.paragraphs
        ? document.paragraphs.length
        : 0;
      analysis.analysis.basic.headingCount = document.headings
        ? document.headings.length
        : 0;
      analysis.analysis.basic.tableCount = document.tables
        ? document.tables.length
        : 0;
      analysis.analysis.basic.imageCount = document.images
        ? document.images.length
        : 0;

      analysis.analysis.structure.hasHeadings =
        document.headings && document.headings.length > 0;
      analysis.analysis.structure.hasTables =
        document.tables && document.tables.length > 0;
      analysis.analysis.structure.hasImages =
        document.images && document.images.length > 0;

      // Analyze readability
      analysis.analysis.content.readability = calculateReadability(
        document.content
      );
      analysis.analysis.content.complexity = calculateComplexity(
        document.content
      );
      analysis.analysis.content.keywords = extractKeywords(document.content);
    } else if (fileExtension === 'pptx') {
      analysis.analysis.basic.slideCount = document.slides
        ? document.slides.length
        : 0;
      analysis.analysis.basic.totalBulletPoints = document.slides
        ? document.slides.reduce(
            (sum, slide) => sum + slide.bulletPoints.length,
            0
          )
        : 0;

      // Analyze presentation structure
      analysis.analysis.structure.hasTitle =
        document.slides && document.slides.some(slide => slide.title);
      analysis.analysis.structure.hasImages =
        document.slides &&
        document.slides.some(slide => slide.images && slide.images.length > 0);
    } else if (fileExtension === 'xlsx') {
      analysis.analysis.basic.sheetCount = document.sheets
        ? document.sheets.length
        : 0;
      analysis.analysis.basic.totalRows = document.sheets
        ? document.sheets.reduce((sum, sheet) => sum + sheet.rows, 0)
        : 0;
      analysis.analysis.basic.totalColumns = document.sheets
        ? document.sheets.reduce((sum, sheet) => sum + sheet.columns, 0)
        : 0;

      // Analyze data structure
      analysis.analysis.structure.hasData =
        document.sheets &&
        document.sheets.some(sheet => sheet.data && sheet.data.length > 0);
    }

    return {
      success: true,
      analysis,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      file: documentFile,
    };
  }
}

function calculateReadability(text) {
  if (!text) return 0;

  const words = text.split(' ').length;
  const sentences = text.split(/[.!?]+/).length;
  const syllables = text
    .split('')
    .filter(char => 'aeiouAEIOU'.includes(char)).length;

  // Simple readability score (0-100)
  const score =
    206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  return Math.max(0, Math.min(100, score));
}

function calculateComplexity(text) {
  if (!text) return 0;

  const words = text.split(' ');
  const longWords = words.filter(word => word.length > 6).length;
  const complexWords = words.filter(
    word => word.includes('-') || word.includes('_')
  ).length;

  return ((longWords + complexWords) / words.length) * 100;
}

function extractKeywords(text) {
  if (!text) return [];

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(' ')
    .filter(word => word.length > 3);

  const wordCount = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  return Object.entries(wordCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
}
```

### Variation 2: Document Comparison

```javascript
async function compareDocuments(file1, file2) {
  try {
    // Extract content from both documents
    const content1 = await extractDocumentContent(file1, 'all');
    const content2 = await extractDocumentContent(file2, 'all');

    if (!content1.success || !content2.success) {
      throw new Error('Failed to extract content from one or both documents');
    }

    const comparison = {
      files: {
        file1,
        file2,
      },
      comparison: {
        basic: {
          sameTitle:
            content1.data.metadata.title === content2.data.metadata.title,
          sameAuthor:
            content1.data.metadata.metadata?.author ===
            content2.data.metadata.metadata?.author,
          sameFormat:
            content1.data.metadata.fileExtension ===
            content2.data.metadata.fileExtension,
        },
        content: {
          textSimilarity: 0,
          structureSimilarity: 0,
          differences: [],
        },
        metadata: {
          file1: content1.data.metadata,
          file2: content2.data.metadata,
        },
      },
    };

    // Compare text content
    if (content1.data.text && content2.data.text) {
      comparison.comparison.content.textSimilarity = calculateTextSimilarity(
        content1.data.text.content,
        content2.data.text.content
      );
    }

    // Compare structure
    comparison.comparison.content.structureSimilarity =
      calculateStructureSimilarity(content1.data, content2.data);

    // Find differences
    comparison.comparison.content.differences = findContentDifferences(
      content1.data,
      content2.data
    );

    return {
      success: true,
      comparison,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      files: { file1, file2 },
    };
  }
}

function calculateTextSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;

  const words1 = text1.toLowerCase().split(' ');
  const words2 = text2.toLowerCase().split(' ');

  const set1 = new Set(words1);
  const set2 = new Set(words2);

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return (intersection.size / union.size) * 100;
}

function calculateStructureSimilarity(content1, content2) {
  let similarity = 0;
  let factors = 0;

  // Compare headings
  if (content1.text?.headings && content2.text?.headings) {
    const headings1 = content1.text.headings.map(h => h.text);
    const headings2 = content2.text.headings.map(h => h.text);
    similarity += calculateTextSimilarity(
      headings1.join(' '),
      headings2.join(' ')
    );
    factors++;
  }

  // Compare tables
  if (content1.tables && content2.tables) {
    const tableCount1 = content1.tables.tableCount || 0;
    const tableCount2 = content2.tables.tableCount || 0;
    similarity +=
      (Math.min(tableCount1, tableCount2) /
        Math.max(tableCount1, tableCount2)) *
      100;
    factors++;
  }

  // Compare images
  if (content1.images && content2.images) {
    const imageCount1 = content1.images.imageCount || 0;
    const imageCount2 = content2.images.imageCount || 0;
    similarity +=
      (Math.min(imageCount1, imageCount2) /
        Math.max(imageCount1, imageCount2)) *
      100;
    factors++;
  }

  return factors > 0 ? similarity / factors : 0;
}

function findContentDifferences(content1, content2) {
  const differences = [];

  // Compare word counts
  if (content1.text?.content && content2.text?.content) {
    const words1 = content1.text.content.split(' ').length;
    const words2 = content2.text.content.split(' ').length;
    if (words1 !== words2) {
      differences.push({
        type: 'word_count',
        file1: words1,
        file2: words2,
        difference: words2 - words1,
      });
    }
  }

  // Compare paragraph counts
  if (content1.text?.paragraphs && content2.text?.paragraphs) {
    const para1 = content1.text.paragraphs.length;
    const para2 = content2.text.paragraphs.length;
    if (para1 !== para2) {
      differences.push({
        type: 'paragraph_count',
        file1: para1,
        file2: para2,
        difference: para2 - para1,
      });
    }
  }

  // Compare table counts
  if (content1.tables && content2.tables) {
    const tables1 = content1.tables.tableCount || 0;
    const tables2 = content2.tables.tableCount || 0;
    if (tables1 !== tables2) {
      differences.push({
        type: 'table_count',
        file1: tables1,
        file2: tables2,
        difference: tables2 - tables1,
      });
    }
  }

  return differences;
}
```

### Variation 3: Document Batch Processing

```javascript
async function batchProcessDocuments(documents, processingType) {
  const results = [];

  for (const document of documents) {
    try {
      let result;

      switch (processingType) {
        case 'extract':
          result = await extractDocumentContent(
            document.file,
            document.extractionType || 'all'
          );
          break;
        case 'convert':
          result = await convertDocumentFormat(
            document.file,
            document.outputFormat
          );
          break;
        case 'analyze':
          result = await analyzeDocument(document.file);
          break;
        default:
          throw new Error(`Unknown processing type: ${processingType}`);
      }

      results.push({
        file: document.file,
        success: result.success,
        result: result.success ? result : null,
        error: result.success ? null : result.error,
      });
    } catch (error) {
      results.push({
        file: document.file,
        success: false,
        result: null,
        error: error.message,
      });
    }
  }

  // Generate summary
  const summary = {
    total: documents.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    successRate:
      (results.filter(r => r.success).length / documents.length) * 100,
  };

  return {
    summary,
    results,
  };
}

// Usage
const documents = [
  { file: 'report1.docx', extractionType: 'text' },
  { file: 'spreadsheet1.xlsx', outputFormat: 'csv' },
  { file: 'presentation1.pptx', extractionType: 'all' },
];

const batchResult = await batchProcessDocuments(documents, 'extract');
```

## ⚠️ Common Pitfalls

### 1. Memory Issues with Large Documents

```javascript
// ❌ Wrong - loading entire document into memory
const document = fs.readFileSync('large-document.docx');
const parsed = await parseFrom(Schema, 'docx', document);

// ✅ Correct - using streaming for large documents
const documentStream = fs.createReadStream('large-document.docx');
const result = await parseFrom(Schema, 'docx', documentStream, {
  streaming: true,
});
```

### 2. Missing Document Validation

```javascript
// ❌ Wrong - no validation
const document = await parseFrom(z.any(), 'docx', documentBuffer);

// ✅ Correct - validate document structure
const document = await parseFrom(WordDocumentSchema, 'docx', documentBuffer);
```

### 3. Inefficient Document Processing

```javascript
// ❌ Wrong - processing documents one by one
for (const doc of documents) {
  await processDocument(doc);
}

// ✅ Correct - batch processing
const results = await Promise.all(documents.map(doc => processDocument(doc)));
```

## 🚀 Advanced Techniques

### 1. Document Content Search

```javascript
async function searchDocumentContent(documentFile, searchTerm, options = {}) {
  try {
    const documentBuffer = fs.readFileSync(documentFile);
    const fileExtension = documentFile.split('.').pop().toLowerCase();

    const schema =
      fileExtension === 'docx'
        ? WordDocumentSchema
        : fileExtension === 'pptx'
          ? PowerPointSchema
          : ExcelSpreadsheetSchema;

    const document = await parseFrom(schema, fileExtension, documentBuffer);

    const results = {
      file: documentFile,
      searchTerm,
      matches: [],
      totalMatches: 0,
    };

    // Search in different content types
    if (fileExtension === 'docx') {
      // Search in paragraphs
      if (document.paragraphs) {
        document.paragraphs.forEach((paragraph, index) => {
          const matches = findMatches(paragraph, searchTerm, options);
          if (matches.length > 0) {
            results.matches.push({
              type: 'paragraph',
              index,
              content: paragraph,
              matches,
            });
          }
        });
      }

      // Search in headings
      if (document.headings) {
        document.headings.forEach((heading, index) => {
          const matches = findMatches(heading.text, searchTerm, options);
          if (matches.length > 0) {
            results.matches.push({
              type: 'heading',
              index,
              content: heading.text,
              matches,
            });
          }
        });
      }
    } else if (fileExtension === 'pptx') {
      // Search in slides
      if (document.slides) {
        document.slides.forEach((slide, index) => {
          const matches = findMatches(slide.content, searchTerm, options);
          if (matches.length > 0) {
            results.matches.push({
              type: 'slide',
              index,
              content: slide.content,
              matches,
            });
          }
        });
      }
    } else if (fileExtension === 'xlsx') {
      // Search in spreadsheet data
      if (document.sheets) {
        document.sheets.forEach((sheet, sheetIndex) => {
          if (sheet.data) {
            sheet.data.forEach((row, rowIndex) => {
              Object.entries(row).forEach(([key, value]) => {
                const matches = findMatches(String(value), searchTerm, options);
                if (matches.length > 0) {
                  results.matches.push({
                    type: 'cell',
                    sheet: sheet.name,
                    row: rowIndex,
                    column: key,
                    content: String(value),
                    matches,
                  });
                }
              });
            });
          }
        });
      }
    }

    results.totalMatches = results.matches.reduce(
      (sum, match) => sum + match.matches.length,
      0
    );

    return {
      success: true,
      results,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      file: documentFile,
    };
  }
}

function findMatches(text, searchTerm, options = {}) {
  if (!text || !searchTerm) return [];

  const { caseSensitive = false, wholeWord = false, regex = false } = options;

  let searchText = text;
  let term = searchTerm;

  if (!caseSensitive) {
    searchText = text.toLowerCase();
    term = searchTerm.toLowerCase();
  }

  const matches = [];

  if (regex) {
    try {
      const regex = new RegExp(term, caseSensitive ? 'g' : 'gi');
      let match;
      while ((match = regex.exec(searchText)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
        });
      }
    } catch (error) {
      // Invalid regex, fall back to simple search
    }
  } else {
    let index = 0;
    while ((index = searchText.indexOf(term, index)) !== -1) {
      matches.push({
        start: index,
        end: index + term.length,
        text: term,
      });
      index += term.length;
    }
  }

  return matches;
}
```

### 2. Document Template Processing

```javascript
async function processDocumentTemplate(templateFile, data, outputFile) {
  try {
    const templateBuffer = fs.readFileSync(templateFile);
    const fileExtension = templateFile.split('.').pop().toLowerCase();

    const schema =
      fileExtension === 'docx'
        ? WordDocumentSchema
        : fileExtension === 'pptx'
          ? PowerPointSchema
          : ExcelSpreadsheetSchema;

    const template = await parseFrom(schema, fileExtension, templateBuffer);

    // Process template with data
    const processedDocument = await fillTemplate(template, data, fileExtension);

    // Save processed document
    const outputData = await formatTo(schema, fileExtension, processedDocument);
    fs.writeFileSync(outputFile, outputData);

    return {
      success: true,
      templateFile,
      outputFile,
      dataFields: Object.keys(data),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      templateFile,
    };
  }
}

async function fillTemplate(template, data, fileExtension) {
  const processed = { ...template };

  if (fileExtension === 'docx') {
    // Replace placeholders in content
    if (processed.content) {
      processed.content = replacePlaceholders(processed.content, data);
    }

    // Replace placeholders in paragraphs
    if (processed.paragraphs) {
      processed.paragraphs = processed.paragraphs.map(paragraph =>
        replacePlaceholders(paragraph, data)
      );
    }

    // Replace placeholders in headings
    if (processed.headings) {
      processed.headings = processed.headings.map(heading => ({
        ...heading,
        text: replacePlaceholders(heading.text, data),
      }));
    }
  } else if (fileExtension === 'pptx') {
    // Replace placeholders in slides
    if (processed.slides) {
      processed.slides = processed.slides.map(slide => ({
        ...slide,
        title: replacePlaceholders(slide.title, data),
        content: replacePlaceholders(slide.content, data),
        bulletPoints: slide.bulletPoints.map(point =>
          replacePlaceholders(point, data)
        ),
      }));
    }
  } else if (fileExtension === 'xlsx') {
    // Replace placeholders in spreadsheet data
    if (processed.sheets) {
      processed.sheets = processed.sheets.map(sheet => ({
        ...sheet,
        data: sheet.data.map(row => {
          const processedRow = {};
          Object.entries(row).forEach(([key, value]) => {
            processedRow[key] = replacePlaceholders(String(value), data);
          });
          return processedRow;
        }),
      }));
    }
  }

  return processed;
}

function replacePlaceholders(text, data) {
  if (!text || typeof text !== 'string') return text;

  let processedText = text;

  // Replace {{key}} placeholders
  Object.entries(data).forEach(([key, value]) => {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    processedText = processedText.replace(placeholder, String(value));
  });

  // Replace ${key} placeholders
  Object.entries(data).forEach(([key, value]) => {
    const placeholder = new RegExp(`\\$\\{${key}\\}`, 'g');
    processedText = processedText.replace(placeholder, String(value));
  });

  return processedText;
}
```

## 📊 Performance Tips

### 1. Parallel Document Processing

```javascript
async function processDocumentsInParallel(documents, processingType) {
  const results = await Promise.allSettled(
    documents.map(async document => {
      try {
        let result;

        switch (processingType) {
          case 'extract':
            result = await extractDocumentContent(
              document.file,
              document.extractionType || 'all'
            );
            break;
          case 'convert':
            result = await convertDocumentFormat(
              document.file,
              document.outputFormat
            );
            break;
          case 'analyze':
            result = await analyzeDocument(document.file);
            break;
        }

        return { file: document.file, success: true, result };
      } catch (error) {
        return { file: document.file, success: false, error: error.message };
      }
    })
  );

  return results.map((result, index) => ({
    file: documents[index].file,
    ...result.value,
  }));
}
```

### 2. Document Caching

```javascript
class DocumentCache {
  constructor(ttl = 3600000) {
    // 1 hour default TTL
    this.cache = new Map();
    this.ttl = ttl;
  }

  async get(key, fetcher) {
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }

    const data = await fetcher();

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    return data;
  }

  clear() {
    this.cache.clear();
  }
}

// Usage
const documentCache = new DocumentCache();

async function getCachedDocument(documentFile) {
  return await documentCache.get(documentFile, async () => {
    const documentBuffer = fs.readFileSync(documentFile);
    const fileExtension = documentFile.split('.').pop().toLowerCase();
    const schema =
      fileExtension === 'docx'
        ? WordDocumentSchema
        : fileExtension === 'pptx'
          ? PowerPointSchema
          : ExcelSpreadsheetSchema;

    return await parseFrom(schema, fileExtension, documentBuffer);
  });
}
```

## 🧪 Testing

### Unit Tests

```javascript
import { describe, it, expect } from 'vitest';

describe('Office Documents', () => {
  it('should process Word document correctly', async () => {
    const result = await processDocument(
      'test.docx',
      WordDocumentSchema,
      'json'
    );

    expect(result.success).toBe(true);
    expect(result.document).toBeDefined();
    expect(result.outputFile).toBeDefined();
  });

  it('should extract document content', async () => {
    const result = await extractDocumentContent('test.docx', 'text');

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.title).toBeDefined();
  });

  it('should convert document format', async () => {
    const result = await convertDocumentFormat('test.docx', 'html');

    expect(result.success).toBe(true);
    expect(result.outputFile).toBeDefined();
    expect(result.outputFormat).toBe('html');
  });

  it('should analyze document correctly', async () => {
    const result = await analyzeDocument('test.docx');

    expect(result.success).toBe(true);
    expect(result.analysis).toBeDefined();
    expect(result.analysis.analysis.basic).toBeDefined();
  });
});
```

---

**Next: [GPS Data Cookbook](gps-data.md)**


