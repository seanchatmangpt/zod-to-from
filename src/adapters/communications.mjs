/**
 * @typedef {import('../core/index.mjs').Adapter} Adapter
 */

import { createPackManifest, registerPack } from '../core/index.mjs';

/**
 * cURL adapter placeholder
 * Note: Would require parse-curl library
 */
const curlAdapter = {
  async parse(input, opts = {}) {
    throw new Error('cURL support requires additional dependencies (parse-curl)');
  },

  async format(data, opts = {}) {
    throw new Error('cURL support requires additional dependencies (parse-curl)');
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * EML adapter placeholder
 * Note: Would require postal-mime library
 */
const emlAdapter = {
  async parse(input, opts = {}) {
    throw new Error('EML support requires additional dependencies (postal-mime)');
  },

  async format(data, opts = {}) {
    throw new Error('EML support requires additional dependencies (postal-mime)');
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * ICS adapter placeholder
 * Note: Would require ical.js library
 */
const icsAdapter = {
  async parse(input, opts = {}) {
    throw new Error('ICS support requires additional dependencies (ical.js)');
  },

  async format(data, opts = {}) {
    throw new Error('ICS support requires additional dependencies (ical.js)');
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * MessagePack adapter placeholder
 * Note: Would require @msgpack/msgpack library
 */
const msgpackAdapter = {
  async parse(input, opts = {}) {
    throw new Error('MessagePack support requires additional dependencies (@msgpack/msgpack)');
  },

  async format(data, opts = {}) {
    throw new Error('MessagePack support requires additional dependencies (@msgpack/msgpack)');
  },

  supportsStreaming: true,
  isAI: false,
  version: '1.0.0',
};

/**
 * vCard adapter placeholder
 * Note: Would require vcard4 library
 */
const vcardAdapter = {
  async parse(input, opts = {}) {
    throw new Error('vCard support requires additional dependencies (vcard4)');
  },

  async format(data, opts = {}) {
    throw new Error('vCard support requires additional dependencies (vcard4)');
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

// Create pack manifest
const packManifest = createPackManifest(
  'ztf-pack-communications',
  ['curl', 'eml', 'ics', 'msgpack', 'vcard'],
  {
    version: '1.0.0',
    description: 'Communications format adapters for ZTF',
    dependencies: [],
  }
);

// Register all adapters
const adapters = {
  curl: curlAdapter,
  eml: emlAdapter,
  ics: icsAdapter,
  msgpack: msgpackAdapter,
  vcard: vcardAdapter,
};

registerPack(packManifest, adapters);

export {
  curlAdapter,
  emlAdapter,
  icsAdapter,
  msgpackAdapter,
  vcardAdapter,
};
