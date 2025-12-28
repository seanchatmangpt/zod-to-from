/**
 * Business Rules Policy Tests
 * @fileoverview Tests for business rules enforcement
 */

import { describe, expect, it } from 'vitest';
import { enforcePolicy } from '../../src/core/policies.mjs';
import {
  WorkflowStateMachine,
  businessPolicy,
  createBusinessRule,
  orderWorkflow,
  scoreDataQuality,
} from '../../src/policies/business.mjs';

describe('Business Rules Policy', () => {
  describe('businessPolicy', () => {
    it('should validate email domain whitelist', async () => {
      const policy = businessPolicy;
      const context = {
        allowedEmailDomains: ['example.com', 'test.com'],
      };

      const validData = { email: 'user@example.com' };
      const invalidData = { email: 'user@invalid.com' };

      const validResult = await enforcePolicy(policy, validData, context);
      const invalidResult = await enforcePolicy(policy, invalidData, context);

      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.audit.businessViolations).toBeDefined();
    });

    it('should validate age range', async () => {
      const context = { minAge: 18, maxAge: 65 };

      const validData = { age: 25 };
      const tooYoung = { age: 15 };
      const tooOld = { age: 70 };

      const validResult = await enforcePolicy(businessPolicy, validData, context);
      const youngResult = await enforcePolicy(businessPolicy, tooYoung, context);
      const oldResult = await enforcePolicy(businessPolicy, tooOld, context);

      expect(validResult.valid).toBe(true);
      expect(youngResult.valid).toBe(false);
      expect(oldResult.valid).toBe(false);
    });

    it('should validate date ranges', async () => {
      const context = {
        minDate: '2024-01-01',
        maxDate: '2024-12-31',
      };

      const validData = { eventDate: '2024-06-15' };
      const beforeMin = { eventDate: '2023-12-31' };
      const afterMax = { eventDate: '2025-01-01' };

      const validResult = await enforcePolicy(businessPolicy, validData, context);
      const beforeResult = await enforcePolicy(businessPolicy, beforeMin, context);
      const afterResult = await enforcePolicy(businessPolicy, afterMax, context);

      expect(validResult.valid).toBe(true);
      expect(beforeResult.valid).toBe(false);
      expect(afterResult.valid).toBe(false);
    });

    it('should validate amount/currency', async () => {
      const context = { maxAmount: 1000 };

      const validData = { amount: 500 };
      const negativeData = { amount: -100 };
      const excessiveData = { amount: 2000 };

      const validResult = await enforcePolicy(businessPolicy, validData, context);
      const negativeResult = await enforcePolicy(businessPolicy, negativeData, context);
      const excessiveResult = await enforcePolicy(businessPolicy, excessiveData, context);

      expect(validResult.valid).toBe(true);
      expect(negativeResult.valid).toBe(false);
      expect(excessiveResult.valid).toBe(false);
    });

    it('should validate status values', async () => {
      const context = {
        validStatuses: ['pending', 'approved', 'rejected'],
      };

      const validData = { status: 'pending' };
      const invalidData = { status: 'unknown' };

      const validResult = await enforcePolicy(businessPolicy, validData, context);
      const invalidResult = await enforcePolicy(businessPolicy, invalidData, context);

      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
    });

    it('should validate status transitions', async () => {
      const context = {
        validStatuses: ['draft', 'pending', 'approved'],
        currentStatus: 'draft',
        allowedTransitions: {
          draft: ['pending'],
          pending: ['approved', 'rejected'],
          approved: [],
        },
      };

      const validData = { status: 'pending' };
      const invalidData = { status: 'approved' };

      const validResult = await enforcePolicy(businessPolicy, validData, context);
      const invalidResult = await enforcePolicy(businessPolicy, invalidData, context);

      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
    });
  });

  describe('createBusinessRule', () => {
    it('should create custom business rule', () => {
      const rule = createBusinessRule({
        name: 'Custom Validation',
        description: 'Custom field validation',
        field: 'customField',
        validator: (value) => value > 0,
        severity: 'error',
      });

      expect(rule.field).toBe('customField');
      expect(rule.validator).toBeDefined();
      expect(rule.metadata.rule).toBe('Custom Validation');
      expect(rule.metadata.severity).toBe('error');
    });
  });

  describe('WorkflowStateMachine', () => {
    it('should validate allowed transitions', () => {
      const workflow = new WorkflowStateMachine({
        states: ['draft', 'review', 'approved'],
        transitions: {
          draft: ['review'],
          review: ['approved', 'draft'],
          approved: [],
        },
        initialState: 'draft',
      });

      expect(workflow.canTransition('draft', 'review')).toBe(true);
      expect(workflow.canTransition('draft', 'approved')).toBe(false);
    });

    it('should get next states', () => {
      const workflow = new WorkflowStateMachine({
        states: ['draft', 'review', 'approved'],
        transitions: {
          draft: ['review'],
          review: ['approved', 'draft'],
          approved: [],
        },
        initialState: 'draft',
      });

      expect(workflow.getNextStates('draft')).toEqual(['review']);
      expect(workflow.getNextStates('review')).toEqual(['approved', 'draft']);
      expect(workflow.getNextStates('approved')).toEqual([]);
    });

    it('should validate transitions', () => {
      const workflow = new WorkflowStateMachine({
        states: ['draft', 'review', 'approved'],
        transitions: {
          draft: ['review'],
          review: ['approved', 'draft'],
          approved: [],
        },
        initialState: 'draft',
      });

      const valid = workflow.validate('draft', 'review');
      const invalid = workflow.validate('draft', 'approved');

      expect(valid.valid).toBe(true);
      expect(invalid.valid).toBe(false);
      expect(invalid.allowed).toEqual(['review']);
    });
  });

  describe('orderWorkflow', () => {
    it('should allow valid order transitions', () => {
      expect(orderWorkflow.canTransition('draft', 'submitted')).toBe(true);
      expect(orderWorkflow.canTransition('submitted', 'processing')).toBe(true);
      expect(orderWorkflow.canTransition('processing', 'shipped')).toBe(true);
      expect(orderWorkflow.canTransition('shipped', 'delivered')).toBe(true);
    });

    it('should prevent invalid order transitions', () => {
      expect(orderWorkflow.canTransition('draft', 'shipped')).toBe(false);
      expect(orderWorkflow.canTransition('delivered', 'processing')).toBe(false);
      expect(orderWorkflow.canTransition('cancelled', 'submitted')).toBe(false);
    });

    it('should allow cancellation from valid states', () => {
      expect(orderWorkflow.canTransition('draft', 'cancelled')).toBe(true);
      expect(orderWorkflow.canTransition('submitted', 'cancelled')).toBe(true);
      expect(orderWorkflow.canTransition('processing', 'cancelled')).toBe(true);
    });
  });

  describe('scoreDataQuality', () => {
    it('should score completeness', () => {
      const rules = {
        requiredFields: ['name', 'email', 'phone'],
        optionalFields: ['address'],
      };

      const completeData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        address: '123 Main St',
      };

      const incompleteData = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const completeScore = scoreDataQuality(completeData, rules);
      const incompleteScore = scoreDataQuality(incompleteData, rules);

      expect(completeScore.scores.completeness).toBe(100);
      expect(incompleteScore.scores.completeness).toBe(50);
    });

    it('should score accuracy', () => {
      const rules = {
        requiredFields: ['email'],
        optionalFields: [],
        validators: {
          email: (value) => value.includes('@'),
        },
      };

      const accurateData = { email: 'user@example.com' };
      const inaccurateData = { email: 'not-an-email' };

      const accurateScore = scoreDataQuality(accurateData, rules);
      const inaccurateScore = scoreDataQuality(inaccurateData, rules);

      expect(accurateScore.scores.accuracy).toBe(100);
      expect(inaccurateScore.scores.accuracy).toBe(0);
    });

    it('should score consistency', () => {
      const rules = {
        requiredFields: ['startDate', 'endDate'],
        optionalFields: [],
        consistencyChecks: [
          (data) => new Date(data.startDate) < new Date(data.endDate),
        ],
      };

      const consistentData = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      const inconsistentData = {
        startDate: '2024-12-31',
        endDate: '2024-01-01',
      };

      const consistentScore = scoreDataQuality(consistentData, rules);
      const inconsistentScore = scoreDataQuality(inconsistentData, rules);

      expect(consistentScore.scores.consistency).toBe(100);
      expect(inconsistentScore.scores.consistency).toBe(80);
    });

    it('should calculate overall score', () => {
      const rules = {
        requiredFields: ['name', 'email'],
        optionalFields: [],
      };

      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        updatedAt: new Date().toISOString(),
      };

      const score = scoreDataQuality(data, rules);

      expect(score.overall).toBeGreaterThan(0);
      expect(score.overall).toBeLessThanOrEqual(100);
    });
  });
});
