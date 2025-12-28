/**
 * PCI DSS Compliance Policy
 * @fileoverview Payment Card Industry Data Security Standard (PCI DSS) compliance rules
 */

import { definePolicy } from '../core/policies.mjs';

/**
 * PCI DSS Compliance Policy
 *
 * PCI DSS 12 Requirements:
 * 1. Install and maintain firewall configuration
 * 2. Do not use vendor-supplied defaults
 * 3. Protect stored cardholder data
 * 4. Encrypt transmission of cardholder data
 * 5. Protect systems against malware
 * 6. Develop and maintain secure systems
 * 7. Restrict access to cardholder data
 * 8. Identify and authenticate access
 * 9. Restrict physical access
 * 10. Track and monitor all access
 * 11. Regularly test security systems
 * 12. Maintain information security policy
 */
export const pciPolicy = definePolicy({
  name: 'PCI DSS Compliance',
  version: '4.0.0',
  description: 'Payment Card Industry Data Security Standard compliance policy',
  strict: true,
  rules: [
    // Requirement 3: Protect Stored Cardholder Data
    {
      field: ['cardNumber', 'creditCardNumber', 'debitCardNumber', 'pan'],
      classify: 'PCI',
      action: 'encrypt',
      metadata: {
        requirement: 'PCI DSS 3.4',
        description: 'PAN must be rendered unreadable',
      },
    },

    // Primary Account Number (PAN) - Must be masked
    {
      field: ['cardNumber', 'creditCardNumber', 'debitCardNumber', 'pan'],
      transform: (value) => {
        if (!value) return value;
        const str = String(value).replace(/\D/g, '');
        // Show only first 6 and last 4 digits
        if (str.length > 10) {
          return str.slice(0, 6) + '*'.repeat(str.length - 10) + str.slice(-4);
        }
        return '****';
      },
      metadata: {
        requirement: 'PCI DSS 3.3',
        description: 'Mask PAN when displayed (first 6 and last 4 digits max)',
      },
    },

    // Sensitive Authentication Data - Must NOT be stored
    {
      field: ['cvv', 'cvc', 'cvc2', 'cvv2', 'cid', 'cardVerificationValue'],
      action: 'deny',
      metadata: {
        requirement: 'PCI DSS 3.2.1',
        description: 'CVV/CVC must not be stored after authorization',
      },
    },

    {
      field: ['pin', 'pinBlock'],
      action: 'deny',
      metadata: {
        requirement: 'PCI DSS 3.2.3',
        description: 'PIN/PIN Block must not be stored',
      },
    },

    {
      field: ['trackData', 'magneticStripe', 'chip', 'track1', 'track2'],
      action: 'deny',
      metadata: {
        requirement: 'PCI DSS 3.2.2',
        description: 'Full track data must not be stored after authorization',
      },
    },

    // Cardholder Name
    {
      field: ['cardholderName', 'nameOnCard'],
      classify: 'PCI',
      action: 'encrypt',
      metadata: {
        requirement: 'PCI DSS 3.4',
        description: 'Protect cardholder name',
      },
    },

    // Service Code
    {
      field: ['serviceCode'],
      classify: 'PCI',
      action: 'encrypt',
      metadata: {
        requirement: 'PCI DSS 3.4',
        description: 'Protect service code',
      },
    },

    // Expiration Date
    {
      field: ['expirationDate', 'cardExpiry', 'expiry'],
      classify: 'PCI',
      action: 'encrypt',
      metadata: {
        requirement: 'PCI DSS 3.4',
        description: 'Protect expiration date',
      },
    },

    // Requirement 7: Restrict Access
    {
      field: 'accessRole',
      validator: (value) => {
        const validRoles = ['merchant', 'processor', 'acquirer', 'issuer', 'admin'];
        return validRoles.includes(value);
      },
      metadata: {
        requirement: 'PCI DSS 7.1',
        description: 'Limit access to cardholder data by business need-to-know',
      },
    },

    // Requirement 8: Identify and Authenticate
    {
      field: ['userId', 'username'],
      required: true,
      metadata: {
        requirement: 'PCI DSS 8.2',
        description: 'Assign unique ID to each user',
      },
    },

    // Requirement 10: Track and Monitor
    {
      metadata: {
        requirement: 'PCI DSS 10.1',
        description: 'Implement audit trails to link all access to cardholder data',
        auditRequired: true,
      },
    },

    // Data Retention
    {
      retention: '90 days',
      metadata: {
        requirement: 'PCI DSS 3.1',
        description: 'Keep cardholder data storage to minimum necessary',
      },
    },

    // Encryption Keys
    {
      field: ['encryptionKey', 'keyEncryptionKey', 'dataEncryptionKey'],
      classify: 'SECRET',
      action: 'encrypt',
      metadata: {
        requirement: 'PCI DSS 3.5, 3.6',
        description: 'Protect cryptographic keys',
      },
    },
  ],
  metadata: {
    version: '4.0',
    effectiveDate: '2024-03-31',
    council: 'PCI Security Standards Council',
    applicableTo: ['Merchants', 'Processors', 'Acquirers', 'Issuers', 'Service Providers'],
  },
});

/**
 * Card brand detection
 */
export const CardBrand = {
  VISA: 'visa',
  MASTERCARD: 'mastercard',
  AMEX: 'amex',
  DISCOVER: 'discover',
  DINERS: 'diners',
  JCB: 'jcb',
};

/**
 * Detect card brand from PAN
 * @param {string} pan - Primary Account Number
 * @returns {string|null} Card brand or null
 */
export function detectCardBrand(pan) {
  if (!pan) return undefined;

  const digits = String(pan).replace(/\D/g, '');

  // Visa: starts with 4
  if (digits.startsWith('4')) {
    return CardBrand.VISA;
  }

  // Mastercard: 51-55 or 2221-2720
  if (/^5[1-5]/.test(digits) || /^(222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)/.test(digits)) {
    return CardBrand.MASTERCARD;
  }

  // Amex: starts with 34 or 37
  if (/^3[47]/.test(digits)) {
    return CardBrand.AMEX;
  }

  // Discover: starts with 6011, 622126-622925, 644-649, 65
  if (/^(6011|65|64[4-9]|622(12[6-9]|1[3-9][0-9]|[2-8][0-9]{2}|9[01][0-9]|92[0-5]))/.test(digits)) {
    return CardBrand.DISCOVER;
  }

  // Diners: starts with 36 or 38 or 300-305
  if (/^(36|38|30[0-5])/.test(digits)) {
    return CardBrand.DINERS;
  }

  // JCB: starts with 3528-3589
  if (/^35(2[8-9]|[3-8][0-9])/.test(digits)) {
    return CardBrand.JCB;
  }

  return undefined;
}

/**
 * Validate card number using Luhn algorithm
 * @param {string} pan - Primary Account Number
 * @returns {boolean} Whether card number is valid
 */
export function validateCardNumber(pan) {
  if (!pan) return false;

  const digits = String(pan).replace(/\D/g, '');

  if (digits.length < 13 || digits.length > 19) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number.parseInt(digits[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Tokenize card data for PCI compliance
 * @param {string} pan - Primary Account Number
 * @returns {string} Token
 */
export function tokenizeCard(pan) {
  if (!pan) return undefined;

  const digits = String(pan).replace(/\D/g, '');

  // In production, use a real tokenization service
  // This is a simple example
  const token = 'TOK_' + Buffer.from(digits).toString('base64').slice(0, 16);

  return token;
}

/**
 * Create PCI DSS audit log
 * @param {Object} event - Event data
 * @returns {Object} Audit log entry
 */
export function createPciAuditLog(event) {
  return {
    timestamp: new Date().toISOString(),
    eventType: event.type,
    userId: event.userId,
    userRole: event.userRole,
    action: event.action,
    cardDataAccessed: event.cardFields || [],
    pan: event.pan ? maskPAN(event.pan) : undefined,
    merchantId: event.merchantId,
    terminalId: event.terminalId,
    transactionId: event.transactionId,
    ipAddress: event.ipAddress,
    outcome: event.outcome || 'success',
    requirement: event.requirement,
  };
}

/**
 * Mask PAN for display
 * @param {string} pan - Primary Account Number
 * @returns {string} Masked PAN
 */
export function maskPAN(pan) {
  if (!pan) return undefined;

  const digits = String(pan).replace(/\D/g, '');

  if (digits.length > 10) {
    return digits.slice(0, 6) + '*'.repeat(digits.length - 10) + digits.slice(-4);
  }

  return '****';
}

/**
 * PCI DSS Merchant Levels
 */
export const MerchantLevel = {
  LEVEL_1: 'level-1', // > 6M transactions/year
  LEVEL_2: 'level-2', // 1M - 6M transactions/year
  LEVEL_3: 'level-3', // 20K - 1M transactions/year (e-commerce)
  LEVEL_4: 'level-4', // < 20K transactions/year (e-commerce) or < 1M (all channels)
};

export default pciPolicy;
