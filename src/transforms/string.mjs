/**
 * String Transform Functions
 * @fileoverview Built-in string transformation functions
 */

/**
 * Convert string to uppercase
 * @param {string} value - Input string
 * @returns {string} Uppercase string
 */
export function uppercase(value) {
  return String(value).toUpperCase();
}

/**
 * Convert string to lowercase
 * @param {string} value - Input string
 * @returns {string} Lowercase string
 */
export function lowercase(value) {
  return String(value).toLowerCase();
}

/**
 * Trim whitespace from string
 * @param {string} value - Input string
 * @returns {string} Trimmed string
 */
export function trim(value) {
  return String(value).trim();
}

/**
 * Capitalize first letter
 * @param {string} value - Input string
 * @returns {string} Capitalized string
 */
export function capitalize(value) {
  const str = String(value);
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert to title case
 * @param {string} value - Input string
 * @returns {string} Title case string
 */
export function titleCase(value) {
  return String(value)
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Convert to camelCase
 * @param {string} value - Input string
 * @returns {string} camelCase string
 */
export function camelCase(value) {
  return String(value)
    .replace(/[_-](.)/g, (_, char) => char.toUpperCase())
    .replace(/^(.)/, (char) => char.toLowerCase());
}

/**
 * Convert to snake_case
 * @param {string} value - Input string
 * @returns {string} snake_case string
 */
export function snakeCase(value) {
  return String(value)
    .replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`)
    .replace(/^_/, '');
}

/**
 * Convert to kebab-case
 * @param {string} value - Input string
 * @returns {string} kebab-case string
 */
export function kebabCase(value) {
  return String(value)
    .replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)
    .replace(/^-/, '');
}

/**
 * Truncate string to length
 * @param {string} value - Input string
 * @param {number} length - Max length
 * @param {Object} [options] - Options
 * @param {string} [options.suffix='...'] - Suffix for truncated strings
 * @returns {string} Truncated string
 */
export function truncate(value, length, options = {}) {
  const str = String(value);
  const suffix = options.suffix || '...';
  if (str.length <= length) return str;
  return str.slice(0, length - suffix.length) + suffix;
}

/**
 * Pad string to length
 * @param {string} value - Input string
 * @param {number} length - Target length
 * @param {Object} [options] - Options
 * @param {string} [options.char=' '] - Padding character
 * @param {string} [options.side='end'] - Padding side ('start' or 'end')
 * @returns {string} Padded string
 */
export function pad(value, length, options = {}) {
  const str = String(value);
  const char = options.char || ' ';
  const side = options.side || 'end';

  if (side === 'start') {
    return str.padStart(length, char);
  }
  return str.padEnd(length, char);
}

/**
 * Replace substring
 * @param {string} value - Input string
 * @param {string|RegExp} search - Search pattern
 * @param {Object} [options] - Options
 * @param {string} [options.replace] - Replacement string
 * @param {boolean} [options.all=false] - Replace all occurrences
 * @returns {string} Modified string
 */
export function replace(value, search, options = {}) {
  const str = String(value);
  const replacement = options.replace || '';

  if (options.all) {
    return str.replaceAll(search, replacement);
  }
  return str.replace(search, replacement);
}

/**
 * Reverse string
 * @param {string} value - Input string
 * @returns {string} Reversed string
 */
export function reverse(value) {
  return String(value).split('').reverse().join('');
}

/**
 * Repeat string
 * @param {string} value - Input string
 * @param {number} count - Repeat count
 * @returns {string} Repeated string
 */
export function repeat(value, count) {
  return String(value).repeat(count);
}

/**
 * Remove non-alphanumeric characters
 * @param {string} value - Input string
 * @param {Object} [options] - Options
 * @param {boolean} [options.keepSpaces=false] - Keep spaces
 * @returns {string} Cleaned string
 */
export function alphanumeric(value, _, options = {}) {
  const str = String(value);
  const pattern = options.keepSpaces ? /[^a-zA-Z0-9\s]/g : /[^a-zA-Z0-9]/g;
  return str.replace(pattern, '');
}

/**
 * Format string using template
 * @param {string} template - Template string with {key} placeholders
 * @param {Object} value - Values to interpolate
 * @returns {string} Formatted string
 */
export function format(template, value) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => value?.[key] || '');
}

// Export all transforms
export const stringTransforms = {
  uppercase,
  lowercase,
  trim,
  capitalize,
  titleCase,
  camelCase,
  snakeCase,
  kebabCase,
  truncate,
  pad,
  replace,
  reverse,
  repeat,
  alphanumeric,
  format,
};
