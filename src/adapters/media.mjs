/**
 * @typedef {import('../core/index.mjs').Adapter} Adapter
 */

import { createPackManifest, registerPack } from '../core/index.mjs';

/**
 * EXIF adapter placeholder
 * Note: Would require exifr library
 */
const exifAdapter = {
  async parse(input, opts = {}) {
    throw new Error('EXIF support requires additional dependencies (exifr)');
  },

  async format(data, opts = {}) {
    throw new Error('EXIF support requires additional dependencies (exifr)');
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * ID3 adapter placeholder
 * Note: Would require node-id3 library
 */
const id3Adapter = {
  async parse(input, opts = {}) {
    throw new Error('ID3 support requires additional dependencies (node-id3)');
  },

  async format(data, opts = {}) {
    throw new Error('ID3 support requires additional dependencies (node-id3)');
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * PDF Text adapter placeholder
 * Note: Would require pdf-parse library
 */
const pdfTextAdapter = {
  async parse(input, opts = {}) {
    throw new Error('PDF Text support requires additional dependencies (pdf-parse)');
  },

  async format(data, opts = {}) {
    throw new Error('PDF Text support requires additional dependencies (pdf-parse)');
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * TAR adapter placeholder
 * Note: Would require tar-stream library
 */
const tarAdapter = {
  async parse(input, opts = {}) {
    throw new Error('TAR support requires additional dependencies (tar-stream)');
  },

  async format(data, opts = {}) {
    throw new Error('TAR support requires additional dependencies (tar-stream)');
  },

  supportsStreaming: true,
  isAI: false,
  version: '1.0.0',
};

/**
 * ZIP adapter placeholder
 * Note: Would require jszip library
 */
const zipAdapter = {
  async parse(input, opts = {}) {
    throw new Error('ZIP support requires additional dependencies (jszip)');
  },

  async format(data, opts = {}) {
    throw new Error('ZIP support requires additional dependencies (jszip)');
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

// Create pack manifest
const packManifest = createPackManifest(
  'ztf-pack-media',
  ['exif', 'id3', 'pdf-text', 'tar', 'zip'],
  {
    version: '1.0.0',
    description: 'Media & Meta format adapters for ZTF',
    dependencies: [],
  }
);

// Register all adapters
const adapters = {
  exif: exifAdapter,
  id3: id3Adapter,
  'pdf-text': pdfTextAdapter,
  tar: tarAdapter,
  zip: zipAdapter,
};

registerPack(packManifest, adapters);

export {
  exifAdapter,
  id3Adapter,
  pdfTextAdapter,
  tarAdapter,
  zipAdapter,
};
