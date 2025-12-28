/**
 * Policy System - Main entry point
 * @fileoverview Exports all policies and policy utilities
 */

// Export core policy system
export * from '../core/policies.mjs';

// Export built-in policies
export { gdprPolicy, checkRightToErasure, createDataSubjectExport, createConsentRecord } from './gdpr.mjs';
export { hipaaPolicy, DeidentificationMethod, isSafeHarborCompliant, createHipaaAuditLog, createBAARecord } from './hipaa.mjs';
export { pciPolicy, CardBrand, detectCardBrand, validateCardNumber, tokenizeCard, createPciAuditLog, maskPAN, MerchantLevel } from './pci.mjs';
export { securityPolicy, sanitizeHtml, sanitizeSql, validateFileUpload, checkRateLimit } from './security.mjs';
export { businessPolicy, createBusinessRule, WorkflowStateMachine, orderWorkflow, scoreDataQuality } from './business.mjs';

// Re-export default policies
import { gdprPolicy } from './gdpr.mjs';
import { hipaaPolicy } from './hipaa.mjs';
import { pciPolicy } from './pci.mjs';
import { securityPolicy } from './security.mjs';
import { businessPolicy } from './business.mjs';

/**
 * All built-in policies
 */
export const builtInPolicies = {
  gdpr: gdprPolicy,
  hipaa: hipaaPolicy,
  pci: pciPolicy,
  security: securityPolicy,
  business: businessPolicy,
};

/**
 * Get a built-in policy by name
 * @param {string} name - Policy name
 * @returns {Object|null} Policy definition or null
 */
export function getPolicy(name) {
  return builtInPolicies[name] || undefined;
}

/**
 * List all built-in policies
 * @returns {string[]} Policy names
 */
export function listPolicies() {
  return Object.keys(builtInPolicies);
}
