/**
 * Business Rules Policy
 * @fileoverview Custom business rules and validation logic
 */

import { definePolicy } from '../core/policies.mjs';

/**
 * Business Rules Policy
 *
 * Custom business logic for:
 * - Data quality rules
 * - Business constraints
 * - Domain-specific validation
 * - Workflow rules
 */
export const businessPolicy = definePolicy({
  name: 'Business Rules',
  version: '1.0.0',
  description: 'Custom business rules and domain-specific validation',
  strict: false,
  rules: [
    // Email domain whitelist
    {
      field: ['email', 'workEmail', 'contactEmail'],
      validator: (value, fieldName, context) => {
        if (typeof value !== 'string') return true;

        const allowedDomains = context.allowedEmailDomains || [];
        if (allowedDomains.length === 0) return true;

        const domain = value.split('@')[1];
        if (!allowedDomains.includes(domain)) {
          context.audit.businessViolations = context.audit.businessViolations || [];
          context.audit.businessViolations.push({
            rule: 'email-domain-whitelist',
            field: fieldName,
            value: domain,
            allowed: allowedDomains,
          });
          return false;
        }

        return true;
      },
      metadata: {
        rule: 'Email Domain Whitelist',
        description: 'Only allow emails from approved domains',
      },
    },

    // Age validation
    {
      field: ['age'],
      validator: (value, fieldName, context) => {
        const age = Number.parseInt(value, 10);
        const minAge = context.minAge || 0;
        const maxAge = context.maxAge || 150;

        if (age < minAge || age > maxAge) {
          context.audit.businessViolations = context.audit.businessViolations || [];
          context.audit.businessViolations.push({
            rule: 'age-range',
            field: fieldName,
            value: age,
            range: [minAge, maxAge],
          });
          return false;
        }

        return true;
      },
      metadata: {
        rule: 'Age Range Validation',
      },
    },

    // Date range validation
    {
      fieldPattern: '.*[Dd]ate.*',
      validator: (value, fieldName, context) => {
        if (!value) return true;

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
          return false;
        }

        const minDate = context.minDate ? new Date(context.minDate) : undefined;
        const maxDate = context.maxDate ? new Date(context.maxDate) : undefined;

        if (minDate && date < minDate) {
          context.audit.businessViolations = context.audit.businessViolations || [];
          context.audit.businessViolations.push({
            rule: 'date-range',
            field: fieldName,
            value: date.toISOString(),
            violation: 'before-minimum',
          });
          return false;
        }

        if (maxDate && date > maxDate) {
          context.audit.businessViolations = context.audit.businessViolations || [];
          context.audit.businessViolations.push({
            rule: 'date-range',
            field: fieldName,
            value: date.toISOString(),
            violation: 'after-maximum',
          });
          return false;
        }

        return true;
      },
      metadata: {
        rule: 'Date Range Validation',
      },
    },

    // Amount/Currency validation
    {
      field: ['amount', 'price', 'cost', 'total', 'subtotal'],
      validator: (value, fieldName, context) => {
        const amount = Number.parseFloat(value);

        if (Number.isNaN(amount) || amount < 0) {
          context.audit.businessViolations = context.audit.businessViolations || [];
          context.audit.businessViolations.push({
            rule: 'amount-validation',
            field: fieldName,
            value: amount,
            violation: 'negative-amount',
          });
          return false;
        }

        const maxAmount = context.maxAmount || Number.POSITIVE_INFINITY;
        if (amount > maxAmount) {
          context.audit.businessViolations = context.audit.businessViolations || [];
          context.audit.businessViolations.push({
            rule: 'amount-validation',
            field: fieldName,
            value: amount,
            violation: 'exceeds-maximum',
            maximum: maxAmount,
          });
          return false;
        }

        return true;
      },
      metadata: {
        rule: 'Amount Validation',
      },
    },

    // Status workflow validation
    {
      field: ['status'],
      validator: (value, fieldName, context) => {
        const validStatuses = context.validStatuses || [
          'draft', 'pending', 'approved', 'rejected', 'completed', 'cancelled'
        ];

        if (!validStatuses.includes(value)) {
          context.audit.businessViolations = context.audit.businessViolations || [];
          context.audit.businessViolations.push({
            rule: 'status-workflow',
            field: fieldName,
            value,
            validStatuses,
          });
          return false;
        }

        // Check workflow transitions
        const currentStatus = context.currentStatus;
        const allowedTransitions = context.allowedTransitions || {};

        if (currentStatus && allowedTransitions[currentStatus] && !allowedTransitions[currentStatus].includes(value)) {
            context.audit.businessViolations = context.audit.businessViolations || [];
            context.audit.businessViolations.push({
              rule: 'status-transition',
              field: fieldName,
              from: currentStatus,
              to: value,
              allowed: allowedTransitions[currentStatus],
            });
            return false;
          }

        return true;
      },
      metadata: {
        rule: 'Status Workflow',
        description: 'Validate status values and transitions',
      },
    },

    // Unique field validation
    {
      metadata: {
        rule: 'Unique Fields',
        description: 'Ensure uniqueness constraints',
      },
      validator: (value, fieldName, context) => {
        const uniqueFields = context.uniqueFields || [];

        if (uniqueFields.includes(fieldName)) {
          const existingValues = context.existingValues?.[fieldName] || [];

          if (existingValues.includes(value)) {
            context.audit.businessViolations = context.audit.businessViolations || [];
            context.audit.businessViolations.push({
              rule: 'unique-constraint',
              field: fieldName,
              value,
            });
            return false;
          }
        }

        return true;
      },
    },

    // Required field groups
    {
      metadata: {
        rule: 'Required Field Groups',
        description: 'Ensure required field combinations',
      },
      validator: (value, fieldName, context) => {
        const requiredGroups = context.requiredGroups || [];

        for (const group of requiredGroups) {
          const hasAll = group.every(f => context.data?.[f] != undefined);
          const hasAny = group.some(f => context.data?.[f] != undefined);

          if (hasAny && !hasAll) {
            context.audit.businessViolations = context.audit.businessViolations || [];
            context.audit.businessViolations.push({
              rule: 'required-field-group',
              group,
              missing: group.filter(f => context.data?.[f] == undefined),
            });
            return false;
          }
        }

        return true;
      },
    },
  ],
  metadata: {
    category: 'Business Rules',
    customizable: true,
  },
});

/**
 * Create custom business rule
 * @param {Object} ruleConfig - Rule configuration
 * @returns {Object} Business rule
 */
export function createBusinessRule(ruleConfig) {
  return {
    field: ruleConfig.field,
    fieldPattern: ruleConfig.fieldPattern,
    validator: ruleConfig.validator,
    transform: ruleConfig.transform,
    metadata: {
      rule: ruleConfig.name,
      description: ruleConfig.description,
      severity: ruleConfig.severity || 'warning',
      ...ruleConfig.metadata,
    },
  };
}

/**
 * Workflow state machine
 */
export class WorkflowStateMachine {
  constructor(config) {
    this.states = config.states;
    this.transitions = config.transitions;
    this.initialState = config.initialState;
  }

  canTransition(from, to) {
    if (!this.transitions[from]) {
      return false;
    }

    return this.transitions[from].includes(to);
  }

  getNextStates(current) {
    return this.transitions[current] || [];
  }

  validate(current, next) {
    if (!this.states.includes(current)) {
      return { valid: false, error: 'Invalid current state' };
    }

    if (!this.states.includes(next)) {
      return { valid: false, error: 'Invalid next state' };
    }

    if (!this.canTransition(current, next)) {
      return {
        valid: false,
        error: `Cannot transition from ${current} to ${next}`,
        allowed: this.getNextStates(current),
      };
    }

    return { valid: true };
  }
}

/**
 * Example workflow: Order processing
 */
export const orderWorkflow = new WorkflowStateMachine({
  states: ['draft', 'submitted', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
  transitions: {
    draft: ['submitted', 'cancelled'],
    submitted: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered', 'refunded'],
    delivered: ['refunded'],
    cancelled: [],
    refunded: [],
  },
  initialState: 'draft',
});

/**
 * Data quality scorer
 * @param {Object} data - Data to score
 * @param {Object} rules - Quality rules
 * @returns {Object} Quality score
 */
export function scoreDataQuality(data, rules = {}) {
  const scores = {
    completeness: 0,
    accuracy: 0,
    consistency: 0,
    timeliness: 0,
  };

  const requiredFields = rules.requiredFields || [];
  const optionalFields = rules.optionalFields || [];
  const totalFields = requiredFields.length + optionalFields.length;

  if (totalFields === 0) {
    return { overall: 100, scores };
  }

  // Completeness: percentage of fields present
  let presentFields = 0;
  for (const field of [...requiredFields, ...optionalFields]) {
    if (data[field] != undefined && data[field] !== '') {
      presentFields++;
    }
  }
  scores.completeness = (presentFields / totalFields) * 100;

  // Accuracy: validate format/type
  let accurateFields = 0;
  for (const [field, value] of Object.entries(data)) {
    if (rules.validators?.[field]) {
      if (rules.validators[field](value)) {
        accurateFields++;
      }
    } else {
      accurateFields++;
    }
  }
  scores.accuracy = (accurateFields / Object.keys(data).length) * 100;

  // Consistency: check for conflicts
  scores.consistency = 100; // Default
  if (rules.consistencyChecks) {
    for (const check of rules.consistencyChecks) {
      if (!check(data)) {
        scores.consistency -= 20;
      }
    }
  }

  // Timeliness: check timestamps
  scores.timeliness = 100; // Default
  if (data.updatedAt || data.createdAt) {
    const date = new Date(data.updatedAt || data.createdAt);
    const ageInDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    const maxAge = rules.maxAgeInDays || 365;

    if (ageInDays > maxAge) {
      scores.timeliness = Math.max(0, 100 - (ageInDays / maxAge) * 100);
    }
  }

  const overall = (scores.completeness + scores.accuracy + scores.consistency + scores.timeliness) / 4;

  return { overall, scores };
}

export default businessPolicy;
