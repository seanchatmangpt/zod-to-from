# Schema Evolution & Migration - zod-to-from v2

## Overview

The Schema Evolution & Migration system enables versioned schemas and automated data migrations in zod-to-from. This powerful feature allows your data models to evolve over time while maintaining data integrity and providing full provenance tracking.

## Core Concepts

### Schema Versioning

Track multiple versions of the same schema over time:

```javascript
import { z } from 'zod';
import { createSchemaEvolution, addSchemaVersion } from 'zod-to-from';

// Version 1: Initial schema
const UserV1 = z.object({
  name: z.string(),
  email: z.string().email(),
});

// Create evolution tracker
createSchemaEvolution('User', UserV1, {
  description: 'Initial user schema'
});

// Version 2: Split name into first and last
const UserV2 = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
});

addSchemaVersion('User', UserV2, {
  description: 'Split name into firstName and lastName'
});

// Version 3: Add optional age field
const UserV3 = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  age: z.number().optional(),
});

addSchemaVersion('User', UserV3, {
  description: 'Add optional age field'
});
```

### Schema Migrations

Define transformation functions to migrate data between schema versions:

```javascript
import { createMigration, executeMigration } from 'zod-to-from';

// Create migration from v1 to v2
const migration_v1_v2 = createMigration(
  'User',  // schema name
  2,       // target version
  (data) => {
    // Transform v1 data to v2 format
    const [first, ...rest] = data.name.split(' ');
    return {
      firstName: first,
      lastName: rest.join(' ') || first,
      email: data.email,
    };
  },
  {
    description: 'Split name into firstName and lastName',
    // Optional: define backward migration for rollback
    backward: (data) => ({
      name: `${data.firstName} ${data.lastName}`,
      email: data.email,
    }),
  }
);

// Execute migration
const v1Data = { name: 'John Doe', email: 'john@example.com' };
const result = await executeMigration(migration_v1_v2, v1Data);

console.log(result.data);
// Output: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' }
```

## API Reference

### Schema Evolution Functions

#### `createSchemaEvolution(name, initialSchema, options)`

Create a new schema evolution tracker.

**Parameters:**
- `name` (string): Unique identifier for the schema
- `initialSchema` (ZodSchema): Initial schema version (v1)
- `options` (object):
  - `description` (string): Description of initial version
  - `metadata` (object): Additional metadata

**Returns:** SchemaEvolution object

**Example:**
```javascript
const evolution = createSchemaEvolution('Product', ProductV1, {
  description: 'Initial product schema',
  metadata: { author: 'team', created: '2024-01-01' }
});
```

#### `addSchemaVersion(name, newSchema, options)`

Add a new version to an existing schema evolution.

**Parameters:**
- `name` (string): Schema identifier
- `newSchema` (ZodSchema): New schema version
- `options` (object):
  - `description` (string): Description of changes
  - `metadata` (object): Version metadata

**Returns:** SchemaVersion object

#### `getSchemaVersion(name, version)`

Retrieve a specific version of a schema.

**Parameters:**
- `name` (string): Schema identifier
- `version` (number): Version number (defaults to current)

**Returns:** SchemaVersion or undefined

#### `listSchemaVersions(name)`

List all versions of a schema in order.

**Returns:** Array of SchemaVersion objects

#### `checkSchemaCompatibility(fromSchema, toSchema)`

Check compatibility between two schema versions.

**Returns:** CompatibilityResult object with:
- `compatible` (boolean): Whether schemas are compatible
- `compatibilityType` (string): 'full', 'backward', 'forward', 'breaking', or 'none'
- `issues` (string[]): List of compatibility issues
- `suggestions` (string[]): Suggested migration strategies

**Example:**
```javascript
const compatibility = checkSchemaCompatibility(UserV1, UserV2);
console.log(compatibility);
// {
//   compatible: false,
//   compatibilityType: 'breaking',
//   issues: ['New required fields added'],
//   suggestions: ['Make new fields optional or provide defaults']
// }
```

### Migration Functions

#### `createMigration(fromSchemaOrName, toSchemaOrVersion, transformFn, options)`

Create a migration between schema versions.

**Parameters:**
- `fromSchemaOrName`: Source schema (ZodSchema) or schema name (string)
- `toSchemaOrVersion`: Target schema (ZodSchema) or version number (number)
- `transformFn`: Transformation function (data) => transformedData
- `options` (object):
  - `description` (string): Migration description
  - `backward` (function): Reverse transformation for rollback
  - `validateInput` (boolean): Validate input data (default: true)
  - `validateOutput` (boolean): Validate output data (default: true)

**Returns:** Migration object

**Example:**
```javascript
// Versioned schema migration
const migration = createMigration('User', 2, transformFn, { description: 'Split name' });

// Direct schema migration (without versioning)
const directMigration = createMigration(OldSchema, NewSchema, transformFn);
```

#### `executeMigration(migration, data, options)`

Execute a migration on data.

**Parameters:**
- `migration`: Migration object
- `data`: Data to migrate
- `options` (object):
  - `dryRun` (boolean): Preview without applying (default: false)
  - `includeProvenance` (boolean): Include provenance metadata (default: true)

**Returns:** Promise<MigrationResult>

**Example:**
```javascript
const result = await executeMigration(migration, oldData, {
  dryRun: false,
  includeProvenance: true
});

if (result.success) {
  console.log('Migrated data:', result.data);
  console.log('Provenance:', result.provenance);
} else {
  console.error('Migration failed:', result.error);
}
```

#### `buildMigrationChain(schemaName, fromVersion, toVersion)`

Build a chain of migrations between two versions.

**Example:**
```javascript
// Automatically chain v1→v2→v3
const chain = buildMigrationChain('User', 1, 3);
```

#### `executeMigrationChain(chain, data, options)`

Execute a chain of migrations.

**Example:**
```javascript
const chain = buildMigrationChain('User', 1, 3);
const result = await executeMigrationChain(chain, v1Data);

console.log(result.versionsApplied); // [1, 2, 3]
console.log(result.migrationsApplied); // ['Split name', 'Add age field']
```

#### `rollbackMigrationChain(chain, data, options)`

Rollback a migration chain (requires backward migrations).

**Example:**
```javascript
const chain = buildMigrationChain('User', 1, 3);

// Migrate forward
const forward = await executeMigrationChain(chain, v1Data);

// Rollback to v1
const rollback = await rollbackMigrationChain(chain, forward.data);
console.log(rollback.data); // Back to v1 format
```

## Complete Example: User Schema Evolution

```javascript
import { z } from 'zod';
import {
  createSchemaEvolution,
  addSchemaVersion,
  createMigration,
  executeMigrationChain,
  buildMigrationChain,
  fromJson,
} from 'zod-to-from';

// 1. Define schema versions
const UserV1 = z.object({
  name: z.string(),
  email: z.string().email(),
});

const UserV2 = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
});

const UserV3 = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  age: z.number().optional(),
  createdAt: z.string().datetime().optional(),
});

// 2. Create evolution tracker
createSchemaEvolution('User', UserV1, {
  description: 'Initial user schema',
});

addSchemaVersion('User', UserV2, {
  description: 'Split name into firstName and lastName',
});

addSchemaVersion('User', UserV3, {
  description: 'Add age and createdAt fields',
});

// 3. Define migrations
createMigration(
  'User',
  2,
  (data) => {
    const [first, ...rest] = data.name.split(' ');
    return {
      firstName: first,
      lastName: rest.join(' ') || first,
      email: data.email,
    };
  },
  {
    description: 'Split name into firstName and lastName',
    backward: (data) => ({
      name: `${data.firstName} ${data.lastName}`,
      email: data.email,
    }),
  }
);

createMigration(
  'User',
  3,
  (data) => ({
    ...data,
    age: undefined,
    createdAt: new Date().toISOString(),
  }),
  {
    description: 'Add age and createdAt fields',
    backward: (data) => {
      const { age, createdAt, ...rest } = data;
      return rest;
    },
  }
);

// 4. Migrate legacy data
const legacyJsonData = JSON.stringify({
  name: 'Alice Johnson',
  email: 'alice@example.com',
});

// Parse with migration
const chain = buildMigrationChain('User', 1, 3);
const parsedData = await fromJson(UserV1, legacyJsonData);
const migratedResult = await executeMigrationChain(chain, parsedData);

console.log(migratedResult.data);
// {
//   firstName: 'Alice',
//   lastName: 'Johnson',
//   email: 'alice@example.com',
//   age: undefined,
//   createdAt: '2024-01-15T10:30:00.000Z'
// }

console.log(migratedResult.provenance);
// {
//   schemaName: 'User',
//   migrationsApplied: [1, 2, 3],
//   versionDetails: [...],
//   migrationTimestamp: '2024-01-15T10:30:00.000Z'
// }
```

## Integration with parseFrom/formatTo

You can combine schema evolution with the existing zod-to-from API:

```javascript
import { parseFrom, formatTo } from 'zod-to-from';

// Parse old data with v1 schema
const oldData = await parseFrom(UserV1, 'json', legacyJsonString);

// Migrate to v3
const chain = buildMigrationChain('User', 1, 3);
const migrated = await executeMigrationChain(chain, oldData);

// Format as YAML with v3 schema and provenance
const result = await formatTo(UserV3, 'yaml', migrated.data, {
  includeProvenance: true,
});

console.log(result.provenance);
// Includes both format conversion AND migration provenance
```

## Best Practices

### 1. Always Provide Descriptions

```javascript
addSchemaVersion('User', UserV2, {
  description: 'Split name field - breaking change for analytics team',
});
```

### 2. Use Bidirectional Migrations

```javascript
createMigration('User', 2, forwardFn, {
  backward: reverseFn,  // Enable rollback capability
});
```

### 3. Validate at Each Step

```javascript
createMigration('User', 2, transformFn, {
  validateInput: true,   // Ensure v1 data is valid
  validateOutput: true,  // Ensure v2 data is valid
});
```

### 4. Test Migrations with Dry-Run

```javascript
const result = await executeMigration(migration, testData, { dryRun: true });
// Preview migration without applying changes
```

### 5. Check Compatibility Before Adding Versions

```javascript
const compatibility = checkSchemaCompatibility(currentSchema, newSchema);
if (!compatibility.compatible) {
  console.warn('Breaking changes detected:', compatibility.issues);
  console.log('Suggestions:', compatibility.suggestions);
}
```

### 6. Use Provenance for Auditing

```javascript
const result = await executeMigrationChain(chain, data, {
  includeProvenance: true,
});

// Log migration history for compliance
auditLog.record({
  operation: 'schema-migration',
  schemaName: result.provenance.schemaName,
  versionsApplied: result.provenance.migrationsApplied,
  timestamp: result.provenance.migrationTimestamp,
});
```

## Advanced Patterns

### Conditional Migrations

```javascript
createMigration('User', 2, (data) => {
  // Handle different data structures
  if (data.fullName) {
    const [first, ...rest] = data.fullName.split(' ');
    return { firstName: first, lastName: rest.join(' ') };
  } else if (data.name) {
    const [first, ...rest] = data.name.split(' ');
    return { firstName: first, lastName: rest.join(' ') };
  }
  return data;
});
```

### Async Migrations

```javascript
createMigration('User', 2, async (data) => {
  // Enrich data from external source
  const additionalInfo = await fetchUserInfo(data.email);
  return {
    ...data,
    ...additionalInfo,
  };
});
```

### Batch Migrations

```javascript
async function migrateBatch(users) {
  const chain = buildMigrationChain('User', 1, 3);

  const results = await Promise.all(
    users.map(user => executeMigrationChain(chain, user))
  );

  return results.filter(r => r.success).map(r => r.data);
}
```

## Error Handling

```javascript
const result = await executeMigration(migration, data);

if (!result.success) {
  switch (true) {
    case result.error.includes('Input validation'):
      console.error('Invalid source data format');
      break;
    case result.error.includes('Output validation'):
      console.error('Migration produced invalid data');
      break;
    case result.error.includes('execution failed'):
      console.error('Migration logic error:', result.error);
      break;
  }
}
```

## Type Safety

All schema evolution and migration functions maintain full TypeScript/JSDoc type safety:

```javascript
/**
 * @typedef {import('zod').ZodSchema} ZodSchema
 */

// TypeScript will infer correct types through the migration chain
const result = await executeMigrationChain(chain, typedData);
// result.data has correct TypeScript type for target schema version
```

## Performance Considerations

- **Lazy Migration**: Only migrate data when accessed, not all at once
- **Caching**: Cache migration chains for frequently used version pairs
- **Validation**: Disable validation for trusted data sources to improve performance
- **Streaming**: For large datasets, use streaming migrations (future feature)

## Migration Provenance

Every migration includes full provenance tracking:

```javascript
{
  schemaName: 'User',
  migrationsApplied: [1, 2, 3],
  versionDetails: [
    { version: 1, hash: 'abc123', description: 'Initial schema', timestamp: '...' },
    { version: 2, hash: 'def456', description: 'Split name', timestamp: '...' },
    { version: 3, hash: 'ghi789', description: 'Add fields', timestamp: '...' }
  ],
  migrationTimestamp: '2024-01-15T10:30:00.000Z'
}
```

This enables:
- Full audit trails for compliance
- Data lineage tracking
- Migration debugging
- Rollback capabilities

## Next Steps

- Explore [API Documentation](/docs/api/schema-evolution.md) for detailed reference
- See [Examples](/docs/examples/migrations.md) for more use cases
- Check [Migration Patterns](/docs/guides/migration-patterns.md) for common scenarios
