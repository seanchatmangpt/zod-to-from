/**
 * Security Policy Tests
 * @fileoverview Tests for security policy enforcement
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { enforcePolicy } from '../../src/core/policies.mjs';
import {
  checkRateLimit,
  sanitizeHtml,
  sanitizeSql,
  securityPolicy,
  validateFileUpload,
} from '../../src/policies/security.mjs';

describe('Security Policy', () => {
  describe('securityPolicy', () => {
    it('should detect SQL injection attempts', async () => {
      const data = {
        username: "admin' OR '1'='1",
      };

      const result = await enforcePolicy(securityPolicy, data);

      expect(result.valid).toBe(false);
      expect(result.audit.securityThreats).toBeDefined();
      expect(result.audit.securityThreats[0].type).toBe('SQL_INJECTION');
    });

    it('should detect XSS attempts', async () => {
      const data = {
        comment: '<script>alert("XSS")</script>',
      };

      const result = await enforcePolicy(securityPolicy, data);

      expect(result.valid).toBe(false);
      expect(result.audit.securityThreats).toBeDefined();
      expect(result.audit.securityThreats[0].type).toBe('XSS');
    });

    it('should detect command injection attempts', async () => {
      const data = {
        filename: 'file.txt; rm -rf /',
      };

      const result = await enforcePolicy(securityPolicy, data);

      expect(result.valid).toBe(false);
      expect(result.audit.securityThreats).toBeDefined();
      expect(result.audit.securityThreats[0].type).toBe('COMMAND_INJECTION');
    });

    it('should detect path traversal attempts', async () => {
      const data = {
        filepath: '../../etc/passwd',
      };

      const result = await enforcePolicy(securityPolicy, data);

      expect(result.valid).toBe(false);
      expect(result.audit.securityThreats).toBeDefined();
      expect(result.audit.securityThreats[0].type).toBe('PATH_TRAVERSAL');
    });

    it('should detect SSRF attempts', async () => {
      const data = {
        webhookUrl: 'http://169.254.169.254/latest/meta-data/',
      };

      const result = await enforcePolicy(securityPolicy, data);

      expect(result.valid).toBe(false);
      expect(result.audit.securityThreats).toBeDefined();
      expect(result.audit.securityThreats[0].type).toBe('SSRF');
    });

    it('should encrypt secrets', async () => {
      const data = {
        password: 'secret123',
        apiKey: 'key-12345',
        token: 'bearer-token',
      };

      const result = await enforcePolicy(securityPolicy, data);

      expect(result.data.password).toContain('ENC[');
      expect(result.data.apiKey).toContain('ENC[');
      expect(result.data.token).toContain('ENC[');
    });

    it('should validate email format', async () => {
      const validData = { email: 'user@example.com' };
      const invalidData = { email: 'not-an-email' };

      const validResult = await enforcePolicy(securityPolicy, validData);
      const invalidResult = await enforcePolicy(securityPolicy, invalidData);

      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
    });

    it('should validate URL protocols', async () => {
      const validData = { url: 'https://example.com' };
      const invalidData = { url: 'ftp://example.com' };

      const validResult = await enforcePolicy(securityPolicy, validData);
      const invalidResult = await enforcePolicy(securityPolicy, invalidData);

      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
    });
  });

  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const html = '<div>Hello <script>alert("XSS")</script> World</div>';
      const sanitized = sanitizeHtml(html);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;script');
    });

    it('should remove event handlers', () => {
      const html = '<div onclick="alert()">Click</div>';
      const sanitized = sanitizeHtml(html);

      expect(sanitized).not.toContain('onclick=');
    });

    it('should remove javascript: protocol', () => {
      const html = '<a href="javascript:alert()">Link</a>';
      const sanitized = sanitizeHtml(html);

      expect(sanitized).not.toContain('javascript:');
    });

    it('should remove iframes', () => {
      const html = '<iframe src="evil.com"></iframe>';
      const sanitized = sanitizeHtml(html);

      expect(sanitized).toContain('&lt;iframe');
    });
  });

  describe('sanitizeSql', () => {
    it('should escape single quotes', () => {
      const input = "O'Reilly";
      const sanitized = sanitizeSql(input);

      expect(sanitized).toBe("O''Reilly");
    });

    it('should remove SQL comments', () => {
      const input = 'SELECT * FROM users -- comment';
      const sanitized = sanitizeSql(input);

      expect(sanitized).not.toContain('--');
    });

    it('should remove semicolons', () => {
      const input = 'DROP TABLE users;';
      const sanitized = sanitizeSql(input);

      expect(sanitized).not.toContain(';');
    });
  });

  describe('validateFileUpload', () => {
    it('should validate allowed file types', () => {
      const validFile = {
        name: 'image.jpg',
        type: 'image/jpeg',
        size: 1024 * 1024, // 1MB
      };

      expect(validateFileUpload(validFile)).toBe(true);
    });

    it('should reject disallowed file types', () => {
      const invalidFile = {
        name: 'script.exe',
        type: 'application/x-msdownload',
        size: 1024,
      };

      expect(validateFileUpload(invalidFile)).toBe(false);
    });

    it('should reject files exceeding size limit', () => {
      const largeFile = {
        name: 'image.jpg',
        type: 'image/jpeg',
        size: 20 * 1024 * 1024, // 20MB (20971520)
      };

      expect(validateFileUpload(largeFile)).toBe(false);
    });

    it('should detect mismatched extensions', () => {
      const mismatchedFile = {
        name: 'image.jpg',
        type: 'application/pdf',
        size: 1024,
      };

      expect(validateFileUpload(mismatchedFile)).toBe(false);
    });
  });

  describe('checkRateLimit', () => {
    beforeEach(() => {
      // Clear rate limit cache
      if (checkRateLimit._cache) {
        checkRateLimit._cache.clear();
      }
    });

    it('should allow requests within limit', () => {
      const key = 'test-user-1';

      for (let i = 0; i < 10; i++) {
        expect(checkRateLimit(key, { limit: 10, window: 60_000 })).toBe(true);
      }
    });

    it('should block requests exceeding limit', () => {
      const key = 'test-user-2';

      for (let i = 0; i < 5; i++) {
        checkRateLimit(key, { limit: 5, window: 60_000 });
      }

      expect(checkRateLimit(key, { limit: 5, window: 60_000 })).toBe(false);
    });
  });
});
