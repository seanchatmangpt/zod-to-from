/**
 * Core Policy System Tests
 * @fileoverview Tests for policy definition and enforcement
 */

import { describe, expect, it } from 'vitest';
import {
  classifyField,
  combinePolicy,
  createAuditLogger,
  decryptValue,
  definePolicy,
  encryptValue,
  enforcePolicy,
  maskValue,
} from '../../src/core/policies.mjs';

describe('Core Policy System', () => {
  describe('classifyField', () => {
    it('should classify email as PII', () => {
      expect(classifyField('email', 'user@example.com')).toBe('PII');
    });

    it('should classify credit card as PCI', () => {
      expect(classifyField('cardNumber', '4111111111111111')).toBe('PCI');
    });

    it('should classify medical record as PHI', () => {
      expect(classifyField('medicalRecordNumber', '12345')).toBe('PHI');
    });

    it('should return undefined for non-sensitive fields', () => {
      expect(classifyField('title', 'Software Engineer')).toBe(undefined);
    });

    it('should detect SSN pattern', () => {
      expect(classifyField('userId', '123-45-6789')).toBe('PII');
    });

    it('should detect credit card pattern', () => {
      expect(classifyField('payment', '4111 1111 1111 1111')).toBe('PCI');
    });
  });

  describe('maskValue', () => {
    it('should mask email addresses', () => {
      const masked = maskValue('john.doe@example.com', 'PII');
      expect(masked).toBe('j***@example.com');
    });

    it('should mask SSN', () => {
      const masked = maskValue('123-45-6789', 'PII');
      expect(masked).toBe('***-**-6789');
    });

    it('should fully redact credit cards for PCI', () => {
      const masked = maskValue('4111111111111111', 'PCI');
      expect(masked).toBe('****-****-****-1111');
    });

    it('should mask phone numbers', () => {
      const masked = maskValue('555-123-4567', 'PII');
      expect(masked).toBe('***-***-4567');
    });

    it('should generically mask short values', () => {
      const masked = maskValue('abc', 'PII');
      expect(masked).toBe('****');
    });
  });

  describe('encryptValue and decryptValue', () => {
    it('should encrypt and decrypt values', () => {
      const original = 'sensitive data';
      const encrypted = encryptValue(original);

      expect(encrypted).toContain('ENC[');
      expect(encrypted).not.toBe(original);

      const decrypted = decryptValue(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should handle undefined values', () => {
      expect(encryptValue(undefined)).toBe(undefined);
      expect(decryptValue(undefined)).toBe(undefined);
    });
  });

  describe('definePolicy', () => {
    it('should define a basic policy', () => {
      const policy = definePolicy({
        name: 'Test Policy',
        version: '1.0.0',
        rules: [
          { field: 'email', classify: 'PII', action: 'mask' },
        ],
      });

      expect(policy.name).toBe('Test Policy');
      expect(policy.version).toBe('1.0.0');
      expect(policy.rules).toHaveLength(1);
    });

    it('should merge extended policies', () => {
      const basePolicy = definePolicy({
        name: 'Base',
        rules: [{ field: 'name', classify: 'PII' }],
      });

      const extendedPolicy = definePolicy({
        name: 'Extended',
        extends: [basePolicy],
        rules: [{ field: 'email', classify: 'PII' }],
      });

      expect(extendedPolicy.rules).toHaveLength(2);
    });

    it('should validate policy definition', () => {
      expect(() => {
        definePolicy({
          name: 'Invalid',
          rules: 'not-an-array',
        });
      }).toThrow();
    });
  });

  describe('enforcePolicy', () => {
    it('should enforce masking rules', async () => {
      const policy = definePolicy({
        name: 'Mask Policy',
        rules: [
          { field: 'email', action: 'mask' },
        ],
      });

      const data = { email: 'user@example.com', name: 'John' };
      const result = await enforcePolicy(policy, data);

      expect(result.valid).toBe(true);
      expect(result.data.email).toBe('u***@example.com');
      expect(result.data.name).toBe('John');
    });

    it('should enforce encryption rules', async () => {
      const policy = definePolicy({
        name: 'Encrypt Policy',
        rules: [
          { field: 'password', action: 'encrypt' },
        ],
      });

      const data = { password: 'secret123' };
      const result = await enforcePolicy(policy, data);

      expect(result.data.password).toContain('ENC[');
    });

    it('should enforce deny rules', async () => {
      const policy = definePolicy({
        name: 'Deny Policy',
        strict: false,
        rules: [
          { field: 'ssn', action: 'deny' },
        ],
      });

      const data = { ssn: '123-45-6789' };
      const result = await enforcePolicy(policy, data);

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].severity).toBe('error');
    });

    it('should apply custom validators', async () => {
      const policy = definePolicy({
        name: 'Validator Policy',
        rules: [
          {
            field: 'age',
            validator: (value) => value >= 18,
          },
        ],
      });

      const validData = { age: 25 };
      const invalidData = { age: 15 };

      const validResult = await enforcePolicy(policy, validData);
      expect(validResult.valid).toBe(true);

      const invalidResult = await enforcePolicy(policy, invalidData);
      expect(invalidResult.valid).toBe(false);
    });

    it('should apply transforms', async () => {
      const policy = definePolicy({
        name: 'Transform Policy',
        rules: [
          {
            field: 'email',
            transform: (value) => value.toLowerCase(),
          },
        ],
      });

      const data = { email: 'USER@EXAMPLE.COM' };
      const result = await enforcePolicy(policy, data);

      expect(result.data.email).toBe('user@example.com');
    });

    it('should handle arrays', async () => {
      const policy = definePolicy({
        name: 'Array Policy',
        rules: [
          { field: 'email', action: 'mask' },
        ],
      });

      const data = [
        { email: 'user1@example.com' },
        { email: 'user2@example.com' },
      ];

      const result = await enforcePolicy(policy, data);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].email).toBe('u***@example.com');
      expect(result.data[1].email).toBe('u***@example.com');
    });

    it('should support simulation mode', async () => {
      const policy = definePolicy({
        name: 'Sim Policy',
        rules: [
          { field: 'email', action: 'mask' },
        ],
      });

      const data = { email: 'user@example.com' };
      const result = await enforcePolicy(policy, data, { simulate: true });

      expect(result.data.email).toBe('user@example.com'); // Original unchanged
      expect(result.audit).toBeDefined();
    });

    it('should throw in strict mode on violations', async () => {
      const policy = definePolicy({
        name: 'Strict Policy',
        strict: true,
        rules: [
          { field: 'ssn', action: 'deny' },
        ],
      });

      const data = { ssn: '123-45-6789' };

      await expect(enforcePolicy(policy, data)).rejects.toThrow('Policy violations detected');
    });

    it('should match field patterns', async () => {
      const policy = definePolicy({
        name: 'Pattern Policy',
        rules: [
          { fieldPattern: '.*email.*', action: 'mask' },
        ],
      });

      const data = {
        workEmail: 'work@example.com',
        personalEmail: 'personal@example.com',
        phone: '555-1234',
      };

      const result = await enforcePolicy(policy, data);

      expect(result.data.workEmail).toBe('w***@example.com');
      expect(result.data.personalEmail).toBe('p***@example.com');
      expect(result.data.phone).toBe('555-1234');
    });
  });

  describe('combinePolicy', () => {
    it('should combine multiple policies', () => {
      const policy1 = definePolicy({
        name: 'Policy 1',
        rules: [{ field: 'email', action: 'mask' }],
      });

      const policy2 = definePolicy({
        name: 'Policy 2',
        rules: [{ field: 'ssn', action: 'redact' }],
      });

      const combined = combinePolicy([policy1, policy2], 'Combined');

      expect(combined.name).toBe('Combined');
      expect(combined.rules).toHaveLength(2);
    });
  });

  describe('createAuditLogger', () => {
    it('should create audit logger', () => {
      const logger = createAuditLogger();

      logger.log({ action: 'test', data: 'sample' });
      logger.log({ action: 'test2', data: 'sample2' });

      const logs = logger.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].action).toBe('test');
    });

    it('should export audit summary', () => {
      const logger = createAuditLogger();

      logger.log({ action: 'test', violations: [{ severity: 'error' }] });
      logger.log({ action: 'test2' });

      const exported = logger.export();
      expect(exported.summary.total).toBe(2);
      expect(exported.summary.violations).toBe(1);
      expect(exported.summary.errors).toBe(1);
    });

    it('should clear logs', () => {
      const logger = createAuditLogger();

      logger.log({ action: 'test' });
      expect(logger.getLogs()).toHaveLength(1);

      logger.clear();
      expect(logger.getLogs()).toHaveLength(0);
    });
  });
});
