/**
 * @typedef {import('../core/registry.mjs').Adapter} Adapter
 * @typedef {import('zod').ZodSchema} ZodSchema
 */

import { generateObject } from 'ai';
import { ollama } from 'ollama-ai-provider-v2';
import { createPackManifest, registerPack } from '../core/index.mjs';

/**
 * AI-Assisted DOCX Adapter (Parse-Only)
 *
 * Uses 'mammoth' to extract raw text and the Vercel AI SDK to structure it.
 *
 * ⚠️ PARSE-ONLY ADAPTER: This adapter only supports parsing (from:docx-ai).
 * Document creation (to:docx-ai) is not supported because AI output is
 * non-deterministic and unsuitable for reliable document generation.
 *
 * Use Cases:
 * - Extract structured data from Word documents using AI
 * - Parse messy or inconsistent document formats
 * - Convert document content to JSON/structured data
 *
 * For document creation, use deterministic adapters:
 * - "docx" - Standard Word documents
 * - "docx-table" - Tabular data in Word
 * - "html" - Rich formatting with Word conversion
 *
 * @type {Adapter}
 */
const docxAiAdapter = {
  async parse(
    input,
    /** @type {{schema?: ZodSchema, model?: string, prompt?: string}} */ opts = {}
  ) {
    if (!opts.schema) {
      throw new Error('A Zod schema is required for AI-assisted parsing.');
    }
    // Dynamically import the required parser library
    const { default: mammoth } = await import('mammoth');

    // 1. Extract raw text from the DOCX buffer
    const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input, 'binary');
    const { value: textContent } = await mammoth.extractRawText({ buffer });

    // 2. Use the Vercel AI SDK's generateObject to get a structured response
    const { object } = await generateObject({
      model: ollama(opts.model || 'qwen3-coder'),
      schema: opts.schema,
      prompt:
        opts.prompt ||
        `Extract the relevant information from the following document text and format it according to the provided schema.\n\nDOCUMENT:\n"""${textContent}"""`,
    });

    return object;
  },

  async format(data, opts = {}) {
    throw new Error(
      '❌ AI-assisted formatting (to:docx-ai) is not supported.\n\n' +
      '📝 Reason: AI output is non-deterministic and unsuitable for document creation.\n\n' +
      '✅ Recommended alternatives:\n' +
      '  • Use "docx" adapter for tables and structured documents\n' +
      '  • Use "docx-table" for tabular data\n' +
      '  • Use "html" → Word conversion for rich formatting\n\n' +
      '💡 Example: .to("docx", { content: data })'
    );
  },

  supportsStreaming: false,
  isAI: true,
  version: '1.0.0',
};

/**
 * AI-Assisted PPTX Adapter (Parse-Only)
 *
 * Uses 'jszip' to extract slide text and the Vercel AI SDK to structure it.
 *
 * ⚠️ PARSE-ONLY ADAPTER: This adapter only supports parsing (from:pptx-ai).
 * Presentation creation (to:pptx-ai) is not supported because AI output is
 * non-deterministic and unsuitable for reliable slide generation.
 *
 * Use Cases:
 * - Extract structured data from PowerPoint slides using AI
 * - Parse presentation content into JSON
 * - Analyze slide content programmatically
 *
 * For presentation creation, use deterministic adapters:
 * - "pptx" - Standard PowerPoint files
 * - "pptx-slides" - Structured slide creation
 * - "html" - Rich formatting with PowerPoint conversion
 *
 * @type {Adapter}
 */
const pptxAiAdapter = {
  async parse(
    input,
    /** @type {{schema?: ZodSchema, model?: string, prompt?: string}} */ opts = {}
  ) {
    if (!opts.schema) {
      throw new Error('A Zod schema is required for AI-assisted parsing.');
    }
    const { default: JSZip } = await import('jszip');

    // 1. Unzip the PPTX and extract text from slide XML files
    const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input, 'binary');
    const zip = await JSZip.loadAsync(buffer);
    const slidePromises = [];
    const slidesFolder = zip.folder('ppt/slides');
    if (slidesFolder) {
      for (const [relativePath, file] of Object.entries(slidesFolder.files)) {
        if (relativePath.endsWith('.xml')) {
          slidePromises.push(file.async('string'));
        }
      }
    }
    const slideXmls = await Promise.all(slidePromises);
    const textContent = slideXmls
      .map((xml, i) => {
        const textNodes = (xml.match(/<a:t>(.*?)<\/a:t>/g) || []).map(t =>
          t.replace(/<[^>]*>/g, '')
        );
        return `[Slide ${i + 1}] ${textNodes.join(' ')}`;
      })
      .join('\n');

    // 2. Use generateObject to structure the extracted text
    const { object } = await generateObject({
      model: ollama(opts.model || 'qwen3-coder'),
      schema: opts.schema,
      prompt:
        opts.prompt ||
        `Extract the relevant information from the following slide content and format it according to the provided schema.\n\nSLIDES:\n"""${textContent}"""`,
    });

    return object;
  },

  async format(data, opts = {}) {
    throw new Error(
      '❌ AI-assisted formatting (to:pptx-ai) is not supported.\n\n' +
      '📝 Reason: AI output is non-deterministic and unsuitable for presentation creation.\n\n' +
      '✅ Recommended alternatives:\n' +
      '  • Use "pptx" adapter for slide creation\n' +
      '  • Use "pptx-slides" for structured presentations\n' +
      '  • Use "html" → PowerPoint conversion for rich content\n\n' +
      '💡 Example: .to("pptx-slides", { slides: data })'
    );
  },

  supportsStreaming: false,
  isAI: true,
  version: '1.0.0',
};

/**
 * AI-Assisted XLSX Adapter (Parse-Only)
 *
 * Uses 'exceljs' to read worksheet data and the Vercel AI SDK to structure it.
 *
 * ⚠️ PARSE-ONLY ADAPTER: This adapter only supports parsing (from:xlsx-ai).
 * Spreadsheet creation (to:xlsx-ai) is not supported because AI output is
 * non-deterministic and unsuitable for reliable Excel generation.
 *
 * Use Cases:
 * - Extract structured data from messy Excel files using AI
 * - Normalize inconsistent column headers and data
 * - Convert spreadsheet content to JSON/structured data
 *
 * For spreadsheet creation, use deterministic adapters:
 * - "xlsx" - Standard Excel files
 * - "csv" - Simple tabular data
 * - "json" - Structured data with Excel conversion
 *
 * @type {Adapter}
 */
const xlsxAiAdapter = {
  async parse(
    input,
    /** @type {{schema?: ZodSchema, model?: string, prompt?: string}} */ opts = {}
  ) {
    if (!opts.schema) {
      throw new Error('A Zod schema is required for AI-assisted parsing.');
    }
    const { default: ExcelJS } = await import('exceljs');

    // 1. Read the first worksheet and convert it to a CSV-like string
    const workbook = new ExcelJS.Workbook();
    const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input, 'binary');
    // @ts-ignore - Buffer type compatibility issue with ExcelJS
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    let csvContent = '';
    worksheet.eachRow({ includeEmpty: false }, row => {
      const values = Array.isArray(row.values) ? row.values : [row.values];
      csvContent += values.slice(1).join(',') + '\n';
    });

    // 2. Use generateObject to normalize the potentially messy CSV data
    const { object } = await generateObject({
      model: ollama(opts.model || 'qwen3-coder'),
      schema: opts.schema,
      prompt:
        opts.prompt ||
        `Normalize the following CSV data into the provided schema. The headers may be messy or inconsistent.\n\nCSV DATA:\n"""${csvContent}"""`,
    });

    return object;
  },

  async format(data, opts = {}) {
    throw new Error(
      '❌ AI-assisted formatting (to:xlsx-ai) is not supported.\n\n' +
      '📝 Reason: AI output is non-deterministic and unsuitable for spreadsheet creation.\n\n' +
      '✅ Recommended alternatives:\n' +
      '  • Use "xlsx" adapter for standard Excel files\n' +
      '  • Use "csv" for simple tabular data\n' +
      '  • Use "json" → Excel conversion for structured data\n\n' +
      '💡 Example: .to("xlsx", { sheets: [{ name: "Sheet1", data }] })'
    );
  },

  supportsStreaming: false,
  isAI: true,
  version: '1.0.0',
};

// --- Pack Registration ---
const packManifest = createPackManifest('ztf-pack-ai', ['docx-ai', 'pptx-ai', 'xlsx-ai'], {
  version: '1.0.0',
  description: 'AI-Assisted parse-only adapters for ZTF (DOCX, PPTX, XLSX). Uses Vercel AI SDK for intelligent document parsing. ⚠️ These adapters only support parsing (from:*-ai), not formatting (to:*-ai).',
  // Peer dependencies are recommended for heavy libraries
  dependencies: ['ai', 'ollama-ai-provider-v2', 'mammoth', 'jszip', 'exceljs'],
});

const adapters = {
  'docx-ai': docxAiAdapter,
  'pptx-ai': pptxAiAdapter,
  'xlsx-ai': xlsxAiAdapter,
};

registerPack(packManifest, adapters);

export { docxAiAdapter, pptxAiAdapter, xlsxAiAdapter };
