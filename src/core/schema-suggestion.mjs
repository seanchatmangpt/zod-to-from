/**
 * Schema Suggestion Engine - Recommend improvements and optimizations
 * @fileoverview Suggest better schemas based on patterns and best practices
 */

import { z } from 'zod';

/**
 * @typedef {Object} Suggestion
 * @property {string} type - Suggestion type ('pattern'|'optimization'|'validation'|'security')
 * @property {string} field - Field path
 * @property {string} message - Human-readable message
 * @property {string} currentType - Current type/schema
 * @property {string} suggestedType - Suggested type/schema
 * @property {number} confidence - Confidence in suggestion (0-1)
 * @property {string} [code] - Code snippet to apply suggestion
 */

/**
 * @typedef {Object} SuggestionOptions
 * @property {boolean} [includePatterns] - Suggest pattern-based refinements
 * @property {boolean} [includeOptimizations] - Suggest optimizations
 * @property {boolean} [includeValidations] - Suggest additional validations
 * @property {boolean} [includeSecurity] - Suggest security improvements
 * @property {number} [minConfidence] - Minimum confidence threshold
 */

/**
 * Analyze schema and suggest improvements
 * @param {import('zod').ZodSchema} schema - Schema to analyze
 * @param {any[]} samples - Sample data
 * @param {SuggestionOptions} [opts] - Options
 * @returns {Suggestion[]} Array of suggestions
 */
export function suggestImprovements(schema, samples, opts = {}) {
  const options = {
    includePatterns: true,
    includeOptimizations: true,
    includeValidations: true,
    includeSecurity: true,
    minConfidence: 0.7,
    ...opts,
  };

  const suggestions = [];

  // Analyze samples for patterns
  if (options.includePatterns) {
    suggestions.push(...detectPatterns(samples));
  }

  // Suggest optimizations
  if (options.includeOptimizations) {
    suggestions.push(...suggestOptimizations(schema, samples));
  }

  // Suggest additional validations
  if (options.includeValidations) {
    suggestions.push(...suggestValidations(samples));
  }

  // Suggest security improvements
  if (options.includeSecurity) {
    suggestions.push(...suggestSecurityImprovements(samples));
  }

  // Filter by confidence
  return suggestions.filter(s => s.confidence >= options.minConfidence);
}

/**
 * Detect patterns in string fields
 * @param {any[]} samples - Sample data
 * @returns {Suggestion[]}
 */
function detectPatterns(samples) {
  const suggestions = [];
  const fieldPatterns = analyzeStringPatterns(samples);

  for (const [field, patterns] of Object.entries(fieldPatterns)) {
    // Email pattern
    if (patterns.email > 0.8) {
      suggestions.push({
        type: 'pattern',
        field,
        message: `Field "${field}" appears to contain email addresses`,
        currentType: 'z.string()',
        suggestedType: 'z.string().email()',
        confidence: patterns.email,
        code: `${field}: z.string().email()`,
      });
    }

    // URL pattern
    if (patterns.url > 0.8) {
      suggestions.push({
        type: 'pattern',
        field,
        message: `Field "${field}" appears to contain URLs`,
        currentType: 'z.string()',
        suggestedType: 'z.string().url()',
        confidence: patterns.url,
        code: `${field}: z.string().url()`,
      });
    }

    // UUID pattern
    if (patterns.uuid > 0.8) {
      suggestions.push({
        type: 'pattern',
        field,
        message: `Field "${field}" appears to contain UUIDs`,
        currentType: 'z.string()',
        suggestedType: 'z.string().uuid()',
        confidence: patterns.uuid,
        code: `${field}: z.string().uuid()`,
      });
    }

    // Date/time pattern
    if (patterns.datetime > 0.8) {
      suggestions.push({
        type: 'pattern',
        field,
        message: `Field "${field}" appears to contain ISO datetime strings`,
        currentType: 'z.string()',
        suggestedType: 'z.string().datetime()',
        confidence: patterns.datetime,
        code: `${field}: z.string().datetime()`,
      });
    }

    // CUID pattern
    if (patterns.cuid > 0.8) {
      suggestions.push({
        type: 'pattern',
        field,
        message: `Field "${field}" appears to contain CUIDs`,
        currentType: 'z.string()',
        suggestedType: 'z.string().cuid()',
        confidence: patterns.cuid,
        code: `${field}: z.string().cuid()`,
      });
    }

    // IP address pattern
    if (patterns.ip > 0.8) {
      suggestions.push({
        type: 'pattern',
        field,
        message: `Field "${field}" appears to contain IP addresses`,
        currentType: 'z.string()',
        suggestedType: 'z.string().ip()',
        confidence: patterns.ip,
        code: `${field}: z.string().ip()`,
      });
    }
  }

  return suggestions;
}

/**
 * Analyze string patterns across samples
 * @param {any[]} samples - Sample data
 * @returns {Object} Field pattern scores
 */
function analyzeStringPatterns(samples) {
  const fieldPatterns = {};

  for (const sample of samples) {
    if (!sample || typeof sample !== 'object') continue;

    for (const [key, value] of Object.entries(sample)) {
      if (typeof value !== 'string') continue;

      if (!fieldPatterns[key]) {
        fieldPatterns[key] = {
          email: 0,
          url: 0,
          uuid: 0,
          datetime: 0,
          cuid: 0,
          ip: 0,
          total: 0,
        };
      }

      const patterns = fieldPatterns[key];
      patterns.total++;

      // Check patterns
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        patterns.email++;
      }
      if (/^https?:\/\/.+/.test(value)) {
        patterns.url++;
      }
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        patterns.uuid++;
      }
      if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/.test(value)) {
        patterns.datetime++;
      }
      if (/^c[a-z0-9]{24}$/i.test(value)) {
        patterns.cuid++;
      }
      if (/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) {
        patterns.ip++;
      }
    }
  }

  // Convert counts to ratios
  for (const patterns of Object.values(fieldPatterns)) {
    if (patterns.total > 0) {
      patterns.email = patterns.email / patterns.total;
      patterns.url = patterns.url / patterns.total;
      patterns.uuid = patterns.uuid / patterns.total;
      patterns.datetime = patterns.datetime / patterns.total;
      patterns.cuid = patterns.cuid / patterns.total;
      patterns.ip = patterns.ip / patterns.total;
    }
  }

  return fieldPatterns;
}

/**
 * Suggest schema optimizations
 * @param {import('zod').ZodSchema} schema - Current schema
 * @param {any[]} samples - Sample data
 * @returns {Suggestion[]}
 */
function suggestOptimizations(schema, samples) {
  const suggestions = [];

  // Detect enum opportunities
  const enumCandidates = detectEnumCandidates(samples);

  for (const [field, values] of Object.entries(enumCandidates)) {
    if (values.size <= 10 && values.size >= 2) {
      suggestions.push({
        type: 'optimization',
        field,
        message: `Field "${field}" has ${values.size} unique values - consider using enum`,
        currentType: 'z.string()',
        suggestedType: `z.enum([${[...values].map(v => `"${v}"`).join(', ')}])`,
        confidence: 0.9,
        code: `${field}: z.enum([${[...values].map(v => `"${v}"`).join(', ')}])`,
      });
    }
  }

  // Detect literal opportunities
  for (const [field, values] of Object.entries(enumCandidates)) {
    if (values.size === 1) {
      const value = [...values][0];
      suggestions.push({
        type: 'optimization',
        field,
        message: `Field "${field}" always has the same value - consider using literal`,
        currentType: 'z.string()',
        suggestedType: `z.literal("${value}")`,
        confidence: 1,
        code: `${field}: z.literal("${value}")`,
      });
    }
  }

  return suggestions;
}

/**
 * Detect fields that could be enums
 * @param {any[]} samples - Sample data
 * @returns {Object} Map of field to unique values
 */
function detectEnumCandidates(samples) {
  const candidates = {};

  for (const sample of samples) {
    if (!sample || typeof sample !== 'object') continue;

    for (const [key, value] of Object.entries(sample)) {
      if (typeof value === 'string') {
        if (!candidates[key]) {
          candidates[key] = new Set();
        }
        candidates[key].add(value);
      }
    }
  }

  return candidates;
}

/**
 * Suggest additional validations
 * @param {any[]} samples - Sample data
 * @returns {Suggestion[]}
 */
function suggestValidations(samples) {
  const suggestions = [];
  const stats = analyzeNumericFields(samples);

  for (const [field, fieldStats] of Object.entries(stats)) {
    // Suggest min/max for numbers
    if (fieldStats.min !== null && fieldStats.max !== null) {
      suggestions.push({
        type: 'validation',
        field,
        message: `Field "${field}" ranges from ${fieldStats.min} to ${fieldStats.max}`,
        currentType: 'z.number()',
        suggestedType: `z.number().min(${fieldStats.min}).max(${fieldStats.max})`,
        confidence: 0.8,
        code: `${field}: z.number().min(${fieldStats.min}).max(${fieldStats.max})`,
      });
    }

    // Suggest positive() for always-positive numbers
    if (fieldStats.min >= 0) {
      suggestions.push({
        type: 'validation',
        field,
        message: `Field "${field}" is always non-negative`,
        currentType: 'z.number()',
        suggestedType: 'z.number().nonnegative()',
        confidence: 0.9,
        code: `${field}: z.number().nonnegative()`,
      });
    }

    // Suggest int() for integers
    if (fieldStats.allIntegers) {
      suggestions.push({
        type: 'validation',
        field,
        message: `Field "${field}" contains only integers`,
        currentType: 'z.number()',
        suggestedType: 'z.number().int()',
        confidence: 1,
        code: `${field}: z.number().int()`,
      });
    }
  }

  // Analyze string lengths
  const stringStats = analyzeStringFields(samples);

  for (const [field, fieldStats] of Object.entries(stringStats)) {
    if (fieldStats.minLength !== null && fieldStats.maxLength !== null) {
      suggestions.push({
        type: 'validation',
        field,
        message: `Field "${field}" length ranges from ${fieldStats.minLength} to ${fieldStats.maxLength}`,
        currentType: 'z.string()',
        suggestedType: `z.string().min(${fieldStats.minLength}).max(${fieldStats.maxLength})`,
        confidence: 0.75,
        code: `${field}: z.string().min(${fieldStats.minLength}).max(${fieldStats.maxLength})`,
      });
    }

    // Suggest nonempty() for non-empty strings
    if (fieldStats.minLength > 0) {
      suggestions.push({
        type: 'validation',
        field,
        message: `Field "${field}" is never empty`,
        currentType: 'z.string()',
        suggestedType: 'z.string().min(1)',
        confidence: 1,
        code: `${field}: z.string().min(1)`,
      });
    }
  }

  return suggestions;
}

/**
 * Analyze numeric fields for validation suggestions
 * @param {any[]} samples - Sample data
 * @returns {Object} Field statistics
 */
function analyzeNumericFields(samples) {
  const stats = {};

  for (const sample of samples) {
    if (!sample || typeof sample !== 'object') continue;

    for (const [key, value] of Object.entries(sample)) {
      if (typeof value === 'number') {
        if (!stats[key]) {
          stats[key] = {
            min: value,
            max: value,
            allIntegers: true,
          };
        }

        stats[key].min = Math.min(stats[key].min, value);
        stats[key].max = Math.max(stats[key].max, value);

        if (!Number.isInteger(value)) {
          stats[key].allIntegers = false;
        }
      }
    }
  }

  return stats;
}

/**
 * Analyze string fields for validation suggestions
 * @param {any[]} samples - Sample data
 * @returns {Object} Field statistics
 */
function analyzeStringFields(samples) {
  const stats = {};

  for (const sample of samples) {
    if (!sample || typeof sample !== 'object') continue;

    for (const [key, value] of Object.entries(sample)) {
      if (typeof value === 'string') {
        if (!stats[key]) {
          stats[key] = {
            minLength: value.length,
            maxLength: value.length,
          };
        }

        stats[key].minLength = Math.min(stats[key].minLength, value.length);
        stats[key].maxLength = Math.max(stats[key].maxLength, value.length);
      }
    }
  }

  return stats;
}

/**
 * Suggest security improvements
 * @param {any[]} samples - Sample data
 * @returns {Suggestion[]}
 */
function suggestSecurityImprovements(samples) {
  const suggestions = [];

  for (const sample of samples) {
    if (!sample || typeof sample !== 'object') continue;

    for (const [key, value] of Object.entries(sample)) {
      const lowerKey = key.toLowerCase();

      // Warn about potential sensitive fields
      if (lowerKey.includes('password') || lowerKey.includes('secret') || lowerKey.includes('token')) {
        suggestions.push({
          type: 'security',
          field: key,
          message: `Field "${key}" may contain sensitive data - ensure proper handling`,
          currentType: 'z.string()',
          suggestedType: 'z.string() // Consider encryption/hashing',
          confidence: 0.9,
        });
      }

      // Suggest trimming for user inputs
      if ((lowerKey.includes('name') || lowerKey.includes('email') || lowerKey.includes('username')) && typeof value === 'string') {
        suggestions.push({
          type: 'security',
          field: key,
          message: `Field "${key}" is user input - consider trimming whitespace`,
          currentType: 'z.string()',
          suggestedType: 'z.string().trim()',
          confidence: 0.8,
          code: `${key}: z.string().trim()`,
        });
      }
    }
  }

  return suggestions;
}

/**
 * Apply suggestions to schema (returns new schema)
 * @param {import('zod').ZodSchema} schema - Original schema
 * @param {Suggestion[]} suggestions - Suggestions to apply
 * @returns {import('zod').ZodSchema} Updated schema
 */
export function applySuggestions(schema, suggestions) {
  // This would need to programmatically rebuild the schema with suggestions applied
  // Simplified implementation - return original schema
  return schema;
}

/**
 * Generate improvement report
 * @param {Suggestion[]} suggestions - Suggestions
 * @returns {string} Formatted report
 */
export function generateReport(suggestions) {
  const grouped = {
    pattern: [],
    optimization: [],
    validation: [],
    security: [],
  };

  for (const suggestion of suggestions) {
    grouped[suggestion.type].push(suggestion);
  }

  let report = '# Schema Improvement Suggestions\n\n';

  for (const [type, items] of Object.entries(grouped)) {
    if (items.length === 0) continue;

    report += `## ${type.charAt(0).toUpperCase() + type.slice(1)} Improvements\n\n`;

    for (const item of items) {
      report += `### ${item.field}\n`;
      report += `- **Message**: ${item.message}\n`;
      report += `- **Current**: ${item.currentType}\n`;
      report += `- **Suggested**: ${item.suggestedType}\n`;
      report += `- **Confidence**: ${(item.confidence * 100).toFixed(0)}%\n`;
      if (item.code) {
        report += `- **Code**: \`${item.code}\`\n`;
      }
      report += '\n';
    }
  }

  return report;
}
