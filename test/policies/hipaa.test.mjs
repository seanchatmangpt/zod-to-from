/**
 * HIPAA Compliance Tests
 * @fileoverview Tests for HIPAA policy enforcement
 */

import { describe, expect, it } from 'vitest';
import { enforcePolicy } from '../../src/core/policies.mjs';
import {
  createBAARecord,
  createHipaaAuditLog,
  hipaaPolicy,
  isSafeHarborCompliant,
} from '../../src/policies/hipaa.mjs';

describe('HIPAA Compliance', () => {
  describe('hipaaPolicy', () => {
    it('should encrypt PHI fields', async () => {
      const data = {
        medicalRecordNumber: 'MRN12345',
        diagnosis: 'condition',
        patientName: 'John Doe',
      };

      const result = await enforcePolicy(hipaaPolicy, data, { strict: false });

      expect(result.data.medicalRecordNumber).toContain('ENC[');
      expect(result.data.diagnosis).toContain('ENC[');
      expect(result.data.patientName).toContain('ENC[');
    });

    it('should encrypt 18 HIPAA identifiers', async () => {
      const data = {
        name: 'John Doe',
        ssn: '123-45-6789',
        phone: '555-1234',
        email: 'patient@example.com',
        ipAddress: '192.168.1.1',
      };

      const result = await enforcePolicy(hipaaPolicy, data, { strict: false });

      expect(result.data.name).toContain('ENC[');
      expect(result.data.ssn).toContain('ENC[');
      expect(result.data.phone).toContain('ENC[');
      expect(result.data.email).toContain('ENC[');
      expect(result.data.ipAddress).toContain('ENC[');
    });

    it('should redact geographic data', async () => {
      const data = {
        city: 'New York',
        zip: '10001',
        address: '123 Main St',
      };

      const result = await enforcePolicy(hipaaPolicy, data, { strict: false });

      expect(result.data.city).toBe('[REDACTED]');
      expect(result.data.zip).toBe('[REDACTED]');
      expect(result.data.address).toBe('[REDACTED]');
    });

    it('should aggregate ages over 89', async () => {
      const youngData = { age: 45 };
      const oldData = { age: 92 };

      const youngResult = await enforcePolicy(hipaaPolicy, youngData, { strict: false });
      const oldResult = await enforcePolicy(hipaaPolicy, oldData, { strict: false });

      expect(youngResult.data.age).toBe(45);
      expect(oldResult.data.age).toBe('90+');
    });

    it('should validate access roles', async () => {
      const validData = { accessRole: 'provider' };
      const invalidData = { accessRole: 'unauthorized' };

      const validResult = await enforcePolicy(hipaaPolicy, validData, { strict: false });
      const invalidResult = await enforcePolicy(hipaaPolicy, invalidData, { strict: false });

      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
    });

    it('should handle breach notifications', async () => {
      const data = { breachDetected: true };

      const result = await enforcePolicy(hipaaPolicy, data, { strict: false });

      expect(result.audit.breachNotificationRequired).toBe(true);
      expect(result.audit.breachNotificationDeadline).toBeDefined();
    });

    it('should warn about date specificity', async () => {
      const data = {
        appointmentDate: '01/15/2024',
      };

      const result = await enforcePolicy(hipaaPolicy, data, { strict: false });

      expect(result.audit.warnings).toBeDefined();
      expect(result.audit.warnings.some(w => w.includes('year-only'))).toBe(true);
    });
  });

  describe('isSafeHarborCompliant', () => {
    it('should return true for de-identified data', () => {
      const data = {
        state: 'CA',
        yearOfBirth: '1980',
      };

      expect(isSafeHarborCompliant(data)).toBe(true);
    });

    it('should return false for data with identifiers', () => {
      const data = {
        name: 'John Doe',
        state: 'CA',
      };

      expect(isSafeHarborCompliant(data)).toBe(false);
    });

    it('should return false for specific dates', () => {
      const data = {
        appointmentDate: '01/15/2024',
      };

      expect(isSafeHarborCompliant(data)).toBe(false);
    });

    it('should return false for ages over 89', () => {
      const data = {
        age: 92,
      };

      expect(isSafeHarborCompliant(data)).toBe(false);
    });
  });

  describe('createHipaaAuditLog', () => {
    it('should create valid audit log', () => {
      const log = createHipaaAuditLog({
        type: 'access',
        userId: 'doctor123',
        userRole: 'provider',
        patientId: 'patient456',
        action: 'view',
        phiFields: ['diagnosis', 'treatment'],
        purpose: 'treatment',
        granted: true,
        ipAddress: '10.0.0.1',
        facility: 'Hospital A',
        outcome: 'success',
      });

      expect(log.timestamp).toBeDefined();
      expect(log.userId).toBe('doctor123');
      expect(log.userRole).toBe('provider');
      expect(log.patientId).toBe('patient456');
      expect(log.phiAccessed).toEqual(['diagnosis', 'treatment']);
      expect(log.purposeOfUse).toBe('treatment');
      expect(log.accessGranted).toBe(true);
    });
  });

  describe('createBAARecord', () => {
    it('should create Business Associate Agreement record', () => {
      const baa = createBAARecord({
        coveredEntity: 'Hospital A',
        businessAssociate: 'Cloud Service Provider',
        effectiveDate: '2024-01-01',
        services: ['Data storage', 'Backup services'],
        phiUsage: ['storage', 'backup'],
        security: ['encryption', 'access controls'],
        breachProcedure: 'Notify within 24 hours',
        subcontractors: ['Subcontractor A'],
        terminationDate: '2025-01-01',
      });

      expect(baa.coveredEntity).toBe('Hospital A');
      expect(baa.businessAssociate).toBe('Cloud Service Provider');
      expect(baa.services).toEqual(['Data storage', 'Backup services']);
      expect(baa.compliance.privacyRule).toBe(true);
      expect(baa.compliance.securityRule).toBe(true);
      expect(baa.compliance.breachNotificationRule).toBe(true);
    });
  });
});
