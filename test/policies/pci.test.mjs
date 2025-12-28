/**
 * PCI DSS Compliance Tests
 * @fileoverview Tests for PCI DSS policy enforcement
 */

import { describe, expect, it } from 'vitest';
import { enforcePolicy } from '../../src/core/policies.mjs';
import {
  createPciAuditLog,
  detectCardBrand,
  maskPAN,
  pciPolicy,
  tokenizeCard,
  validateCardNumber,
} from '../../src/policies/pci.mjs';

describe('PCI DSS Compliance', () => {
  describe('pciPolicy', () => {
    it('should encrypt PAN', async () => {
      const data = {
        cardNumber: '4111111111111111',
      };

      const result = await enforcePolicy(pciPolicy, data, { strict: false });

      expect(result.data.cardNumber).toContain('ENC[');
    });

    it('should deny storing CVV', async () => {
      const data = {
        cvv: '123',
      };

      const result = await enforcePolicy(pciPolicy, data, { strict: false });

      expect(result.valid).toBe(false);
      expect(result.violations.some(v => v.rule === 'deny')).toBe(true);
    });

    it('should deny storing PIN', async () => {
      const data = {
        pin: '1234',
      };

      const result = await enforcePolicy(pciPolicy, data, { strict: false });

      expect(result.valid).toBe(false);
    });

    it('should deny storing track data', async () => {
      const data = {
        trackData: '%B1234567890123456^DOE/JOHN^99011200000000000000**XXX******?*',
      };

      const result = await enforcePolicy(pciPolicy, data, { strict: false });

      expect(result.valid).toBe(false);
    });

    it('should encrypt cardholder name', async () => {
      const data = {
        cardholderName: 'John Doe',
      };

      const result = await enforcePolicy(pciPolicy, data, { strict: false });

      expect(result.data.cardholderName).toContain('ENC[');
    });

    it('should encrypt expiration date', async () => {
      const data = {
        expirationDate: '12/25',
      };

      const result = await enforcePolicy(pciPolicy, data, { strict: false });

      expect(result.data.expirationDate).toContain('ENC[');
    });

    it('should validate access roles', async () => {
      const validData = { accessRole: 'merchant' };
      const invalidData = { accessRole: 'hacker' };

      const validResult = await enforcePolicy(pciPolicy, validData, { strict: false });
      const invalidResult = await enforcePolicy(pciPolicy, invalidData, { strict: false });

      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
    });
  });

  describe('detectCardBrand', () => {
    it('should detect Visa', () => {
      expect(detectCardBrand('4111111111111111')).toBe('visa');
      expect(detectCardBrand('4012888888881881')).toBe('visa');
    });

    it('should detect Mastercard', () => {
      expect(detectCardBrand('5555555555554444')).toBe('mastercard');
      expect(detectCardBrand('5105105105105100')).toBe('mastercard');
      expect(detectCardBrand('2221000000000009')).toBe('mastercard');
    });

    it('should detect American Express', () => {
      expect(detectCardBrand('378282246310005')).toBe('amex');
      expect(detectCardBrand('371449635398431')).toBe('amex');
    });

    it('should detect Discover', () => {
      expect(detectCardBrand('6011111111111117')).toBe('discover');
      expect(detectCardBrand('6011000990139424')).toBe('discover');
    });

    it('should detect Diners Club', () => {
      expect(detectCardBrand('30569309025904')).toBe('diners');
      expect(detectCardBrand('38520000023237')).toBe('diners');
    });

    it('should detect JCB', () => {
      expect(detectCardBrand('3530111333300000')).toBe('jcb');
      expect(detectCardBrand('3566002020360505')).toBe('jcb');
    });

    it('should return undefined for invalid card', () => {
      expect(detectCardBrand('1234567890123456')).toBe(undefined);
    });
  });

  describe('validateCardNumber', () => {
    it('should validate Visa card numbers', () => {
      expect(validateCardNumber('4111111111111111')).toBe(true);
      expect(validateCardNumber('4012888888881881')).toBe(true);
    });

    it('should validate Mastercard numbers', () => {
      expect(validateCardNumber('5555555555554444')).toBe(true);
      expect(validateCardNumber('5105105105105100')).toBe(true);
    });

    it('should reject invalid numbers', () => {
      expect(validateCardNumber('4111111111111112')).toBe(false);
      expect(validateCardNumber('1234567890123456')).toBe(false);
    });

    it('should reject too short numbers', () => {
      expect(validateCardNumber('123')).toBe(false);
    });

    it('should reject too long numbers', () => {
      expect(validateCardNumber('12345678901234567890')).toBe(false);
    });
  });

  describe('tokenizeCard', () => {
    it('should tokenize card number', () => {
      const token = tokenizeCard('4111111111111111');

      expect(token).toContain('TOK_');
      expect(token).not.toContain('4111111111111111');
    });

    it('should handle undefined input', () => {
      expect(tokenizeCard(undefined)).toBe(undefined);
    });
  });

  describe('maskPAN', () => {
    it('should mask PAN showing first 6 and last 4 digits', () => {
      expect(maskPAN('4111111111111111')).toBe('411111******1111');
    });

    it('should mask short PANs', () => {
      expect(maskPAN('123456')).toBe('****');
    });

    it('should handle undefined input', () => {
      expect(maskPAN(undefined)).toBe(undefined);
    });
  });

  describe('createPciAuditLog', () => {
    it('should create valid audit log', () => {
      const log = createPciAuditLog({
        type: 'transaction',
        userId: 'cashier123',
        userRole: 'merchant',
        action: 'charge',
        cardFields: ['cardNumber', 'expirationDate'],
        pan: '4111111111111111',
        merchantId: 'MERCH-001',
        terminalId: 'TERM-001',
        transactionId: 'TXN-12345',
        ipAddress: '10.0.0.1',
        outcome: 'approved',
        requirement: 'PCI DSS 10.1',
      });

      expect(log.timestamp).toBeDefined();
      expect(log.userId).toBe('cashier123');
      expect(log.pan).toBe('411111******1111'); // Masked
      expect(log.cardDataAccessed).toEqual(['cardNumber', 'expirationDate']);
      expect(log.requirement).toBe('PCI DSS 10.1');
    });
  });
});
