/**
 * Date Transform Functions
 * @fileoverview Built-in date transformation functions
 */

/**
 * Parse date from string
 * @param {string|number|Date} value - Input value
 * @returns {Date} Parsed date
 */
export function parseDate(value) {
  if (value instanceof Date) return value;
  return new Date(value);
}

/**
 * Format date to ISO string
 * @param {string|number|Date} value - Input date
 * @returns {string} ISO formatted date
 */
export function toISO(value) {
  return parseDate(value).toISOString();
}

/**
 * Format date to locale string
 * @param {string|number|Date} value - Input date
 * @param {any} [_] - Unused
 * @param {Object} [options] - Options
 * @param {string} [options.locale='en-US'] - Locale string
 * @param {Object} [options.format] - Intl.DateTimeFormat options
 * @returns {string} Formatted date
 */
export function formatDate(value, _, options = {}) {
  const locale = options.locale || 'en-US';
  const format = options.format || {};
  return parseDate(value).toLocaleDateString(locale, format);
}

/**
 * Format time to locale string
 * @param {string|number|Date} value - Input date
 * @param {any} [_] - Unused
 * @param {Object} [options] - Options
 * @param {string} [options.locale='en-US'] - Locale string
 * @param {Object} [options.format] - Intl.DateTimeFormat options
 * @returns {string} Formatted time
 */
export function formatTime(value, _, options = {}) {
  const locale = options.locale || 'en-US';
  const format = options.format || {};
  return parseDate(value).toLocaleTimeString(locale, format);
}

/**
 * Get Unix timestamp (seconds)
 * @param {string|number|Date} value - Input date
 * @returns {number} Unix timestamp
 */
export function toUnix(value) {
  return Math.floor(parseDate(value).getTime() / 1000);
}

/**
 * Parse Unix timestamp
 * @param {number} value - Unix timestamp
 * @returns {Date} Date object
 */
export function fromUnix(value) {
  return new Date(Number(value) * 1000);
}

/**
 * Get timestamp in milliseconds
 * @param {string|number|Date} value - Input date
 * @returns {number} Timestamp in milliseconds
 */
export function toTimestamp(value) {
  return parseDate(value).getTime();
}

/**
 * Add time to date
 * @param {string|number|Date} value - Input date
 * @param {number} amount - Amount to add
 * @param {Object} [options] - Options
 * @param {string} [options.unit='days'] - Time unit (days, hours, minutes, seconds)
 * @returns {Date} Modified date
 */
export function addTime(value, amount, options = {}) {
  const date = parseDate(value);
  const num = Number(amount);
  const unit = options.unit || 'days';

  const multipliers = {
    seconds: 1000,
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
  };

  const multiplier = multipliers[unit] || multipliers.days;
  return new Date(date.getTime() + num * multiplier);
}

/**
 * Subtract time from date
 * @param {string|number|Date} value - Input date
 * @param {number} amount - Amount to subtract
 * @param {Object} [options] - Options
 * @param {string} [options.unit='days'] - Time unit
 * @returns {Date} Modified date
 */
export function subtractTime(value, amount, options = {}) {
  return addTime(value, -Number(amount), options);
}

/**
 * Get start of time period
 * @param {string|number|Date} value - Input date
 * @param {string} [unit='day'] - Time unit (year, month, day, hour, minute)
 * @returns {Date} Start of period
 */
export function startOf(value, unit = 'day') {
  const date = parseDate(value);

  switch (unit) {
    case 'year': {
      return new Date(date.getFullYear(), 0, 1);
    }
    case 'month': {
      return new Date(date.getFullYear(), date.getMonth(), 1);
    }
    case 'day': {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    case 'hour': {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours());
    }
    case 'minute': {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes());
    }
    default: {
      return date;
    }
  }
}

/**
 * Get end of time period
 * @param {string|number|Date} value - Input date
 * @param {string} [unit='day'] - Time unit
 * @returns {Date} End of period
 */
export function endOf(value, unit = 'day') {
  const date = parseDate(value);

  switch (unit) {
    case 'year': {
      return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
    }
    case 'month': {
      return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    }
    case 'day': {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    }
    case 'hour': {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), 59, 59, 999);
    }
    case 'minute': {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), 59, 999);
    }
    default: {
      return date;
    }
  }
}

/**
 * Get difference between dates
 * @param {string|number|Date} value - Start date
 * @param {string|number|Date} other - End date
 * @param {Object} [options] - Options
 * @param {string} [options.unit='milliseconds'] - Time unit
 * @returns {number} Difference
 */
export function dateDiff(value, other, options = {}) {
  const date1 = parseDate(value);
  const date2 = parseDate(other);
  const diff = date2.getTime() - date1.getTime();
  const unit = options.unit || 'milliseconds';

  const divisors = {
    milliseconds: 1,
    seconds: 1000,
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
  };

  const divisor = divisors[unit] || divisors.milliseconds;
  return diff / divisor;
}

/**
 * Check if date is in the past
 * @param {string|number|Date} value - Input date
 * @returns {boolean} True if past
 */
export function isPast(value) {
  return parseDate(value).getTime() < Date.now();
}

/**
 * Check if date is in the future
 * @param {string|number|Date} value - Input date
 * @returns {boolean} True if future
 */
export function isFuture(value) {
  return parseDate(value).getTime() > Date.now();
}

/**
 * Convert to UTC timezone
 * @param {string|number|Date} value - Input date
 * @returns {Date} UTC date
 */
export function toUTC(value) {
  const date = parseDate(value);
  return new Date(date.toUTCString());
}

// Export all transforms
export const dateTransforms = {
  parseDate,
  toISO,
  formatDate,
  formatTime,
  toUnix,
  fromUnix,
  toTimestamp,
  addTime,
  subtractTime,
  startOf,
  endOf,
  dateDiff,
  isPast,
  isFuture,
  toUTC,
};
