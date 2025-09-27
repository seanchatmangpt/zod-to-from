/**
 * Quick 80/20 tests for the new from/to export naming
 * Tests the most commonly used adapters to ensure the new naming works
 */

import { describe, expect, it } from 'vitest';
import {
  fromCsv,
  // Communications (common for APIs)
  fromCurl,
  // DevOps adapters (common in config)
  fromEnv,
  // Office adapters (very common)
  fromHtml,
  // Data adapters (most common)
  fromJson,
  fromMd,
  fromToml,
  fromYaml,
  toCsv,
  toCurl,
  toEnv,
  toHtml,
  toJson,
  toMd,
  toToml,
  toYaml,
} from '../src/index.mjs';

describe('From/To Export Naming', () => {
  describe('JSON Adapter', () => {
    it('should parse JSON to structured data', async () => {
      const jsonInput = '{"name": "John", "age": 30}';
      const result = await fromJson(jsonInput);

      expect(result.data).toEqual({ name: 'John', age: 30 });
      expect(result.metadata.format).toBe('json');
    });

    it('should format structured data to JSON', async () => {
      const data = { name: 'John', age: 30 };
      const result = await toJson(data);

      expect(result.data).toContain('"name": "John"');
      expect(result.data).toContain('"age": 30');
      expect(result.metadata.format).toBe('json');
    });
  });

  describe('CSV Adapter', () => {
    it('should parse CSV to structured data', async () => {
      const csvInput = 'name,age\nJohn,30\nJane,25';
      const result = await fromCsv(csvInput);

      expect(result.data).toBeDefined();
      expect(result.metadata.format).toBe('csv');
    });

    it('should format structured data to CSV', async () => {
      const data = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
      ];
      const result = await toCsv(data);

      expect(result.data).toContain('name,age');
      expect(result.data).toContain('John,30');
      expect(result.metadata.format).toBe('csv');
    });
  });

  describe('YAML Adapter', () => {
    it('should parse YAML to structured data', async () => {
      const yamlInput = `
name: John
age: 30
hobbies:
  - reading
  - coding
      `.trim();

      const result = await fromYaml(yamlInput);

      expect(result.data.name).toBe('John');
      expect(result.data.age).toBe(30);
      expect(result.data.hobbies).toEqual(['reading', 'coding']);
      expect(result.metadata.format).toBe('yaml');
    });

    it('should format structured data to YAML', async () => {
      const data = {
        name: 'John',
        age: 30,
        hobbies: ['reading', 'coding'],
      };
      const result = await toYaml(data);

      expect(result.data).toContain('name: John');
      expect(result.data).toContain('age: 30');
      expect(result.metadata.format).toBe('yaml');
    });
  });

  describe('HTML Adapter', () => {
    it('should parse HTML to structured data', async () => {
      const htmlInput = `
        <html>
          <head><title>Test Page</title></head>
          <body>
            <h1>Hello World</h1>
            <a href="https://example.com">Example Link</a>
          </body>
        </html>
      `.trim();

      const result = await fromHtml(htmlInput);

      expect(result.data.title).toBe('Test Page');
      expect(result.data.links).toHaveLength(1);
      expect(result.data.links[0].href).toBe('https://example.com');
      expect(result.metadata.format).toBe('html');
    });

    it('should format structured data to HTML', async () => {
      const data = {
        title: 'Test Page',
        text: 'Hello World',
        links: [{ href: 'https://example.com', text: 'Example Link' }],
      };
      const result = await toHtml(data);

      expect(result.data).toContain('<title>Test Page</title>');
      expect(result.data).toContain('Hello World');
      expect(result.metadata.format).toBe('html');
    });
  });

  describe('Markdown Adapter', () => {
    it('should parse Markdown to structured data', async () => {
      const mdInput = `
# Test Document

This is a paragraph.

## Subsection

- Item 1
- Item 2

[Link](https://example.com)
      `.trim();

      const result = await fromMd(mdInput);

      expect(result.data.title).toBe('Test Document');
      expect(result.data.headings).toHaveLength(2);
      expect(result.data.paragraphs).toContain('This is a paragraph.');
      expect(result.data.links).toHaveLength(1);
      expect(result.metadata.format).toBe('md');
    });

    it('should format structured data to Markdown', async () => {
      const data = {
        title: 'Test Document',
        headings: [{ level: 2, text: 'Subsection' }],
        paragraphs: ['This is a paragraph.'],
        links: [{ text: 'Link', url: 'https://example.com' }],
      };
      const result = await toMd(data);

      expect(result.data).toContain('# Test Document');
      expect(result.data).toContain('## Subsection');
      expect(result.data).toContain('This is a paragraph.');
      expect(result.metadata.format).toBe('md');
    });
  });

  describe('Environment Variables Adapter', () => {
    it('should parse .env to structured data', async () => {
      const envInput = `
# Database config
DB_HOST=localhost
DB_PORT=5432
DB_SSL=true

# API keys
API_KEY=secret123
      `.trim();

      const result = await fromEnv(envInput);

      expect(result.data.DB_HOST).toBe('localhost');
      expect(result.data.DB_PORT).toBe('5432');
      expect(result.data.DB_SSL).toBe(true);
      expect(result.data.API_KEY).toBe('secret123');
      expect(result.metadata.format).toBe('env');
    });

    it('should format structured data to .env', async () => {
      const data = {
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_SSL: true,
        API_KEY: 'secret123',
      };
      const result = await toEnv(data);

      expect(result.data).toContain('DB_HOST=localhost');
      expect(result.data).toContain('DB_PORT=5432');
      expect(result.data).toContain('DB_SSL=true');
      expect(result.metadata.format).toBe('env');
    });
  });

  describe('TOML Adapter', () => {
    it('should parse TOML to structured data', async () => {
      const tomlInput = `
title = "Test Config"
author = "John Doe"

[database]
host = "localhost"
port = 5432
ssl = true

[features]
enabled = ["auth", "logging"]
      `.trim();

      const result = await fromToml(tomlInput);

      expect(result.data.title).toBe('Test Config');
      expect(result.data.author).toBe('John Doe');
      expect(result.data.database.host).toBe('localhost');
      expect(result.data.database.port).toBe(5432);
      expect(result.data.database.ssl).toBe(true);
      expect(result.metadata.format).toBe('toml');
    });

    it('should format structured data to TOML', async () => {
      const data = {
        title: 'Test Config',
        author: 'John Doe',
        database: {
          host: 'localhost',
          port: 5432,
          ssl: true,
        },
      };
      const result = await toToml(data);

      expect(result.data).toContain('title = "Test Config"');
      expect(result.data).toContain('database =');
      expect(result.data).toContain('host = "localhost"');
      expect(result.metadata.format).toBe('toml');
    });
  });

  describe('cURL Adapter', () => {
    it('should parse cURL command to structured data', async () => {
      const curlInput =
        'curl -X POST "https://api.example.com/users" -H "Content-Type: application/json" -d \'{"name":"John"}\'';

      const result = await fromCurl(curlInput);

      expect(result.data.method).toBe('POST');
      expect(result.data.url).toBe('https://api.example.com/users');
      expect(result.data.headers).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should format structured data to cURL command', async () => {
      const data = {
        method: 'POST',
        url: 'https://api.example.com/users',
        headers: {
          'Content-Type': 'application/json',
        },
        data: { name: 'John' },
      };
      const result = await toCurl(data);

      expect(result.data).toContain('curl -X POST');
      expect(result.data).toContain('https://api.example.com/users');
      expect(result.data).toContain('Content-Type: application/json');
      expect(result.data).toContain('curl');
    });
  });

  describe('Export Availability', () => {
    it('should have all expected from/to exports available', async () => {
      // Test that all the imported functions are actually functions
      expect(typeof fromJson).toBe('function');
      expect(typeof toJson).toBe('function');
      expect(typeof fromCsv).toBe('function');
      expect(typeof toCsv).toBe('function');
      expect(typeof fromYaml).toBe('function');
      expect(typeof toYaml).toBe('function');
      expect(typeof fromHtml).toBe('function');
      expect(typeof toHtml).toBe('function');
      expect(typeof fromMd).toBe('function');
      expect(typeof toMd).toBe('function');
      expect(typeof fromEnv).toBe('function');
      expect(typeof toEnv).toBe('function');
      expect(typeof fromToml).toBe('function');
      expect(typeof toToml).toBe('function');
      expect(typeof fromCurl).toBe('function');
      expect(typeof toCurl).toBe('function');
    });
  });
});
