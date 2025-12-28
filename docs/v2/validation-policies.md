# Validation Policies (v2)

## Overview

The zod-to-from v2 Validation Policies system adds a powerful compliance, security, and business rules layer on top of the existing Zod schema validation. This allows you to enforce regulatory compliance (GDPR, HIPAA, PCI DSS), security policies, and custom business rules automatically during data validation.

## Core Concepts

### Policy Definition

A policy is a set of rules that are enforced on data during validation. Each policy can:

- **Classify fields** - Automatically detect and classify sensitive data (PII, PHI, PCI, etc.)
- **Apply actions** - Mask, encrypt, redact, or deny sensitive fields
- **Validate data** - Apply custom validation logic
- **Transform data** - Apply data transformations
- **Audit operations** - Track policy enforcement and violations

### Policy Rules

Each policy consists of multiple rules. A rule defines:

```javascript
{
  field: 'email',              // Field name or array of field names
  fieldPattern: '.*email.*',   // Regex pattern to match field names
  classify: 'PII',            // Data classification
  action: 'mask',             // Action to take
  validator: (value) => true, // Custom validation function
  transform: (value) => value, // Transform function
  metadata: {}                // Additional metadata
}
```

### Actions

- **`allow`** - Explicitly allow the field (default)
- **`deny`** - Reject data containing this field
- **`mask`** - Mask the field value (partial redaction)
- **`encrypt`** - Encrypt the field value
- **`redact`** - Fully redact the field value
- **`warn`** - Issue a warning but allow the data

### Data Classifications

- **`PII`** - Personally Identifiable Information
- **`PHI`** - Protected Health Information
- **`PCI`** - Payment Card Industry data
- **`PUBLIC`** - Public data
- **`INTERNAL`** - Internal use only
- **`CONFIDENTIAL`** - Confidential data
- **`SECRET`** - Secret/sensitive data

## Built-in Policies

### 1. GDPR Compliance Policy

Enforces General Data Protection Regulation (EU) compliance.

**Example:**

```javascript
import { fromJson } from 'zod-to-from';
import { enforcePolicy, gdprPolicy } from 'zod-to-from/policies';
import { z } from 'zod';

const UserSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  password: z.string(),
  deletionRequested: z.boolean().optional(),
});

const data = {
  email: 'user@example.com',
  name: 'John Doe',
  password: 'secret123',
  deletionRequested: false,
};

// Enforce GDPR policy
const result = await enforcePolicy(gdprPolicy, data);

console.log(result.data);
// {
//   email: 'user@example.com',      // Warned (PII detected)
//   name: 'John Doe',               // Warned (PII detected)
//   password: 'ENC[...]',           // Encrypted (Secret)
//   deletionRequested: false
// }

console.log(result.violations);     // Warnings for PII fields
console.log(result.audit);          // Audit log with classifications
```

**Key Features:**

- Detects and warns about PII (Article 4)
- Encrypts special categories of data (Article 9)
- Handles right to erasure (Article 17)
- Tracks consent and legal basis (Article 6)
- Supports data portability (Article 20)

### 2. HIPAA Compliance Policy

Enforces Health Insurance Portability and Accountability Act (US) compliance.

**Example:**

```javascript
import { enforcePolicy, hipaaPolicy } from 'zod-to-from/policies';

const PatientData = {
  medicalRecordNumber: 'MRN12345',
  patientName: 'Jane Smith',
  diagnosis: 'Condition X',
  age: 92,
  city: 'New York',
  zip: '10001',
};

const result = await enforcePolicy(hipaaPolicy, PatientData, { strict: true });

console.log(result.data);
// {
//   medicalRecordNumber: 'ENC[...]',  // Encrypted (PHI)
//   patientName: 'ENC[...]',          // Encrypted (Identifier)
//   diagnosis: 'ENC[...]',            // Encrypted (PHI)
//   age: '90+',                       // Aggregated (>89)
//   city: '[REDACTED]',               // Redacted (Geographic)
//   zip: '[REDACTED]'                 // Redacted (Geographic)
// }
```

**Key Features:**

- Encrypts 18 HIPAA identifiers
- Redacts geographic subdivisions smaller than state
- Aggregates ages over 89
- De-identification (Safe Harbor method)
- Audit logging for PHI access
- Business Associate Agreement (BAA) support

### 3. PCI DSS Compliance Policy

Enforces Payment Card Industry Data Security Standard compliance.

**Example:**

```javascript
import { enforcePolicy, pciPolicy } from 'zod-to-from/policies';

const PaymentData = {
  cardNumber: '4111111111111111',
  cvv: '123',                      // MUST NOT be stored!
  cardholderName: 'John Doe',
  expirationDate: '12/25',
};

try {
  const result = await enforcePolicy(pciPolicy, PaymentData, { strict: true });
} catch (error) {
  console.error('PCI violation:', error.violations);
  // Error: CVV must not be stored after authorization
}

// Without CVV:
const validPaymentData = {
  cardNumber: '4111111111111111',
  cardholderName: 'John Doe',
  expirationDate: '12/25',
};

const result = await enforcePolicy(pciPolicy, validPaymentData, { strict: true });

console.log(result.data);
// {
//   cardNumber: 'ENC[...]',          // Encrypted
//   cardholderName: 'ENC[...]',      // Encrypted
//   expirationDate: 'ENC[...]'       // Encrypted
// }
```

**Key Features:**

- **DENIES** storage of CVV, PIN, full track data
- Encrypts Primary Account Number (PAN)
- Masks PAN for display (first 6 + last 4 digits)
- Card brand detection (Visa, Mastercard, Amex, etc.)
- Luhn algorithm validation
- Tokenization support
- Requirement 3.4 (protect stored cardholder data)

### 4. Security Policy

General security policy for threat prevention.

**Example:**

```javascript
import { enforcePolicy, securityPolicy } from 'zod-to-from/policies';

const UserInput = {
  username: "admin' OR '1'='1",        // SQL Injection attempt
  comment: '<script>alert("XSS")</script>',  // XSS attempt
  filename: 'file.txt; rm -rf /',      // Command injection
  path: '../../etc/passwd',            // Path traversal
  webhookUrl: 'http://169.254.169.254/latest/meta-data/', // SSRF
};

const result = await enforcePolicy(securityPolicy, UserInput);

console.log(result.valid);  // false
console.log(result.audit.securityThreats);
// [
//   { type: 'SQL_INJECTION', field: 'username', severity: 'high' },
//   { type: 'XSS', field: 'comment', severity: 'high' },
//   { type: 'COMMAND_INJECTION', field: 'filename', severity: 'critical' },
//   { type: 'PATH_TRAVERSAL', field: 'path', severity: 'high' },
//   { type: 'SSRF', field: 'webhookUrl', severity: 'high' }
// ]
```

**Key Features:**

- **SQL Injection** detection
- **XSS (Cross-Site Scripting)** detection
- **Command Injection** detection
- **Path Traversal** detection
- **SSRF (Server-Side Request Forgery)** detection
- Email validation
- URL protocol validation
- Secret encryption

### 5. Business Rules Policy

Custom business logic and validation.

**Example:**

```javascript
import { enforcePolicy, businessPolicy } from 'zod-to-from/policies';

const OrderData = {
  email: 'user@example.com',
  age: 25,
  amount: 500,
  status: 'pending',
  orderDate: '2024-06-15',
};

const context = {
  allowedEmailDomains: ['example.com', 'company.com'],
  minAge: 18,
  maxAge: 65,
  maxAmount: 1000,
  minDate: '2024-01-01',
  maxDate: '2024-12-31',
  validStatuses: ['draft', 'pending', 'approved', 'rejected'],
};

const result = await enforcePolicy(businessPolicy, OrderData, context);

console.log(result.valid);  // true
```

**Key Features:**

- Email domain whitelist
- Age range validation
- Date range validation
- Amount/currency validation
- Status workflow validation
- Unique field constraints
- Required field groups
- Data quality scoring

## Integration with zod-to-from

### Using Policies with from/to Functions

You can integrate policies directly with the from/to API:

```javascript
import { fromJson, toJson } from 'zod-to-from';
import { enforcePolicy, gdprPolicy } from 'zod-to-from/policies';
import { z } from 'zod';

const UserSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  password: z.string(),
});

// Parse and enforce policy
const jsonData = '{"email":"user@example.com","name":"John","password":"secret"}';

// Step 1: Parse with Zod
const parsed = await fromJson(UserSchema, jsonData);

// Step 2: Enforce policy
const result = await enforcePolicy(gdprPolicy, parsed);

// Step 3: Use the compliant data
console.log(result.data);
// { email: 'user@example.com', name: 'John', password: 'ENC[...]' }

// Or combine with toJson
const output = await toJson(UserSchema, result.data);
console.log(output);
```

### Policy Options

```javascript
const result = await enforcePolicy(policy, data, {
  strict: true,      // Throw on violations (default: false)
  simulate: true,    // Don't modify data, just report violations
  // ... any custom context for the policy
});
```

## Advanced Usage

### Combining Multiple Policies

```javascript
import { combinePolicy, gdprPolicy, securityPolicy } from 'zod-to-from/policies';

const combinedPolicy = combinePolicy(
  [gdprPolicy, securityPolicy],
  'GDPR + Security Policy'
);

const result = await enforcePolicy(combinedPolicy, data);
```

### Creating Custom Policies

```javascript
import { definePolicy } from 'zod-to-from/policies';

const customPolicy = definePolicy({
  name: 'My Custom Policy',
  version: '1.0.0',
  description: 'Custom business rules',
  strict: false,
  rules: [
    {
      field: 'email',
      validator: (value) => value.endsWith('@company.com'),
      metadata: {
        rule: 'Corporate Email Only',
        description: 'Only company emails allowed',
      },
    },
    {
      field: 'salary',
      classify: 'CONFIDENTIAL',
      action: 'encrypt',
    },
  ],
});
```

### Extending Existing Policies

```javascript
const extendedGdpr = definePolicy({
  name: 'Extended GDPR',
  extends: [gdprPolicy],
  rules: [
    {
      field: 'customField',
      classify: 'PII',
      action: 'mask',
    },
  ],
});
```

### Audit Logging

```javascript
import { createAuditLogger, enforcePolicy, gdprPolicy } from 'zod-to-from/policies';

const logger = createAuditLogger({
  console: true,  // Log to console
  onLog: (entry) => {
    // Send to external logging service
    console.log('Audit entry:', entry);
  },
});

const result = await enforcePolicy(gdprPolicy, data);

logger.log({
  ...result.audit,
  userId: 'user123',
  action: 'data-processing',
});

// Export audit logs
const auditReport = logger.export();
console.log(auditReport);
// {
//   logs: [...],
//   summary: {
//     total: 10,
//     violations: 2,
//     errors: 0
//   }
// }
```

## Utility Functions

### PII/PHI/PCI Detection

```javascript
import { classifyField } from 'zod-to-from/policies';

console.log(classifyField('email', 'user@example.com'));  // 'PII'
console.log(classifyField('cardNumber', '4111111111111111'));  // 'PCI'
console.log(classifyField('medicalRecordNumber', '12345'));  // 'PHI'
```

### Masking

```javascript
import { maskValue } from 'zod-to-from/policies';

console.log(maskValue('user@example.com', 'PII'));  // 'u***@example.com'
console.log(maskValue('123-45-6789', 'PII'));  // '***-**-6789'
console.log(maskValue('4111111111111111', 'PCI'));  // '****-****-****-1111'
```

### Encryption

```javascript
import { encryptValue, decryptValue } from 'zod-to-from/policies';

const encrypted = encryptValue('sensitive data');
console.log(encrypted);  // 'ENC[...]'

const decrypted = decryptValue(encrypted);
console.log(decrypted);  // 'sensitive data'
```

### GDPR Helpers

```javascript
import {
  checkRightToErasure,
  createDataSubjectExport,
  createConsentRecord,
} from 'zod-to-from/policies';

// Check if data should be deleted
const shouldDelete = checkRightToErasure({ deletionRequested: true });

// Create data export for data subject request
const exportData = createDataSubjectExport(userData, {
  controller: 'My Company',
  legalBasis: 'Consent',
});

// Create consent record
const consent = createConsentRecord({
  dataSubject: 'user@example.com',
  purpose: 'marketing',
  consentGiven: true,
});
```

### HIPAA Helpers

```javascript
import {
  isSafeHarborCompliant,
  createHipaaAuditLog,
  createBAARecord,
} from 'zod-to-from/policies';

// Check Safe Harbor compliance
const isCompliant = isSafeHarborCompliant(patientData);

// Create HIPAA audit log
const auditLog = createHipaaAuditLog({
  type: 'access',
  userId: 'doctor123',
  userRole: 'provider',
  patientId: 'patient456',
  action: 'view',
  phiFields: ['diagnosis'],
  purpose: 'treatment',
});

// Create Business Associate Agreement
const baa = createBAARecord({
  coveredEntity: 'Hospital A',
  businessAssociate: 'Cloud Provider',
  services: ['Data storage'],
});
```

### PCI Helpers

```javascript
import {
  detectCardBrand,
  validateCardNumber,
  maskPAN,
  tokenizeCard,
  createPciAuditLog,
} from 'zod-to-from/policies';

// Detect card brand
console.log(detectCardBrand('4111111111111111'));  // 'visa'

// Validate card number (Luhn algorithm)
console.log(validateCardNumber('4111111111111111'));  // true

// Mask PAN
console.log(maskPAN('4111111111111111'));  // '411111******1111'

// Tokenize card
const token = tokenizeCard('4111111111111111');

// Create PCI audit log
const auditLog = createPciAuditLog({
  type: 'transaction',
  userId: 'cashier123',
  action: 'charge',
  cardFields: ['cardNumber'],
});
```

### Security Helpers

```javascript
import {
  sanitizeHtml,
  sanitizeSql,
  validateFileUpload,
  checkRateLimit,
} from 'zod-to-from/policies';

// Sanitize HTML
const clean = sanitizeHtml('<script>alert("XSS")</script>');

// Sanitize SQL
const safe = sanitizeSql("admin' OR '1'='1");

// Validate file upload
const isValid = validateFileUpload({
  name: 'image.jpg',
  type: 'image/jpeg',
  size: 1024 * 1024,
});

// Check rate limit
const allowed = checkRateLimit('user-123', {
  limit: 100,
  window: 60000,  // 1 minute
});
```

### Business Rules Helpers

```javascript
import {
  WorkflowStateMachine,
  orderWorkflow,
  scoreDataQuality,
  createBusinessRule,
} from 'zod-to-from/policies';

// Use predefined order workflow
console.log(orderWorkflow.canTransition('draft', 'submitted'));  // true
console.log(orderWorkflow.validate('draft', 'shipped'));  // { valid: false, error: '...' }

// Create custom workflow
const approvalWorkflow = new WorkflowStateMachine({
  states: ['draft', 'review', 'approved', 'rejected'],
  transitions: {
    draft: ['review'],
    review: ['approved', 'rejected', 'draft'],
    approved: [],
    rejected: ['draft'],
  },
  initialState: 'draft',
});

// Score data quality
const qualityScore = scoreDataQuality(data, {
  requiredFields: ['name', 'email'],
  optionalFields: ['phone'],
  validators: {
    email: (value) => value.includes('@'),
  },
});

console.log(qualityScore);
// {
//   overall: 85,
//   scores: {
//     completeness: 100,
//     accuracy: 100,
//     consistency: 100,
//     timeliness: 40
//   }
// }

// Create custom business rule
const customRule = createBusinessRule({
  name: 'Corporate Email',
  description: 'Only allow corporate emails',
  field: 'email',
  validator: (value) => value.endsWith('@company.com'),
  severity: 'error',
});
```

## Best Practices

### 1. Layer Your Policies

Apply multiple policies in order of strictness:

```javascript
// 1. Security (most critical)
await enforcePolicy(securityPolicy, data, { strict: true });

// 2. Regulatory compliance
await enforcePolicy(gdprPolicy, data);

// 3. Business rules
await enforcePolicy(businessPolicy, data);
```

### 2. Use Simulation Mode for Testing

```javascript
const result = await enforcePolicy(policy, data, {
  simulate: true,  // Don't modify data
});

console.log('Would transform:', result.audit);
console.log('Violations:', result.violations);
```

### 3. Audit Everything

```javascript
const logger = createAuditLogger();

// Log all policy enforcements
const result = await enforcePolicy(policy, data);
logger.log({
  ...result.audit,
  userId: currentUser.id,
  action: 'data-processing',
  ipAddress: request.ip,
});

// Periodically export and archive
const report = logger.export();
await archiveAuditLog(report);
```

### 4. Combine Policies Appropriately

```javascript
// For healthcare + payments
const healthcarePaymentPolicy = combinePolicy(
  [hipaaPolicy, pciPolicy, securityPolicy],
  'Healthcare Payment Processing'
);

// For EU e-commerce
const euCommercePolicy = combinePolicy(
  [gdprPolicy, pciPolicy, securityPolicy, businessPolicy],
  'EU E-Commerce'
);
```

## API Reference

See the full API documentation for detailed type definitions and function signatures.

## License

MIT

## Support

For issues and questions, please visit:
- GitHub: https://github.com/seanchatmangpt/zod-to-from
- Issues: https://github.com/seanchatmangpt/zod-to-from/issues
