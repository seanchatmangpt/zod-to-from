/**
 * @typedef {import('../core/index.mjs').Adapter} Adapter
 */

import { createPackManifest, registerPack } from '../core/index.mjs';

/**
 * HTML adapter for parsing and formatting HTML content
 */
const htmlAdapter = {
  async parse(input, opts = {}) {
    // For HTML parsing, we'll use a simple approach
    // In a real implementation, you might want to use jsdom or cheerio
    const parser = new DOMParser();
    const doc = parser.parseFromString(input, 'text/html');
    
    // Extract structured data from HTML
    const data = {
      title: doc.title || '',
      meta: {},
      links: [],
      images: [],
      text: doc.body?.textContent || '',
    };

    // Extract meta tags
    const metaTags = doc.querySelectorAll('meta');
    for (const meta of metaTags) {
      const name = meta.getAttribute('name') || meta.getAttribute('property');
      const content = meta.getAttribute('content');
      if (name && content) {
        data.meta[name] = content;
      }
    }

    // Extract links
    const linkTags = doc.querySelectorAll('a[href]');
    for (const link of linkTags) {
      data.links.push({
        href: link.getAttribute('href'),
        text: link.textContent?.trim() || '',
      });
    }

    // Extract images
    const imgTags = doc.querySelectorAll('img[src]');
    for (const img of imgTags) {
      data.images.push({
        src: img.getAttribute('src'),
        alt: img.getAttribute('alt') || '',
      });
    }

    return {
      data,
      metadata: {
        format: 'html',
        linkCount: data.links.length,
        imageCount: data.images.length,
        ...opts,
      },
    };
  },

  async format(data, opts = {}) {
    // Simple HTML formatting - in production you'd want a proper templating engine
    const { title = '', meta = {}, links = [], images = [], text = '' } = data;
    
    let html = '<!DOCTYPE html>\n<html>\n<head>\n';
    
    if (title) {
      html += `  <title>${escapeHtml(title)}</title>\n`;
    }
    
    for (const [name, content] of Object.entries(meta)) {
      html += `  <meta name="${escapeHtml(name)}" content="${escapeHtml(content)}">\n`;
    }
    
    html += '</head>\n<body>\n';
    
    if (text) {
      html += `  <p>${escapeHtml(text)}</p>\n`;
    }
    
    for (const link of links) {
      html += `  <a href="${escapeHtml(link.href)}">${escapeHtml(link.text)}</a><br>\n`;
    }
    
    for (const img of images) {
      html += `  <img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.alt)}"><br>\n`;
    }
    
    html += '</body>\n</html>';
    
    return {
      data: html,
      metadata: {
        format: 'html',
        outputSize: html.length,
        ...opts,
      },
    };
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * Markdown adapter for parsing and formatting Markdown content
 */
const mdAdapter = {
  async parse(input, opts = {}) {
    // Simple markdown parsing - in production you'd want marked or remark
    const lines = input.split('\n');
    const data = {
      title: '',
      headings: [],
      paragraphs: [],
      links: [],
      codeBlocks: [],
    };

    let currentParagraph = '';
    let inCodeBlock = false;
    let currentCodeBlock = '';

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('```')) {
        if (inCodeBlock) {
          data.codeBlocks.push(currentCodeBlock);
          currentCodeBlock = '';
          inCodeBlock = false;
        } else {
          if (currentParagraph) {
            data.paragraphs.push(currentParagraph);
            currentParagraph = '';
          }
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        currentCodeBlock += line + '\n';
        continue;
      }

      if (trimmed.startsWith('#')) {
        if (currentParagraph) {
          data.paragraphs.push(currentParagraph);
          currentParagraph = '';
        }
        const level = trimmed.match(/^#+/)[0].length;
        const text = trimmed.replace(/^#+\s*/, '');
        data.headings.push({ level, text });
        
        if (level === 1 && !data.title) {
          data.title = text;
        }
        continue;
      }

      if (trimmed.startsWith('[') && trimmed.includes('](')) {
        const match = trimmed.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (match) {
          data.links.push({ text: match[1], url: match[2] });
        }
        continue;
      }

      if (trimmed) {
        currentParagraph += (currentParagraph ? ' ' : '') + trimmed;
      } else if (currentParagraph) {
        data.paragraphs.push(currentParagraph);
        currentParagraph = '';
      }
    }

    if (currentParagraph) {
      data.paragraphs.push(currentParagraph);
    }

    return {
      data,
      metadata: {
        format: 'md',
        headingCount: data.headings.length,
        paragraphCount: data.paragraphs.length,
        linkCount: data.links.length,
        codeBlockCount: data.codeBlocks.length,
        ...opts,
      },
    };
  },

  async format(data, opts = {}) {
    const { title = '', headings = [], paragraphs = [], links = [], codeBlocks = [] } = data;
    
    let md = '';
    
    if (title) {
      md += `# ${title}\n\n`;
    }
    
    for (const heading of headings) {
      md += `${'#'.repeat(heading.level)} ${heading.text}\n\n`;
    }
    
    for (const paragraph of paragraphs) {
      md += `${paragraph}\n\n`;
    }
    
    for (const link of links) {
      md += `[${link.text}](${link.url})\n\n`;
    }
    
    for (const codeBlock of codeBlocks) {
      md += '```\n' + codeBlock + '```\n\n';
    }
    
    return {
      data: md.trim(),
      metadata: {
        format: 'md',
        outputSize: md.length,
        ...opts,
      },
    };
  },

  supportsStreaming: true,
  isAI: false,
  version: '1.0.0',
};

/**
 * CSV adapter (already implemented in data.mjs, but re-exported here for completeness)
 */
const csvAdapter = {
  async parse(input, opts = {}) {
    const { parse } = await import('csv-parse/sync');
    const options = {
      columns: true,
      skip_empty_lines: true,
      ...opts,
    };

    const records = parse(input, options);

    return {
      data: records,
      metadata: {
        format: 'csv',
        recordCount: records.length,
        columnCount: records.length > 0 ? Object.keys(records[0]).length : 0,
        ...opts,
      },
    };
  },

  async format(data, opts = {}) {
    const { stringify } = await import('csv-stringify');
    const { promisify } = await import('node:util');
    
    const options = {
      header: true,
      ...opts,
    };

    const stringifyAsync = promisify(stringify);
    const csv = await stringifyAsync(data, options);

    return {
      data: csv,
      metadata: {
        format: 'csv',
        outputSize: csv.length,
        recordCount: Array.isArray(data) ? data.length : 1,
        ...opts,
      },
    };
  },

  supportsStreaming: true,
  isAI: false,
  version: '1.0.0',
};

/**
 * DOCX Table adapter placeholder
 * Note: Would require docxtemplater library
 */
const docxTableAdapter = {
  async parse(input, opts = {}) {
    throw new Error('DOCX Table support requires additional dependencies (docxtemplater)');
  },

  async format(data, opts = {}) {
    throw new Error('DOCX Table support requires additional dependencies (docxtemplater)');
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * PDF Table adapter placeholder
 * Note: Would require pdf-lib or puppeteer library
 */
const pdfTableAdapter = {
  async parse(input, opts = {}) {
    throw new Error('PDF Table support requires additional dependencies (pdf-lib or puppeteer)');
  },

  async format(data, opts = {}) {
    throw new Error('PDF Table support requires additional dependencies (pdf-lib or puppeteer)');
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * PPTX Slides adapter placeholder
 * Note: Would require pptxgenjs library
 */
const pptxSlidesAdapter = {
  async parse(input, opts = {}) {
    throw new Error('PPTX Slides support requires additional dependencies (pptxgenjs)');
  },

  async format(data, opts = {}) {
    throw new Error('PPTX Slides support requires additional dependencies (pptxgenjs)');
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * XLSX adapter placeholder
 * Note: Would require exceljs library
 */
const xlsxAdapter = {
  async parse(input, opts = {}) {
    throw new Error('XLSX support requires additional dependencies (exceljs)');
  },

  async format(data, opts = {}) {
    throw new Error('XLSX support requires additional dependencies (exceljs)');
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * Helper function to escape HTML characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML text
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Create pack manifest
const packManifest = createPackManifest(
  'ztf-pack-office',
  ['csv', 'docx-table', 'html', 'md', 'pdf-table', 'pptx-slides', 'xlsx'],
  {
    version: '1.0.0',
    description: 'Office & Exec Outputs format adapters for ZTF',
    dependencies: ['csv-parse', 'csv-stringify'],
  }
);

// Register all adapters
const adapters = {
  csv: csvAdapter,
  'docx-table': docxTableAdapter,
  html: htmlAdapter,
  md: mdAdapter,
  'pdf-table': pdfTableAdapter,
  'pptx-slides': pptxSlidesAdapter,
  xlsx: xlsxAdapter,
};

registerPack(packManifest, adapters);

export {
  csvAdapter,
  docxTableAdapter,
  htmlAdapter,
  mdAdapter,
  pdfTableAdapter,
  pptxSlidesAdapter,
  xlsxAdapter,
};
