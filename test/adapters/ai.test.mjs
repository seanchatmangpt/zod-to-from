/**
 * AI Adapter Tests
 * These tests verify the AI adapters work correctly with Ollama models.
 *
 * To run these tests, set ENABLE_OLLAMA_TESTS=true:
 * ENABLE_OLLAMA_TESTS=true pnpm test test/adapters/ai.test.mjs
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import '../../src/adapters/ai.mjs';
import { getAdapter, listAdapters } from '../../src/core/index.mjs';

// Test schemas
const DocumentSchema = z.object({
  title: z.string(),
  content: z.string(),
  summary: z.string().optional(),
  keyPoints: z.array(z.string()).optional(),
});

const SlideSchema = z.object({
  slideNumber: z.number(),
  title: z.string(),
  content: z.string(),
  bulletPoints: z.array(z.string()).optional(),
});

const SpreadsheetSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
  summary: z.string().optional(),
});

// Check if Ollama tests should run
const shouldRunOllamaTests = process.env.ENABLE_OLLAMA_TESTS === 'true';

describe('AI Adapters', () => {
  describe('Adapter Registration', () => {
    it('should register all AI adapters', () => {
      const adapters = listAdapters();
      expect(adapters).toContain('docx-ai');
      expect(adapters).toContain('pptx-ai');
      expect(adapters).toContain('xlsx-ai');
    });

    it('should have correct adapter properties', () => {
      const docxAdapter = getAdapter('docx-ai');
      expect(docxAdapter).toBeDefined();
      expect(docxAdapter.isAI).toBe(true);
      expect(docxAdapter.supportsStreaming).toBe(false);
      expect(docxAdapter.version).toBe('1.0.0');
    });
  });

  describe('Schema Validation', () => {
    it('should require Zod schema for parsing', async () => {
      const docxAdapter = getAdapter('docx-ai');
      const mockBuffer = Buffer.from('test data', 'utf8');

      await expect(docxAdapter.parse(mockBuffer)).rejects.toThrow(
        'A Zod schema is required for AI-assisted parsing'
      );
    });

    it('should reject formatting operations', async () => {
      const docxAdapter = getAdapter('docx-ai');
      const testData = { title: 'Test', content: 'Test content' };

      await expect(docxAdapter.format(testData)).rejects.toThrow(
        'AI-assisted formatting (to:docx-ai) is not supported'
      );
    });
  });

  describe('Ollama Integration Tests', () => {
    beforeAll(() => {
      if (!shouldRunOllamaTests) {
        console.log('⏭️  Skipping Ollama tests. Set ENABLE_OLLAMA_TESTS=true to run them.');
      }
    });

    it('should process real DOCX files with AI', async () => {
      if (!shouldRunOllamaTests) {
        return;
      }

      const docxAdapter = getAdapter('docx-ai');
      const docxPath = join(
        process.cwd(),
        'node_modules/.pnpm/mammoth@1.11.0/node_modules/mammoth/test/test-data/tables.docx'
      );
      const docxBuffer = readFileSync(docxPath);

      const result = await docxAdapter.parse(docxBuffer, {
        schema: DocumentSchema,
        model: 'qwen3-coder',
        prompt:
          'Extract key information from this document and structure it according to the schema.',
      });

      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.content).toBeDefined();
      expect(typeof result.title).toBe('string');
      expect(typeof result.content).toBe('string');

      // Validate against schema
      const validatedResult = DocumentSchema.parse(result);
      expect(validatedResult).toBeDefined();
    });

    it('should work with different Ollama models', async () => {
      if (!shouldRunOllamaTests) {
        return;
      }

      const docxAdapter = getAdapter('docx-ai');
      const docxPath = join(
        process.cwd(),
        'node_modules/.pnpm/mammoth@1.11.0/node_modules/mammoth/test/test-data/tables.docx'
      );
      const docxBuffer = readFileSync(docxPath);

      // Test with different models
      const models = ['qwen3-coder', 'qwen3:8b'];

      for (const model of models) {
        const result = await docxAdapter.parse(docxBuffer, {
          schema: DocumentSchema,
          model: model,
          prompt: 'Extract key information from this document.',
        });

        expect(result).toBeDefined();
        expect(result.title).toBeDefined();
        expect(result.content).toBeDefined();
      }
    });

    it('should handle custom prompts', async () => {
      if (!shouldRunOllamaTests) {
        return;
      }

      const docxAdapter = getAdapter('docx-ai');
      const docxPath = join(
        process.cwd(),
        'node_modules/.pnpm/mammoth@1.11.0/node_modules/mammoth/test/test-data/tables.docx'
      );
      const docxBuffer = readFileSync(docxPath);

      const customPrompt =
        'Focus on extracting only the main title and a brief summary of this document.';

      const result = await docxAdapter.parse(docxBuffer, {
        schema: DocumentSchema,
        model: 'qwen3-coder',
        prompt: customPrompt,
      });

      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should validate output against Zod schema', async () => {
      if (!shouldRunOllamaTests) {
        return;
      }

      const docxAdapter = getAdapter('docx-ai');
      const docxPath = join(
        process.cwd(),
        'node_modules/.pnpm/mammoth@1.11.0/node_modules/mammoth/test/test-data/tables.docx'
      );
      const docxBuffer = readFileSync(docxPath);

      const result = await docxAdapter.parse(docxBuffer, {
        schema: DocumentSchema,
        model: 'qwen3-coder',
      });

      // This should not throw if the AI output matches the schema
      expect(() => DocumentSchema.parse(result)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid file formats gracefully', async () => {
      if (!shouldRunOllamaTests) {
        return;
      }

      const docxAdapter = getAdapter('docx-ai');
      const invalidBuffer = Buffer.from('not a docx file', 'utf8');

      await expect(
        docxAdapter.parse(invalidBuffer, {
          schema: DocumentSchema,
          model: 'qwen3-coder',
        })
      ).rejects.toThrow();
    });

    it('should handle AI model errors gracefully', async () => {
      if (!shouldRunOllamaTests) {
        return;
      }

      const docxAdapter = getAdapter('docx-ai');
      const docxPath = join(
        process.cwd(),
        'node_modules/.pnpm/mammoth@1.11.0/node_modules/mammoth/test/test-data/tables.docx'
      );
      const docxBuffer = readFileSync(docxPath);

      // Test with invalid model name
      await expect(
        docxAdapter.parse(docxBuffer, {
          schema: DocumentSchema,
          model: 'invalid-model-name',
        })
      ).rejects.toThrow();
    });
  });
});
