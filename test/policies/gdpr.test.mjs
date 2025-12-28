/**
 * GDPR Compliance Tests
 * @fileoverview Tests for GDPR policy enforcement
 */

import { describe, expect, it } from 'vitest';
import { enforcePolicy } from '../../src/core/policies.mjs';
import {
  checkRightToErasure,
  createConsentRecord,
  createDataSubjectExport,
  gdprPolicy,
} from '../../src/policies/gdpr.mjs';

describe('GDPR Compliance', () => {
  describe('gdprPolicy', () => {
    it('should detect and warn about PII', async () => {
      const data = {
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = await enforcePolicy(gdprPolicy, data);

      expect(result.audit.classifications).toBeDefined();
      expect(result.violations.some(v => v.severity === 'warning')).toBe(true);
    });

    it('should encrypt sensitive data', async () => {
      const data = {
        password: 'secret123',
        apiKey: 'key-12345',
      };

      const result = await enforcePolicy(gdprPolicy, data);

      expect(result.data.password).toContain('ENC[');
      expect(result.data.apiKey).toContain('ENC[');
    });

    it('should encrypt special categories of data', async () => {
      const data = {
        health: 'medical condition',
        ethnicity: 'example',
        religiousBeliefs: 'example',
      };

      const result = await enforcePolicy(gdprPolicy, data);

      expect(result.data.health).toContain('ENC[');
      expect(result.data.ethnicity).toContain('ENC[');
      expect(result.data.religiousBeliefs).toContain('ENC[');
    });

    it('should handle deletion requests', async () => {
      const data = {
        email: 'user@example.com',
        deletionRequested: true,
      };

      const result = await enforcePolicy(gdprPolicy, data);

      expect(result.audit.deletionRequested).toBe(true);
    });

    it('should validate consent basis', async () => {
      const data = {
        email: 'user@example.com',
        consent: true,
        legalBasis: 'Article 6(1)(a)',
      };

      const result = await enforcePolicy(gdprPolicy, data);

      expect(result.valid).toBe(true);
    });

    it('should handle breach notification', async () => {
      const data = {
        dataBreachDetected: true,
      };

      const result = await enforcePolicy(gdprPolicy, data);

      expect(result.audit.breachNotificationRequired).toBe(true);
    });
  });

  describe('checkRightToErasure', () => {
    it('should return true if deletion requested', () => {
      expect(checkRightToErasure({ deletionRequested: true })).toBe(true);
    });

    it('should return true if consent withdrawn', () => {
      expect(checkRightToErasure({ consentWithdrawn: true })).toBe(true);
    });

    it('should return true if processing unlawful', () => {
      expect(checkRightToErasure({ processingUnlawful: true })).toBe(true);
    });

    it('should return false otherwise', () => {
      expect(checkRightToErasure({ email: 'user@example.com' })).toBe(false);
    });
  });

  describe('createDataSubjectExport', () => {
    it('should create portable data export', () => {
      const data = {
        email: 'user@example.com',
        name: 'John Doe',
      };

      const exported = createDataSubjectExport(data, {
        controller: 'Example Corp',
        legalBasis: 'Consent',
        retention: '1 year',
      });

      expect(exported.metadata.dataController).toBe('Example Corp');
      expect(exported.metadata.legalBasis).toBe('Consent');
      expect(exported.personalData).toEqual(data);
      expect(exported.rights).toBeDefined();
      expect(exported.rights.access).toContain('Article 15');
    });

    it('should include all GDPR rights', () => {
      const exported = createDataSubjectExport({});

      expect(exported.rights.access).toBeDefined();
      expect(exported.rights.rectification).toBeDefined();
      expect(exported.rights.erasure).toBeDefined();
      expect(exported.rights.restrictProcessing).toBeDefined();
      expect(exported.rights.dataPortability).toBeDefined();
      expect(exported.rights.object).toBeDefined();
    });
  });

  describe('createConsentRecord', () => {
    it('should create valid consent record', () => {
      const record = createConsentRecord({
        dataSubject: 'user@example.com',
        purpose: 'marketing',
        consentGiven: true,
        method: 'explicit',
        withdrawUrl: 'https://example.com/withdraw',
        categories: ['email', 'name'],
        retention: '1 year',
        thirdPartySharing: false,
      });

      expect(record.timestamp).toBeDefined();
      expect(record.dataSubject).toBe('user@example.com');
      expect(record.purpose).toBe('marketing');
      expect(record.legalBasis).toContain('Article 6(1)(a)');
      expect(record.withdrawable).toBe(true);
      expect(record.processingCategories).toEqual(['email', 'name']);
    });

    it('should use defaults for optional fields', () => {
      const record = createConsentRecord({
        dataSubject: 'user@example.com',
        purpose: 'essential',
        consentGiven: true,
      });

      expect(record.consentMethod).toBe('explicit');
      expect(record.dataRetention).toBe('30 days');
      expect(record.thirdPartySharing).toBe(false);
      expect(record.processingCategories).toEqual([]);
    });
  });
});
