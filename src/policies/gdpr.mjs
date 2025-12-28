/**
 * GDPR Compliance Policy
 * @fileoverview General Data Protection Regulation (GDPR) compliance rules
 */

import { definePolicy } from '../core/policies.mjs';

/**
 * GDPR Compliance Policy
 *
 * Key GDPR principles:
 * - Lawfulness, fairness and transparency
 * - Purpose limitation
 * - Data minimisation
 * - Accuracy
 * - Storage limitation
 * - Integrity and confidentiality
 * - Accountability
 */
export const gdprPolicy = definePolicy({
  name: 'GDPR Compliance',
  version: '1.0.0',
  description: 'General Data Protection Regulation (EU) compliance policy',
  strict: false,
  rules: [
    // Article 4(1) - Personal Data Detection
    {
      field: ['email', 'phone', 'phoneNumber', 'firstName', 'lastName', 'fullName', 'name'],
      classify: 'PII',
      action: 'warn',
      metadata: {
        article: 'Article 4(1)',
        description: 'Personal data identification',
      },
    },

    // Article 5(1)(e) - Storage Limitation
    {
      retention: '30 days',
      action: 'warn',
      metadata: {
        article: 'Article 5(1)(e)',
        description: 'Storage limitation principle',
      },
    },

    // Article 6 - Lawfulness of Processing
    {
      field: ['consent', 'legalBasis'],
      required: false,
      validator: (value) => {
        // Ensure lawful basis for processing is documented
        return value != undefined;
      },
      metadata: {
        article: 'Article 6',
        description: 'Lawful basis for processing',
      },
    },

    // Article 9 - Special Categories (Sensitive Data)
    {
      field: [
        'race', 'ethnicity', 'politicalOpinions', 'religiousBeliefs',
        'tradeUnion', 'genetics', 'biometric', 'health', 'sexLife', 'sexualOrientation'
      ],
      classify: 'CONFIDENTIAL',
      action: 'encrypt',
      metadata: {
        article: 'Article 9',
        description: 'Special categories of personal data',
      },
    },

    // Article 17 - Right to Erasure
    {
      field: 'deletionRequested',
      validator: (value, fieldName, context) => {
        if (value === true) {
          // In a real implementation, this would trigger deletion workflow
          context.audit.deletionRequested = true;
        }
        return true;
      },
      metadata: {
        article: 'Article 17',
        description: 'Right to erasure (right to be forgotten)',
      },
    },

    // Article 20 - Right to Data Portability
    {
      metadata: {
        article: 'Article 20',
        description: 'Right to data portability',
        exportable: true,
      },
    },

    // Article 25 - Data Protection by Design
    {
      fieldPattern: '.+',
      validator: (value, fieldName, context) => {
        // Pseudonymization check
        if (fieldName.toLowerCase().includes('id') && typeof value === 'string') {
          const isPseudonymized = value.length > 16 && !/\s/.test(value);
          if (!isPseudonymized) {
            context.audit.warnings = context.audit.warnings || [];
            context.audit.warnings.push(`Field ${fieldName} should be pseudonymized`);
          }
        }
        return true;
      },
      metadata: {
        article: 'Article 25',
        description: 'Data protection by design and by default',
      },
    },

    // Article 32 - Security of Processing
    {
      field: ['password', 'secret', 'apiKey', 'token', 'privateKey'],
      classify: 'SECRET',
      action: 'encrypt',
      metadata: {
        article: 'Article 32',
        description: 'Security of processing',
      },
    },

    // Article 33 - Breach Notification
    {
      field: 'dataBreachDetected',
      validator: (value, fieldName, context) => {
        if (value === true) {
          context.audit.breachNotificationRequired = true;
          // In production, trigger breach notification workflow
        }
        return true;
      },
      metadata: {
        article: 'Article 33',
        description: 'Notification of personal data breach to supervisory authority',
      },
    },
  ],
  metadata: {
    jurisdiction: 'EU',
    regulation: 'GDPR',
    effectiveDate: '2018-05-25',
    penalties: 'Up to €20 million or 4% of annual global turnover',
  },
});

/**
 * GDPR Right to Erasure helper
 * Checks if data should be deleted based on GDPR Article 17
 * @param {Object} data - Data to check
 * @returns {boolean} Whether data should be deleted
 */
export function checkRightToErasure(data) {
  if (!data) return false;

  return (
    data.deletionRequested === true ||
    data.consentWithdrawn === true ||
    data.processingUnlawful === true ||
    data.legalObligationRequiresDeletion === true
  );
}

/**
 * GDPR Data Subject Request helper
 * Handles data subject access requests (Article 15)
 * @param {Object} data - Data to export
 * @param {Object} options - Export options
 * @returns {Object} Portable data format
 */
export function createDataSubjectExport(data, options = {}) {
  return {
    metadata: {
      exportDate: new Date().toISOString(),
      dataController: options.controller || 'Unknown',
      legalBasis: options.legalBasis || 'Consent',
      retentionPeriod: options.retention || '30 days',
    },
    personalData: data,
    rights: {
      access: 'Article 15 - Right of access',
      rectification: 'Article 16 - Right to rectification',
      erasure: 'Article 17 - Right to erasure',
      restrictProcessing: 'Article 18 - Right to restriction of processing',
      dataPortability: 'Article 20 - Right to data portability',
      object: 'Article 21 - Right to object',
    },
  };
}

/**
 * GDPR Consent Record
 * Creates a consent record as per GDPR requirements
 * @param {Object} consentData - Consent information
 * @returns {Object} Consent record
 */
export function createConsentRecord(consentData) {
  return {
    timestamp: new Date().toISOString(),
    dataSubject: consentData.dataSubject,
    purpose: consentData.purpose,
    legalBasis: 'Article 6(1)(a) - Consent',
    consentGiven: consentData.consentGiven,
    consentMethod: consentData.method || 'explicit',
    withdrawable: true,
    canWithdrawAt: consentData.withdrawUrl,
    processingCategories: consentData.categories || [],
    dataRetention: consentData.retention || '30 days',
    thirdPartySharing: consentData.thirdPartySharing || false,
  };
}

export default gdprPolicy;
