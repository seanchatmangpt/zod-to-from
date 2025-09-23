/**
 * Unit tests for Templating adapters
 */

import { describe, expect, it } from 'vitest';
import { frontmatterAdapter } from '../../src/adapters/templating.mjs';

describe('Templating Adapters', () => {
  describe('Frontmatter Adapter', () => {
    it('should parse frontmatter content', async () => {
      const input = `---
title: "Test Document"
author: "John Doe"
date: "2024-01-01"
published: true
tags: ["test", "document"]
---

# Test Document

This is the content of the document.

## Subsection

More content here.
      `;

      const result = await frontmatterAdapter.parse(input);

      expect(result.data.frontmatter.title).toBe('Test Document');
      expect(result.data.frontmatter.author).toBe('John Doe');
      expect(result.data.frontmatter.date).toBe('2024-01-01');
      expect(result.data.frontmatter.published).toBe(true);
      expect(result.data.frontmatter.tags).toBe('["test", "document"]');
      expect(result.data.content).toContain('# Test Document');
      expect(result.data.content).toContain('This is the content');
      expect(result.metadata.format).toBe('frontmatter');
      expect(result.metadata.hasFrontmatter).toBe(true);
      expect(result.metadata.frontmatterKeys).toContain('title');
      expect(result.metadata.frontmatterKeys).toContain('author');
    });

    it('should format data to frontmatter', async () => {
      const data = {
        frontmatter: {
          title: 'Test Document',
          author: 'John Doe',
          date: '2024-01-01',
          published: true,
          tags: '["test", "document"]',
        },
        content: `# Test Document

This is the content of the document.

## Subsection

More content here.`,
      };

      const result = await frontmatterAdapter.format(data);

      expect(result.data).toContain('---');
      expect(result.data).toContain('title: "Test Document"');
      expect(result.data).toContain('author: "John Doe"');
      expect(result.data).toContain('date: 2024-01-01');
      expect(result.data).toContain('published: true');
      expect(result.data).toContain('# Test Document');
      expect(result.data).toContain('This is the content');
      expect(result.metadata.format).toBe('frontmatter');
      expect(result.metadata.frontmatterKeys).toHaveLength(5);
    });

    it('should handle content without frontmatter', async () => {
      const input = `# Test Document

This is the content of the document.`;

      const result = await frontmatterAdapter.parse(input);

      expect(result.data.frontmatter).toEqual({});
      expect(result.data.content).toBe(input);
      expect(result.metadata.hasFrontmatter).toBe(false);
      expect(result.metadata.frontmatterKeys).toHaveLength(0);
    });

    it('should handle empty content', async () => {
      const input = '';

      const result = await frontmatterAdapter.parse(input);

      expect(result.data.frontmatter).toEqual({});
      expect(result.data.content).toBe('');
      expect(result.metadata.hasFrontmatter).toBe(false);
    });

    it('should handle frontmatter with comments', async () => {
      const input = `---
# This is a comment
title: "Test Document"
# Another comment
author: "John Doe"
---

Content here.`;

      const result = await frontmatterAdapter.parse(input);

      expect(result.data.frontmatter.title).toBe('Test Document');
      expect(result.data.frontmatter.author).toBe('John Doe');
      expect(result.data.content).toBe('Content here.');
    });

    it('should handle frontmatter with boolean values', async () => {
      const input = `---
published: true
draft: false
featured: true
---

Content here.`;

      const result = await frontmatterAdapter.parse(input);

      expect(result.data.frontmatter.published).toBe(true);
      expect(result.data.frontmatter.draft).toBe(false);
      expect(result.data.frontmatter.featured).toBe(true);
    });

    it('should handle frontmatter with numeric values', async () => {
      const input = `---
version: 1
count: 42
price: 99.99
---

Content here.`;

      const result = await frontmatterAdapter.parse(input);

      expect(result.data.frontmatter.version).toBe(1);
      expect(result.data.frontmatter.count).toBe(42);
      expect(result.data.frontmatter.price).toBe(99.99);
    });

    it('should handle frontmatter with quoted values', async () => {
      const input = `---
title: "Title with spaces"
description: 'Description with spaces'
unquoted: simple value
---

Content here.`;

      const result = await frontmatterAdapter.parse(input);

      expect(result.data.frontmatter.title).toBe('Title with spaces');
      expect(result.data.frontmatter.description).toBe('Description with spaces');
      expect(result.data.frontmatter.unquoted).toBe('simple value');
    });

    it('should format with custom delimiter', async () => {
      const data = {
        frontmatter: {
          title: 'Test Document',
          author: 'John Doe',
        },
        content: 'Content here.',
      };

      const result = await frontmatterAdapter.format(data, { delimiter: '+++' });

      expect(result.data).toContain('+++');
      expect(result.data).toContain('title: "Test Document"');
      expect(result.data).toContain('author: "John Doe"');
    });

    it('should throw error for unclosed frontmatter', async () => {
      const input = `---
title: "Test Document"
author: "John Doe"

# Missing closing delimiter

Content here.`;

      await expect(frontmatterAdapter.parse(input)).rejects.toThrow(
        'Frontmatter delimiter not closed'
      );
    });

    it('should handle empty frontmatter', async () => {
      const input = `---
---

Content here.`;

      const result = await frontmatterAdapter.parse(input);

      expect(result.data.frontmatter).toEqual({});
      expect(result.data.content).toBe('Content here.');
      expect(result.metadata.hasFrontmatter).toBe(true);
    });
  });
});
