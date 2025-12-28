/**
 * Number Transform Functions
 * @fileoverview Built-in number transformation functions
 */

/**
 * Round number to decimal places
 * @param {number} value - Input number
 * @param {number} [decimals=0] - Decimal places
 * @returns {number} Rounded number
 */
export function round(value, decimals = 0) {
  const multiplier = Math.pow(10, decimals);
  return Math.round(Number(value) * multiplier) / multiplier;
}

/**
 * Round number up
 * @param {number} value - Input number
 * @returns {number} Ceiling value
 */
export function ceil(value) {
  return Math.ceil(Number(value));
}

/**
 * Round number down
 * @param {number} value - Input number
 * @returns {number} Floor value
 */
export function floor(value) {
  return Math.floor(Number(value));
}

/**
 * Get absolute value
 * @param {number} value - Input number
 * @returns {number} Absolute value
 */
export function abs(value) {
  return Math.abs(Number(value));
}

/**
 * Clamp number to range
 * @param {number} value - Input number
 * @param {number} min - Minimum value
 * @param {Object} [options] - Options
 * @param {number} [options.max] - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, options = {}) {
  const num = Number(value);
  const minVal = Number(min);
  const maxVal = options.max === undefined ? Infinity : Number(options.max);
  return Math.max(minVal, Math.min(maxVal, num));
}

/**
 * Add to number
 * @param {number} value - Input number
 * @param {number} amount - Amount to add
 * @returns {number} Result
 */
export function add(value, amount) {
  return Number(value) + Number(amount);
}

/**
 * Subtract from number
 * @param {number} value - Input number
 * @param {number} amount - Amount to subtract
 * @returns {number} Result
 */
export function subtract(value, amount) {
  return Number(value) - Number(amount);
}

/**
 * Multiply number
 * @param {number} value - Input number
 * @param {number} factor - Multiplication factor
 * @returns {number} Result
 */
export function multiply(value, factor) {
  return Number(value) * Number(factor);
}

/**
 * Divide number
 * @param {number} value - Input number
 * @param {number} divisor - Division divisor
 * @returns {number} Result
 */
export function divide(value, divisor) {
  const div = Number(divisor);
  if (div === 0) throw new Error('Division by zero');
  return Number(value) / div;
}

/**
 * Calculate modulo
 * @param {number} value - Input number
 * @param {number} divisor - Modulo divisor
 * @returns {number} Remainder
 */
export function modulo(value, divisor) {
  return Number(value) % Number(divisor);
}

/**
 * Raise to power
 * @param {number} value - Input number
 * @param {number} exponent - Exponent
 * @returns {number} Result
 */
export function power(value, exponent) {
  return Math.pow(Number(value), Number(exponent));
}

/**
 * Calculate square root
 * @param {number} value - Input number
 * @returns {number} Square root
 */
export function sqrt(value) {
  return Math.sqrt(Number(value));
}

/**
 * Convert to percentage
 * @param {number} value - Input number (0-1 or 0-100)
 * @param {number} [_] - Unused
 * @param {Object} [options] - Options
 * @param {boolean} [options.asDecimal=false] - Input is decimal (0-1)
 * @param {number} [options.decimals=2] - Decimal places
 * @returns {number} Percentage
 */
export function toPercent(value, _, options = {}) {
  const num = Number(value);
  const asDecimal = options.asDecimal || false;
  const decimals = options.decimals === undefined ? 2 : options.decimals;

  const percent = asDecimal ? num * 100 : num;
  return round(percent, decimals);
}

/**
 * Convert from percentage
 * @param {number} value - Percentage value
 * @param {number} [_] - Unused
 * @param {Object} [options] - Options
 * @param {number} [options.decimals=4] - Decimal places
 * @returns {number} Decimal value
 */
export function fromPercent(value, _, options = {}) {
  const decimals = options.decimals === undefined ? 4 : options.decimals;
  return round(Number(value) / 100, decimals);
}

/**
 * Parse number from string
 * @param {string} value - Input string
 * @param {number} [_] - Unused
 * @param {Object} [options] - Options
 * @param {boolean} [options.allowFloat=true] - Allow floating point
 * @returns {number} Parsed number
 */
export function parseNumber(value, _, options = {}) {
  const allowFloat = options.allowFloat !== false;
  return allowFloat ? Number.parseFloat(value) : Number.parseInt(value, 10);
}

/**
 * Format number with locale
 * @param {number} value - Input number
 * @param {number} [_] - Unused
 * @param {Object} [options] - Options
 * @param {string} [options.locale='en-US'] - Locale string
 * @param {number} [options.decimals] - Decimal places
 * @returns {string} Formatted number
 */
export function formatNumber(value, _, options = {}) {
  const locale = options.locale || 'en-US';
  const opts = {};

  if (options.decimals !== undefined) {
    opts.minimumFractionDigits = options.decimals;
    opts.maximumFractionDigits = options.decimals;
  }

  return Number(value).toLocaleString(locale, opts);
}

/**
 * Map number to range
 * @param {number} value - Input number
 * @param {number} fromMin - Source range minimum
 * @param {Object} options - Options
 * @param {number} options.fromMax - Source range maximum
 * @param {number} options.toMin - Target range minimum
 * @param {number} options.toMax - Target range maximum
 * @returns {number} Mapped value
 */
export function mapRange(value, fromMin, options) {
  const { fromMax, toMin, toMax } = options;
  const num = Number(value);
  const fromRange = fromMax - fromMin;
  const toRange = toMax - toMin;
  return ((num - fromMin) / fromRange) * toRange + toMin;
}

// Export all transforms
export const numberTransforms = {
  round,
  ceil,
  floor,
  abs,
  clamp,
  add,
  subtract,
  multiply,
  divide,
  modulo,
  power,
  sqrt,
  toPercent,
  fromPercent,
  parseNumber,
  formatNumber,
  mapRange,
};
