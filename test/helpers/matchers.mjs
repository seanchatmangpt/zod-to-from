/**
 * Custom Test Matchers
 * Extend vitest with domain-specific assertions
 */

import { expect } from 'vitest';

/**
 * Check if adapter result has valid metadata
 */
export function toHaveValidMetadata(result) {
  const { data, metadata } = result;

  const hasData = data !== undefined;
  const hasMetadata = metadata !== undefined && typeof metadata === 'object';
  const hasFormat = metadata?.format !== undefined;

  return {
    pass: hasData && hasMetadata && hasFormat,
    message: () =>
      this.isNot
        ? `Expected result NOT to have valid metadata`
        : `Expected result to have valid metadata with data, metadata object, and format`,
    actual: result,
  };
}

/**
 * Check if string contains valid format syntax
 */
export function toBeValidFormat(str, format) {
  const validators = {
    json: (s) => {
      try {
        JSON.parse(s);
        return true;
      } catch {
        return false;
      }
    },
    yaml: (s) => s.includes(':') && !s.includes('{'),
    xml: (s) => s.trim().startsWith('<') && s.includes('</'),
    csv: (s) => s.includes(',') || s.includes('\n'),
    html: (s) => s.includes('<html') || s.includes('<div') || s.includes('<p'),
    md: (s) => s.includes('#') || s.includes('**') || s.includes('-'),
    toml: (s) => s.includes('=') && !s.includes(':'),
    env: (s) => /^[A-Z_]+=.+/m.test(s),
  };

  const validator = validators[format];
  const isValid = validator ? validator(str) : true;

  return {
    pass: isValid,
    message: () =>
      this.isNot
        ? `Expected string NOT to be valid ${format}`
        : `Expected string to be valid ${format}, got: ${str.slice(0, 100)}...`,
    actual: str,
  };
}

/**
 * Check if execution time is within limit
 */
export function toCompleteWithin(fn, maxMs) {
  return async () => {
    const start = Date.now();
    await fn();
    const duration = Date.now() - start;

    return {
      pass: duration <= maxMs,
      message: () =>
        this.isNot
          ? `Expected execution NOT to complete within ${maxMs}ms`
          : `Expected execution within ${maxMs}ms, took ${duration}ms`,
      actual: duration,
    };
  };
}

/**
 * Check if data matches schema structure
 */
export function toMatchSchema(data, schema) {
  try {
    schema.parse(data);
    return {
      pass: true,
      message: () => `Expected data NOT to match schema`,
      actual: data,
    };
  } catch (error) {
    return {
      pass: false,
      message: () => `Expected data to match schema: ${error.message}`,
      actual: data,
      expected: schema,
    };
  }
}

// Register custom matchers
expect.extend({
  toHaveValidMetadata,
  toBeValidFormat,
  toMatchSchema,
});
