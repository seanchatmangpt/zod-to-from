/**
 * AI Adapter Tests
 * These tests verify the AI adapters work correctly with both mock and real Ollama models.
 *
 * To run real Ollama tests, set ENABLE_OLLAMA_TESTS=true:
 * ENABLE_OLLAMA_TESTS=true pnpm test test/adapters/ai.test.mjs
 */

import { MockLanguageModelV2 } from 'ai/test';
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

  describe('Mock AI Integration Tests', () => {
    it('should demonstrate mock AI usage patterns', async () => {
      // This test demonstrates how to use MockLanguageModelV2 for testing
      // In a real implementation, you would mock the AI adapter's internal calls

      const mockModel = new MockLanguageModelV2({
        doGenerate: async () => ({
          finishReason: 'stop',
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                title: 'Mock Document Title',
                content: 'This is mock document content extracted from the file.',
                summary: 'A mock summary of the document.',
                keyPoints: ['Key point 1', 'Key point 2', 'Key point 3'],
              }),
            },
          ],
          warnings: [],
        }),
      });

      // Test the mock model directly
      const { generateObject } = await import('ai');
      const result = await generateObject({
        model: mockModel,
        schema: DocumentSchema,
        prompt: 'Extract information from this document.',
      });

      expect(result.object).toBeDefined();
      expect(result.object.title).toBe('Mock Document Title');
      expect(result.object.content).toBe('This is mock document content extracted from the file.');
      expect(result.object.summary).toBe('A mock summary of the document.');
      expect(result.object.keyPoints).toEqual(['Key point 1', 'Key point 2', 'Key point 3']);

      // Validate against schema
      const validatedResult = DocumentSchema.parse(result.object);
      expect(validatedResult).toBeDefined();
    });

    it('should handle mock AI errors', async () => {
      const errorModel = new MockLanguageModelV2({
        doGenerate: async () => {
          throw new Error('Mock AI model error');
        },
      });

      const { generateObject } = await import('ai');

      await expect(
        generateObject({
          model: errorModel,
          schema: DocumentSchema,
          prompt: 'Extract information from this document.',
        })
      ).rejects.toThrow('Mock AI model error');
    });

    it('should handle invalid mock AI responses', async () => {
      const invalidModel = new MockLanguageModelV2({
        doGenerate: async () => ({
          finishReason: 'stop',
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: 'text',
              text: 'This is not valid JSON',
            },
          ],
          warnings: [],
        }),
      });

      const { generateObject } = await import('ai');

      await expect(
        generateObject({
          model: invalidModel,
          schema: DocumentSchema,
          prompt: 'Extract information from this document.',
        })
      ).rejects.toThrow();
    });

    it('should demonstrate streaming with mock AI', async () => {
      const { simulateReadableStream } = await import('ai/test');

      const streamModel = new MockLanguageModelV2({
        doStream: async () => ({
          stream: simulateReadableStream({
            chunks: [
              { type: 'text-start', id: 'text-1' },
              { type: 'text-delta', id: 'text-1', delta: 'Hello' },
              { type: 'text-delta', id: 'text-1', delta: ', ' },
              { type: 'text-delta', id: 'text-1', delta: 'world!' },
              { type: 'text-end', id: 'text-1' },
              {
                type: 'finish',
                finishReason: 'stop',
                logprobs: undefined,
                usage: { inputTokens: 3, outputTokens: 10, totalTokens: 13 },
              },
            ],
          }),
        }),
      });

      const { streamText } = await import('ai');
      const result = streamText({
        model: streamModel,
        prompt: 'Hello, test!',
      });

      expect(result).toBeDefined();
      expect(result.textStream).toBeDefined();
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
