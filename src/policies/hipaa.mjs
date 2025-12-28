/**
 * HIPAA Compliance Policy
 * @fileoverview Health Insurance Portability and Accountability Act (HIPAA) compliance rules
 */

import { definePolicy } from '../core/policies.mjs';

/**
 * HIPAA Compliance Policy
 *
 * Key HIPAA requirements:
 * - Privacy Rule (45 CFR Part 160 and Part 164, Subparts A and E)
 * - Security Rule (45 CFR Part 164, Subpart C)
 * - Breach Notification Rule (45 CFR Part 164, Subpart D)
 */
export const hipaaPolicy = definePolicy({
  name: 'HIPAA Compliance',
  version: '1.0.0',
  description: 'Health Insurance Portability and Accountability Act (US) compliance policy',
  strict: true,
  rules: [
    // Protected Health Information (PHI) Detection
    {
      field: [
        'medicalRecordNumber', 'mrn', 'healthPlanId', 'accountNumber',
        'diagnosis', 'treatment', 'prescription', 'medication',
        'labResults', 'vitalSigns', 'allergies', 'immunizations',
        'patientName', 'patientId', 'dateOfBirth', 'dob'
      ],
      classify: 'PHI',
      action: 'encrypt',
      metadata: {
        rule: '45 CFR 164.514(b)',
        description: 'Protected Health Information',
      },
    },

    // 18 HIPAA Identifiers that must be removed for de-identification
    {
      field: [
        'name', 'address', 'city', 'state', 'zip',
        'phone', 'fax', 'email', 'ssn', 'mrn',
        'healthPlanNumber', 'accountNumber', 'certificateNumber',
        'vehicleId', 'deviceId', 'webUrl', 'ipAddress',
        'biometricId', 'photoImage', 'anyUniqueId'
      ],
      classify: 'PHI',
      action: 'encrypt',
      metadata: {
        rule: '45 CFR 164.514(b)(2)',
        description: '18 HIPAA Identifiers for de-identification',
      },
    },

    // Dates more specific than year must be removed (except age > 89)
    {
      fieldPattern: '.*[Dd]ate.*',
      validator: (value, fieldName, context) => {
        if (value instanceof Date || typeof value === 'string') {
          const dateStr = value.toString();
          // Check if date is more specific than year
          if (/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(dateStr)) {
            context.audit.warnings = context.audit.warnings || [];
            context.audit.warnings.push(`Date field ${fieldName} should be year-only for de-identification`);
          }
        }
        return true;
      },
      metadata: {
        rule: '45 CFR 164.514(b)(2)(i)(C)',
        description: 'Dates more specific than year',
      },
    },

    // Geographic subdivisions smaller than state must be removed
    {
      field: ['city', 'county', 'zip', 'zipCode', 'postalCode', 'precinct', 'address'],
      action: 'redact',
      metadata: {
        rule: '45 CFR 164.514(b)(2)(i)(A)',
        description: 'Geographic subdivisions smaller than state',
      },
    },

    // Age > 89 must be aggregated
    {
      field: ['age'],
      transform: (value) => {
        const age = Number.parseInt(value, 10);
        if (age > 89) {
          return '90+';
        }
        return value;
      },
      metadata: {
        rule: '45 CFR 164.514(b)(2)(i)(B)',
        description: 'Ages over 89 must be aggregated',
      },
    },

    // Minimum Necessary Rule
    {
      metadata: {
        rule: '45 CFR 164.502(b)',
        description: 'Minimum necessary standard',
        guidance: 'Only collect and use minimum PHI necessary for purpose',
      },
    },

    // Encryption Required (Security Rule)
    {
      field: ['password', 'encryptionKey', 'accessToken'],
      classify: 'SECRET',
      action: 'encrypt',
      metadata: {
        rule: '45 CFR 164.312(a)(2)(iv)',
        description: 'Encryption and decryption',
      },
    },

    // Access Controls
    {
      field: 'accessRole',
      validator: (value) => {
        const validRoles = [
          'patient', 'provider', 'admin', 'billing',
          'research', 'quality-assurance', 'legal'
        ];
        return validRoles.includes(value);
      },
      metadata: {
        rule: '45 CFR 164.308(a)(4)',
        description: 'Access control requirements',
      },
    },

    // Audit Controls
    {
      metadata: {
        rule: '45 CFR 164.312(b)',
        description: 'Audit controls - log all PHI access',
        auditRequired: true,
      },
    },

    // Breach Notification
    {
      field: 'breachDetected',
      validator: (value, fieldName, context) => {
        if (value === true) {
          context.audit.breachNotificationRequired = true;
          context.audit.breachNotificationDeadline =
            new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days
        }
        return true;
      },
      metadata: {
        rule: '45 CFR 164.404',
        description: 'Breach notification to individuals (60-day deadline)',
      },
    },
  ],
  metadata: {
    jurisdiction: 'US',
    regulation: 'HIPAA',
    effectiveDate: '1996-08-21',
    penalties: 'Up to $1.5 million per violation category per year',
    coveredEntities: ['Healthcare providers', 'Health plans', 'Healthcare clearinghouses', 'Business associates'],
  },
});

/**
 * HIPAA De-identification Methods
 */
export const DeidentificationMethod = {
  SAFE_HARBOR: 'safe-harbor',
  EXPERT_DETERMINATION: 'expert-determination',
};

/**
 * Check if data is de-identified per Safe Harbor method
 * @param {Object} data - Data to check
 * @returns {boolean} Whether data meets Safe Harbor requirements
 */
export function isSafeHarborCompliant(data) {
  if (!data) return true;

  const phi18Identifiers = [
    'name', 'address', 'city', 'county', 'zip', 'phone', 'fax', 'email',
    'ssn', 'mrn', 'healthPlanNumber', 'accountNumber', 'certificateNumber',
    'vehicleId', 'deviceId', 'webUrl', 'ipAddress', 'biometricId',
    'photoImage', 'anyUniqueId'
  ];

  for (const identifier of phi18Identifiers) {
    if (data[identifier] != undefined) {
      return false;
    }
  }

  // Check for dates more specific than year
  for (const key of Object.keys(data)) {
    if (key.toLowerCase().includes('date')) {
      const value = data[key];
      if (value && typeof value === 'string' && /\d{1,2}[/-]\d{1,2}/.test(value)) {
        return false;
      }
    }
  }

  // Check for ages > 89
  if (data.age && Number.parseInt(data.age, 10) > 89) {
    return false;
  }

  return true;
}

/**
 * Create HIPAA audit log entry
 * @param {Object} event - Event data
 * @returns {Object} Audit log entry
 */
export function createHipaaAuditLog(event) {
  return {
    timestamp: new Date().toISOString(),
    eventType: event.type,
    userId: event.userId,
    userRole: event.userRole,
    patientId: event.patientId,
    action: event.action,
    phiAccessed: event.phiFields || [],
    purposeOfUse: event.purpose,
    accessGranted: event.granted !== false,
    ipAddress: event.ipAddress,
    facility: event.facility,
    outcome: event.outcome || 'success',
  };
}

/**
 * Business Associate Agreement (BAA) requirements
 * @param {Object} baaData - BAA information
 * @returns {Object} BAA record
 */
export function createBAARecord(baaData) {
  return {
    coveredEntity: baaData.coveredEntity,
    businessAssociate: baaData.businessAssociate,
    effectiveDate: baaData.effectiveDate,
    services: baaData.services,
    phiUsagePermitted: baaData.phiUsage || [],
    securityMeasures: baaData.security || [],
    breachNotificationProcedure: baaData.breachProcedure,
    subcontractors: baaData.subcontractors || [],
    terminationDate: baaData.terminationDate,
    compliance: {
      privacyRule: true,
      securityRule: true,
      breachNotificationRule: true,
    },
  };
}

export default hipaaPolicy;
