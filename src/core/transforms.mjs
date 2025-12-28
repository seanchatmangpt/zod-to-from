/**
 * Declarative Transform Engine for zod-to-from
 * @fileoverview Transform DSL for data transformation with validation
 */

import { stringTransforms } from '../transforms/string.mjs';
import { numberTransforms } from '../transforms/number.mjs';
import { dateTransforms } from '../transforms/date.mjs';
import { arrayTransforms } from '../transforms/array.mjs';
import { objectTransforms } from '../transforms/object.mjs';

/**
 * @typedef {Object} FieldMapping
 * @property {string} source - Source field path (e.g., 'user.firstName')
 * @property {string} target - Target field path (e.g., 'first_name')
 */

/**
 * @typedef {Object} TransformRule
 * @property {string} field - Field to transform
 * @property {string} fn - Transform function name
 * @property {any} [value] - Optional value parameter
 * @property {Object} [options] - Optional transform options
 */

/**
 * @typedef {Object} ConditionalTransform
 * @property {string|Function} if - Condition expression or function
 * @property {TransformRule[]} then - Transforms to apply if true
 * @property {TransformRule[]} [else] - Transforms to apply if false
 */

/**
 * @typedef {Object} TransformConfig
 * @property {Object<string, string>} [mapping] - Field name mappings
 * @property {TransformRule[]} [transforms] - Transform rules to apply
 * @property {ConditionalTransform[]} [conditionals] - Conditional transforms
 * @property {Object<string, Function>} [custom] - Custom transform functions
 * @property {import('zod').ZodSchema} [validate] - Output schema validation
 * @property {boolean} [bidirectional] - Enable reverse transforms
 */

/**
 * @typedef {Object} TransformResult
 * @property {any} data - Transformed data
 * @property {Object} [metadata] - Transform metadata
 * @property {string[]} [errors] - Transform errors
 * @property {TransformConfig} [reverseConfig] - Reverse transform config
 */

// Built-in transform registry
const builtInTransforms = {
  ...stringTransforms,
  ...numberTransforms,
  ...dateTransforms,
  ...arrayTransforms,
  ...objectTransforms,
};

/**
 * Get a nested field value using dot notation
 * @param {Object} obj - Source object
 * @param {string} path - Dot-notation path (e.g., 'user.firstName')
 * @returns {any} Field value
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Set a nested field value using dot notation
 * @param {Object} obj - Target object
 * @param {string} path - Dot-notation path
 * @param {any} value - Value to set
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
}

/**
 * Apply field mappings to data
 * @param {any} data - Input data
 * @param {Object<string, string>} mappings - Field mappings
 * @returns {any} Mapped data
 */
function applyMappings(data, mappings) {
  if (!mappings || typeof data !== 'object' || data === null) {
    return data;
  }

  const result = Array.isArray(data) ? [] : {};

  // Copy unmapped fields
  Object.assign(result, data);

  // Apply mappings
  for (const [source, target] of Object.entries(mappings)) {
    const value = getNestedValue(data, source);
    if (value !== undefined) {
      setNestedValue(result, target, value);
      // Remove old field if it's a simple rename
      if (!source.includes('.') && !target.includes('.')) {
        delete result[source];
      }
    }
  }

  return result;
}

/**
 * Apply a single transform rule
 * @param {any} data - Input data
 * @param {TransformRule} rule - Transform rule
 * @param {Object<string, Function>} customTransforms - Custom functions
 * @returns {any} Transformed data
 */
function applyTransformRule(data, rule, customTransforms = {}) {
  const { field, fn, value, options } = rule;

  // Get the transform function
  const transformFn = customTransforms[fn] || builtInTransforms[fn];
  if (!transformFn) {
    throw new Error(`Transform function '${fn}' not found`);
  }

  // Get current field value
  const currentValue = getNestedValue(data, field);

  // Apply transform
  const transformedValue = transformFn(currentValue, value, options);

  // Set transformed value
  const result = { ...data };
  setNestedValue(result, field, transformedValue);

  return result;
}

/**
 * Evaluate a condition
 * @param {string|Function} condition - Condition expression or function
 * @param {any} data - Data to evaluate against
 * @returns {boolean} Condition result
 */
function evaluateCondition(condition, data) {
  if (typeof condition === 'function') {
    return condition(data);
  }

  if (typeof condition === 'string') {
    // Simple expression evaluation (e.g., "status === 'active'")
    // Note: In production, use a proper expression parser for security
    try {
      // Create a safe evaluation context
      const fn = new Function('data', `with(data) { return ${condition}; }`);
      return fn(data);
    } catch (error) {
      throw new Error(`Failed to evaluate condition: ${condition} - ${error.message}`);
    }
  }

  return false;
}

/**
 * Apply conditional transforms
 * @param {any} data - Input data
 * @param {ConditionalTransform[]} conditionals - Conditional rules
 * @param {Object<string, Function>} customTransforms - Custom functions
 * @returns {any} Transformed data
 */
function applyConditionals(data, conditionals, customTransforms = {}) {
  let result = data;

  for (const conditional of conditionals) {
    const conditionMet = evaluateCondition(conditional.if, result);
    const rulesToApply = conditionMet ? conditional.then : conditional.else;

    if (rulesToApply) {
      for (const rule of rulesToApply) {
        result = applyTransformRule(result, rule, customTransforms);
      }
    }
  }

  return result;
}

/**
 * Create reverse mapping configuration
 * @param {Object<string, string>} mappings - Original mappings
 * @returns {Object<string, string>} Reversed mappings
 */
function createReverseMappings(mappings) {
  if (!mappings) return undefined;
  return Object.fromEntries(
    Object.entries(mappings).map(([source, target]) => [target, source])
  );
}

/**
 * Create reverse transform configuration
 * @param {TransformConfig} config - Original transform config
 * @returns {TransformConfig|undefined} Reverse config
 */
function createReverseConfig(config) {
  if (!config.bidirectional) return undefined;

  return {
    mapping: createReverseMappings(config.mapping),
    // Note: Not all transforms are reversible
    // Only include mapping for reverse config
  };
}

/**
 * Apply transform configuration to data
 * @param {any} data - Input data
 * @param {TransformConfig} config - Transform configuration
 * @returns {Promise<TransformResult>} Transform result
 */
export async function applyTransform(data, config) {
  const errors = [];
  let result = data;

  try {
    // Step 1: Apply field mappings
    if (config.mapping) {
      result = applyMappings(result, config.mapping);
    }

    // Step 2: Apply transforms
    if (config.transforms) {
      for (const rule of config.transforms) {
        try {
          result = applyTransformRule(result, rule, config.custom);
        } catch (error) {
          errors.push(`Transform '${rule.fn}' on field '${rule.field}': ${error.message}`);
        }
      }
    }

    // Step 3: Apply conditional transforms
    if (config.conditionals) {
      result = applyConditionals(result, config.conditionals, config.custom);
    }

    // Step 4: Validate output schema
    if (config.validate) {
      try {
        result = config.validate.parse(result);
      } catch (error) {
        errors.push(`Validation error: ${error.message}`);
      }
    }

    // Create reverse config if bidirectional
    const reverseConfig = createReverseConfig(config);

    return {
      data: result,
      metadata: {
        appliedRules: config.transforms?.length || 0,
        appliedMappings: Object.keys(config.mapping || {}).length,
        hasErrors: errors.length > 0,
      },
      errors: errors.length > 0 ? errors : undefined,
      reverseConfig,
    };
  } catch (error) {
    return {
      data: result,
      metadata: { hasErrors: true },
      errors: [error.message],
    };
  }
}

/**
 * Test transform with sample data (dry run)
 * @param {TransformConfig} config - Transform configuration
 * @param {any[]} samples - Sample data array
 * @returns {Promise<Object>} Test results
 */
export async function testTransform(config, samples) {
  const results = [];

  for (const sample of samples) {
    const result = await applyTransform(sample, config);
    results.push({
      input: sample,
      output: result.data,
      errors: result.errors,
      success: !result.errors || result.errors.length === 0,
    });
  }

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.length - successCount;

  return {
    results,
    summary: {
      total: samples.length,
      success: successCount,
      failure: failureCount,
      successRate: (successCount / samples.length) * 100,
    },
  };
}

/**
 * Compose multiple transform configurations
 * @param {...TransformConfig} configs - Transform configs to compose
 * @returns {TransformConfig} Composed configuration
 */
export function composeTransforms(...configs) {
  return {
    mapping: configs.reduce((acc, cfg) => ({ ...acc, ...cfg.mapping }), {}),
    transforms: configs.flatMap((cfg) => cfg.transforms || []),
    conditionals: configs.flatMap((cfg) => cfg.conditionals || []),
    custom: configs.reduce((acc, cfg) => ({ ...acc, ...cfg.custom }), {}),
  };
}

/**
 * Create a transform template (reusable configuration)
 * @param {string} name - Template name
 * @param {TransformConfig} config - Template configuration
 * @returns {Object} Template object
 */
export function createTransformTemplate(name, config) {
  return {
    name,
    config,
    apply: (data) => applyTransform(data, config),
    test: (samples) => testTransform(config, samples),
  };
}

/**
 * Register a custom transform function
 * @param {string} name - Transform function name
 * @param {Function} fn - Transform function
 */
export function registerTransform(name, fn) {
  builtInTransforms[name] = fn;
}

/**
 * Get all available transform functions
 * @returns {string[]} Array of transform function names
 */
export function listTransforms() {
  return Object.keys(builtInTransforms);
}

/**
 * Export for use in parseFrom/formatTo options
 */
export const transforms = {
  apply: applyTransform,
  test: testTransform,
  compose: composeTransforms,
  createTemplate: createTransformTemplate,
  register: registerTransform,
  list: listTransforms,
};
