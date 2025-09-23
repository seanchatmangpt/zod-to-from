/**
 * Communications Adapter Tests
 * @fileoverview Tests for communications format adapters
 */

import { describe, expect, it } from 'vitest';
import {
  curlAdapter,
  emlAdapter,
  icsAdapter,
  msgpackAdapter,
  vcardAdapter,
} from '../../src/adapters/communications.mjs';

describe('Communications Adapters', () => {
  describe('cURL Adapter', () => {
    it('should parse cURL command successfully', async () => {
      const input = 'curl -X GET https://api.example.com';

      const result = await curlAdapter.parse(input);
      expect(result.data).toHaveProperty('method', 'GET');
      expect(result.data).toHaveProperty('url', 'https://api.example.com');
      expect(result.metadata).toHaveProperty('inputSize');
    });

    it('should format HTTP request to cURL command', async () => {
      const data = { method: 'GET', url: 'https://api.example.com' };

      const result = await curlAdapter.format(data);
      expect(result.data).toContain('curl -X GET');
      expect(result.data).toContain('https://api.example.com');
      expect(result.metadata).toHaveProperty('outputSize');
    });

    it('should handle cURL with headers and data', async () => {
      const data = {
        method: 'POST',
        url: 'https://api.example.com',
        headers: { 'Content-Type': 'application/json' },
        data: { key: 'value' },
      };

      const result = await curlAdapter.format(data);
      expect(result.data).toContain('curl -X POST');
      expect(result.data).toContain('Content-Type: application/json');
      expect(result.data).toContain('{"key":"value"}');
    });

    it('should have correct adapter properties', () => {
      expect(curlAdapter.supportsStreaming).toBe(false);
      expect(curlAdapter.isAI).toBe(false);
      expect(curlAdapter.version).toBe('1.0.0');
    });
  });

  describe('EML Adapter', () => {
    it('should parse EML content successfully', async () => {
      const input =
        'From: sender@example.com\nTo: recipient@example.com\nSubject: Test\n\nTest message body';

      const result = await emlAdapter.parse(input);
      expect(result.data).toHaveProperty('from');
      expect(result.data).toHaveProperty('to');
      expect(result.data).toHaveProperty('subject', 'Test');
      expect(result.metadata).toHaveProperty('inputSize');
    });

    it('should format email data to EML', async () => {
      const data = {
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        subject: 'Test',
        text: 'Test message',
      };

      const result = await emlAdapter.format(data);
      expect(result.data).toContain('From: sender@example.com');
      expect(result.data).toContain('Subject: Test');
      expect(result.data).toContain('Test message');
      expect(result.metadata).toHaveProperty('outputSize');
    });

    it('should handle email with HTML content', async () => {
      const data = {
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        subject: 'HTML Test',
        html: '<p>HTML message</p>',
      };

      const result = await emlAdapter.format(data);
      expect(result.data).toContain('Content-Type: text/html');
      expect(result.data).toContain('<p>HTML message</p>');
    });

    it('should have correct adapter properties', () => {
      expect(emlAdapter.supportsStreaming).toBe(false);
      expect(emlAdapter.isAI).toBe(false);
      expect(emlAdapter.version).toBe('1.0.0');
    });
  });

  describe('ICS Adapter', () => {
    it('should parse ICS content successfully', async () => {
      const input = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
DTSTART:20240101T120000Z
DTEND:20240101T130000Z
SUMMARY:Test Event
END:VEVENT
END:VCALENDAR`;

      const result = await icsAdapter.parse(input);
      expect(result.data).toHaveProperty('events');
      expect(result.data.events).toHaveLength(1);
      expect(result.data.events[0]).toHaveProperty('summary', 'Test Event');
      expect(result.metadata).toHaveProperty('eventCount', 1);
    });

    it('should format calendar data to ICS', async () => {
      const data = {
        events: [
          {
            uid: 'test-event-1',
            summary: 'Test Event',
            startDate: '2024-01-01T12:00:00Z',
            endDate: '2024-01-01T13:00:00Z',
          },
        ],
      };

      const result = await icsAdapter.format(data);
      expect(result.data).toContain('BEGIN:VCALENDAR');
      expect(result.data).toContain('SUMMARY:Test Event');
      expect(result.data).toContain('END:VCALENDAR');
      expect(result.metadata).toHaveProperty('eventCount', 1);
    });

    it('should handle calendar with multiple events', async () => {
      const data = {
        events: [
          {
            uid: 'event-1',
            summary: 'Event 1',
            startDate: '2024-01-01T12:00:00Z',
            endDate: '2024-01-01T13:00:00Z',
          },
          {
            uid: 'event-2',
            summary: 'Event 2',
            startDate: '2024-01-02T12:00:00Z',
            endDate: '2024-01-02T13:00:00Z',
          },
        ],
      };

      const result = await icsAdapter.format(data);
      expect(result.data).toContain('Event 1');
      expect(result.data).toContain('Event 2');
      expect(result.metadata).toHaveProperty('eventCount', 2);
    });

    it('should have correct adapter properties', () => {
      expect(icsAdapter.supportsStreaming).toBe(false);
      expect(icsAdapter.isAI).toBe(false);
      expect(icsAdapter.version).toBe('1.0.0');
    });
  });

  describe('MessagePack Adapter', () => {
    it('should parse MessagePack data successfully', async () => {
      const input = Buffer.from([0x81, 0xa3, 0x6b, 0x65, 0x79, 0xa5, 0x76, 0x61, 0x6c, 0x75, 0x65]);

      const result = await msgpackAdapter.parse(input);
      expect(result.data).toEqual({ key: 'value' });
      expect(result.metadata).toHaveProperty('isBinary', true);
      expect(result.metadata).toHaveProperty('format', 'msgpack');
    });

    it('should format data to MessagePack', async () => {
      const data = { key: 'value', number: 42, array: [1, 2, 3] };

      const result = await msgpackAdapter.format(data);
      expect(result.data).toBeTruthy();
      expect(typeof result.data).toBe('string'); // base64 string
      expect(result.metadata).toHaveProperty('isBinary', true);
      expect(result.metadata).toHaveProperty('compressionRatio');
    });

    it('should handle complex data structures', async () => {
      const data = {
        nested: { key: 'value' },
        array: [1, 2, { nested: true }],
        boolean: true,
        null: null,
      };

      const result = await msgpackAdapter.format(data);
      expect(result.data).toBeTruthy();
      expect(result.metadata.compressionRatio).toBeLessThan(1); // Should be compressed
    });

    it('should have correct adapter properties', () => {
      expect(msgpackAdapter.supportsStreaming).toBe(true);
      expect(msgpackAdapter.isAI).toBe(false);
      expect(msgpackAdapter.version).toBe('1.0.0');
    });
  });

  describe('vCard Adapter', () => {
    it('should parse vCard content successfully', async () => {
      const input = `BEGIN:VCARD
VERSION:3.0
FN:John Doe
EMAIL:john@example.com
TEL:+1234567890
END:VCARD`;

      const result = await vcardAdapter.parse(input);
      expect(result.data).toHaveProperty('fn');
      expect(result.data).toHaveProperty('email');
      expect(result.metadata).toHaveProperty('inputSize');
    });

    it('should format contact data to vCard', async () => {
      const data = {
        fn: 'John Doe',
        email: [{ value: 'john@example.com' }],
        tel: [{ value: '+1234567890' }],
      };

      const result = await vcardAdapter.format(data);
      expect(result.data).toContain('BEGIN:VCARD');
      expect(result.data).toContain('FN:John Doe');
      expect(result.data).toContain('END:VCARD');
      expect(result.metadata).toHaveProperty('outputSize');
    });

    it('should handle vCard with multiple contact methods', async () => {
      const data = {
        fn: 'Jane Smith',
        email: [{ value: 'jane@example.com' }, { value: 'jane.work@company.com' }],
        tel: [{ value: '+1234567890' }, { value: '+0987654321' }],
        adr: [
          {
            value: {
              street: '123 Main St',
              city: 'Anytown',
              region: 'ST',
              postalCode: '12345',
              country: 'USA',
            },
          },
        ],
      };

      const result = await vcardAdapter.format(data);
      expect(result.data).toContain('jane@example.com');
      expect(result.data).toContain('jane.work@company.com');
      expect(result.data).toContain('+1234567890');
      expect(result.data).toContain('+0987654321');
    });

    it('should have correct adapter properties', () => {
      expect(vcardAdapter.supportsStreaming).toBe(false);
      expect(vcardAdapter.isAI).toBe(false);
      expect(vcardAdapter.version).toBe('1.0.0');
    });
  });

  describe('Adapter Consistency', () => {
    it('should have consistent version numbers', () => {
      const adapters = [curlAdapter, emlAdapter, icsAdapter, msgpackAdapter, vcardAdapter];

      for (const adapter of adapters) {
        expect(adapter.version).toBe('1.0.0');
        expect(adapter.isAI).toBe(false);
      }
    });

    it('should have appropriate streaming support flags', () => {
      // MessagePack should support streaming
      expect(msgpackAdapter.supportsStreaming).toBe(true);

      // Other adapters should not support streaming
      expect(curlAdapter.supportsStreaming).toBe(false);
      expect(emlAdapter.supportsStreaming).toBe(false);
      expect(icsAdapter.supportsStreaming).toBe(false);
      expect(vcardAdapter.supportsStreaming).toBe(false);
    });

    it('should handle empty input gracefully', async () => {
      await expect(curlAdapter.parse('')).rejects.toThrow('cURL input cannot be empty');
      await expect(emlAdapter.parse('')).rejects.toThrow('EML input cannot be empty');
      await expect(icsAdapter.parse('')).rejects.toThrow('ICS input cannot be empty');
      await expect(vcardAdapter.parse('')).rejects.toThrow('vCard input cannot be empty');
    });

    it('should handle invalid input gracefully', async () => {
      await expect(curlAdapter.parse('invalid curl')).rejects.toThrow();
      // EML and vCard adapters are more permissive and can parse basic text
      await expect(icsAdapter.parse('invalid ics')).rejects.toThrow();
    });
  });
});
