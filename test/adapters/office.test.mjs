/**
 * Unit tests for Office & Exec Outputs adapters
 */

import { describe, it, expect } from 'vitest';
import { htmlAdapter, mdAdapter, csvAdapter } from '../../src/adapters/office.mjs';

describe('Office & Exec Outputs Adapters', () => {
  describe('HTML Adapter', () => {
    it('should parse HTML content', async () => {
      const input = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Test Page</title>
          <meta name="description" content="Test description">
        </head>
        <body>
          <h1>Hello World</h1>
          <p>This is a test paragraph.</p>
          <a href="https://example.com">Example Link</a>
          <img src="test.jpg" alt="Test Image">
        </body>
        </html>
      `;

      const result = await htmlAdapter.parse(input);
      
      expect(result.data.title).toBe('Test Page');
      expect(result.data.meta.description).toBe('Test description');
      expect(result.data.links).toHaveLength(1);
      expect(result.data.links[0].href).toBe('https://example.com');
      expect(result.data.images).toHaveLength(1);
      expect(result.data.images[0].src).toBe('test.jpg');
      expect(result.metadata.format).toBe('html');
    });

    it('should format data to HTML', async () => {
      const data = {
        title: 'Test Page',
        meta: { description: 'Test description' },
        links: [{ href: 'https://example.com', text: 'Example Link' }],
        images: [{ src: 'test.jpg', alt: 'Test Image' }],
        text: 'This is a test paragraph.',
      };

      const result = await htmlAdapter.format(data);
      
      expect(result.data).toContain('<title>Test Page</title>');
      expect(result.data).toContain('Test description');
      expect(result.data).toContain('https://example.com');
      expect(result.data).toContain('test.jpg');
      expect(result.metadata.format).toBe('html');
    });

    it('should handle empty HTML', async () => {
      const input = '<html><body></body></html>';
      const result = await htmlAdapter.parse(input);
      
      expect(result.data.title).toBe('');
      expect(result.data.links).toHaveLength(0);
      expect(result.data.images).toHaveLength(0);
    });
  });

  describe('Markdown Adapter', () => {
    it('should parse Markdown content', async () => {
      const input = `
# Main Title

## Subtitle

This is a paragraph with some text.

[Link to example](https://example.com)

\`\`\`
code block
\`\`\`

Another paragraph.
      `;

      const result = await mdAdapter.parse(input);
      
      expect(result.data.title).toBe('Main Title');
      expect(result.data.headings).toHaveLength(2);
      expect(result.data.headings[0].level).toBe(1);
      expect(result.data.headings[0].text).toBe('Main Title');
      expect(result.data.paragraphs).toHaveLength(2);
      expect(result.data.links).toHaveLength(1);
      expect(result.data.links[0].text).toBe('Link to example');
      expect(result.data.codeBlocks).toHaveLength(1);
      expect(result.metadata.format).toBe('md');
    });

    it('should format data to Markdown', async () => {
      const data = {
        title: 'Test Document',
        headings: [
          { level: 1, text: 'Main Title' },
          { level: 2, text: 'Subtitle' },
        ],
        paragraphs: ['First paragraph.', 'Second paragraph.'],
        links: [{ text: 'Example', url: 'https://example.com' }],
        codeBlocks: ['console.log("hello");'],
      };

      const result = await mdAdapter.format(data);
      
      expect(result.data).toContain('# Test Document');
      expect(result.data).toContain('## Subtitle');
      expect(result.data).toContain('First paragraph.');
      expect(result.data).toContain('[Example](https://example.com)');
      expect(result.data).toContain('```');
      expect(result.metadata.format).toBe('md');
    });

    it('should handle empty Markdown', async () => {
      const input = '';
      const result = await mdAdapter.parse(input);
      
      expect(result.data.title).toBe('');
      expect(result.data.headings).toHaveLength(0);
      expect(result.data.paragraphs).toHaveLength(0);
    });
  });

  describe('CSV Adapter (Office Pack)', () => {
    it('should parse CSV data', async () => {
      const input = 'name,age,active\nAlice,25,true\nBob,30,false';
      const result = await csvAdapter.parse(input);
      
      expect(result.data).toEqual([
        { name: 'Alice', age: '25', active: 'true' },
        { name: 'Bob', age: '30', active: 'false' },
      ]);
      expect(result.metadata.format).toBe('csv');
      expect(result.metadata.recordCount).toBe(2);
    });

    it('should format data to CSV', async () => {
      const data = [
        { name: 'Alice', age: 25, active: true },
        { name: 'Bob', age: 30, active: false },
      ];
      const result = await csvAdapter.format(data);
      
      expect(result.data).toContain('name,age,active');
      expect(result.data).toContain('Alice,25,true');
      expect(result.data).toContain('Bob,30,false');
      expect(result.metadata.format).toBe('csv');
    });
  });
});
