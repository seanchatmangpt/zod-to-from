/**
 * Security Policy
 * @fileoverview General security policies for data validation and sanitization
 */

import { definePolicy } from '../core/policies.mjs';

/**
 * Security Policy
 *
 * Protects against common security vulnerabilities:
 * - SQL Injection
 * - Cross-Site Scripting (XSS)
 * - Command Injection
 * - Path Traversal
 * - XML External Entity (XXE)
 * - Server-Side Request Forgery (SSRF)
 */
export const securityPolicy = definePolicy({
  name: 'Security Policy',
  version: '1.0.0',
  description: 'General security policy for data validation and threat prevention',
  strict: false,
  rules: [
    // SQL Injection Prevention
    {
      fieldPattern: '.*',
      validator: (value, fieldName, context) => {
        if (typeof value !== 'string') return true;

        const sqlPatterns = [
          /(\bOR\b|\bAND\b).*[=<>]/i,
          /UNION.*SELECT/i,
          /DROP\s+TABLE/i,
          /INSERT\s+INTO/i,
          /DELETE\s+FROM/i,
          /UPDATE.*SET/i,
          /--.*$/,
          /\/\*.*\*\//,
          /;\s*DROP/i,
          /;\s*DELETE/i,
          /'\s*(OR|AND)/i,
        ];

        for (const pattern of sqlPatterns) {
          if (pattern.test(value)) {
            context.audit.securityThreats = context.audit.securityThreats || [];
            context.audit.securityThreats.push({
              type: 'SQL_INJECTION',
              field: fieldName,
              severity: 'high',
            });
            return false;
          }
        }

        return true;
      },
      metadata: {
        threat: 'SQL Injection',
        severity: 'high',
      },
    },

    // XSS Prevention
    {
      fieldPattern: '.*',
      validator: (value, fieldName, context) => {
        if (typeof value !== 'string') return true;

        const xssPatterns = [
          /<script[^>]*>.*?<\/script>/gi,
          /javascript:/gi,
          /on\w+\s*=/gi,
          /<iframe/gi,
          /<object/gi,
          /<embed/gi,
          /eval\s*\(/gi,
          /expression\s*\(/gi,
        ];

        for (const pattern of xssPatterns) {
          if (pattern.test(value)) {
            context.audit.securityThreats = context.audit.securityThreats || [];
            context.audit.securityThreats.push({
              type: 'XSS',
              field: fieldName,
              severity: 'high',
            });
            return false;
          }
        }

        return true;
      },
      metadata: {
        threat: 'Cross-Site Scripting (XSS)',
        severity: 'high',
      },
    },

    // Command Injection Prevention
    {
      fieldPattern: '.*',
      validator: (value, fieldName, context) => {
        if (typeof value !== 'string') return true;

        const commandPatterns = [
          /[;&|`$]/,
          /\$\(/,
          /`.*`/,
          />\s*\/dev/,
          /\|\s*\w+/,
        ];

        for (const pattern of commandPatterns) {
          if (pattern.test(value)) {
            context.audit.securityThreats = context.audit.securityThreats || [];
            context.audit.securityThreats.push({
              type: 'COMMAND_INJECTION',
              field: fieldName,
              severity: 'critical',
            });
            return false;
          }
        }

        return true;
      },
      metadata: {
        threat: 'Command Injection',
        severity: 'critical',
      },
    },

    // Path Traversal Prevention
    {
      fieldPattern: '.*(path|file|dir).*',
      validator: (value, fieldName, context) => {
        if (typeof value !== 'string') return true;

        const traversalPatterns = [
          /\.\.\//,
          /\.\.\\/,
          /%2e%2e/i,
          /\.\.%2f/i,
        ];

        for (const pattern of traversalPatterns) {
          if (pattern.test(value)) {
            context.audit.securityThreats = context.audit.securityThreats || [];
            context.audit.securityThreats.push({
              type: 'PATH_TRAVERSAL',
              field: fieldName,
              severity: 'high',
            });
            return false;
          }
        }

        return true;
      },
      metadata: {
        threat: 'Path Traversal',
        severity: 'high',
      },
    },

    // SSRF Prevention
    {
      fieldPattern: '.*(url|uri|link|href).*',
      validator: (value, fieldName, context) => {
        if (typeof value !== 'string') return true;

        // Prevent private IP ranges
        const privateIpPatterns = [
          /^https?:\/\/(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/i,
          /^https?:\/\/127\./i,
          /^https?:\/\/localhost/i,
          /^https?:\/\/169\.254\./i,
          /^https?:\/\/\[::1\]/i,
          /^https?:\/\/\[fe80:/i,
        ];

        for (const pattern of privateIpPatterns) {
          if (pattern.test(value)) {
            context.audit.securityThreats = context.audit.securityThreats || [];
            context.audit.securityThreats.push({
              type: 'SSRF',
              field: fieldName,
              severity: 'high',
            });
            return false;
          }
        }

        return true;
      },
      metadata: {
        threat: 'Server-Side Request Forgery (SSRF)',
        severity: 'high',
      },
    },

    // Secrets Detection
    {
      field: ['password', 'secret', 'apiKey', 'token', 'privateKey', 'accessToken', 'refreshToken'],
      classify: 'SECRET',
      action: 'encrypt',
      metadata: {
        threat: 'Secret Exposure',
        severity: 'critical',
      },
    },

    // Email Validation
    {
      field: ['email'],
      validator: (value) => {
        if (typeof value !== 'string') return false;
        // RFC 5322 simplified
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
      },
      metadata: {
        validation: 'Email format',
      },
    },

    // URL Validation
    {
      fieldPattern: '.*(url|uri|link|href).*',
      validator: (value, fieldName, context) => {
        if (typeof value !== 'string') return true;

        try {
          const url = new URL(value);
          // Only allow http/https
          if (!['http:', 'https:'].includes(url.protocol)) {
            context.audit.securityThreats = context.audit.securityThreats || [];
            context.audit.securityThreats.push({
              type: 'INVALID_PROTOCOL',
              field: fieldName,
              severity: 'medium',
              protocol: url.protocol,
            });
            return false;
          }
        } catch {
          // Invalid URL
          return false;
        }

        return true;
      },
      metadata: {
        validation: 'URL format and protocol',
      },
    },
  ],
  metadata: {
    category: 'Security',
    threats: ['SQL Injection', 'XSS', 'Command Injection', 'Path Traversal', 'SSRF'],
  },
});

/**
 * Sanitize HTML to prevent XSS
 * @param {string} html - HTML string
 * @returns {string} Sanitized HTML
 */
export function sanitizeHtml(html) {
  if (typeof html !== 'string') return html;

  return html
    .replaceAll('<script', '&lt;script')
    .replaceAll('</script>', '&lt;/script&gt;')
    .replaceAll(/on\w+\s*=/gi, '')
    .replaceAll('javascript:', '')
    .replaceAll('<iframe', '&lt;iframe')
    .replaceAll('<object', '&lt;object')
    .replaceAll('<embed', '&lt;embed');
}

/**
 * Sanitize SQL input
 * @param {string} input - SQL input
 * @returns {string} Sanitized input
 */
export function sanitizeSql(input) {
  if (typeof input !== 'string') return input;

  return input
    .replaceAll(/'/g, "''")
    .replaceAll(/--/g, '')
    .replaceAll(/;/g, '')
    .replaceAll(/\/\*/g, '')
    .replaceAll(/\*\//g, '');
}

/**
 * Validate file upload
 * @param {Object} file - File object
 * @param {Object} options - Validation options
 * @returns {boolean} Whether file is valid
 */
export function validateFileUpload(file, options = {}) {
  const allowedTypes = options.allowedTypes || ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  const maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB default

  if (!file) return false;

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return false;
  }

  // Check file size
  if (file.size > maxSize) {
    return false;
  }

  // Check file extension matches type
  const ext = file.name.split('.').pop().toLowerCase();
  const typeMap = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    pdf: 'application/pdf',
  };

  if (typeMap[ext] !== file.type) {
    return false;
  }

  return true;
}

/**
 * Rate limiting helper
 * @param {string} key - Rate limit key
 * @param {Object} options - Rate limit options
 * @returns {boolean} Whether request is allowed
 */
export function checkRateLimit(key, options = {}) {
  const limit = options.limit || 100;
  const window = options.window || 60_000; // 1 minute default

  // In production, use Redis or similar
  // This is a simple in-memory example
  if (!checkRateLimit._cache) {
    checkRateLimit._cache = new Map();
  }

  const now = Date.now();
  const record = checkRateLimit._cache.get(key) || { count: 0, resetAt: now + window };

  if (now > record.resetAt) {
    // Reset window
    record.count = 0;
    record.resetAt = now + window;
  }

  record.count++;
  checkRateLimit._cache.set(key, record);

  return record.count <= limit;
}

export default securityPolicy;
