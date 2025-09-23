/**
 * @typedef {import('../core/index.mjs').Adapter} Adapter
 */

import { createPackManifest, registerPack } from '../core/index.mjs';

/**
 * Nunjucks adapter placeholder
 * Note: Would require nunjucks library
 */
const nunjucksAdapter = {
  async parse(input, opts = {}) {
    throw new Error('Nunjucks support requires additional dependencies (nunjucks)');
  },

  async format(data, opts = {}) {
    throw new Error('Nunjucks support requires additional dependencies (nunjucks)');
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * Frontmatter adapter for parsing and formatting frontmatter content
 */
const frontmatterAdapter = {
  async parse(input, opts = {}) {
    const { delimiter = '---' } = opts;
    
    // Simple frontmatter parser
    const lines = input.split('\n');
    
    if (lines.length < 2 || lines[0].trim() !== delimiter) {
      // No frontmatter found
      return {
        data: {
          frontmatter: {},
          content: input,
        },
        metadata: {
          format: 'frontmatter',
          hasFrontmatter: false,
          ...opts,
        },
      };
    }
    
    let frontmatterEndIndex = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === delimiter) {
        frontmatterEndIndex = i;
        break;
      }
    }
    
    if (frontmatterEndIndex === -1) {
      throw new Error('Frontmatter delimiter not closed');
    }
    
    const frontmatterLines = lines.slice(1, frontmatterEndIndex);
    const contentLines = lines.slice(frontmatterEndIndex + 1);
    
    // Parse frontmatter as YAML-like key-value pairs
    const frontmatter = {};
    for (const line of frontmatterLines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;
      
      const key = trimmed.slice(0, Math.max(0, colonIndex)).trim();
      let value = trimmed.slice(Math.max(0, colonIndex + 1)).trim();
      
      // Remove surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      // Try to parse as number or boolean
      if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      } else if (!Number.isNaN(value) && !Number.isNaN(Number.parseFloat(value))) {
        value = Number.parseFloat(value);
      }
      
      frontmatter[key] = value;
    }
    
    return {
      data: {
        frontmatter,
        content: contentLines.join('\n'),
      },
      metadata: {
        format: 'frontmatter',
        hasFrontmatter: true,
        frontmatterKeys: Object.keys(frontmatter),
        contentLength: contentLines.join('\n').length,
        ...opts,
      },
    };
  },

  async format(data, opts = {}) {
    const { frontmatter = {}, content = '' } = data;
    const { delimiter = '---' } = opts;
    
    let output = delimiter + '\n';
    
    // Format frontmatter
    for (const [key, value] of Object.entries(frontmatter)) {
      output += typeof value === 'string' && (value.includes(' ') || value.includes(':')) ? `${key}: "${value}"\n` : `${key}: ${value}\n`;
    }
    
    output += delimiter + '\n';
    
    if (content) {
      output += content;
    }
    
    return {
      data: output,
      metadata: {
        format: 'frontmatter',
        outputSize: output.length,
        frontmatterKeys: Object.keys(frontmatter),
        contentLength: content.length,
        ...opts,
      },
    };
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

// Create pack manifest
const packManifest = createPackManifest(
  'ztf-pack-templating',
  ['nunjucks', 'frontmatter'],
  {
    version: '1.0.0',
    description: 'Templating format adapters for ZTF',
    dependencies: [],
  }
);

// Register all adapters
const adapters = {
  nunjucks: nunjucksAdapter,
  frontmatter: frontmatterAdapter,
};

registerPack(packManifest, adapters);

export {
  nunjucksAdapter,
  frontmatterAdapter,
};
