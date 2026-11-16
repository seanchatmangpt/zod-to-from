/**
 * @typedef {Object} Adapter
 * @property {Function} parse - Parse function
 * @property {Function} format - Format function
 * @property {boolean} supportsStreaming - Whether streaming is supported
 * @property {boolean} isAI - Whether this is an AI adapter
 * @property {string} version - Adapter version
 */

import { createPackManifest, registerPack } from '../core/index.mjs';
import { csvAdapter as dataCsvAdapter } from './data.mjs';

/**
 * CSV adapter wrapper for office pack compatibility
 */
const csvAdapter = {
  async parse(input, opts = {}) {
    const result = await dataCsvAdapter.parse(input, opts);
    // Wrap the array result in an items property for office pack compatibility
    return {
      data: { items: result.data },
      metadata: result.metadata,
    };
  },

  async format(data, opts = {}) {
    // Extract items array if it's wrapped, otherwise use data directly
    const items = Array.isArray(data) ? data : data.items || data;

    // Convert boolean values to string representations for office compatibility
    const convertedItems = items.map(record => {
      const converted = {};
      for (const [key, value] of Object.entries(record)) {
        if (typeof value === 'boolean') {
          converted[key] = value ? 'true' : 'false';
        } else {
          converted[key] = value;
        }
      }
      return converted;
    });

    return await dataCsvAdapter.format(convertedItems, opts);
  },

  supportsStreaming: true,
  isAI: false,
  version: '1.0.0',
};

/**
 * HTML adapter for parsing and formatting HTML content
 * Uses Cheerio for robust DOM parsing and traversal
 */
const htmlAdapter = {
  async parse(input, opts = {}) {
    try {
      const cheerio = await import('cheerio');
      const $ = cheerio.load(input);

      // Extract structured data using proper DOM traversal
      const data = {
        title: $('title').text() || $('h1').first().text() || '',
        meta: {},
        headings: [],
        links: [],
        images: [],
        text: $('body').text().trim() || $.text().trim(),
      };

      // Extract meta tags with proper attribute handling
      $('meta').each((_, el) => {
        const $el = $(el);
        const name = $el.attr('name') || $el.attr('property');
        const content = $el.attr('content');
        if (name && content) {
          data.meta[name] = content;
        }
      });

      // Extract headings with hierarchy
      $('h1, h2, h3, h4, h5, h6').each((_, el) => {
        const $el = $(el);
        data.headings.push({
          level: Number.parseInt(el.name[1], 10),
          text: $el.text().trim(),
          id: $el.attr('id') || '',
        });
      });

      // Extract links with proper text extraction
      $('a').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        if (href) {
          data.links.push({
            href: href,
            text: $el.text().trim(),
            title: $el.attr('title') || '',
            rel: $el.attr('rel') || '',
          });
        }
      });

      // Extract images with all relevant attributes
      $('img').each((_, el) => {
        const $el = $(el);
        const src = $el.attr('src');
        if (src) {
          data.images.push({
            src: src,
            alt: $el.attr('alt') || '',
            title: $el.attr('title') || '',
            width: $el.attr('width') || '',
            height: $el.attr('height') || '',
          });
        }
      });

      return {
        data,
        metadata: {
          format: 'html',
          headingCount: data.headings.length,
          linkCount: data.links.length,
          imageCount: data.images.length,
          metaCount: Object.keys(data.meta).length,
          ...opts,
        },
      };
    } catch (error) {
      if (error.message.includes('Cannot find module') || error.message.includes('Cannot resolve module')) {
        throw new Error('HTML parsing requires the cheerio library (npm install cheerio)');
      }
      throw new Error(`HTML parsing failed: ${error.message}`);
    }
  },

  async format(data, opts = {}) {
    const {
      title = '',
      meta = {},
      headings = [],
      links = [],
      images = [],
      text = ''
    } = data;

    let html = '<!DOCTYPE html>\n<html>\n<head>\n';

    if (title) {
      html += `  <title>${escapeHtml(title)}</title>\n`;
    }

    for (const [name, content] of Object.entries(meta)) {
      html += `  <meta name="${escapeHtml(name)}" content="${escapeHtml(content)}">\n`;
    }

    html += '</head>\n<body>\n';

    // Add headings
    for (const heading of headings) {
      const id = heading.id ? ` id="${escapeHtml(heading.id)}"` : '';
      html += `  <h${heading.level}${id}>${escapeHtml(heading.text)}</h${heading.level}>\n`;
    }

    if (text) {
      html += `  <p>${escapeHtml(text)}</p>\n`;
    }

    for (const link of links) {
      const title = link.title ? ` title="${escapeHtml(link.title)}"` : '';
      const rel = link.rel ? ` rel="${escapeHtml(link.rel)}"` : '';
      html += `  <a href="${escapeHtml(link.href)}"${title}${rel}>${escapeHtml(link.text)}</a><br>\n`;
    }

    for (const img of images) {
      const title = img.title ? ` title="${escapeHtml(img.title)}"` : '';
      const width = img.width ? ` width="${escapeHtml(img.width)}"` : '';
      const height = img.height ? ` height="${escapeHtml(img.height)}"` : '';
      html += `  <img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.alt)}"${title}${width}${height}><br>\n`;
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
  version: '2.0.0',
};

/**
 * Markdown adapter for parsing and formatting Markdown content
 * Uses marked library for robust parsing and structure extraction
 */
const mdAdapter = {
  async parse(input, opts = {}) {
    try {
      const { marked } = await import('marked');

      // Parse markdown into tokens
      const tokens = marked.lexer(input);

      // Extract structured data from tokens
      const data = {
        title: '',
        headings: [],
        paragraphs: [],
        links: [],
        images: [],
        codeBlocks: [],
        lists: [],
        blockquotes: [],
        tables: [],
      };

      // Helper function to recursively extract links and images from tokens
      const extractInlineElements = (token) => {
        if (token.tokens) {
          for (const subToken of token.tokens) {
            if (subToken.type === 'link') {
              data.links.push({
                text: subToken.text,
                url: subToken.href,
                title: subToken.title || ''
              });
            } else if (subToken.type === 'image') {
              data.images.push({
                text: subToken.text,
                url: subToken.href,
                alt: subToken.text || '',
                title: subToken.title || ''
              });
            }
            extractInlineElements(subToken);
          }
        }
      };

      // Process tokens
      for (const token of tokens) {
        extractInlineElements(token);

        switch (token.type) {
          case 'heading': {
            data.headings.push({
              level: token.depth,
              text: token.text,
              raw: token.raw
            });
            // Use first h1 as title if not set
            if (token.depth === 1 && !data.title) {
              data.title = token.text;
            }
            break;
          }

          case 'paragraph': {
            data.paragraphs.push({
              text: token.text,
              raw: token.raw
            });
            break;
          }

          case 'code': {
            data.codeBlocks.push({
              lang: token.lang || '',
              code: token.text,
              raw: token.raw
            });
            break;
          }

          case 'list': {
            data.lists.push({
              ordered: token.ordered,
              start: token.start || 1,
              items: token.items.map(item => ({
                text: item.text,
                task: item.task,
                checked: item.checked,
                raw: item.raw
              }))
            });
            break;
          }

          case 'blockquote': {
            data.blockquotes.push({
              text: token.text,
              raw: token.raw
            });
            break;
          }

          case 'table': {
            data.tables.push({
              header: token.header.map(cell => ({
                text: cell.text,
                align: cell.align || 'left'
              })),
              rows: token.rows.map(row =>
                row.map(cell => ({
                  text: cell.text,
                  align: cell.align || 'left'
                }))
              ),
              align: token.align,
              raw: token.raw
            });
            break;
          }
        }
      }

      return {
        data,
        metadata: {
          format: 'md',
          headingCount: data.headings.length,
          paragraphCount: data.paragraphs.length,
          linkCount: data.links.length,
          imageCount: data.images.length,
          codeBlockCount: data.codeBlocks.length,
          listCount: data.lists.length,
          blockquoteCount: data.blockquotes.length,
          tableCount: data.tables.length,
          ...opts,
        },
      };
    } catch (error) {
      if (error.message.includes('Cannot find module') || error.message.includes('Cannot resolve module')) {
        throw new Error('Markdown parsing requires the marked library (npm install marked)');
      }
      throw new Error(`Markdown parsing failed: ${error.message}`);
    }
  },

  async format(data, opts = {}) {
    const {
      title = '',
      headings = [],
      paragraphs = [],
      links = [],
      images = [],
      codeBlocks = [],
      lists = [],
      blockquotes = [],
      tables = []
    } = data;

    let md = '';

    // Add title as h1 if present
    if (title) {
      md += `# ${title}\n\n`;
    }

    // Add headings
    for (const heading of headings) {
      md += `${'#'.repeat(heading.level)} ${heading.text}\n\n`;
    }

    // Add paragraphs
    for (const paragraph of paragraphs) {
      const text = typeof paragraph === 'string' ? paragraph : paragraph.text;
      md += `${text}\n\n`;
    }

    // Add lists
    for (const list of lists) {
      for (let i = 0; i < list.items.length; i++) {
        const item = list.items[i];
        const text = typeof item === 'string' ? item : item.text;
        const prefix = list.ordered ? `${(list.start || 1) + i}. ` : '- ';
        const checkbox = item.task ? (item.checked ? '[x] ' : '[ ] ') : '';
        md += `${prefix}${checkbox}${text}\n`;
      }
      md += '\n';
    }

    // Add blockquotes
    for (const quote of blockquotes) {
      const text = typeof quote === 'string' ? quote : quote.text;
      md += `> ${text}\n\n`;
    }

    // Add tables
    for (const table of tables) {
      // Header row
      md += '| ' + table.header.map(cell => {
        const text = typeof cell === 'string' ? cell : cell.text;
        return text;
      }).join(' | ') + ' |\n';

      // Separator row
      md += '| ' + table.header.map((cell, i) => {
        const align = (typeof cell === 'string' ? 'left' : cell.align) || table.align?.[i] || 'left';
        switch (align) {
          case 'center': { return ':---:'; }
          case 'right': { return '---:'; }
          default: { return '---'; }
        }
      }).join(' | ') + ' |\n';

      // Data rows
      for (const row of table.rows) {
        md += '| ' + row.map(cell => {
          const text = typeof cell === 'string' ? cell : cell.text;
          return text;
        }).join(' | ') + ' |\n';
      }
      md += '\n';
    }

    // Add code blocks
    for (const codeBlock of codeBlocks) {
      const lang = typeof codeBlock === 'string' ? '' : codeBlock.lang || '';
      const code = typeof codeBlock === 'string' ? codeBlock : codeBlock.code;
      md += '```' + lang + '\n' + code + '\n```\n\n';
    }

    // Add standalone links
    for (const link of links) {
      md += `[${link.text}](${link.url}${link.title ? ` "${link.title}"` : ''})\n\n`;
    }

    // Add standalone images
    for (const image of images) {
      md += `![${image.alt || image.text}](${image.url}${image.title ? ` "${image.title}"` : ''})\n\n`;
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
  version: '2.0.0',
};

/**
 * DOCX Table adapter for parsing and formatting DOCX documents with tables
 */
const docxTableAdapter = {
  async parse(input, opts = {}) {
    try {
      const Docxtemplater = (await import('docxtemplater')).default;
      // @ts-ignore - pizzip module exists at runtime
      const PizZip = (await import('pizzip')).default;

      // If input is a buffer, use it directly; otherwise assume it's a file path
      let zip;
      if (Buffer.isBuffer(input)) {
        zip = new PizZip(input);
      } else {
        // For file paths, we'd need fs - this is a simplified version
        throw new TypeError(
          'DOCX parsing from file paths requires fs module - use buffer input instead'
        );
      }

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // Extract text content and basic structure
      const text = doc.getFullText();

      // Simple table extraction using regex patterns
      const tableMatches = text.match(/\|.*\|/g) || [];
      const tables = tableMatches.map(match => {
        const rows = match.split('\n').filter(row => row.trim());
        return rows.map(row =>
          row
            .split('|')
            .map(cell => cell.trim())
            .filter(Boolean)
        );
      });

      // Extract basic document structure
      const data = {
        text,
        tables,
        metadata: {
          tableCount: tables.length,
          totalRows: tables.reduce((sum, table) => sum + table.length, 0),
        },
      };

      return {
        data,
        metadata: {
          format: 'docx',
          tableCount: tables.length,
          textLength: text.length,
          ...opts,
        },
      };
    } catch (error) {
      if (error.message.includes('Cannot resolve module')) {
        throw new Error(
          'DOCX Table support requires additional dependencies (docxtemplater, pizzip)'
        );
      }
      throw new Error(`DOCX parsing failed: ${error.message}`);
    }
  },

  async format(data, opts = {}) {
    try {
      const Docxtemplater = (await import('docxtemplater')).default;
      // @ts-ignore - pizzip module exists at runtime
      const PizZip = (await import('pizzip')).default;

      // Create a simple DOCX template with tables
      const { text = '', tables = [] } = data;

      // Create a basic DOCX structure
      const template = `
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body>
            <w:p>
              <w:r>
                <w:t>${escapeXml(text)}</w:t>
              </w:r>
            </w:p>
            ${tables
              .map(
                table => `
              <w:tbl>
                ${table
                  .map(
                    row => `
                  <w:tr>
                    ${row
                      .map(
                        cell => `
                      <w:tc>
                        <w:p>
                          <w:r>
                            <w:t>${escapeXml(cell)}</w:t>
                          </w:r>
                        </w:p>
                      </w:tc>
                    `
                      )
                      .join('')}
                  </w:tr>
                `
                  )
                  .join('')}
              </w:tbl>
            `
              )
              .join('')}
          </w:body>
        </w:document>
      `;

      const zip = new PizZip();
      zip.file('word/document.xml', template);
      zip.file(
        '[Content_Types].xml',
        '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>'
      );

      const docxBuffer = zip.generate({ type: 'nodebuffer' });

      return {
        data: docxBuffer,
        metadata: {
          format: 'docx',
          outputSize: docxBuffer.length,
          tableCount: tables.length,
          ...opts,
        },
      };
    } catch (error) {
      if (error.message.includes('Cannot resolve module')) {
        throw new Error(
          'DOCX Table support requires additional dependencies (docxtemplater, pizzip)'
        );
      }
      throw new Error(`DOCX formatting failed: ${error.message}`);
    }
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * PDF Table adapter for parsing and formatting PDF documents with tables
 */
const pdfTableAdapter = {
  async parse(input, opts = {}) {
    try {
      const { PDFDocument } = await import('pdf-lib');

      // If input is a buffer, use it directly; otherwise assume it's a file path
      let pdfBytes;
      if (Buffer.isBuffer(input)) {
        pdfBytes = input;
      } else {
        // For file paths, we'd need fs - this is a simplified version
        throw new TypeError(
          'PDF parsing from file paths requires fs module - use buffer input instead'
        );
      }

      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      // Extract basic document information
      const data = {
        pageCount: pages.length,
        pages: pages.map((page, index) => ({
          pageNumber: index + 1,
          width: page.getWidth(),
          height: page.getHeight(),
          // Note: Text extraction would require additional libraries like pdf-parse
          // This is a simplified version that extracts basic page info
        })),
        metadata: {
          title: pdfDoc.getTitle() || '',
          author: pdfDoc.getAuthor() || '',
          subject: pdfDoc.getSubject() || '',
          creator: pdfDoc.getCreator() || '',
          producer: pdfDoc.getProducer() || '',
          creationDate: pdfDoc.getCreationDate() || undefined,
          modificationDate: pdfDoc.getModificationDate() || undefined,
        },
      };

      return {
        data,
        metadata: {
          format: 'pdf',
          pageCount: pages.length,
          fileSize: pdfBytes.length,
          ...opts,
        },
      };
    } catch (error) {
      if (error.message.includes('Cannot resolve module')) {
        throw new Error('PDF Table support requires additional dependencies (pdf-lib)');
      }
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  },

  async format(data, opts = {}) {
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

      const { tables = [], text = '', title = 'Generated PDF' } = data;

      const pdfDoc = await PDFDocument.create();

      // Set document metadata
      pdfDoc.setTitle(title);
      pdfDoc.setAuthor('ZTF Office Adapter');
      pdfDoc.setCreator('ZTF Office Adapter');

      // Add a page
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();

      // Add title
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      page.drawText(title, {
        x: 50,
        y: height - 50,
        size: 16,
        font,
        color: rgb(0, 0, 0),
      });

      // Add text content
      if (text) {
        page.drawText(text, {
          x: 50,
          y: height - 100,
          size: 12,
          font,
          color: rgb(0, 0, 0),
        });
      }

      // Add tables
      let currentY = height - 150;
      for (const table of tables) {
        if (currentY < 100) {
          // Add new page if needed
          const newPage = pdfDoc.addPage();
          currentY = newPage.getHeight() - 50;
        }

        // Draw table headers
        let currentX = 50;
        const cellWidth = 100;
        const cellHeight = 20;

        for (const row of table) {
          for (const cell of row) {
            // Draw cell border
            page.drawRectangle({
              x: currentX,
              y: currentY,
              width: cellWidth,
              height: cellHeight,
              borderColor: rgb(0, 0, 0),
              borderWidth: 1,
            });

            // Draw cell text
            page.drawText(String(cell), {
              x: currentX + 5,
              y: currentY + 5,
              size: 10,
              font,
              color: rgb(0, 0, 0),
            });

            currentX += cellWidth;
          }
          currentX = 50;
          currentY -= cellHeight;
        }

        currentY -= 20; // Space between tables
      }

      const pdfBytes = await pdfDoc.save();

      return {
        data: pdfBytes,
        metadata: {
          format: 'pdf',
          outputSize: pdfBytes.length,
          pageCount: pdfDoc.getPageCount(),
          tableCount: tables.length,
          ...opts,
        },
      };
    } catch (error) {
      if (error.message.includes('Cannot resolve module')) {
        throw new Error('PDF Table support requires additional dependencies (pdf-lib)');
      }
      throw new Error(`PDF formatting failed: ${error.message}`);
    }
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * PPTX Slides adapter for parsing and formatting PowerPoint presentations
 */
const pptxSlidesAdapter = {
  async parse(input, opts = {}) {
    try {
      const PptxGenJS = (await import('pptxgenjs')).default;

      // If input is a buffer, use it directly; otherwise assume it's a file path
      let pptxBuffer;
      if (Buffer.isBuffer(input)) {
        pptxBuffer = input;
      } else {
        // For file paths, we'd need fs - this is a simplified version
        throw new TypeError(
          'PPTX parsing from file paths requires fs module - use buffer input instead'
        );
      }

      // Note: pptxgenjs is primarily for creating presentations, not parsing
      // For parsing existing PPTX files, we'd need additional libraries
      // This is a simplified version that extracts basic info
      const data = {
        slides: [],
        metadata: {
          title: 'Parsed Presentation',
          author: 'Unknown',
          // Note: Full parsing would require additional libraries
        },
      };

      return {
        data,
        metadata: {
          format: 'pptx',
          slideCount: 0,
          fileSize: pptxBuffer.length,
          ...opts,
        },
      };
    } catch (error) {
      if (error.message.includes('Cannot resolve module')) {
        throw new Error('PPTX Slides support requires additional dependencies (pptxgenjs)');
      }
      throw new Error(`PPTX parsing failed: ${error.message}`);
    }
  },

  async format(data, opts = {}) {
    try {
      const PptxGenJS = (await import('pptxgenjs')).default;

      const { slides = [], title = 'Generated Presentation', author = 'ZTF Office Adapter' } = data;

      // @ts-ignore - PptxGenJS constructor works at runtime
      const pptx = new PptxGenJS();

      // Set presentation properties
      pptx.author = author;
      pptx.company = 'ZTF Office Adapter';
      pptx.title = title;

      // Add slides
      for (const slideData of slides) {
        const slide = pptx.addSlide();

        // Add title if provided
        if (slideData.title) {
          slide.addText(slideData.title, {
            x: 1,
            y: 0.5,
            w: 8,
            h: 1,
            fontSize: 24,
            bold: true,
            color: '363636',
          });
        }

        // Add content
        if (slideData.content) {
          slide.addText(slideData.content, {
            x: 1,
            y: 2,
            w: 8,
            h: 4,
            fontSize: 14,
            color: '363636',
          });
        }

        // Add tables if provided
        if (slideData.tables) {
          for (const table of slideData.tables) {
            slide.addTable(table, {
              x: 1,
              y: 3,
              w: 8,
              h: 3,
              fontSize: 12,
              color: '363636',
            });
          }
        }

        // Add images if provided
        if (slideData.images) {
          for (const image of slideData.images) {
            slide.addImage({
              data: image.data,
              x: image.x || 1,
              y: image.y || 4,
              w: image.w || 2,
              h: image.h || 2,
            });
          }
        }
      }

      // Generate the presentation
      const pptxBuffer = await pptx.write('nodebuffer');

      return {
        data: pptxBuffer,
        metadata: {
          format: 'pptx',
          outputSize: pptxBuffer.length,
          slideCount: slides.length,
          ...opts,
        },
      };
    } catch (error) {
      if (error.message.includes('Cannot resolve module')) {
        throw new Error('PPTX Slides support requires additional dependencies (pptxgenjs)');
      }
      throw new Error(`PPTX formatting failed: ${error.message}`);
    }
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * XLSX adapter for parsing and formatting Excel spreadsheets
 */
const xlsxAdapter = {
  async parse(input, opts = {}) {
    try {
      const ExcelJS = (await import('exceljs')).default;

      // If input is a buffer, use it directly; otherwise assume it's a file path
      let workbook;
      if (Buffer.isBuffer(input)) {
        workbook = new ExcelJS.Workbook();
        // @ts-ignore - Buffer type compatibility
        await workbook.xlsx.load(input);
      } else {
        // For file paths, we'd need fs - this is a simplified version
        throw new TypeError(
          'XLSX parsing from file paths requires fs module - use buffer input instead'
        );
      }

      const data = {
        worksheets: [],
        metadata: {
          creator: workbook.creator || '',
          lastModifiedBy: workbook.lastModifiedBy || '',
          created: workbook.created || undefined,
          modified: workbook.modified || undefined,
        },
      };

      // Process each worksheet
      workbook.eachSheet((worksheet, sheetId) => {
        const sheetData = {
          id: sheetId,
          name: worksheet.name,
          rows: [],
          rowCount: worksheet.rowCount,
          columnCount: worksheet.columnCount,
        };

        // Extract data from each row
        worksheet.eachRow((row, rowNumber) => {
          const rowData = {
            rowNumber,
            values: [],
          };

          row.eachCell((cell, colNumber) => {
            rowData.values[colNumber - 1] = {
              value: cell.value,
              type: cell.type,
              formula: cell.formula,
              style: cell.style,
            };
          });

          sheetData.rows.push(rowData);
        });

        data.worksheets.push(sheetData);
      });

      return {
        data,
        metadata: {
          format: 'xlsx',
          worksheetCount: data.worksheets.length,
          totalRows: data.worksheets.reduce((sum, sheet) => sum + sheet.rowCount, 0),
          ...opts,
        },
      };
    } catch (error) {
      if (error.message.includes('Cannot resolve module')) {
        throw new Error('XLSX support requires additional dependencies (exceljs)');
      }
      throw new Error(`XLSX parsing failed: ${error.message}`);
    }
  },

  async format(data, opts = {}) {
    try {
      const ExcelJS = (await import('exceljs')).default;

      const { worksheets = [], metadata = {} } = data;

      const workbook = new ExcelJS.Workbook();

      // Set workbook properties
      if (metadata.creator) workbook.creator = metadata.creator;
      if (metadata.lastModifiedBy) workbook.lastModifiedBy = metadata.lastModifiedBy;
      if (metadata.created) workbook.created = metadata.created;
      if (metadata.modified) workbook.modified = metadata.modified;

      // Add worksheets
      for (const sheetData of worksheets) {
        const worksheet = workbook.addWorksheet(sheetData.name || 'Sheet1');

        // Add data to worksheet
        for (const rowData of sheetData.rows || []) {
          const row = worksheet.getRow(rowData.rowNumber);

          for (let colIndex = 0; colIndex < rowData.values.length; colIndex++) {
            const cellData = rowData.values[colIndex];
            if (cellData) {
              const cell = row.getCell(colIndex + 1);
              cell.value = cellData.value;

              if (cellData.formula) {
                // @ts-ignore - formula is writable at runtime
                cell.formula = cellData.formula;
              }

              if (cellData.style) {
                cell.style = cellData.style;
              }
            }
          }
        }
      }

      // Generate the Excel file
      const xlsxBuffer = await workbook.xlsx.writeBuffer();

      return {
        data: xlsxBuffer,
        metadata: {
          format: 'xlsx',
          // @ts-ignore - Buffer has length property at runtime
          outputSize: xlsxBuffer.byteLength || xlsxBuffer.length,
          worksheetCount: Array.isArray(worksheets) ? worksheets.length : 0,
          ...opts,
        },
      };
    } catch (error) {
      if (error.message.includes('Cannot resolve module')) {
        throw new Error('XLSX support requires additional dependencies (exceljs)');
      }
      throw new Error(`XLSX formatting failed: ${error.message}`);
    }
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

/**
 * Helper function to escape XML characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped XML text
 */
function escapeXml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
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
    dependencies: [
      'csv-parse',
      'csv-stringify',
      'docxtemplater',
      'pizzip',
      'pdf-lib',
      'pptxgenjs',
      'exceljs',
    ],
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
