/**
 * Test AI Adapter Format Error Messages
 * Verifies that AI adapters provide helpful error messages when format is attempted
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { docxAiAdapter, pptxAiAdapter, xlsxAiAdapter } from '../src/adapters/ai.mjs';

describe('AI Adapter Format Error Messages', () => {
  describe('docx-ai adapter', () => {
    it('should throw informative error with alternatives', async () => {
      await assert.rejects(
        async () => docxAiAdapter.format({ test: 'data' }),
        (error) => {
          assert.ok(error.message.includes('❌ AI-assisted formatting'));
          assert.ok(error.message.includes('to:docx-ai'));
          assert.ok(error.message.includes('non-deterministic'));
          assert.ok(error.message.includes('✅ Recommended alternatives'));
          assert.ok(error.message.includes('"docx"'));
          assert.ok(error.message.includes('"docx-table"'));
          assert.ok(error.message.includes('"html"'));
          assert.ok(error.message.includes('💡 Example:'));
          return true;
        }
      );
    });
  });

  describe('pptx-ai adapter', () => {
    it('should throw informative error with alternatives', async () => {
      await assert.rejects(
        async () => pptxAiAdapter.format({ slides: [] }),
        (error) => {
          assert.ok(error.message.includes('❌ AI-assisted formatting'));
          assert.ok(error.message.includes('to:pptx-ai'));
          assert.ok(error.message.includes('non-deterministic'));
          assert.ok(error.message.includes('✅ Recommended alternatives'));
          assert.ok(error.message.includes('"pptx"'));
          assert.ok(error.message.includes('"pptx-slides"'));
          assert.ok(error.message.includes('"html"'));
          assert.ok(error.message.includes('💡 Example:'));
          return true;
        }
      );
    });
  });

  describe('xlsx-ai adapter', () => {
    it('should throw informative error with alternatives', async () => {
      await assert.rejects(
        async () => xlsxAiAdapter.format({ data: [] }),
        (error) => {
          assert.ok(error.message.includes('❌ AI-assisted formatting'));
          assert.ok(error.message.includes('to:xlsx-ai'));
          assert.ok(error.message.includes('non-deterministic'));
          assert.ok(error.message.includes('✅ Recommended alternatives'));
          assert.ok(error.message.includes('"xlsx"'));
          assert.ok(error.message.includes('"csv"'));
          assert.ok(error.message.includes('"json"'));
          assert.ok(error.message.includes('💡 Example:'));
          return true;
        }
      );
    });
  });

  describe('AI adapter metadata', () => {
    it('should mark adapters as AI-assisted', () => {
      assert.strictEqual(docxAiAdapter.isAI, true);
      assert.strictEqual(pptxAiAdapter.isAI, true);
      assert.strictEqual(xlsxAiAdapter.isAI, true);
    });

    it('should not support streaming', () => {
      assert.strictEqual(docxAiAdapter.supportsStreaming, false);
      assert.strictEqual(pptxAiAdapter.supportsStreaming, false);
      assert.strictEqual(xlsxAiAdapter.supportsStreaming, false);
    });

    it('should have version specified', () => {
      assert.strictEqual(docxAiAdapter.version, '1.0.0');
      assert.strictEqual(pptxAiAdapter.version, '1.0.0');
      assert.strictEqual(xlsxAiAdapter.version, '1.0.0');
    });
  });
});
