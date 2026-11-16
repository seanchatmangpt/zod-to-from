/**
 * Shared Test Fixtures
 * Reusable test data for consistent testing across the suite
 */

import { z } from 'zod';

// Common Zod Schemas
export const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
});

export const UserWithEmailSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email(),
});

export const ConfigSchema = z.object({
  DB_HOST: z.string(),
  DB_PORT: z.string(),
  DB_SSL: z.boolean(),
  API_KEY: z.string(),
});

export const HtmlSchema = z.object({
  title: z.string(),
  links: z.array(
    z.object({
      href: z.string(),
      text: z.string(),
    })
  ),
});

export const MarkdownSchema = z.object({
  title: z.string(),
  headings: z.array(
    z.object({
      level: z.number(),
      text: z.string(),
    })
  ),
});

export const CsvSchema = z.object({
  items: z.array(UserSchema),
});

// Sample Data
export const sampleUser = { name: 'John', age: 30 };
export const sampleUsers = [
  { name: 'John', age: 30 },
  { name: 'Jane', age: 25 },
  { name: 'Bob', age: 35 },
];

export const sampleConfig = {
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_SSL: true,
  API_KEY: 'secret123',
};

export const sampleHtml = {
  title: 'Test Page',
  links: [{ href: 'https://example.com', text: 'Example Link' }],
};

export const sampleMarkdown = {
  title: 'Test Document',
  headings: [
    { level: 1, text: 'Test Document' },
    { level: 2, text: 'Subsection' },
  ],
};

// Format-specific test inputs
export const testInputs = {
  json: '{"name": "John", "age": 30}',
  csv: 'name,age\nJohn,30\nJane,25',
  yaml: 'name: John\nage: 30',
  toml: 'name = "John"\nage = 30',
  xml: '<?xml version="1.0"?><user><name>John</name><age>30</age></user>',
  env: 'DB_HOST=localhost\nDB_PORT=5432\nDB_SSL=true\nAPI_KEY=secret123',
  html: '<html><head><title>Test Page</title></head><body><h1>Hello World</h1><a href="https://example.com">Example Link</a></body></html>',
  md: '# Test Document\n\nThis is a paragraph.\n\n## Subsection\n\n- Item 1\n- Item 2',
  curl: 'curl -X POST "https://api.example.com/users" -H "Content-Type: application/json" -d \'{"name":"John"}\'',
};

// Edge case data
export const edgeCases = {
  emptyString: '',
  emptyObject: {},
  emptyArray: [],
  nullValues: { name: null, age: null },
  undefinedValues: { name: undefined, age: undefined },
  specialChars: { name: 'Test "Quote" & <Tag>', age: 30 },
  unicode: { name: '测试 🚀', age: 30 },
  largeNumber: { name: 'Test', age: Number.MAX_SAFE_INTEGER },
  negativeNumber: { name: 'Test', age: -999 },
  decimal: { name: 'Test', age: 30.5 },
};

// Performance test data
export const performanceData = {
  small: Array.from({ length: 10 }, (_, i) => ({ name: `User${i}`, age: 20 + i })),
  medium: Array.from({ length: 100 }, (_, i) => ({ name: `User${i}`, age: 20 + i })),
  large: Array.from({ length: 1000 }, (_, i) => ({ name: `User${i}`, age: 20 + i })),
};

// Error test cases
export const errorCases = {
  invalidJson: '{"name": "Test", invalid}',
  invalidYaml: 'name: Test\n  invalid: yaml: syntax',
  invalidXml: '<user><name>Test</invalid>',
  invalidCsv: 'name,age\nJohn,thirty',
  typeMismatch: { name: 'Test', age: 'not-a-number' },
  missingRequired: { name: 'Test' }, // missing age
};
