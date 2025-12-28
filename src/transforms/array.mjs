/**
 * Array Transform Functions
 * @fileoverview Built-in array transformation functions
 */

/**
 * Map array elements
 * @param {Array} value - Input array
 * @param {Function|string} fn - Map function or property name
 * @returns {Array} Mapped array
 */
export function map(value, fn) {
  if (!Array.isArray(value)) return value;

  if (typeof fn === 'function') {
    return value.map(fn);
  }

  // If fn is a string, extract that property
  if (typeof fn === 'string') {
    return value.map((item) => item?.[fn]);
  }

  return value;
}

/**
 * Filter array elements
 * @param {Array} value - Input array
 * @param {Function} fn - Filter function
 * @returns {Array} Filtered array
 */
export function filter(value, fn) {
  if (!Array.isArray(value)) return value;
  if (typeof fn !== 'function') return value;
  return value.filter(fn);
}

/**
 * Reduce array to single value
 * @param {Array} value - Input array
 * @param {Function} fn - Reducer function
 * @param {Object} [options] - Options
 * @param {any} [options.initial] - Initial value
 * @returns {any} Reduced value
 */
export function reduce(value, fn, options = {}) {
  if (!Array.isArray(value)) return value;
  if (typeof fn !== 'function') return value;

  if (options.initial !== undefined) {
    return value.reduce(fn, options.initial);
  }
  return value.reduce(fn);
}

/**
 * Sort array
 * @param {Array} value - Input array
 * @param {Function|string} [compareFn] - Compare function or property name
 * @param {Object} [options] - Options
 * @param {boolean} [options.reverse=false] - Reverse order
 * @returns {Array} Sorted array
 */
export function sort(value, compareFn, options = {}) {
  if (!Array.isArray(value)) return value;
  const arr = [...value]; // Create copy

  if (typeof compareFn === 'string') {
    // Sort by property
    arr.sort((a, b) => {
      const aVal = a?.[compareFn];
      const bVal = b?.[compareFn];
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
      return 0;
    });
  } else if (typeof compareFn === 'function') {
    arr.sort(compareFn);
  } else {
    arr.sort();
  }

  return options.reverse ? arr.reverse() : arr;
}

/**
 * Reverse array
 * @param {Array} value - Input array
 * @returns {Array} Reversed array
 */
export function reverse(value) {
  if (!Array.isArray(value)) return value;
  return [...value].reverse();
}

/**
 * Get unique array elements
 * @param {Array} value - Input array
 * @param {string} [byProperty] - Property to check uniqueness
 * @returns {Array} Unique array
 */
export function unique(value, byProperty) {
  if (!Array.isArray(value)) return value;

  if (byProperty) {
    const seen = new Set();
    return value.filter((item) => {
      const key = item?.[byProperty];
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  return [...new Set(value)];
}

/**
 * Flatten array
 * @param {Array} value - Input array
 * @param {number} [depth=1] - Flatten depth
 * @returns {Array} Flattened array
 */
export function flatten(value, depth = 1) {
  if (!Array.isArray(value)) return value;
  return value.flat(depth);
}

/**
 * Chunk array into smaller arrays
 * @param {Array} value - Input array
 * @param {number} size - Chunk size
 * @returns {Array<Array>} Chunked array
 */
export function chunk(value, size) {
  if (!Array.isArray(value)) return value;
  const result = [];
  for (let i = 0; i < value.length; i += size) {
    result.push(value.slice(i, i + size));
  }
  return result;
}

/**
 * Take first n elements
 * @param {Array} value - Input array
 * @param {number} count - Number of elements
 * @returns {Array} Sliced array
 */
export function take(value, count) {
  if (!Array.isArray(value)) return value;
  return value.slice(0, count);
}

/**
 * Skip first n elements
 * @param {Array} value - Input array
 * @param {number} count - Number of elements to skip
 * @returns {Array} Sliced array
 */
export function skip(value, count) {
  if (!Array.isArray(value)) return value;
  return value.slice(count);
}

/**
 * Join array elements
 * @param {Array} value - Input array
 * @param {string} [separator=','] - Separator string
 * @returns {string} Joined string
 */
export function join(value, separator = ',') {
  if (!Array.isArray(value)) return value;
  return value.join(separator);
}

/**
 * Find element in array
 * @param {Array} value - Input array
 * @param {Function} fn - Find function
 * @returns {any} Found element
 */
export function find(value, fn) {
  if (!Array.isArray(value)) return value;
  if (typeof fn !== 'function') return undefined;
  return value.find(fn);
}

/**
 * Check if array includes element
 * @param {Array} value - Input array
 * @param {any} element - Element to find
 * @returns {boolean} True if includes
 */
export function includes(value, element) {
  if (!Array.isArray(value)) return false;
  return value.includes(element);
}

/**
 * Get array length
 * @param {Array} value - Input array
 * @returns {number} Array length
 */
export function length(value) {
  if (!Array.isArray(value)) return 0;
  return value.length;
}

/**
 * Compact array (remove falsy values)
 * @param {Array} value - Input array
 * @returns {Array} Compacted array
 */
export function compact(value) {
  if (!Array.isArray(value)) return value;
  return value.filter(Boolean);
}

/**
 * Concatenate arrays
 * @param {Array} value - Input array
 * @param {Array|any} other - Array or value to concat
 * @returns {Array} Concatenated array
 */
export function concat(value, other) {
  if (!Array.isArray(value)) return value;
  return value.concat(other);
}

/**
 * Group array by property
 * @param {Array} value - Input array
 * @param {string|Function} groupBy - Property name or function
 * @returns {Object} Grouped object
 */
export function groupBy(value, groupBy) {
  if (!Array.isArray(value)) return value;

  return value.reduce((groups, item) => {
    const key = typeof groupBy === 'function'
      ? groupBy(item)
      : item?.[groupBy];

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {});
}

// Export all transforms
export const arrayTransforms = {
  map,
  filter,
  reduce,
  sort,
  reverse,
  unique,
  flatten,
  chunk,
  take,
  skip,
  join,
  find,
  includes,
  length,
  compact,
  concat,
  groupBy,
};
