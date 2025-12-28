/**
 * Policy System - Core policy definition and enforcement
 * @fileoverview Policy layer for compliance, security, and business rules validation
 */

import { z } from 'zod';

/**
 * @typedef {Object} PolicyRule
 * @property {string|string[]} [field] - Field or fields this rule applies to
 * @property {string} [fieldPattern] - Regex pattern to match field names
 * @property {'PII'|'PHI'|'PCI'|'PUBLIC'|'INTERNAL'|'CONFIDENTIAL'|'SECRET'} [classify] - Data classification
 * @property {'allow'|'deny'|'mask'|'encrypt'|'warn'|'redact'} [action] - Action to take
 * @property {boolean} [required] - Whether field is required
 * @property {string} [retention] - Data retention policy (e.g., '30 days', '1 year')
 * @property {Function} [validator] - Custom validation function
 * @property {Function} [transform] - Transform function to apply
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * @typedef {Object} PolicyDefinition
 * @property {string} name - Policy name
 * @property {string} [version] - Policy version
 * @property {string} [description] - Policy description
 * @property {PolicyRule[]} rules - Policy rules
 * @property {PolicyDefinition[]} [extends] - Base policies to extend
 * @property {boolean} [strict] - Strict mode (fail on any violation)
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * @typedef {Object} PolicyViolation
 * @property {string} rule - Rule that was violated
 * @property {string} field - Field that violated the rule
 * @property {string} message - Violation message
 * @property {string} severity - 'error' | 'warning' | 'info'
 * @property {any} [value] - The violating value (may be redacted)
 */

/**
 * @typedef {Object} PolicyEnforcementResult
 * @property {boolean} valid - Whether data passes all policies
 * @property {any} data - The (possibly transformed) data
 * @property {PolicyViolation[]} violations - List of violations
 * @property {Object} audit - Audit log entry
 * @property {Object} metadata - Additional metadata
 */

/**
 * PII Detection patterns
 */
const PII_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\d\s\-\+\(\)]+$/,
  ssn: /^\d{3}-?\d{2}-?\d{4}$/,
  creditCard: /^\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}$/,
  zipCode: /^\d{5}(-\d{4})?$/,
  ipAddress: /^(\d{1,3}\.){3}\d{1,3}$/,
  name: /^[A-Z][a-z]+([\s\-][A-Z][a-z]+)+$/,
};

/**
 * Common PII field names
 */
const PII_FIELD_NAMES = [
  'email', 'phone', 'phoneNumber', 'ssn', 'socialSecurityNumber',
  'firstName', 'lastName', 'fullName', 'name', 'address',
  'street', 'city', 'state', 'zip', 'zipCode', 'postalCode',
  'dob', 'dateOfBirth', 'birthDate', 'passport', 'driversLicense',
  'ipAddress', 'deviceId', 'userId', 'username'
];

/**
 * PHI field names (HIPAA)
 */
const PHI_FIELD_NAMES = [
  'medicalRecordNumber', 'mrn', 'healthPlanId', 'accountNumber',
  'certificateNumber', 'licenseNumber', 'vehicleId', 'deviceSerial',
  'webUrl', 'diagnosis', 'treatment', 'prescription', 'medication',
  'labResults', 'vitalSigns', 'allergies', 'immunizations'
];

/**
 * PCI DSS field names
 */
const PCI_FIELD_NAMES = [
  'cardNumber', 'creditCardNumber', 'debitCardNumber', 'cvv', 'cvc',
  'cardholderName', 'expirationDate', 'cardExpiry', 'pin',
  'trackData', 'magneticStripe', 'cardVerificationValue'
];

/**
 * Classify a field based on its name and value
 * @param {string} fieldName - Field name
 * @param {any} value - Field value
 * @returns {string|null} Classification or null
 */
export function classifyField(fieldName, value) {
  const lowerName = fieldName.toLowerCase();

  // Check PCI DSS fields first (most sensitive)
  if (PCI_FIELD_NAMES.some(f => lowerName.includes(f.toLowerCase()))) {
    return 'PCI';
  }

  // Check PHI fields
  if (PHI_FIELD_NAMES.some(f => lowerName.includes(f.toLowerCase()))) {
    return 'PHI';
  }

  // Check PII fields
  if (PII_FIELD_NAMES.some(f => lowerName.includes(f.toLowerCase()))) {
    return 'PII';
  }

  // Pattern-based detection for values
  if (typeof value === 'string') {
    if (PII_PATTERNS.email.test(value)) return 'PII';
    if (PII_PATTERNS.ssn.test(value)) return 'PII';
    if (PII_PATTERNS.creditCard.test(value)) return 'PCI';
    if (PII_PATTERNS.phone.test(value) && value.replace(/\D/g, '').length >= 10) return 'PII';
  }

  return undefined;
}

/**
 * Mask a value based on its type
 * @param {any} value - Value to mask
 * @param {string} classification - Data classification
 * @returns {string} Masked value
 */
export function maskValue(value, classification = 'PII') {
  if (value == undefined) return value;

  const str = String(value);

  // Full redaction for PCI data
  if (classification === 'PCI') {
    if (PII_PATTERNS.creditCard.test(str)) {
      // Show last 4 digits only
      return '****-****-****-' + str.slice(-4);
    }
    return '[REDACTED]';
  }

  // Partial masking for PII/PHI
  if (PII_PATTERNS.email.test(str)) {
    const [local, domain] = str.split('@');
    return local[0] + '***@' + domain;
  }

  if (PII_PATTERNS.ssn.test(str)) {
    return '***-**-' + str.slice(-4);
  }

  if (PII_PATTERNS.phone.test(str)) {
    return '***-***-' + str.slice(-4);
  }

  // Generic masking
  if (str.length > 4) {
    return str.slice(0, 2) + '*'.repeat(str.length - 4) + str.slice(-2);
  }

  return '****';
}

/**
 * Encrypt a value (placeholder - should use real encryption in production)
 * @param {any} value - Value to encrypt
 * @returns {string} Encrypted value
 */
export function encryptValue(value) {
  if (value == undefined) return value;
  // In production, use a real encryption library (e.g., crypto module)
  const encoded = Buffer.from(String(value)).toString('base64');
  return `ENC[${encoded}]`;
}

/**
 * Decrypt a value (placeholder)
 * @param {string} encrypted - Encrypted value
 * @returns {string} Decrypted value
 */
export function decryptValue(encrypted) {
  if (!encrypted || !encrypted.startsWith('ENC[')) return encrypted;
  const encoded = encrypted.slice(4, -1);
  return Buffer.from(encoded, 'base64').toString();
}

/**
 * Define a policy
 * @param {PolicyDefinition} definition - Policy definition
 * @returns {PolicyDefinition} Policy object
 */
export function definePolicy(definition) {
  // Validate policy definition
  const policySchema = z.object({
    name: z.string(),
    version: z.string().optional(),
    description: z.string().optional(),
    rules: z.array(z.object({
      field: z.union([z.string(), z.array(z.string())]).optional(),
      fieldPattern: z.string().optional(),
      classify: z.enum(['PII', 'PHI', 'PCI', 'PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'SECRET']).optional(),
      action: z.enum(['allow', 'deny', 'mask', 'encrypt', 'warn', 'redact']).optional(),
      required: z.boolean().optional(),
      retention: z.string().optional(),
      validator: z.function().optional(),
      transform: z.function().optional(),
      metadata: z.record(z.any()).optional(),
    })),
    extends: z.array(z.any()).optional(),
    strict: z.boolean().optional().default(false),
    metadata: z.record(z.any()).optional(),
  });

  const validated = policySchema.parse(definition);

  // Merge extended policies
  if (validated.extends && validated.extends.length > 0) {
    const mergedRules = [];
    for (const basePolicy of validated.extends) {
      mergedRules.push(...basePolicy.rules);
    }
    mergedRules.push(...validated.rules);
    validated.rules = mergedRules;
  }

  return validated;
}

/**
 * Apply a policy rule to a field
 * @param {PolicyRule} rule - Policy rule
 * @param {string} fieldName - Field name
 * @param {any} value - Field value
 * @param {Object} context - Enforcement context
 * @returns {{value: any, violations: PolicyViolation[]}} Result
 */
function applyRule(rule, fieldName, value, context) {
  const violations = [];
  let transformedValue = value;

  // Check if rule applies to this field
  const applies = (
    (!rule.field && !rule.fieldPattern) || // Global rule
    (rule.field && (
      (Array.isArray(rule.field) && rule.field.includes(fieldName)) ||
      (typeof rule.field === 'string' && rule.field === fieldName)
    )) ||
    (rule.fieldPattern && new RegExp(rule.fieldPattern).test(fieldName))
  );

  if (!applies) {
    return { value: transformedValue, violations };
  }

  // Auto-classify if not specified
  const classification = rule.classify || classifyField(fieldName, value);

  // Apply custom validator
  if (rule.validator) {
    try {
      const valid = rule.validator(value, fieldName, context);
      if (!valid) {
        violations.push({
          rule: 'custom-validator',
          field: fieldName,
          message: `Custom validation failed for field: ${fieldName}`,
          severity: context.strict ? 'error' : 'warning',
        });
      }
    } catch (error) {
      violations.push({
        rule: 'custom-validator',
        field: fieldName,
        message: `Validation error: ${error.message}`,
        severity: 'error',
      });
    }
  }

  // Apply action
  if (rule.action) {
    switch (rule.action) {
      case 'deny': {
        violations.push({
          rule: 'deny',
          field: fieldName,
          message: `Field '${fieldName}' is not allowed by policy`,
          severity: 'error',
        });
        break;
      }

      case 'mask': {
        transformedValue = maskValue(value, classification);
        if (context.audit) {
          context.audit.maskedFields = context.audit.maskedFields || [];
          context.audit.maskedFields.push(fieldName);
        }
        break;
      }

      case 'encrypt': {
        transformedValue = encryptValue(value);
        if (context.audit) {
          context.audit.encryptedFields = context.audit.encryptedFields || [];
          context.audit.encryptedFields.push(fieldName);
        }
        break;
      }

      case 'redact': {
        transformedValue = '[REDACTED]';
        if (context.audit) {
          context.audit.redactedFields = context.audit.redactedFields || [];
          context.audit.redactedFields.push(fieldName);
        }
        break;
      }

      case 'warn': {
        violations.push({
          rule: 'warn',
          field: fieldName,
          message: `Warning for field '${fieldName}': ${classification || 'policy concern'}`,
          severity: 'warning',
        });
        break;
      }
    }
  }

  // Apply transform
  if (rule.transform) {
    try {
      transformedValue = rule.transform(transformedValue, fieldName, context);
    } catch (error) {
      violations.push({
        rule: 'transform',
        field: fieldName,
        message: `Transform error: ${error.message}`,
        severity: 'error',
      });
    }
  }

  // Check classification
  if (classification && context.audit) {
    context.audit.classifications = context.audit.classifications || {};
    context.audit.classifications[fieldName] = classification;
  }

  return { value: transformedValue, violations };
}

/**
 * Enforce a policy on data
 * @param {PolicyDefinition} policy - Policy to enforce
 * @param {any} data - Data to validate
 * @param {Object} options - Enforcement options
 * @returns {PolicyEnforcementResult} Enforcement result
 */
export async function enforcePolicy(policy, data, options = {}) {
  const context = {
    strict: options.strict ?? policy.strict ?? false,
    simulate: options.simulate ?? false,
    audit: {
      policyName: policy.name,
      policyVersion: policy.version,
      timestamp: new Date().toISOString(),
      classifications: {},
      maskedFields: [],
      encryptedFields: [],
      redactedFields: [],
    },
  };

  const violations = [];
  let transformedData = data;

  // Handle arrays
  if (Array.isArray(data)) {
    transformedData = [];
    for (const datum of data) {
      const itemResult = await enforcePolicy(policy, datum, options);
      transformedData.push(itemResult.data);
      violations.push(...itemResult.violations);
    }

    return {
      valid: violations.filter(v => v.severity === 'error').length === 0,
      data: context.simulate ? data : transformedData,
      violations,
      audit: context.audit,
      metadata: { itemCount: data.length },
    };
  }

  // Handle objects
  if (data && typeof data === 'object') {
    transformedData = { ...data };

    for (const [fieldName, value] of Object.entries(data)) {
      for (const rule of policy.rules) {
        const { value: newValue, violations: ruleViolations } = applyRule(
          rule,
          fieldName,
          transformedData[fieldName],
          context
        );

        if (!context.simulate) {
          transformedData[fieldName] = newValue;
        }

        violations.push(...ruleViolations);
      }
    }
  }

  const valid = violations.filter(v => v.severity === 'error').length === 0;

  // In strict mode, throw on errors
  if (context.strict && !valid && !context.simulate) {
    const errorViolations = violations.filter(v => v.severity === 'error');
    const error = new Error(`Policy violations detected: ${errorViolations.map(v => v.message).join(', ')}`);
    error.violations = errorViolations;
    throw error;
  }

  return {
    valid,
    data: context.simulate ? data : transformedData,
    violations,
    audit: context.audit,
    metadata: {
      fieldCount: Object.keys(data || {}).length,
      policyRuleCount: policy.rules.length,
    },
  };
}

/**
 * Combine multiple policies
 * @param {PolicyDefinition[]} policies - Policies to combine
 * @param {string} name - Combined policy name
 * @returns {PolicyDefinition} Combined policy
 */
export function combinePolicy(policies, name = 'Combined Policy') {
  const combinedRules = [];

  for (const policy of policies) {
    combinedRules.push(...policy.rules);
  }

  return definePolicy({
    name,
    version: '1.0.0',
    description: `Combined policy from: ${policies.map(p => p.name).join(', ')}`,
    rules: combinedRules,
    metadata: {
      sourcePolicies: policies.map(p => ({ name: p.name, version: p.version })),
    },
  });
}

/**
 * Create audit logger for policy enforcement
 * @param {Object} options - Logger options
 * @returns {Function} Audit logger function
 */
export function createAuditLogger(options = {}) {
  const logs = [];

  return {
    log: (entry) => {
      const auditEntry = {
        timestamp: new Date().toISOString(),
        ...entry,
      };

      logs.push(auditEntry);

      if (options.onLog) {
        options.onLog(auditEntry);
      }

      if (options.console) {
        console.log('[POLICY AUDIT]', auditEntry);
      }

      return auditEntry;
    },

    getLogs: () => [...logs],

    clear: () => {
      logs.length = 0;
    },

    export: () => ({
      logs: [...logs],
      summary: {
        total: logs.length,
        violations: logs.filter(l => l.violations?.length > 0).length,
        errors: logs.filter(l => l.violations?.some(v => v.severity === 'error')).length,
      },
    }),
  };
}
