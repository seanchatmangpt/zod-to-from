/**
 * @typedef {Object} Adapter
 * @property {Function} parse - Parse function
 * @property {Function} format - Format function
 * @property {boolean} supportsStreaming - Whether streaming is supported
 * @property {boolean} isAI - Whether this is an AI adapter
 * @property {string} version - Adapter version
 */

import { createPackManifest, registerPack } from '../core/index.mjs';

/**
 * Nunjucks adapter for parsing and formatting Nunjucks templates
 */
const nunjucksAdapter = {
  async parse(input, opts = {}) {
    try {
      const nunjucks = await import('nunjucks');

      // For parsing, we extract template variables and structure
      // This is a simplified approach - in practice, you'd need a more sophisticated parser
      const template = input;

      // Extract variables from template using regex
      const variableMatches = template.match(/\{\{\s*([^}]+)\s*\}\}/g) || [];
      const variables = variableMatches.map(match => {
        const content = match.replace(/\{\{\s*|\s*\}\}/g, '');
        return {
          fullMatch: match,
          content: content.trim(),
          type: content.includes('|') ? 'filter' : 'variable',
        };
      });

      // Extract block structures
      const blockMatches = template.match(/\{%\s*([^%]+)\s*%\}/g) || [];
      const blocks = blockMatches.map(match => {
        const content = match.replace(/\{%\s*|\s*%\}/g, '');
        return {
          fullMatch: match,
          content: content.trim(),
          type: content.startsWith('end') ? 'end' : 'start',
        };
      });

      const data = {
        template,
        variables,
        blocks,
        metadata: {
          variableCount: variables.length,
          blockCount: blocks.length,
          hasFilters: variables.some(v => v.type === 'filter'),
        },
      };

      return {
        data,
        metadata: {
          format: 'nunjucks',
          templateLength: template.length,
          variableCount: variables.length,
          blockCount: blocks.length,
          ...opts,
        },
      };
    } catch (error) {
      if (error.message.includes('Cannot resolve module')) {
        throw new Error('Nunjucks support requires additional dependencies (nunjucks)');
      }
      throw new Error(`Nunjucks parsing failed: ${error.message}`);
    }
  },

  async format(data, opts = {}) {
    try {
      const nunjucks = await import('nunjucks');

      const { template, context = {} } = data;
      const { autoescape = true, throwOnUndefined = false } = opts;

      // Configure Nunjucks environment
      const env = nunjucks.configure({
        autoescape,
        throwOnUndefined,
        noCache: true, // Disable caching for dynamic content
      });

      // Render the template with the provided context
      const rendered = env.renderString(template, context);

      return {
        data: rendered,
        metadata: {
          format: 'nunjucks',
          outputSize: rendered.length,
          contextKeys: Object.keys(context),
          templateLength: template.length,
          ...opts,
        },
      };
    } catch (error) {
      if (error.message.includes('Cannot resolve module')) {
        throw new Error('Nunjucks support requires additional dependencies (nunjucks)');
      }
      throw new Error(`Nunjucks formatting failed: ${error.message}`);
    }
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
          frontmatterKeys: [],
          contentLength: input.length,
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
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // Try to parse as number, boolean, or array
      if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      } else if (/^\d+(\.\d+)?$/.test(value)) {
        // Only parse as number if it's purely numeric
        value = Number.parseFloat(value);
      } else if (value.startsWith('[') && value.endsWith(']')) {
        // Keep array-like values as strings for frontmatter compatibility
        // This matches the expected behavior in the tests
        value = value;
      }

      frontmatter[key] = value;
    }

    return {
      data: {
        frontmatter,
        content: contentLines.join('\n').trim(),
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
      output +=
        typeof value === 'string' && (value.includes(' ') || value.includes(':'))
          ? `${key}: "${value}"\n`
          : `${key}: ${value}\n`;
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
const packManifest = createPackManifest('ztf-pack-templating', ['nunjucks', 'frontmatter'], {
  version: '1.0.0',
  description: 'Templating format adapters for ZTF',
  dependencies: ['nunjucks'],
});

// Register all adapters
const adapters = {
  nunjucks: nunjucksAdapter,
  frontmatter: frontmatterAdapter,
};

registerPack(packManifest, adapters);

export { frontmatterAdapter, nunjucksAdapter };
