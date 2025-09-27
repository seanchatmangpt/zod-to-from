/**
 * Quick 80/20 tests for the new from/to export naming
 * Tests the most commonly used adapters to ensure the new naming works
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
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
  // Define test schemas
  const UserSchema = z.object({
    name: z.string(),
    age: z.number(),
  });

  const ConfigSchema = z.object({
    DB_HOST: z.string(),
    DB_PORT: z.string(),
    DB_SSL: z.boolean(),
    API_KEY: z.string(),
  });

  const HtmlSchema = z.object({
    title: z.string(),
    links: z.array(
      z.object({
        href: z.string(),
        text: z.string(),
      })
    ),
  });

  const MarkdownSchema = z.object({
    title: z.string(),
    headings: z.array(
      z.object({
        level: z.number(),
        text: z.string(),
      })
    ),
  });

  const TomlSchema = z.object({
    title: z.string(),
    author: z.string(),
    database: z.object({
      host: z.string(),
      port: z.number(),
      ssl: z.boolean(),
    }),
  });

  const CurlSchema = z.object({
    method: z.string(),
    url: z.string(),
    headers: z.record(z.string()),
  });

  describe('JSON Adapter', () => {
    it('should parse JSON to structured data with schema validation', async () => {
      const jsonInput = '{"name": "John", "age": 30}';
      const result = await fromJson(UserSchema, jsonInput);

      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should format structured data to JSON with schema validation', async () => {
      const data = { name: 'John', age: 30 };
      const result = await toJson(UserSchema, data);

      expect(result).toContain('"name": "John"');
      expect(result).toContain('"age": 30');
    });
  });

  describe('CSV Adapter', () => {
    const CsvSchema = z.object({
      items: z.array(UserSchema),
    });

    it('should parse CSV to structured data with schema validation', async () => {
      const csvInput = 'name,age\nJohn,30\nJane,25';
      const result = await fromCsv(CsvSchema, csvInput);

      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({ name: 'John', age: 30 });
      expect(result.items[1]).toEqual({ name: 'Jane', age: 25 });
    });

    it('should format structured data to CSV with schema validation', async () => {
      const data = {
        items: [
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 },
        ],
      };
      const result = await toCsv(CsvSchema, data);

      expect(result).toContain('name,age');
      expect(result).toContain('John,30');
    });
  });

  describe('YAML Adapter', () => {
    const YamlSchema = z.object({
      name: z.string(),
      age: z.number(),
      hobbies: z.array(z.string()),
    });

    it('should parse YAML to structured data with schema validation', async () => {
      const yamlInput = `
name: John
age: 30
hobbies:
  - reading
  - coding
`.trim();

      const result = await fromYaml(YamlSchema, yamlInput);

      expect(result.name).toBe('John');
      expect(result.age).toBe(30);
      expect(result.hobbies).toEqual(['reading', 'coding']);
    });

    it('should format structured data to YAML with schema validation', async () => {
      const data = {
        name: 'John',
        age: 30,
        hobbies: ['reading', 'coding'],
      };
      const result = await toYaml(YamlSchema, data);

      expect(result).toContain('name: John');
      expect(result).toContain('age: 30');
    });
  });

  describe('HTML Adapter', () => {
    it('should parse HTML to structured data with schema validation', async () => {
      const htmlInput = `
        <html>
          <head><title>Test Page</title></head>
          <body>
            <h1>Hello World</h1>
            <a href="https://example.com">Example Link</a>
          </body>
        </html>
      `.trim();

      const result = await fromHtml(HtmlSchema, htmlInput);

      expect(result.title).toBe('Test Page');
      expect(result.links).toHaveLength(1);
      expect(result.links[0].href).toBe('https://example.com');
    });

    it('should format structured data to HTML with schema validation', async () => {
      const data = {
        title: 'Test Page',
        links: [{ href: 'https://example.com', text: 'Example Link' }],
      };
      const result = await toHtml(HtmlSchema, data);

      expect(result).toContain('<title>Test Page</title>');
    });
  });

  describe('Markdown Adapter', () => {
    it('should parse Markdown to structured data with schema validation', async () => {
      const mdInput = `
# Test Document

This is a paragraph.

## Subsection

- Item 1
- Item 2

[Link](https://example.com)
      `.trim();

      const result = await fromMd(MarkdownSchema, mdInput);

      expect(result.title).toBe('Test Document');
      expect(result.headings).toHaveLength(2);
    });

    it('should format structured data to Markdown with schema validation', async () => {
      const data = {
        title: 'Test Document',
        headings: [{ level: 2, text: 'Subsection' }],
      };
      const result = await toMd(MarkdownSchema, data);

      expect(result).toContain('# Test Document');
      expect(result).toContain('## Subsection');
    });
  });

  describe('Environment Variables Adapter', () => {
    it('should parse .env to structured data with schema validation', async () => {
      const envInput = `
# Database config
DB_HOST=localhost
DB_PORT=5432
DB_SSL=true

# API keys
API_KEY=secret123
      `.trim();

      const result = await fromEnv(ConfigSchema, envInput);

      expect(result.DB_HOST).toBe('localhost');
      expect(result.DB_PORT).toBe('5432');
      expect(result.DB_SSL).toBe(true);
      expect(result.API_KEY).toBe('secret123');
    });

    it('should format structured data to .env with schema validation', async () => {
      const data = {
        DB_HOST: 'localhost',
        DB_PORT: '5432',
        DB_SSL: true,
        API_KEY: 'secret123',
      };
      const result = await toEnv(ConfigSchema, data);

      expect(result).toContain('DB_HOST=localhost');
      expect(result).toContain('DB_PORT=5432');
      expect(result).toContain('DB_SSL=true');
    });
  });

  describe('TOML Adapter', () => {
    it('should parse TOML to structured data with schema validation', async () => {
      const tomlInput = `
title = "Test Config"
author = "John Doe"

[database]
host = "localhost"
port = 5432
ssl = true
      `.trim();

      const result = await fromToml(TomlSchema, tomlInput);

      expect(result.title).toBe('Test Config');
      expect(result.author).toBe('John Doe');
      expect(result.database.host).toBe('localhost');
      expect(result.database.port).toBe(5432);
      expect(result.database.ssl).toBe(true);
    });

    it('should format structured data to TOML with schema validation', async () => {
      const data = {
        title: 'Test Config',
        author: 'John Doe',
        database: {
          host: 'localhost',
          port: 5432,
          ssl: true,
        },
      };
      const result = await toToml(TomlSchema, data);

      expect(result).toContain('title = "Test Config"');
      expect(result).toContain('database =');
      expect(result).toContain('host = "localhost"');
    });
  });

  describe('cURL Adapter', () => {
    it('should parse cURL command to structured data with schema validation', async () => {
      const curlInput =
        'curl -X POST "https://api.example.com/users" -H "Content-Type: application/json" -d \'{"name":"John"}\'';

      const result = await fromCurl(CurlSchema, curlInput);

      expect(result.method).toBe('POST');
      expect(result.url).toBe('https://api.example.com/users');
      expect(result.headers).toBeDefined();
    });

    it('should format structured data to cURL command with schema validation', async () => {
      const data = {
        method: 'POST',
        url: 'https://api.example.com/users',
        headers: {
          'Content-Type': 'application/json',
        },
      };
      const result = await toCurl(CurlSchema, data);

      expect(result).toContain('curl -X POST');
      expect(result).toContain('https://api.example.com/users');
      expect(result).toContain('Content-Type: application/json');
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

    it('should require schema as first parameter', async () => {
      // Test that functions require schema parameter
      await expect(fromJson()).rejects.toThrow();
      await expect(toJson()).rejects.toThrow();
      await expect(fromCsv()).rejects.toThrow();
      await expect(toCsv()).rejects.toThrow();
    });
  });
});
