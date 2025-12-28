/**
 * Schema-aware Merge Engine - Intelligent data merging with conflict resolution
 * @fileoverview Three-way merge with schema validation and conflict detection
 */

import { simpleHash } from './registry.mjs';

/**
 * @typedef {import('zod').ZodSchema} ZodSchema
 */

/**
 * @typedef {Object} MergeConflict
 * @property {string} path - Path to the conflicting field
 * @property {any} baseValue - Value from base version
 * @property {any} leftValue - Value from left version
 * @property {any} rightValue - Value from right version
 * @property {string} reason - Reason for conflict
 * @property {any} [resolvedValue] - Resolved value (if resolved)
 * @property {string} [resolution] - How the conflict was resolved
 */

/**
 * @typedef {Object} MergeResult
 * @property {any} data - Merged data
 * @property {MergeConflict[]} conflicts - Detected conflicts
 * @property {boolean} hasConflicts - Whether there are unresolved conflicts
 * @property {MergeProvenance} provenance - Merge provenance
 * @property {MergeStatistics} statistics - Merge statistics
 */

/**
 * @typedef {Object} MergeProvenance
 * @property {string} timestamp - When merge was performed
 * @property {string} strategy - Merge strategy used
 * @property {number} conflictsDetected - Number of conflicts detected
 * @property {number} conflictsResolved - Number of conflicts resolved
 * @property {string} baseHash - Hash of base data
 * @property {string} leftHash - Hash of left data
 * @property {string} rightHash - Hash of right data
 * @property {string} resultHash - Hash of merged result
 */

/**
 * @typedef {Object} MergeStatistics
 * @property {number} fieldsFromBase - Fields unchanged from base
 * @property {number} fieldsFromLeft - Fields taken from left
 * @property {number} fieldsFromRight - Fields taken from right
 * @property {number} fieldsMerged - Fields merged from both sides
 * @property {number} totalFields - Total fields in result
 */

/**
 * @typedef {Object} MergeOptions
 * @property {'prefer-left'|'prefer-right'|'prefer-newer'|'prefer-older'|'fail-on-conflict'|'custom'} [strategy='fail-on-conflict'] - Merge strategy
 * @property {Function} [onConflict] - Custom conflict resolver: (field, base, left, right) => resolvedValue
 * @property {boolean} [validate=true] - Validate result against schema
 * @property {boolean} [trackProvenance=true] - Track merge provenance
 * @property {Object} [fieldRules] - Per-field merge rules: { 'path.to.field': 'prefer-left' | 'prefer-right' | Function }
 * @property {boolean} [allowSchemaEvolution=false] - Allow fields not in base schema
 * @property {Function} [conflictFilter] - Filter which conflicts to report: (conflict) => boolean
 */

/**
 * Perform a three-way merge of validated data
 * @param {ZodSchema} schema - Zod schema for validation
 * @param {any} base - Base version (common ancestor)
 * @param {any} left - Left version (e.g., local changes)
 * @param {any} right - Right version (e.g., remote changes)
 * @param {MergeOptions} [opts={}] - Merge options
 * @returns {Promise<MergeResult>} Merge result with conflicts
 */
export async function mergeData(schema, base, left, right, opts = {}) {
  const options = {
    strategy: 'fail-on-conflict',
    validate: true,
    trackProvenance: true,
    allowSchemaEvolution: false,
    ...opts,
  };

  // Validate all three versions against schema
  const validatedBase = schema.parse(base);
  const validatedLeft = schema.parse(left);
  const validatedRight = schema.parse(right);

  // Track conflicts
  const conflicts = [];

  // Track statistics
  const statistics = {
    fieldsFromBase: 0,
    fieldsFromLeft: 0,
    fieldsFromRight: 0,
    fieldsMerged: 0,
    totalFields: 0,
  };

  // Perform merge
  const mergedData = mergeObjects(
    validatedBase,
    validatedLeft,
    validatedRight,
    '',
    conflicts,
    statistics,
    options
  );

  // Validate merged result if requested
  if (options.validate) {
    try {
      schema.parse(mergedData);
    } catch (error) {
      throw new Error(`Merged data failed schema validation: ${error.message}`);
    }
  }

  // Build provenance
  const provenance = options.trackProvenance
    ? {
        timestamp: new Date().toISOString(),
        strategy: options.strategy,
        conflictsDetected: conflicts.length,
        conflictsResolved: conflicts.filter(c => c.resolvedValue !== undefined).length,
        baseHash: simpleHash(JSON.stringify(validatedBase)),
        leftHash: simpleHash(JSON.stringify(validatedLeft)),
        rightHash: simpleHash(JSON.stringify(validatedRight)),
        resultHash: simpleHash(JSON.stringify(mergedData)),
      }
    : null;

  // Filter conflicts if requested
  const reportedConflicts = options.conflictFilter
    ? conflicts.filter(options.conflictFilter)
    : conflicts;

  return {
    data: mergedData,
    conflicts: reportedConflicts,
    hasConflicts: reportedConflicts.some(c => c.resolvedValue === undefined),
    provenance,
    statistics,
  };
}

/**
 * Merge three objects recursively
 * @param {any} base - Base version
 * @param {any} left - Left version
 * @param {any} right - Right version
 * @param {string} path - Current path
 * @param {MergeConflict[]} conflicts - Conflicts array
 * @param {MergeStatistics} statistics - Statistics object
 * @param {MergeOptions} options - Merge options
 * @returns {any} Merged result
 */
function mergeObjects(base, left, right, path, conflicts, statistics, options) {
  // Handle primitives
  if (typeof base !== 'object' || base === null) {
    return mergePrimitives(base, left, right, path, conflicts, statistics, options);
  }

  // Handle arrays
  if (Array.isArray(base)) {
    return mergeArrays(base, left, right, path, conflicts, statistics, options);
  }

  // Handle objects - need to check if left and right are also objects
  // If they're not objects, treat it as a field-level change
  if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) {
    return mergeField(base, left, right, path, conflicts, statistics, options);
  }

  // Both are objects - merge recursively
  const result = {};
  const allKeys = new Set([
    ...Object.keys(base || {}),
    ...Object.keys(left || {}),
    ...Object.keys(right || {}),
  ]);

  for (const key of allKeys) {
    const fieldPath = path ? `${path}.${key}` : key;
    const baseValue = base?.[key];
    const leftValue = left?.[key];
    const rightValue = right?.[key];

    // Check for field-specific rules
    const fieldRule = options.fieldRules?.[fieldPath];
    if (fieldRule) {
      if (typeof fieldRule === 'function') {
        result[key] = fieldRule(baseValue, leftValue, rightValue);
        statistics.fieldsMerged++;
      } else if (fieldRule === 'prefer-left') {
        result[key] = leftValue;
        statistics.fieldsFromLeft++;
      } else if (fieldRule === 'prefer-right') {
        result[key] = rightValue;
        statistics.fieldsFromRight++;
      }
      continue;
    }

    // Recursive merge
    result[key] = mergeField(
      baseValue,
      leftValue,
      rightValue,
      fieldPath,
      conflicts,
      statistics,
      options
    );
  }

  statistics.totalFields = Object.keys(result).length;
  return result;
}

/**
 * Merge a single field
 * @param {any} base - Base value
 * @param {any} left - Left value
 * @param {any} right - Right value
 * @param {string} path - Field path
 * @param {MergeConflict[]} conflicts - Conflicts array
 * @param {MergeStatistics} statistics - Statistics object
 * @param {MergeOptions} options - Merge options
 * @returns {any} Merged value
 */
function mergeField(base, left, right, path, conflicts, statistics, options) {
  // Case 1: Both sides unchanged from base
  if (deepEqual(left, base) && deepEqual(right, base)) {
    statistics.fieldsFromBase++;
    return base;
  }

  // Case 2: Only left changed
  if (deepEqual(right, base) && !deepEqual(left, base)) {
    statistics.fieldsFromLeft++;
    return left;
  }

  // Case 3: Only right changed
  if (deepEqual(left, base) && !deepEqual(right, base)) {
    statistics.fieldsFromRight++;
    return right;
  }

  // Case 4: Both changed to the same value
  if (deepEqual(left, right)) {
    statistics.fieldsFromLeft++; // Arbitrary choice
    return left;
  }

  // Case 5: Both are objects - recurse to merge nested structure
  if (
    typeof base === 'object' &&
    base !== null &&
    !Array.isArray(base) &&
    typeof left === 'object' &&
    left !== null &&
    !Array.isArray(left) &&
    typeof right === 'object' &&
    right !== null &&
    !Array.isArray(right)
  ) {
    return mergeObjects(base, left, right, path, conflicts, statistics, options);
  }

  // Case 6: Conflict - both changed to different values
  const conflict = {
    path,
    baseValue: base,
    leftValue: left,
    rightValue: right,
    reason: 'Both sides modified with different values',
  };

  // Try to resolve conflict
  const resolved = resolveConflict(conflict, options);
  if (resolved !== undefined) {
    conflict.resolvedValue = resolved.value;
    conflict.resolution = resolved.strategy;
    statistics.fieldsMerged++;
  }

  conflicts.push(conflict);

  // Return resolved value or throw based on strategy
  if (resolved !== undefined) {
    return resolved.value;
  }

  if (options.strategy === 'fail-on-conflict') {
    throw new Error(`Merge conflict at ${path}: both sides modified`);
  }

  // Should not reach here if strategy is properly handled
  return base;
}

/**
 * Merge primitive values
 * @param {any} base - Base value
 * @param {any} left - Left value
 * @param {any} right - Right value
 * @param {string} path - Field path
 * @param {MergeConflict[]} conflicts - Conflicts array
 * @param {MergeStatistics} statistics - Statistics object
 * @param {MergeOptions} options - Merge options
 * @returns {any} Merged value
 */
function mergePrimitives(base, left, right, path, conflicts, statistics, options) {
  return mergeField(base, left, right, path, conflicts, statistics, options);
}

/**
 * Merge arrays
 * @param {Array} base - Base array
 * @param {Array} left - Left array
 * @param {Array} right - Right array
 * @param {string} path - Field path
 * @param {MergeConflict[]} conflicts - Conflicts array
 * @param {MergeStatistics} statistics - Statistics object
 * @param {MergeOptions} options - Merge options
 * @returns {Array} Merged array
 */
function mergeArrays(base, left, right, path, conflicts, statistics, options) {
  // Simple array merge: if both modified differently, it's a conflict
  if (deepEqual(left, base)) {
    statistics.fieldsFromRight++;
    return right;
  }

  if (deepEqual(right, base)) {
    statistics.fieldsFromLeft++;
    return left;
  }

  if (deepEqual(left, right)) {
    statistics.fieldsFromLeft++;
    return left;
  }

  // Conflict: both arrays modified
  const conflict = {
    path,
    baseValue: base,
    leftValue: left,
    rightValue: right,
    reason: 'Both sides modified array with different changes',
  };

  const resolved = resolveConflict(conflict, options);
  if (resolved !== undefined) {
    conflict.resolvedValue = resolved.value;
    conflict.resolution = resolved.strategy;
    statistics.fieldsMerged++;
  }

  conflicts.push(conflict);

  if (resolved !== undefined) {
    return resolved.value;
  }

  if (options.strategy === 'fail-on-conflict') {
    throw new Error(`Merge conflict at ${path}: both sides modified array`);
  }

  return base;
}

/**
 * Resolve a conflict based on strategy
 * @param {MergeConflict} conflict - The conflict to resolve
 * @param {MergeOptions} options - Merge options
 * @returns {{value: any, strategy: string}|undefined} Resolved value and strategy
 */
function resolveConflict(conflict, options) {
  // Try custom conflict resolver first
  if (options.onConflict) {
    try {
      const resolved = options.onConflict(
        conflict.path,
        conflict.baseValue,
        conflict.leftValue,
        conflict.rightValue
      );
      if (resolved !== undefined) {
        return { value: resolved, strategy: 'custom' };
      }
    } catch {
      // Custom resolver failed, fall through to strategy
    }
  }

  // Apply strategy
  switch (options.strategy) {
    case 'prefer-left': {
      return { value: conflict.leftValue, strategy: 'prefer-left' };
    }
    case 'prefer-right': {
      return { value: conflict.rightValue, strategy: 'prefer-right' };
    }
    case 'prefer-newer': {
      // For this to work properly, we'd need timestamps
      // For now, prefer right (assuming it's newer)
      return { value: conflict.rightValue, strategy: 'prefer-newer' };
    }
    case 'prefer-older': {
      // For this to work properly, we'd need timestamps
      // For now, prefer left (assuming it's older)
      return { value: conflict.leftValue, strategy: 'prefer-older' };
    }
    case 'fail-on-conflict': {
      return undefined; // Will throw error
    }
    case 'custom': {
      return undefined; // Already tried custom resolver above
    }
    default: {
      return undefined;
    }
  }
}

/**
 * Deep equality check
 * @param {any} a - First value
 * @param {any} b - Second value
 * @returns {boolean} Whether values are deeply equal
 */
function deepEqual(a, b) {
  if (a === b) return true;

  if (a === null || b === null || a === undefined || b === undefined) {
    return a === b;
  }

  if (typeof a !== typeof b) return false;

  if (typeof a !== 'object') return a === b;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (const [i, element_] of a.entries()) {
      if (!deepEqual(element_, b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

/**
 * Perform a two-way merge (no base version)
 * @param {ZodSchema} schema - Zod schema for validation
 * @param {any} left - Left version
 * @param {any} right - Right version
 * @param {MergeOptions} [opts={}] - Merge options
 * @returns {Promise<MergeResult>} Merge result
 */
export async function mergeTwoWay(schema, left, right, opts = {}) {
  // Validate inputs first
  const validatedLeft = schema.parse(left);
  const validatedRight = schema.parse(right);

  // Two-way merge: use left as base and merge right's changes
  // This avoids schema validation issues with empty base
  return mergeData(schema, validatedLeft, validatedLeft, validatedRight, opts);
}

/**
 * Create an interactive conflict resolver
 * @param {Function} promptUser - Function to prompt user: (conflict) => Promise<any>
 * @returns {Function} Conflict resolver for onConflict option
 */
export function createInteractiveResolver(promptUser) {
  return async (path, base, left, right) => {
    const conflict = { path, baseValue: base, leftValue: left, rightValue: right };
    return promptUser(conflict);
  };
}

/**
 * Merge with schema evolution support
 * @param {ZodSchema} oldSchema - Old schema version
 * @param {ZodSchema} newSchema - New schema version
 * @param {any} base - Base data (old schema)
 * @param {any} left - Left data (new schema)
 * @param {any} right - Right data (new schema)
 * @param {MergeOptions} [opts={}] - Merge options
 * @returns {Promise<MergeResult>} Merge result
 */
export async function mergeWithSchemaEvolution(oldSchema, newSchema, base, left, right, opts = {}) {
  // Validate base against old schema
  const validatedBase = oldSchema.parse(base);

  // Validate left and right against new schema
  const validatedLeft = newSchema.parse(left);
  const validatedRight = newSchema.parse(right);

  // Perform merge using new schema
  return mergeData(newSchema, validatedBase, validatedLeft, validatedRight, {
    ...opts,
    allowSchemaEvolution: true,
  });
}

/**
 * Get merge statistics summary
 * @param {MergeResult} mergeResult - Merge result to summarize
 * @returns {string} Summary string
 */
export function summarizeMerge(mergeResult) {
  const { statistics, conflicts, hasConflicts } = mergeResult;

  const parts = [];
  parts.push(`Total fields: ${statistics.totalFields}`, `From base: ${statistics.fieldsFromBase}`, `From left: ${statistics.fieldsFromLeft}`, `From right: ${statistics.fieldsFromRight}`, `Merged: ${statistics.fieldsMerged}`);

  if (conflicts.length > 0) {
    parts.push(`Conflicts: ${conflicts.length} (${hasConflicts ? 'UNRESOLVED' : 'resolved'})`);
  }

  return parts.join(', ');
}
