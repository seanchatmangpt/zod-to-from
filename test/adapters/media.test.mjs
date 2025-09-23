/**
 * Media Adapter Tests
 * @fileoverview Tests for media and metadata format adapters
 */

import { describe, expect, it } from 'vitest';
import {
  exifAdapter,
  id3Adapter,
  pdfTextAdapter,
  tarAdapter,
  zipAdapter,
} from '../../src/adapters/media.mjs';

describe('Media Adapters', () => {
  describe('EXIF Adapter', () => {
    it('should throw error for parse operation', async () => {
      const input = Buffer.from('mock image data with EXIF');

      await expect(exifAdapter.parse(input)).rejects.toThrow(
        'EXIF support requires additional dependencies (exifr)'
      );
    });

    it('should throw error for format operation', async () => {
      const data = {
        camera: 'Canon EOS R5',
        lens: 'RF 24-70mm f/2.8L IS USM',
        exposure: '1/125',
        aperture: 'f/2.8',
        iso: 100,
        focalLength: '50mm',
        dateTime: '2024-01-01T12:00:00Z',
      };

      await expect(exifAdapter.format(data)).rejects.toThrow(
        'EXIF support requires additional dependencies (exifr)'
      );
    });

    it('should have correct adapter properties', () => {
      expect(exifAdapter.supportsStreaming).toBe(false);
      expect(exifAdapter.isAI).toBe(false);
      expect(exifAdapter.version).toBe('1.0.0');
    });
  });

  describe('ID3 Adapter', () => {
    it('should throw error for parse operation', async () => {
      const input = Buffer.from('mock MP3 data with ID3 tags');

      await expect(id3Adapter.parse(input)).rejects.toThrow(
        'ID3 support requires additional dependencies (node-id3)'
      );
    });

    it('should throw error for format operation', async () => {
      const data = {
        title: 'Test Song',
        artist: 'Test Artist',
        album: 'Test Album',
        year: 2024,
        genre: 'Electronic',
        track: 1,
        duration: 180,
      };

      await expect(id3Adapter.format(data)).rejects.toThrow(
        'ID3 support requires additional dependencies (node-id3)'
      );
    });

    it('should have correct adapter properties', () => {
      expect(id3Adapter.supportsStreaming).toBe(false);
      expect(id3Adapter.isAI).toBe(false);
      expect(id3Adapter.version).toBe('1.0.0');
    });
  });

  describe('PDF Text Adapter', () => {
    it('should throw error for parse operation', async () => {
      const input = Buffer.from('mock PDF data');

      await expect(pdfTextAdapter.parse(input)).rejects.toThrow(
        'PDF Text support requires additional dependencies (pdf-parse)'
      );
    });

    it('should throw error for format operation', async () => {
      const data = {
        text: 'This is extracted PDF text content.',
        pages: [
          { pageNumber: 1, text: 'Page 1 content' },
          { pageNumber: 2, text: 'Page 2 content' },
        ],
        metadata: {
          title: 'Test Document',
          author: 'Test Author',
          creationDate: '2024-01-01T12:00:00Z',
        },
      };

      await expect(pdfTextAdapter.format(data)).rejects.toThrow(
        'PDF Text support requires additional dependencies (pdf-parse)'
      );
    });

    it('should have correct adapter properties', () => {
      expect(pdfTextAdapter.supportsStreaming).toBe(false);
      expect(pdfTextAdapter.isAI).toBe(false);
      expect(pdfTextAdapter.version).toBe('1.0.0');
    });
  });

  describe('TAR Adapter', () => {
    it('should throw error for parse operation', async () => {
      const input = Buffer.from('mock TAR archive data');

      await expect(tarAdapter.parse(input)).rejects.toThrow(
        'TAR support requires additional dependencies (tar-stream)'
      );
    });

    it('should throw error for format operation', async () => {
      const data = {
        files: [
          {
            name: 'file1.txt',
            content: 'Content of file 1',
            mode: '0644',
            mtime: '2024-01-01T12:00:00Z',
          },
          {
            name: 'file2.txt',
            content: 'Content of file 2',
            mode: '0644',
            mtime: '2024-01-01T12:00:00Z',
          },
        ],
      };

      await expect(tarAdapter.format(data)).rejects.toThrow(
        'TAR support requires additional dependencies (tar-stream)'
      );
    });

    it('should have correct adapter properties', () => {
      expect(tarAdapter.supportsStreaming).toBe(true);
      expect(tarAdapter.isAI).toBe(false);
      expect(tarAdapter.version).toBe('1.0.0');
    });
  });

  describe('ZIP Adapter', () => {
    it('should throw error for parse operation', async () => {
      const input = Buffer.from('mock ZIP archive data');

      await expect(zipAdapter.parse(input)).rejects.toThrow(
        'ZIP support requires additional dependencies (jszip)'
      );
    });

    it('should throw error for format operation', async () => {
      const data = {
        files: [
          {
            name: 'document.txt',
            content: 'Document content',
            compression: 'deflate',
          },
          {
            name: 'image.jpg',
            content: Buffer.from('mock image data'),
            compression: 'store',
          },
        ],
      };

      await expect(zipAdapter.format(data)).rejects.toThrow(
        'ZIP support requires additional dependencies (jszip)'
      );
    });

    it('should have correct adapter properties', () => {
      expect(zipAdapter.supportsStreaming).toBe(false);
      expect(zipAdapter.isAI).toBe(false);
      expect(zipAdapter.version).toBe('1.0.0');
    });
  });

  describe('Adapter Consistency', () => {
    it('should have consistent version numbers', () => {
      const adapters = [exifAdapter, id3Adapter, pdfTextAdapter, tarAdapter, zipAdapter];

      for (const adapter of adapters) {
        expect(adapter.version).toBe('1.0.0');
        expect(adapter.isAI).toBe(false);
      }
    });

    it('should have consistent error messages for missing dependencies', async () => {
      const adapters = [
        { adapter: exifAdapter, dependency: 'exifr' },
        { adapter: id3Adapter, dependency: 'node-id3' },
        { adapter: pdfTextAdapter, dependency: 'pdf-parse' },
        { adapter: tarAdapter, dependency: 'tar-stream' },
        { adapter: zipAdapter, dependency: 'jszip' },
      ];

      for (const { adapter, dependency } of adapters) {
        await expect(adapter.parse('test')).rejects.toThrow(`${dependency}`);
        await expect(adapter.format({})).rejects.toThrow(`${dependency}`);
      }
    });

    it('should have appropriate streaming support flags', () => {
      // TAR should support streaming
      expect(tarAdapter.supportsStreaming).toBe(true);

      // Other adapters should not support streaming
      expect(exifAdapter.supportsStreaming).toBe(false);
      expect(id3Adapter.supportsStreaming).toBe(false);
      expect(pdfTextAdapter.supportsStreaming).toBe(false);
      expect(zipAdapter.supportsStreaming).toBe(false);
    });
  });

  describe('Media Data Formats', () => {
    it('should handle EXIF metadata structure', async () => {
      const exifData = {
        camera: 'Canon EOS R5',
        lens: 'RF 24-70mm f/2.8L IS USM',
        exposure: '1/125',
        aperture: 'f/2.8',
        iso: 100,
        focalLength: '50mm',
        dateTime: '2024-01-01T12:00:00Z',
        gps: {
          latitude: 40.7128,
          longitude: -74.006,
          altitude: 10,
        },
      };

      await expect(exifAdapter.format(exifData)).rejects.toThrow(
        'EXIF support requires additional dependencies (exifr)'
      );
    });

    it('should handle ID3 tag structure', async () => {
      const id3Data = {
        title: 'Test Song',
        artist: 'Test Artist',
        album: 'Test Album',
        year: 2024,
        genre: 'Electronic',
        track: 1,
        duration: 180,
        lyrics: 'Test lyrics content',
        albumArt: Buffer.from('mock album art'),
      };

      await expect(id3Adapter.format(id3Data)).rejects.toThrow(
        'ID3 support requires additional dependencies (node-id3)'
      );
    });

    it('should handle PDF text extraction structure', async () => {
      const pdfData = {
        text: 'This is extracted PDF text content.',
        pages: [
          { pageNumber: 1, text: 'Page 1 content' },
          { pageNumber: 2, text: 'Page 2 content' },
        ],
        metadata: {
          title: 'Test Document',
          author: 'Test Author',
          creationDate: '2024-01-01T12:00:00Z',
          pageCount: 2,
        },
      };

      await expect(pdfTextAdapter.format(pdfData)).rejects.toThrow(
        'PDF Text support requires additional dependencies (pdf-parse)'
      );
    });

    it('should handle TAR archive structure', async () => {
      const tarData = {
        files: [
          {
            name: 'file1.txt',
            content: 'Content of file 1',
            mode: '0644',
            mtime: '2024-01-01T12:00:00Z',
            type: 'file',
          },
          {
            name: 'directory/',
            mode: '0755',
            mtime: '2024-01-01T12:00:00Z',
            type: 'directory',
          },
        ],
      };

      await expect(tarAdapter.format(tarData)).rejects.toThrow(
        'TAR support requires additional dependencies (tar-stream)'
      );
    });

    it('should handle ZIP archive structure', async () => {
      const zipData = {
        files: [
          {
            name: 'document.txt',
            content: 'Document content',
            compression: 'deflate',
            crc32: 1_234_567_890,
          },
          {
            name: 'image.jpg',
            content: Buffer.from('mock image data'),
            compression: 'store',
            crc32: 987_654_321,
          },
        ],
      };

      await expect(zipAdapter.format(zipData)).rejects.toThrow(
        'ZIP support requires additional dependencies (jszip)'
      );
    });
  });
});
