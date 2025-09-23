/**
 * @typedef {import('../core/index.mjs').Adapter} Adapter
 */

import { createPackManifest, registerPack } from '../core/index.mjs';

/**
 * DOCX AI adapter placeholder
 * Note: Would require mammoth library
 */
const docxAiAdapter = {
  async parse(input, opts = {}) {
    throw new Error('DOCX AI support requires additional dependencies (mammoth)');
  },

  async format(data, opts = {}) {
    throw new Error('DOCX AI support requires additional dependencies (mammoth)');
  },

  supportsStreaming: false,
  isAI: true,
  version: '1.0.0',
};

/**
 * PPTX AI adapter placeholder
 * Note: Would require jszip library
 */
const pptxAiAdapter = {
  async parse(input, opts = {}) {
    throw new Error('PPTX AI support requires additional dependencies (jszip)');
  },

  async format(data, opts = {}) {
    throw new Error('PPTX AI support requires additional dependencies (jszip)');
  },

  supportsStreaming: false,
  isAI: true,
  version: '1.0.0',
};

/**
 * XLSX AI adapter placeholder
 * Note: Would require exceljs library
 */
const xlsxAiAdapter = {
  async parse(input, opts = {}) {
    throw new Error('XLSX AI support requires additional dependencies (exceljs)');
  },

  async format(data, opts = {}) {
    throw new Error('XLSX AI support requires additional dependencies (exceljs)');
  },

  supportsStreaming: false,
  isAI: true,
  version: '1.0.0',
};

// Create pack manifest
const packManifest = createPackManifest(
  'ztf-pack-ai',
  ['docx-ai', 'pptx-ai', 'xlsx-ai'],
  {
    version: '1.0.0',
    description: 'AI-Assisted format adapters for ZTF',
    dependencies: [],
  }
);

// Register all adapters
const adapters = {
  'docx-ai': docxAiAdapter,
  'pptx-ai': pptxAiAdapter,
  'xlsx-ai': xlsxAiAdapter,
};

registerPack(packManifest, adapters);

export {
  docxAiAdapter,
  pptxAiAdapter,
  xlsxAiAdapter,
};
