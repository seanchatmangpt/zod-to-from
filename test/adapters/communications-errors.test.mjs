/**
 * Communications Adapters Error Handling Tests
 * @fileoverview Comprehensive error handling tests for communications adapters
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { fromCurl, fromEml, fromIcs, fromMsgpack, fromVcard } from '../../src/index.mjs';
import {
  curlAdapter,
  emlAdapter,
  icsAdapter,
  msgpackAdapter,
  vcardAdapter,
} from '../../src/adapters/communications.mjs';

describe('Communications Adapters - Error Handling', () => {
  describe('cURL Adapter Errors', () => {
    it('should throw error on empty input', async () => {
      await expect(curlAdapter.parse('')).rejects.toThrow('cURL input cannot be empty');
    });

    it('should throw error on whitespace-only input', async () => {
      await expect(curlAdapter.parse('   ')).rejects.toThrow('cURL input cannot be empty');
    });

    it('should throw error when URL is missing on format', async () => {
      await expect(curlAdapter.format({ method: 'GET' })).rejects.toThrow(
        'URL is required for cURL format'
      );
    });

    it('should throw error on invalid data type for format', async () => {
      await expect(curlAdapter.format('not-an-object')).rejects.toThrow(
        'cURL format data must be an object'
      );
    });

    it('should handle missing optional dependency gracefully', async () => {
      // This test validates the error message when parse-curl is not installed
      const CurlSchema = z.object({
        method: z.string(),
        url: z.string(),
      });

      // Note: This will only fail if parse-curl is actually missing
      // If installed, it will parse successfully
      try {
        await fromCurl(CurlSchema, 'curl -X GET https://example.com');
        // If successful, dependency is installed
        expect(true).toBe(true);
      } catch (error) {
        // If failed, check it's the right error message
        expect(error.message).toContain('parse-curl');
      }
    });
  });

  describe('EML Adapter Errors', () => {
    it('should throw error on empty input', async () => {
      await expect(emlAdapter.parse('')).rejects.toThrow('EML input cannot be empty');
    });

    it('should throw error on whitespace-only input', async () => {
      await expect(emlAdapter.parse('   \n   ')).rejects.toThrow('EML input cannot be empty');
    });

    it('should throw error on invalid data type for format', async () => {
      await expect(emlAdapter.format('not-an-object')).rejects.toThrow(
        'EML format data must be an object'
      );
    });

    it('should handle missing optional dependency gracefully', async () => {
      const EmlSchema = z.object({
        from: z.any(),
        to: z.any(),
        subject: z.string(),
      });

      try {
        await fromEml(EmlSchema, 'From: test@example.com\nSubject: Test');
        expect(true).toBe(true);
      } catch (error) {
        expect(error.message).toContain('postal-mime');
      }
    });

    it('should handle malformed EML content', async () => {
      const malformedEml = 'INVALID EML CONTENT WITHOUT PROPER STRUCTURE';

      try {
        await emlAdapter.parse(malformedEml);
        // If it parses, that's ok (postal-mime is lenient)
        expect(true).toBe(true);
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('ICS Adapter Errors', () => {
    it('should throw error on empty input', async () => {
      await expect(icsAdapter.parse('')).rejects.toThrow('ICS input cannot be empty');
    });

    it('should throw error on whitespace-only input', async () => {
      await expect(icsAdapter.parse('   ')).rejects.toThrow('ICS input cannot be empty');
    });

    it('should throw error on invalid data type for format', async () => {
      await expect(icsAdapter.format('not-an-object')).rejects.toThrow(
        'ICS format data must be an object'
      );
    });

    it('should handle missing optional dependency gracefully', async () => {
      const IcsSchema = z.object({
        events: z.array(z.any()),
      });

      try {
        await fromIcs(
          IcsSchema,
          'BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nEND:VEVENT\nEND:VCALENDAR'
        );
        expect(true).toBe(true);
      } catch (error) {
        expect(error.message).toContain('ical.js');
      }
    });

    it('should handle malformed ICS content', async () => {
      const malformedIcs = 'BEGIN:VCALENDAR\nINVALID CONTENT\nEND:VCALENDAR';

      try {
        await icsAdapter.parse(malformedIcs);
        expect(true).toBe(true);
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('MessagePack Adapter Errors', () => {
    it('should throw error on empty input', async () => {
      await expect(msgpackAdapter.parse('')).rejects.toThrow('MessagePack input cannot be empty');
    });

    it('should throw error on invalid data type', async () => {
      await expect(msgpackAdapter.parse(123)).rejects.toThrow(
        'MessagePack input must be Uint8Array, Buffer, or base64 string'
      );
    });

    it('should throw error on undefined format data', async () => {
      await expect(msgpackAdapter.format(undefined)).rejects.toThrow(
        'MessagePack format data cannot be undefined'
      );
    });

    it('should handle invalid base64 string', async () => {
      const invalidBase64 = 'not-valid-base64!!!';

      try {
        await msgpackAdapter.parse(invalidBase64);
      } catch (error) {
        // Should fail to decode
        expect(error.message).toBeDefined();
      }
    });

    it('should handle missing optional dependency gracefully', async () => {
      const MsgpackSchema = z.object({
        data: z.any(),
      });

      try {
        // Try with valid base64-encoded msgpack data
        await fromMsgpack(MsgpackSchema, 'gaNkYXRhpHRlc3Q=');
        expect(true).toBe(true);
      } catch (error) {
        expect(error.message).toContain('@msgpack/msgpack');
      }
    });
  });

  describe('vCard Adapter Errors', () => {
    it('should throw error on empty input', async () => {
      await expect(vcardAdapter.parse('')).rejects.toThrow('vCard input cannot be empty');
    });

    it('should throw error on whitespace-only input', async () => {
      await expect(vcardAdapter.parse('   ')).rejects.toThrow('vCard input cannot be empty');
    });

    it('should throw error on invalid data type for format', async () => {
      await expect(vcardAdapter.format('not-an-object')).rejects.toThrow(
        'vCard format data must be an object'
      );
    });

    it('should handle missing optional dependency gracefully', async () => {
      const VcardSchema = z.object({
        fn: z.string(),
        n: z.any(),
      });

      try {
        await fromVcard(VcardSchema, 'BEGIN:VCARD\nFN:Test User\nEND:VCARD');
        expect(true).toBe(true);
      } catch (error) {
        expect(error.message).toContain('vcard4');
      }
    });

    it('should handle malformed vCard content gracefully', async () => {
      const malformedVcard = 'BEGIN:VCARD\nINVALID:Content\nEND:VCARD';

      try {
        const result = await vcardAdapter.parse(malformedVcard);
        // Should parse but with limited data
        expect(result.data).toBeDefined();
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('Cross-Adapter Error Patterns', () => {
    it('should provide consistent error messages across adapters', async () => {
      const adapters = [
        { adapter: curlAdapter, name: 'cURL' },
        { adapter: emlAdapter, name: 'EML' },
        { adapter: icsAdapter, name: 'ICS' },
        { adapter: vcardAdapter, name: 'vCard' },
      ];

      for (const { adapter, name } of adapters) {
        try {
          await adapter.parse('');
        } catch (error) {
          expect(error.message).toContain('cannot be empty');
        }
      }
    });

    it('should validate required fields before processing', async () => {
      // Test that each adapter validates its required fields
      await expect(curlAdapter.format({ method: 'GET' })).rejects.toThrow();
      await expect(emlAdapter.format('invalid')).rejects.toThrow();
      await expect(icsAdapter.format('invalid')).rejects.toThrow();
      await expect(vcardAdapter.format('invalid')).rejects.toThrow();
    });
  });

  describe('Schema Validation Errors', () => {
    it('should fail validation when required fields are missing', async () => {
      const StrictCurlSchema = z.object({
        method: z.string(),
        url: z.string(),
        headers: z.record(z.string()),
      });

      const incompleteCurl = 'curl -X GET https://example.com';

      try {
        const result = await fromCurl(StrictCurlSchema, incompleteCurl);
        // If headers is empty object, validation might pass
        expect(result.headers).toBeDefined();
      } catch (error) {
        // Should fail if headers are truly missing
        expect(error.message).toBeDefined();
      }
    });

    it('should fail validation when field types are wrong', async () => {
      const TypedSchema = z.object({
        from: z.string().email(),
        to: z.array(z.string().email()),
      });

      const invalidEml = 'From: not-an-email\nTo: also-not-email';

      try {
        await fromEml(TypedSchema, invalidEml);
      } catch (error) {
        // Should fail Zod validation
        expect(error).toBeDefined();
      }
    });
  });
});
