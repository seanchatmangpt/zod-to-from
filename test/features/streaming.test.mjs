/**
 * Streaming Feature Tests
 * @fileoverview Tests for streaming functionality across adapters
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { convert, formatTo, parseFrom } from '../../src/core/main.mjs';
import { adapterSupports } from '../../src/core/registry.mjs';

describe('Streaming Features', () => {
  const StreamingSchema = z.object({
    items: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        value: z.number(),
      })
    ),
  });

  beforeEach(() => {
    // Ensure clean state for each test
  });

  describe('Streaming Support Detection', () => {
    it('should correctly identify streaming-capable adapters', () => {
      expect(adapterSupports('csv', 'streaming')).toBe(true);
      expect(adapterSupports('ndjson', 'streaming')).toBe(true);
      expect(adapterSupports('json', 'streaming')).toBe(false);
    });

    it('should return false for non-existent adapters', () => {
      expect(adapterSupports('non-existent', 'streaming')).toBe(false);
    });
  });

  describe('CSV Streaming', () => {
    it('should handle streaming CSV parsing', async () => {
      const csvInput = `id,name,value
1,Item 1,10
2,Item 2,20
3,Item 3,30`;

      const result = await parseFrom(StreamingSchema, 'csv', csvInput, { streaming: true });

      expect(result.items).toHaveLength(3);
      expect(result.items[0]).toEqual({ id: 1, name: 'Item 1', value: 10 });
      expect(result.items[1]).toEqual({ id: 2, name: 'Item 2', value: 20 });
      expect(result.items[2]).toEqual({ id: 3, name: 'Item 3', value: 30 });
    });

    it('should handle streaming CSV formatting', async () => {
      const data = {
        items: [
          { id: 1, name: 'Item 1', value: 10 },
          { id: 2, name: 'Item 2', value: 20 },
          { id: 3, name: 'Item 3', value: 30 },
        ],
      };

      const result = await formatTo(StreamingSchema, 'csv', data, { streaming: true });

      expect(result).toContain('id,name,value');
      expect(result).toContain('1,Item 1,10');
      expect(result).toContain('2,Item 2,20');
      expect(result).toContain('3,Item 3,30');
    });

    it('should handle large CSV files efficiently', async () => {
      // Generate large CSV
      const headers = 'id,name,value\n';
      const rows = Array.from(
        { length: 1000 },
        (_, i) => `${i + 1},Item ${i + 1},${(i + 1) * 10}`
      ).join('\n');
      const largeCSV = headers + rows;

      const startTime = Date.now();
      const result = await parseFrom(StreamingSchema, 'csv', largeCSV, { streaming: true });
      const endTime = Date.now();

      expect(result.items).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle streaming CSV conversion', async () => {
      const csvInput = `id,name,value
1,Item 1,10
2,Item 2,20`;

      const result = await convert(StreamingSchema, { from: 'csv', to: 'csv' }, csvInput, {
        streaming: true,
      });

      expect(result).toContain('id,name,value');
      expect(result).toContain('1,Item 1,10');
      expect(result).toContain('2,Item 2,20');
    });
  });

  describe('NDJSON Streaming', () => {
    it('should handle streaming NDJSON parsing', async () => {
      const ndjsonInput = `{"id": 1, "name": "Item 1", "value": 10}
{"id": 2, "name": "Item 2", "value": 20}
{"id": 3, "name": "Item 3", "value": 30}`;

      const result = await parseFrom(StreamingSchema, 'ndjson', ndjsonInput, { streaming: true });

      expect(result.items).toHaveLength(3);
      expect(result.items[0]).toEqual({ id: 1, name: 'Item 1', value: 10 });
      expect(result.items[1]).toEqual({ id: 2, name: 'Item 2', value: 20 });
      expect(result.items[2]).toEqual({ id: 3, name: 'Item 3', value: 30 });
    });

    it('should handle streaming NDJSON formatting', async () => {
      const data = {
        items: [
          { id: 1, name: 'Item 1', value: 10 },
          { id: 2, name: 'Item 2', value: 20 },
          { id: 3, name: 'Item 3', value: 30 },
        ],
      };

      const result = await formatTo(StreamingSchema, 'ndjson', data, { streaming: true });

      const lines = result.trim().split('\n');
      expect(lines).toHaveLength(3);
      expect(JSON.parse(lines[0])).toEqual({ id: 1, name: 'Item 1', value: 10 });
      expect(JSON.parse(lines[1])).toEqual({ id: 2, name: 'Item 2', value: 20 });
      expect(JSON.parse(lines[2])).toEqual({ id: 3, name: 'Item 3', value: 30 });
    });

    it('should handle large NDJSON files efficiently', async () => {
      // Generate large NDJSON
      const lines = Array.from({ length: 1000 }, (_, i) =>
        JSON.stringify({ id: i + 1, name: `Item ${i + 1}`, value: (i + 1) * 10 })
      ).join('\n');

      const startTime = Date.now();
      const result = await parseFrom(StreamingSchema, 'ndjson', lines, { streaming: true });
      const endTime = Date.now();

      expect(result.items).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle streaming NDJSON conversion', async () => {
      const ndjsonInput = `{"id": 1, "name": "Item 1", "value": 10}
{"id": 2, "name": "Item 2", "value": 20}`;

      const result = await convert(StreamingSchema, { from: 'ndjson', to: 'ndjson' }, ndjsonInput, {
        streaming: true,
      });

      const lines = result.trim().split('\n');
      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0])).toEqual({ id: 1, name: 'Item 1', value: 10 });
      expect(JSON.parse(lines[1])).toEqual({ id: 2, name: 'Item 2', value: 20 });
    });
  });

  describe('Cross-Format Streaming Conversion', () => {
    it('should convert CSV to NDJSON with streaming', async () => {
      const csvInput = `id,name,value
1,Item 1,10
2,Item 2,20`;

      const result = await convert(StreamingSchema, { from: 'csv', to: 'ndjson' }, csvInput, {
        streaming: true,
      });

      const lines = result.trim().split('\n');
      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0])).toEqual({ id: 1, name: 'Item 1', value: 10 });
      expect(JSON.parse(lines[1])).toEqual({ id: 2, name: 'Item 2', value: 20 });
    });

    it('should convert NDJSON to CSV with streaming', async () => {
      const ndjsonInput = `{"id": 1, "name": "Item 1", "value": 10}
{"id": 2, "name": "Item 2", "value": 20}`;

      const result = await convert(StreamingSchema, { from: 'ndjson', to: 'csv' }, ndjsonInput, {
        streaming: true,
      });

      expect(result).toContain('id,name,value');
      expect(result).toContain('1,Item 1,10');
      expect(result).toContain('2,Item 2,20');
    });

    it('should convert streaming formats to JSON', async () => {
      const csvInput = `id,name,value
1,Item 1,10
2,Item 2,20`;

      const result = await convert(StreamingSchema, { from: 'csv', to: 'json' }, csvInput, {
        streaming: true,
      });

      const parsedResult = JSON.parse(result);
      expect(parsedResult.items).toHaveLength(2);
      expect(parsedResult.items[0]).toEqual({ id: 1, name: 'Item 1', value: 10 });
      expect(parsedResult.items[1]).toEqual({ id: 2, name: 'Item 2', value: 20 });
    });

    it('should convert JSON to streaming formats', async () => {
      const jsonInput = JSON.stringify({
        items: [
          { id: 1, name: 'Item 1', value: 10 },
          { id: 2, name: 'Item 2', value: 20 },
        ],
      });

      const result = await convert(StreamingSchema, { from: 'json', to: 'csv' }, jsonInput, {
        streaming: true,
      });

      expect(result).toContain('id,name,value');
      expect(result).toContain('1,Item 1,10');
      expect(result).toContain('2,Item 2,20');
    });
  });

  describe('Streaming Error Handling', () => {
    it('should throw error for streaming on non-streaming adapters', async () => {
      const input = '{"name": "Test", "age": 30, "active": true}';

      await expect(parseFrom(StreamingSchema, 'json', input, { streaming: true })).rejects.toThrow(
        "Adapter 'json' does not support streaming"
      );
    });

    it('should handle streaming errors gracefully', async () => {
      const malformedCSV = `id,name,value
1,Item 1,10
2,Item 2`; // Missing value column

      await expect(
        parseFrom(StreamingSchema, 'csv', malformedCSV, { streaming: true })
      ).rejects.toThrow();
    });

    it('should handle large streaming operations without memory issues', async () => {
      // Generate very large CSV
      const headers = 'id,name,value\n';
      const rows = Array.from(
        { length: 10_000 },
        (_, i) => `${i + 1},Item ${i + 1},${(i + 1) * 10}`
      ).join('\n');
      const veryLargeCSV = headers + rows;

      const startTime = Date.now();
      const result = await parseFrom(StreamingSchema, 'csv', veryLargeCSV, { streaming: true });
      const endTime = Date.now();

      expect(result.items).toHaveLength(10_000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Streaming Metadata', () => {
    it('should include streaming metadata in parse results', async () => {
      const csvInput = `id,name,value
1,Item 1,10
2,Item 2,20`;

      const result = await parseFrom(StreamingSchema, 'csv', csvInput, {
        streaming: true,
        includeProvenance: true,
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('provenance');
      expect(result.provenance).toHaveProperty('adapter', 'csv');
      expect(result.provenance).toHaveProperty('sourceFormat', 'csv');
    });

    it('should include streaming metadata in format results', async () => {
      const data = {
        items: [{ id: 1, name: 'Item 1', value: 10 }],
      };

      const result = await formatTo(StreamingSchema, 'csv', data, {
        streaming: true,
        includeProvenance: true,
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('provenance');
      expect(result.provenance).toHaveProperty('adapter', 'csv');
      expect(result.provenance).toHaveProperty('targetFormat', 'csv');
    });
  });

  describe('Streaming Performance', () => {
    it('should demonstrate streaming performance benefits', async () => {
      // Generate large dataset
      const headers = 'id,name,value\n';
      const rows = Array.from(
        { length: 5000 },
        (_, i) => `${i + 1},Item ${i + 1},${(i + 1) * 10}`
      ).join('\n');
      const largeCSV = headers + rows;

      // Test with streaming
      const streamingStart = Date.now();
      const streamingResult = await parseFrom(StreamingSchema, 'csv', largeCSV, {
        streaming: true,
      });
      const streamingEnd = Date.now();
      const streamingTime = streamingEnd - streamingStart;

      // Test without streaming (should be same for CSV, but demonstrates the API)
      const nonStreamingStart = Date.now();
      const nonStreamingResult = await parseFrom(StreamingSchema, 'csv', largeCSV, {
        streaming: false,
      });
      const nonStreamingEnd = Date.now();
      const nonStreamingTime = nonStreamingEnd - nonStreamingStart;

      expect(streamingResult.items).toHaveLength(5000);
      expect(nonStreamingResult.items).toHaveLength(5000);
      expect(streamingResult.items).toEqual(nonStreamingResult.items);

      // Both should complete reasonably quickly
      expect(streamingTime).toBeLessThan(2000);
      expect(nonStreamingTime).toBeLessThan(2000);
    });
  });
});
