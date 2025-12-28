# Diff and Merge - Schema-Aware Data Comparison and Merging

The zod-to-from v2 Diff and Merge engine provides intelligent data comparison and conflict resolution with full schema validation. Compare validated data structures, detect changes at any depth, and merge conflicting versions with configurable strategies.

## Table of Contents

- [Overview](#overview)
- [Diff Engine](#diff-engine)
  - [Basic Diffing](#basic-diffing)
  - [Diff Options](#diff-options)
  - [Output Formats](#output-formats)
  - [Statistics and Metrics](#statistics-and-metrics)
- [Merge Engine](#merge-engine)
  - [Three-Way Merge](#three-way-merge)
  - [Merge Strategies](#merge-strategies)
  - [Conflict Resolution](#conflict-resolution)
  - [Field-Level Rules](#field-level-rules)
- [Advanced Features](#advanced-features)
- [API Reference](#api-reference)

## Overview

The Diff and Merge functionality builds on zod-to-from's schema validation to provide:

- **Schema-aware diffing**: Compare validated objects with deep field tracking
- **Multiple diff formats**: Unified, split, JSON Patch (RFC 6902), JSON Merge Patch (RFC 7386)
- **Semantic comparison**: Ignore formatting differences while detecting real changes
- **Three-way merge**: Merge base, left, and right versions with conflict detection
- **Flexible conflict resolution**: Multiple strategies plus custom resolvers
- **Provenance tracking**: Full audit trail of merge operations
- **Schema evolution support**: Merge data across schema versions

## Diff Engine

### Basic Diffing

Compare two validated objects to detect additions, removals, and changes:

```javascript
import { z } from 'zod';
import { diffData } from 'zod-to-from/core';

const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email().optional(),
});

const oldData = { name: 'John', age: 30 };
const newData = { name: 'John', age: 31, email: 'john@example.com' };

const diff = await diffData(UserSchema, oldData, newData);

console.log(diff.added);     // ['email']
console.log(diff.changed);   // ['age']
console.log(diff.removed);   // []
console.log(diff.statistics.percentChanged); // 50%
```

### Diff Options

Control diff behavior with comprehensive options:

```javascript
const diff = await diffData(schema, oldData, newData, {
  // Ignore formatting/whitespace differences
  semantic: true,

  // Treat arrays as sets (ignore order)
  ignoreOrder: true,

  // Deep comparison for nested objects
  deepCompare: true,

  // Ignore specific paths
  ignorePaths: ['metadata.timestamp', 'internal.*'],

  // Output format
  format: 'unified', // or 'split', 'json-patch', 'json-merge-patch', 'all'

  // Include unchanged fields
  includeUnchanged: false,

  // Custom comparison function
  customCompare: (field, oldVal, newVal) => {
    if (typeof oldVal === 'string' && typeof newVal === 'string') {
      return oldVal.toLowerCase() === newVal.toLowerCase();
    }
    return oldVal === newVal;
  },

  // Threshold for detecting array moves (0-1)
  arrayMoveThreshold: 0.8,
});
```

### Output Formats

#### Unified Diff

Git-style unified diff output:

```javascript
const diff = await diffData(schema, oldData, newData, {
  format: 'unified',
});

console.log(diff.unified);
// --- old
// +++ new
// - age: 30
// + age: 31
// + email: "john@example.com"
```

#### Split Diff

Side-by-side comparison:

```javascript
const diff = await diffData(schema, oldData, newData, {
  format: 'split',
});

console.log(diff.split.old);  // ['age: 30', '']
console.log(diff.split.new);  // ['age: 31', 'email: "john@example.com"']
```

#### JSON Patch (RFC 6902)

Standard JSON Patch operations:

```javascript
const diff = await diffData(schema, oldData, newData, {
  format: 'json-patch',
});

console.log(diff.jsonPatch);
// [
//   { op: 'replace', path: '/age', value: 31 },
//   { op: 'add', path: '/email', value: 'john@example.com' }
// ]
```

#### JSON Merge Patch (RFC 7386)

Simplified merge patch:

```javascript
const diff = await diffData(schema, oldData, newData, {
  format: 'json-merge-patch',
});

console.log(diff.jsonMergePatch);
// { age: 31, email: 'john@example.com' }
```

### Statistics and Metrics

Get detailed statistics about changes:

```javascript
const diff = await diffData(schema, oldData, newData);

console.log(diff.statistics);
// {
//   totalChanges: 2,
//   fieldsAdded: 1,
//   fieldsRemoved: 0,
//   fieldsChanged: 1,
//   fieldsMoved: 0,
//   percentChanged: 50.0,
//   similarity: 0.5
// }

// Human-readable summary
import { summarizeDiff } from 'zod-to-from/core';
console.log(summarizeDiff(diff));
// "2 total changes: 1 added, 1 changed (50% changed, 50% similar)"
```

## Merge Engine

### Three-Way Merge

Merge base, left, and right versions with automatic conflict detection:

```javascript
import { mergeData } from 'zod-to-from/core';

const base = { name: 'John', age: 30, email: 'john@old.com' };
const left = { name: 'John', age: 31, email: 'john@old.com' };  // Local changes
const right = { name: 'John', age: 30, email: 'john@new.com' }; // Remote changes

const result = await mergeData(schema, base, left, right, {
  strategy: 'prefer-left',
});

console.log(result.data);
// { name: 'John', age: 31, email: 'john@new.com' }

console.log(result.hasConflicts);  // false (all resolved)
console.log(result.conflicts);     // Array of conflict objects
```

### Merge Strategies

Built-in strategies for conflict resolution:

#### Fail on Conflict (Default)

Throw an error when conflicts are detected:

```javascript
const result = await mergeData(schema, base, left, right, {
  strategy: 'fail-on-conflict',
});
// Throws: "Merge conflict at name: both sides modified"
```

#### Prefer Left

Always choose left version in conflicts:

```javascript
const result = await mergeData(schema, base, left, right, {
  strategy: 'prefer-left',
});
// Conflicts resolved with left values
```

#### Prefer Right

Always choose right version in conflicts:

```javascript
const result = await mergeData(schema, base, left, right, {
  strategy: 'prefer-right',
});
// Conflicts resolved with right values
```

#### Prefer Newer/Older

Choose based on assumed chronology:

```javascript
const result = await mergeData(schema, base, left, right, {
  strategy: 'prefer-newer', // Assumes right is newer
});

const result2 = await mergeData(schema, base, left, right, {
  strategy: 'prefer-older', // Assumes left is older
});
```

### Conflict Resolution

#### Custom Resolver

Provide your own conflict resolution logic:

```javascript
const result = await mergeData(schema, base, left, right, {
  strategy: 'custom',
  onConflict: (field, baseValue, leftValue, rightValue) => {
    // Custom logic
    if (field === 'age') {
      return Math.max(leftValue, rightValue); // Take higher age
    }
    if (field === 'email') {
      return leftValue; // Prefer local email
    }
    return rightValue; // Default to right
  },
});
```

#### Interactive Resolver

Create an interactive resolver for user input:

```javascript
import { createInteractiveResolver } from 'zod-to-from/core';

const resolver = createInteractiveResolver(async (conflict) => {
  // Prompt user (in CLI, UI, etc.)
  const choice = await promptUser(
    `Conflict at ${conflict.path}:\n` +
    `Left: ${JSON.stringify(conflict.leftValue)}\n` +
    `Right: ${JSON.stringify(conflict.rightValue)}\n` +
    'Choose (left/right):'
  );

  return choice === 'left' ? conflict.leftValue : conflict.rightValue;
});

const result = await mergeData(schema, base, left, right, {
  onConflict: resolver,
});
```

### Field-Level Rules

Apply different strategies to different fields:

```javascript
const result = await mergeData(schema, base, left, right, {
  strategy: 'prefer-left', // Default strategy
  fieldRules: {
    'age': 'prefer-right',
    'profile.email': 'prefer-left',
    'metadata.timestamp': (base, left, right) => {
      return new Date().toISOString(); // Always use current time
    },
  },
});
```

## Advanced Features

### Format-Agnostic Diff

Compare data in different formats:

```javascript
import { diffFormats } from 'zod-to-from/core';

const csvData = 'name,age\nJohn,30';
const jsonData = { name: 'John', age: 31 };

const diff = await diffFormats(
  schema,
  'csv',
  csvData,
  'json',
  jsonData
);
// Compares the underlying data, not the format
```

### Schema Evolution Support

Merge data across different schema versions:

```javascript
import { mergeWithSchemaEvolution } from 'zod-to-from/core';

const OldSchema = z.object({
  name: z.string(),
  age: z.number(),
});

const NewSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email().optional(),
  verified: z.boolean().default(false),
});

const base = { name: 'John', age: 30 };
const left = { name: 'John', age: 31, email: 'john@example.com', verified: true };
const right = { name: 'Jane', age: 30, email: 'jane@example.com', verified: false };

const result = await mergeWithSchemaEvolution(
  OldSchema,
  NewSchema,
  base,
  left,
  right,
  { strategy: 'prefer-left' }
);
```

### Two-Way Merge

Merge without a base version:

```javascript
import { mergeTwoWay } from 'zod-to-from/core';

const left = { name: 'John', age: 30 };
const right = { name: 'Jane', age: 31 };

const result = await mergeTwoWay(schema, left, right, {
  strategy: 'prefer-left',
});
```

### Provenance Tracking

Track full merge history:

```javascript
const result = await mergeData(schema, base, left, right, {
  trackProvenance: true,
});

console.log(result.provenance);
// {
//   timestamp: '2025-12-27T10:30:00.000Z',
//   strategy: 'prefer-left',
//   conflictsDetected: 2,
//   conflictsResolved: 2,
//   baseHash: 'a1b2c3',
//   leftHash: 'd4e5f6',
//   rightHash: 'g7h8i9',
//   resultHash: 'j0k1l2'
// }
```

### Merge Statistics

Get detailed merge statistics:

```javascript
const result = await mergeData(schema, base, left, right);

console.log(result.statistics);
// {
//   fieldsFromBase: 5,
//   fieldsFromLeft: 3,
//   fieldsFromRight: 2,
//   fieldsMerged: 1,
//   totalFields: 11
// }

import { summarizeMerge } from 'zod-to-from/core';
console.log(summarizeMerge(result));
// "Total fields: 11, From base: 5, From left: 3, From right: 2, Merged: 1"
```

## API Reference

### diffData()

```typescript
async function diffData(
  schema: ZodSchema,
  oldData: any,
  newData: any,
  opts?: DiffOptions
): Promise<DiffResult>
```

### mergeData()

```typescript
async function mergeData(
  schema: ZodSchema,
  base: any,
  left: any,
  right: any,
  opts?: MergeOptions
): Promise<MergeResult>
```

### mergeTwoWay()

```typescript
async function mergeTwoWay(
  schema: ZodSchema,
  left: any,
  right: any,
  opts?: MergeOptions
): Promise<MergeResult>
```

### mergeWithSchemaEvolution()

```typescript
async function mergeWithSchemaEvolution(
  oldSchema: ZodSchema,
  newSchema: ZodSchema,
  base: any,
  left: any,
  right: any,
  opts?: MergeOptions
): Promise<MergeResult>
```

### summarizeDiff()

```typescript
function summarizeDiff(diffResult: DiffResult): string
```

### summarizeMerge()

```typescript
function summarizeMerge(mergeResult: MergeResult): string
```

### createInteractiveResolver()

```typescript
function createInteractiveResolver(
  promptUser: (conflict: MergeConflict) => Promise<any>
): Function
```

## Examples

### Version Control Diff

```javascript
// Compare two commits
const commit1 = await parseFrom(schema, 'json', fs.readFileSync('v1.json', 'utf8'));
const commit2 = await parseFrom(schema, 'json', fs.readFileSync('v2.json', 'utf8'));

const diff = await diffData(schema, commit1, commit2, {
  format: 'unified',
  semantic: true,
});

console.log(summarizeDiff(diff));
fs.writeFileSync('changes.diff', diff.unified);
```

### Collaborative Editing

```javascript
// Merge local and remote changes
const serverData = await fetchFromServer();
const localData = loadLocalChanges();
const baseData = loadLastSyncedVersion();

const result = await mergeData(schema, baseData, localData, serverData, {
  strategy: 'custom',
  onConflict: async (field, base, local, remote) => {
    // Show conflict UI
    return await showConflictDialog(field, local, remote);
  },
  validate: true,
});

if (result.hasConflicts) {
  console.warn('Unresolved conflicts:', result.conflicts);
} else {
  await saveToServer(result.data);
}
```

### Configuration Management

```javascript
// Merge configuration files
const defaultConfig = loadDefaults();
const userConfig = loadUserPreferences();
const systemConfig = loadSystemSettings();

const result = await mergeData(ConfigSchema, defaultConfig, userConfig, systemConfig, {
  strategy: 'prefer-right',
  fieldRules: {
    'security.*': 'prefer-left', // User can't override security settings
    'theme.*': 'prefer-right',    // System theme takes precedence
  },
});

await saveConfig(result.data);
```

---

**Next Steps:**
- Explore [Validation and Transformation](./validation-and-transformation.md)
- Learn about [Streaming and Performance](./streaming-and-performance.md)
- Check out [Advanced Patterns](./advanced-patterns.md)
