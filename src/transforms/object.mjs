/**
 * Object Transform Functions
 * @fileoverview Built-in object transformation functions
 */

/**
 * Pick properties from object
 * @param {Object} value - Input object
 * @param {string[]|string} keys - Keys to pick
 * @returns {Object} Object with picked keys
 */
export function pick(value, keys) {
  if (typeof value !== 'object' || value === null) return value;

  const keyArray = Array.isArray(keys) ? keys : [keys];
  const result = {};

  for (const key of keyArray) {
    if (key in value) {
      result[key] = value[key];
    }
  }

  return result;
}

/**
 * Omit properties from object
 * @param {Object} value - Input object
 * @param {string[]|string} keys - Keys to omit
 * @returns {Object} Object without omitted keys
 */
export function omit(value, keys) {
  if (typeof value !== 'object' || value === null) return value;

  const keyArray = Array.isArray(keys) ? keys : [keys];
  const result = { ...value };

  for (const key of keyArray) {
    delete result[key];
  }

  return result;
}

/**
 * Flatten nested object
 * @param {Object} value - Input object
 * @param {any} [_] - Unused
 * @param {Object} [options] - Options
 * @param {string} [options.separator='.'] - Key separator
 * @param {number} [options.maxDepth=Infinity] - Max flatten depth
 * @returns {Object} Flattened object
 */
export function flattenObject(value, _, options = {}) {
  if (typeof value !== 'object' || value === null) return value;

  const separator = options.separator || '.';
  const maxDepth = options.maxDepth || Infinity;

  function flatten(obj, prefix = '', depth = 0) {
    const result = {};

    for (const [key, val] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}${separator}${key}` : key;

      if (typeof val === 'object' && val !== null && !Array.isArray(val) && depth < maxDepth) {
        Object.assign(result, flatten(val, newKey, depth + 1));
      } else {
        result[newKey] = val;
      }
    }

    return result;
  }

  return flatten(value);
}

/**
 * Unflatten object
 * @param {Object} value - Flattened object
 * @param {any} [_] - Unused
 * @param {Object} [options] - Options
 * @param {string} [options.separator='.'] - Key separator
 * @returns {Object} Nested object
 */
export function unflattenObject(value, _, options = {}) {
  if (typeof value !== 'object' || value === null) return value;

  const separator = options.separator || '.';
  const result = {};

  for (const [key, val] of Object.entries(value)) {
    const keys = key.split(separator);
    let current = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!current[k]) current[k] = {};
      current = current[k];
    }

    current[keys.at(-1)] = val;
  }

  return result;
}

/**
 * Merge objects
 * @param {Object} value - Input object
 * @param {Object} other - Object to merge
 * @param {Object} [options] - Options
 * @param {boolean} [options.deep=false] - Deep merge
 * @returns {Object} Merged object
 */
export function merge(value, other, options = {}) {
  if (typeof value !== 'object' || value === null) return value;
  if (typeof other !== 'object' || other === null) return value;

  if (options.deep) {
    const result = { ...value };

    for (const [key, val] of Object.entries(other)) {
      result[key] = typeof val === 'object' && val !== null && !Array.isArray(val) ? merge(result[key] || {}, val, options) : val;
    }

    return result;
  }

  return { ...value, ...other };
}

/**
 * Get object keys
 * @param {Object} value - Input object
 * @returns {string[]} Array of keys
 */
export function keys(value) {
  if (typeof value !== 'object' || value === null) return [];
  return Object.keys(value);
}

/**
 * Get object values
 * @param {Object} value - Input object
 * @returns {any[]} Array of values
 */
export function values(value) {
  if (typeof value !== 'object' || value === null) return [];
  return Object.values(value);
}

/**
 * Get object entries
 * @param {Object} value - Input object
 * @returns {Array<[string, any]>} Array of [key, value] pairs
 */
export function entries(value) {
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value);
}

/**
 * Convert entries to object
 * @param {Array<[string, any]>} value - Array of entries
 * @returns {Object} Object from entries
 */
export function fromEntries(value) {
  if (!Array.isArray(value)) return value;
  return Object.fromEntries(value);
}

/**
 * Rename object keys
 * @param {Object} value - Input object
 * @param {Object} mapping - Key mapping
 * @returns {Object} Object with renamed keys
 */
export function renameKeys(value, mapping) {
  if (typeof value !== 'object' || value === null) return value;
  if (typeof mapping !== 'object' || mapping === null) return value;

  const result = { ...value };

  for (const [oldKey, newKey] of Object.entries(mapping)) {
    if (oldKey in result) {
      result[newKey] = result[oldKey];
      delete result[oldKey];
    }
  }

  return result;
}

/**
 * Map object values
 * @param {Object} value - Input object
 * @param {Function} fn - Map function
 * @returns {Object} Object with mapped values
 */
export function mapValues(value, fn) {
  if (typeof value !== 'object' || value === null) return value;
  if (typeof fn !== 'function') return value;

  const result = {};

  for (const [key, val] of Object.entries(value)) {
    result[key] = fn(val, key);
  }

  return result;
}

/**
 * Map object keys
 * @param {Object} value - Input object
 * @param {Function} fn - Map function
 * @returns {Object} Object with mapped keys
 */
export function mapKeys(value, fn) {
  if (typeof value !== 'object' || value === null) return value;
  if (typeof fn !== 'function') return value;

  const result = {};

  for (const [key, val] of Object.entries(value)) {
    const newKey = fn(key, val);
    result[newKey] = val;
  }

  return result;
}

/**
 * Deep clone object
 * @param {Object} value - Input object
 * @returns {Object} Cloned object
 */
export function clone(value) {
  if (typeof value !== 'object' || value === null) return value;
  return JSON.parse(JSON.stringify(value));
}

/**
 * Check if object has property
 * @param {Object} value - Input object
 * @param {string} key - Property key
 * @returns {boolean} True if has property
 */
export function has(value, key) {
  if (typeof value !== 'object' || value === null) return false;
  return key in value;
}

/**
 * Get property with default
 * @param {Object} value - Input object
 * @param {string} key - Property key
 * @param {Object} [options] - Options
 * @param {any} [options.default] - Default value
 * @returns {any} Property value or default
 */
export function getWithDefault(value, key, options = {}) {
  if (typeof value !== 'object' || value === null) return options.default;
  return value[key] === undefined ? options.default : value[key];
}

/**
 * Restructure object
 * @param {Object} value - Input object
 * @param {Object} template - Restructure template
 * @returns {Object} Restructured object
 */
export function restructure(value, template) {
  if (typeof value !== 'object' || value === null) return value;
  if (typeof template !== 'object' || template === null) return value;

  const result = {};

  for (const [newKey, oldKey] of Object.entries(template)) {
    if (typeof oldKey === 'string') {
      // Simple mapping
      result[newKey] = value[oldKey];
    } else if (typeof oldKey === 'function') {
      // Function mapping
      result[newKey] = oldKey(value);
    }
  }

  return result;
}

// Export all transforms
export const objectTransforms = {
  pick,
  omit,
  flattenObject,
  unflattenObject,
  merge,
  keys,
  values,
  entries,
  fromEntries,
  renameKeys,
  mapValues,
  mapKeys,
  clone,
  has,
  getWithDefault,
  restructure,
};
