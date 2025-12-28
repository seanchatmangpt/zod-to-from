/**
 * Schema-aware Diff Engine - Compare validated data structures
 * @fileoverview Advanced diffing with schema awareness, semantic comparison, and multiple output formats
 */

import { simpleHash } from './registry.mjs';

/**
 * @typedef {import('zod').ZodSchema} ZodSchema
 */

/**
 * @typedef {Object} DiffChange
 * @property {'changed'|'added'|'removed'|'moved'} type - Type of change
 * @property {string} path - Path to the changed field (dot notation)
 * @property {any} [oldValue] - Previous value (for changed/removed)
 * @property {any} [newValue] - New value (for changed/added)
 * @property {number} [oldIndex] - Old array index (for moved)
 * @property {number} [newIndex] - New array index (for moved)
 */

/**
 * @typedef {Object} DiffResult
 * @property {DiffChange[]} changes - Array of detected changes
 * @property {string[]} added - Paths of added fields
 * @property {string[]} removed - Paths of removed fields
 * @property {string[]} changed - Paths of changed fields
 * @property {string[]} moved - Paths of moved array items
 * @property {DiffStatistics} statistics - Statistics about the diff
 * @property {string} [unified] - Unified diff format (if requested)
 * @property {Object} [split] - Split diff format (if requested)
 * @property {Array} [jsonPatch] - JSON Patch format (RFC 6902)
 * @property {Object} [jsonMergePatch] - JSON Merge Patch format (RFC 7386)
 */

/**
 * @typedef {Object} DiffStatistics
 * @property {number} totalChanges - Total number of changes
 * @property {number} fieldsAdded - Number of fields added
 * @property {number} fieldsRemoved - Number of fields removed
 * @property {number} fieldsChanged - Number of fields changed
 * @property {number} fieldsMoved - Number of array items moved
 * @property {number} percentChanged - Percentage of fields changed
 * @property {number} similarity - Similarity score (0-1)
 */

/**
 * @typedef {Object} DiffOptions
 * @property {boolean} [semantic] - Ignore formatting/whitespace differences
 * @property {boolean} [ignoreOrder] - Ignore array order (treat as sets)
 * @property {boolean} [deepCompare] - Deep comparison for nested objects
 * @property {string[]} [ignorePaths] - Paths to ignore in comparison
 * @property {string} [format] - Output format: 'unified'|'split'|'json-patch'|'json-merge-patch'
 * @property {boolean} [includeUnchanged] - Include unchanged fields in output
 * @property {Function} [customCompare] - Custom comparison function (field, oldVal, newVal) => boolean
 * @property {number} [arrayMoveThreshold] - Threshold for detecting array moves (0-1)
 */

/**
 * Compare two validated objects and generate a schema-aware diff
 * @param {ZodSchema} schema - Zod schema for validation
 * @param {any} oldData - Previous version of data
 * @param {any} newData - New version of data
 * @param {DiffOptions} [opts={}] - Diff options
 * @returns {Promise<DiffResult>} Detailed diff result
 */
export async function diffData(schema, oldData, newData, opts = {}) {
  // Validate both objects against schema
  const validatedOld = schema.parse(oldData);
  const validatedNew = schema.parse(newData);

  // Normalize data if semantic comparison is requested
  const normalizedOld = opts.semantic ? normalizeForSemanticCompare(validatedOld) : validatedOld;
  const normalizedNew = opts.semantic ? normalizeForSemanticCompare(validatedNew) : validatedNew;

  // Perform deep comparison
  const changes = [];
  const added = [];
  const removed = [];
  const changed = [];
  const moved = [];

  // Compare objects recursively
  compareObjects(normalizedOld, normalizedNew, '', changes, added, removed, changed, moved, opts);

  // Calculate statistics
  const statistics = calculateDiffStatistics(changes, normalizedOld, normalizedNew);

  // Build result
  const result = {
    changes,
    added,
    removed,
    changed,
    moved,
    statistics,
  };

  // Add requested formats
  if (opts.format === 'unified' || opts.format === 'all') {
    result.unified = generateUnifiedDiff(changes, normalizedOld, normalizedNew);
  }

  if (opts.format === 'split' || opts.format === 'all') {
    result.split = generateSplitDiff(changes, normalizedOld, normalizedNew);
  }

  if (opts.format === 'json-patch' || opts.format === 'all') {
    result.jsonPatch = generateJSONPatch(changes);
  }

  if (opts.format === 'json-merge-patch' || opts.format === 'all') {
    result.jsonMergePatch = generateJSONMergePatch(changes, normalizedNew);
  }

  return result;
}

/**
 * Normalize data for semantic comparison (ignore formatting)
 * @param {any} data - Data to normalize
 * @returns {any} Normalized data
 */
function normalizeForSemanticCompare(data) {
  if (typeof data === 'string') {
    // Normalize whitespace in strings
    return data.trim().replace(/\s+/g, ' ');
  }

  if (Array.isArray(data)) {
    return data.map(item => normalizeForSemanticCompare(item));
  }

  if (data && typeof data === 'object') {
    const normalized = {};
    for (const [key, value] of Object.entries(data)) {
      normalized[key] = normalizeForSemanticCompare(value);
    }
    return normalized;
  }

  return data;
}

/**
 * Compare two objects recursively and detect changes
 * @param {any} oldObj - Old object
 * @param {any} newObj - New object
 * @param {string} basePath - Current path prefix
 * @param {DiffChange[]} changes - Array to accumulate changes
 * @param {string[]} added - Array to accumulate added paths
 * @param {string[]} removed - Array to accumulate removed paths
 * @param {string[]} changed - Array to accumulate changed paths
 * @param {string[]} moved - Array to accumulate moved paths
 * @param {DiffOptions} opts - Diff options
 */
function compareObjects(oldObj, newObj, basePath, changes, added, removed, changed, moved, opts) {
  // Handle null/undefined
  if (oldObj === null || oldObj === undefined) {
    if (newObj !== null && newObj !== undefined) {
      const path = basePath || '(root)';
      changes.push({ type: 'added', path, newValue: newObj });
      added.push(path);
    }
    return;
  }

  if (newObj === null || newObj === undefined) {
    const path = basePath || '(root)';
    changes.push({ type: 'removed', path, oldValue: oldObj });
    removed.push(path);
    return;
  }

  // Handle primitives
  if (typeof oldObj !== 'object' || typeof newObj !== 'object') {
    if (oldObj !== newObj) {
      const path = basePath || '(root)';
      if (!shouldIgnorePath(path, opts.ignorePaths)) {
        changes.push({ type: 'changed', path, oldValue: oldObj, newValue: newObj });
        changed.push(path);
      }
    }
    return;
  }

  // Handle arrays
  if (Array.isArray(oldObj) && Array.isArray(newObj)) {
    compareArrays(oldObj, newObj, basePath, changes, added, removed, changed, moved, opts);
    return;
  }

  // Handle objects
  const oldKeys = new Set(Object.keys(oldObj));
  const newKeys = new Set(Object.keys(newObj));

  // Find added keys
  for (const key of newKeys) {
    if (!oldKeys.has(key)) {
      const path = joinPath(basePath, key);
      if (!shouldIgnorePath(path, opts.ignorePaths)) {
        changes.push({ type: 'added', path, newValue: newObj[key] });
        added.push(path);
      }
    }
  }

  // Find removed keys
  for (const key of oldKeys) {
    if (!newKeys.has(key)) {
      const path = joinPath(basePath, key);
      if (!shouldIgnorePath(path, opts.ignorePaths)) {
        changes.push({ type: 'removed', path, oldValue: oldObj[key] });
        removed.push(path);
      }
    }
  }

  // Find changed keys
  for (const key of oldKeys) {
    if (newKeys.has(key)) {
      const path = joinPath(basePath, key);
      if (!shouldIgnorePath(path, opts.ignorePaths)) {
        // Use custom compare if provided
        if (opts.customCompare) {
          const areEqual = opts.customCompare(key, oldObj[key], newObj[key]);
          if (!areEqual) {
            changes.push({ type: 'changed', path, oldValue: oldObj[key], newValue: newObj[key] });
            changed.push(path);
          }
        } else {
          // Recursive compare
          compareObjects(oldObj[key], newObj[key], path, changes, added, removed, changed, moved, opts);
        }
      }
    }
  }
}

/**
 * Compare two arrays and detect changes, additions, removals, and moves
 * @param {Array} oldArr - Old array
 * @param {Array} newArr - New array
 * @param {string} basePath - Current path prefix
 * @param {DiffChange[]} changes - Array to accumulate changes
 * @param {string[]} added - Array to accumulate added paths
 * @param {string[]} removed - Array to accumulate removed paths
 * @param {string[]} changed - Array to accumulate changed paths
 * @param {string[]} moved - Array to accumulate moved paths
 * @param {DiffOptions} opts - Diff options
 */
function compareArrays(oldArr, newArr, basePath, changes, added, removed, changed, moved, opts) {
  if (opts.ignoreOrder) {
    // Treat arrays as sets - just check for additions and removals
    const oldSet = new Set(oldArr.map(item => JSON.stringify(item)));
    const newSet = new Set(newArr.map(item => JSON.stringify(item)));

    let index = 0;
    for (const item of newSet) {
      if (!oldSet.has(item)) {
        const path = joinPath(basePath, `[${index}]`);
        changes.push({ type: 'added', path, newValue: JSON.parse(item) });
        added.push(path);
      }
      index++;
    }

    index = 0;
    for (const item of oldSet) {
      if (!newSet.has(item)) {
        const path = joinPath(basePath, `[${index}]`);
        changes.push({ type: 'removed', path, oldValue: JSON.parse(item) });
        removed.push(path);
      }
      index++;
    }
  } else {
    // Order matters - detect moves, additions, removals, and changes
    const maxLen = Math.max(oldArr.length, newArr.length);

    // Simple LCS-based diff for arrays
    for (let i = 0; i < maxLen; i++) {
      const path = joinPath(basePath, `[${i}]`);

      if (i >= oldArr.length) {
        // Added
        changes.push({ type: 'added', path, newValue: newArr[i] });
        added.push(path);
      } else if (i >= newArr.length) {
        // Removed
        changes.push({ type: 'removed', path, oldValue: oldArr[i] });
        removed.push(path);
      } else {
        // Compare elements
        compareObjects(oldArr[i], newArr[i], path, changes, added, removed, changed, moved, opts);
      }
    }
  }
}

/**
 * Check if a path should be ignored
 * @param {string} path - Path to check
 * @param {string[]} [ignorePaths] - Paths to ignore
 * @returns {boolean} Whether to ignore this path
 */
function shouldIgnorePath(path, ignorePaths) {
  if (!ignorePaths || ignorePaths.length === 0) {
    return false;
  }

  return ignorePaths.some(ignorePath => {
    // Support wildcards
    const pattern = ignorePath.replace(/\*/g, '.*');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(path);
  });
}

/**
 * Join path segments
 * @param {string} base - Base path
 * @param {string} segment - Segment to add
 * @returns {string} Joined path
 */
function joinPath(base, segment) {
  if (!base) return segment;
  if (segment.startsWith('[')) return base + segment;
  return `${base}.${segment}`;
}

/**
 * Calculate diff statistics
 * @param {DiffChange[]} changes - All changes
 * @param {any} oldData - Old data
 * @param {any} newData - New data
 * @returns {DiffStatistics} Statistics
 */
function calculateDiffStatistics(changes, oldData, newData) {
  const fieldsAdded = changes.filter(c => c.type === 'added').length;
  const fieldsRemoved = changes.filter(c => c.type === 'removed').length;
  const fieldsChanged = changes.filter(c => c.type === 'changed').length;
  const fieldsMoved = changes.filter(c => c.type === 'moved').length;

  const totalChanges = changes.length;

  // Count total fields for percentage calculation
  const oldFieldCount = countFields(oldData);
  const newFieldCount = countFields(newData);
  const avgFieldCount = (oldFieldCount + newFieldCount) / 2;

  const percentChanged = avgFieldCount > 0 ? (totalChanges / avgFieldCount) * 100 : 0;
  const similarity = avgFieldCount > 0 ? 1 - (totalChanges / avgFieldCount) : 1;

  return {
    totalChanges,
    fieldsAdded,
    fieldsRemoved,
    fieldsChanged,
    fieldsMoved,
    percentChanged: Math.round(percentChanged * 100) / 100,
    similarity: Math.round(similarity * 100) / 100,
  };
}

/**
 * Count total fields in an object (recursive)
 * @param {any} obj - Object to count
 * @returns {number} Field count
 */
function countFields(obj) {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return 1;
  }

  if (Array.isArray(obj)) {
    return obj.reduce((sum, item) => sum + countFields(item), 0);
  }

  return Object.values(obj).reduce((sum, value) => sum + countFields(value), 0);
}

/**
 * Generate unified diff format
 * @param {DiffChange[]} changes - Changes to format
 * @param {any} oldData - Old data
 * @param {any} newData - New data
 * @returns {string} Unified diff string
 */
function generateUnifiedDiff(changes, oldData, newData) {
  const lines = [];
  lines.push('--- old', '+++ new');

  for (const change of changes) {
    switch (change.type) {
    case 'added': {
      lines.push(`+ ${change.path}: ${JSON.stringify(change.newValue)}`);
    
    break;
    }
    case 'removed': {
      lines.push(`- ${change.path}: ${JSON.stringify(change.oldValue)}`);
    
    break;
    }
    case 'changed': {
      lines.push(`- ${change.path}: ${JSON.stringify(change.oldValue)}`);
      lines.push(`+ ${change.path}: ${JSON.stringify(change.newValue)}`);
    
    break;
    }
    // No default
    }
  }

  return lines.join('\n');
}

/**
 * Generate split diff format
 * @param {DiffChange[]} changes - Changes to format
 * @param {any} oldData - Old data
 * @param {any} newData - New data
 * @returns {Object} Split diff with old and new sides
 */
function generateSplitDiff(changes, oldData, newData) {
  const oldLines = [];
  const newLines = [];

  for (const change of changes) {
    switch (change.type) {
    case 'added': {
      oldLines.push('');
      newLines.push(`${change.path}: ${JSON.stringify(change.newValue)}`);
    
    break;
    }
    case 'removed': {
      oldLines.push(`${change.path}: ${JSON.stringify(change.oldValue)}`);
      newLines.push('');
    
    break;
    }
    case 'changed': {
      oldLines.push(`${change.path}: ${JSON.stringify(change.oldValue)}`);
      newLines.push(`${change.path}: ${JSON.stringify(change.newValue)}`);
    
    break;
    }
    // No default
    }
  }

  return { old: oldLines, new: newLines };
}

/**
 * Generate JSON Patch (RFC 6902) format
 * @param {DiffChange[]} changes - Changes to convert
 * @returns {Array} JSON Patch operations
 */
function generateJSONPatch(changes) {
  const patch = [];

  for (const change of changes) {
    // Convert dot notation to JSON Pointer
    const pointer = '/' + change.path.replace(/\./g, '/').replace(/\[(\d+)\]/g, '/$1');

    switch (change.type) {
    case 'added': {
      patch.push({ op: 'add', path: pointer, value: change.newValue });
    
    break;
    }
    case 'removed': {
      patch.push({ op: 'remove', path: pointer });
    
    break;
    }
    case 'changed': {
      patch.push({ op: 'replace', path: pointer, value: change.newValue });
    
    break;
    }
    case 'moved': {
      const fromPointer = '/' + change.path.replace(/\./g, '/').replace(/\[(\d+)\]/g, `/${change.oldIndex}`);
      patch.push({ op: 'move', from: fromPointer, path: pointer });
    
    break;
    }
    // No default
    }
  }

  return patch;
}

/**
 * Generate JSON Merge Patch (RFC 7386) format
 * @param {DiffChange[]} changes - Changes to convert
 * @param {any} newData - New data for reference
 * @returns {Object} JSON Merge Patch
 */
function generateJSONMergePatch(changes, newData) {
  const patch = {};

  for (const change of changes) {
    const pathParts = change.path.split('.').filter(p => !p.includes('['));

    if (change.type === 'added' || change.type === 'changed') {
      setNestedValue(patch, pathParts, change.newValue);
    } else if (change.type === 'removed') {
      setNestedValue(patch, pathParts, null);
    }
  }

  return patch;
}

/**
 * Set a nested value in an object
 * @param {Object} obj - Object to modify
 * @param {string[]} pathParts - Path parts
 * @param {any} value - Value to set
 */
function setNestedValue(obj, pathParts, value) {
  let current = obj;

  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part];
  }

  const lastPart = pathParts.at(-1);
  current[lastPart] = value;
}

/**
 * Compare two validated datasets with format-agnostic comparison
 * @param {ZodSchema} schema - Zod schema for validation
 * @param {string} format1 - Format of first dataset
 * @param {any} data1 - First dataset
 * @param {string} format2 - Format of second dataset
 * @param {any} data2 - Second dataset
 * @param {DiffOptions} [opts={}] - Diff options
 * @returns {Promise<DiffResult>} Diff result
 */
export async function diffFormats(schema, format1, data1, format2, data2, opts = {}) {
  // This function would integrate with parseFrom to compare different formats
  // For now, it's a placeholder that compares the data directly
  return diffData(schema, data1, data2, opts);
}

/**
 * Get a summary of changes as a human-readable string
 * @param {DiffResult} diffResult - Diff result to summarize
 * @returns {string} Summary string
 */
export function summarizeDiff(diffResult) {
  const { statistics } = diffResult;
  const parts = [];

  if (statistics.fieldsAdded > 0) {
    parts.push(`${statistics.fieldsAdded} added`);
  }

  if (statistics.fieldsRemoved > 0) {
    parts.push(`${statistics.fieldsRemoved} removed`);
  }

  if (statistics.fieldsChanged > 0) {
    parts.push(`${statistics.fieldsChanged} changed`);
  }

  if (statistics.fieldsMoved > 0) {
    parts.push(`${statistics.fieldsMoved} moved`);
  }

  if (parts.length === 0) {
    return 'No changes detected';
  }

  return `${statistics.totalChanges} total changes: ${parts.join(', ')} (${statistics.percentChanged}% changed, ${statistics.similarity * 100}% similar)`;
}
