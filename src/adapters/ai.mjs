/**
 * @typedef {import('../core/registry.mjs').Adapter} Adapter
 * @typedef {import('zod').ZodSchema} ZodSchema
 */

import { generateObject } from 'ai';
import { ollama } from 'ollama-ai-provider-v2';
import { createPackManifest, registerPack } from '../core/index.mjs';

/**
 * AI-Assisted DOCX Adapter
 * Uses 'mammoth' to extract raw text and Vercel AI SDK to structure it.
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
    // Convert string input to Buffer for mammoth
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
      'AI-assisted formatting (to:docx-ai) is not supported. Use a deterministic adapter like "docx-table" instead.'
    );
  },

  supportsStreaming: false,
  isAI: true,
  version: '1.0.0',
};

/**
 * AI-Assisted PPTX Adapter
 * Uses 'jszip' to extract slide text and Vercel AI SDK to structure it.
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
    // Convert string input to Buffer for JSZip
    const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input, 'binary');
    const zip = await JSZip.loadAsync(buffer);
    const slidePromises = [];
    const slidesFolder = zip.folder('ppt/slides');
    if (slidesFolder) {
      for (const relativePath of Object.keys(slidesFolder.files)) {
        const file = slidesFolder.files[relativePath];
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
      'AI-assisted formatting (to:pptx-ai) is not supported. Use a deterministic adapter like "pptx-slides" instead.'
    );
  },

  supportsStreaming: false,
  isAI: true,
  version: '1.0.0',
};

/**
 * AI-Assisted XLSX Adapter
 * Uses 'exceljs' to read worksheet data and Vercel AI SDK to structure it.
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
    // Convert string input to Buffer for ExcelJS
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
      'AI-assisted formatting (to:xlsx-ai) is not supported. Use a deterministic adapter like "xlsx" instead.'
    );
  },

  supportsStreaming: false,
  isAI: true,
  version: '1.0.0',
};

// --- Pack Registration ---
const packManifest = createPackManifest('ztf-pack-ai', ['docx-ai', 'pptx-ai', 'xlsx-ai'], {
  version: '1.0.0',
  description: 'AI-Assisted format adapters for ZTF',
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
