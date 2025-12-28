# Schema Registry

The Schema Registry provides centralized Zod schema management with versioning, discovery, and dependency tracking for zod-to-from v2.

## Overview

The Schema Registry system consists of three main components:

1. **Schema Registry** - Core registry for schema registration, versioning, and discovery
2. **Schema Store** - Persistent storage with caching and multi-backend support
3. **Remote Registry** - HTTP client for remote schema repositories

## Core Concepts

### Schema Registration

Register Zod schemas with semantic versioning and rich metadata:

```javascript
import { z } from 'zod';
import { registerSchema } from 'zod-to-from/core';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().optional(),
});

// Register with metadata
const metadata = registerSchema('User', UserSchema, {
  version: '1.0.0',
  description: 'User account data',
  tags: ['auth', 'core'],
  author: 'team@example.com',
  namespace: 'myapp',
  changelog: 'Initial version',
});
```

### Schema Retrieval

Get schemas by name and version:

```javascript
import { getSchema, getSchemaMetadata } from 'zod-to-from/core';

// Get latest version
const schema = getSchema('User');

// Get specific version
const schemaV1 = getSchema('User', '1.0.0');

// Get metadata
const metadata = getSchemaMetadata('User', '1.0.0');
console.log(metadata.description, metadata.tags);
```

### Versioning

Multiple versions of the same schema can coexist:

```javascript
// Register different versions
registerSchema('User', UserSchemaV1, { version: '1.0.0' });
registerSchema('User', UserSchemaV1_1, { version: '1.1.0' });
registerSchema('User', UserSchemaV2, { version: '2.0.0' });

// List all versions
const versions = listVersions('User');
// ['1.0.0', '1.1.0', '2.0.0']

// Check compatibility
const diff = checkCompatibility('User', '1.0.0', '2.0.0');
if (!diff.compatible) {
  console.log('Breaking changes:', diff.breakingChanges);
}
```

## Features

### 1. Schema Discovery

Search schemas by various criteria:

```javascript
import { searchSchemas } from 'zod-to-from/core';

// Search by name pattern
const userSchemas = searchSchemas({ name: '*User' });

// Search by tags
const authSchemas = searchSchemas({ tags: ['auth'] });

// Search by namespace
const myAppSchemas = searchSchemas({ namespace: 'myapp' });

// Combine criteria
const results = searchSchemas({
  namespace: 'myapp',
  tags: ['core'],
  publishedOnly: true,
});

for (const entry of results) {
  console.log(entry.metadata.name, entry.metadata.version);
}
```

### 2. Schema Dependencies

Track schemas that reference other schemas:

```javascript
const OrderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  items: z.array(z.string()),
});

// Register with dependencies
registerSchema('User', UserSchema);
registerSchema('Product', ProductSchema);
registerSchema('Order', OrderSchema, {
  dependencies: ['User', 'Product'],
});

// Get dependencies
const deps = getDependencies('Order');
// ['User', 'Product']

// Get reverse dependencies (what depends on this schema)
const dependents = getDependents('User');
// ['Order@1.0.0']
```

### 3. Publishing

Control schema visibility:

```javascript
// Register as draft
registerSchema('User', UserSchema, { published: false });

// Publish when ready
publishSchema('User', '1.0.0');

// Unpublish if needed
unpublishSchema('User', '1.0.0');

// List only published schemas
const published = listSchemas({ publishedOnly: true });
```

### 4. Metadata Management

Update metadata without changing the schema:

```javascript
updateMetadata('User', '1.0.0', {
  description: 'Updated user schema description',
  tags: ['auth', 'core', 'v2'],
  changelog: 'Added email validation',
});
```

### 5. Registry Statistics

Get overview of registry contents:

```javascript
import { getRegistryStats } from 'zod-to-from/core';

const stats = getRegistryStats();
console.log(`Total schemas: ${stats.totalSchemas}`);
console.log(`Total versions: ${stats.totalVersions}`);
console.log(`Published: ${stats.publishedSchemas}`);
console.log(`Namespaces: ${stats.namespaces}`);
console.log(`Tags: ${stats.tags}`);
```

## Persistent Storage

### Memory Store

In-memory storage (default, no persistence):

```javascript
import { createMemoryStore } from 'zod-to-from/core';

const store = createMemoryStore({
  cache: true,
  cacheTTL: 3600000, // 1 hour
});

// Save metadata
await store.saveMetadata('User', '1.0.0', metadata);

// Load metadata
const loaded = await store.loadMetadata('User', '1.0.0');
```

### File Store

File system-based persistence:

```javascript
import { createFileStore } from 'zod-to-from/core';

const store = createFileStore('./schemas', {
  cache: true,
  cacheTTL: 3600000,
});

// Metadata persists to ./schemas/*.json
await store.saveMetadata('User', '1.0.0', metadata);

// Export all to JSON
const exported = await store.exportAll();

// Import from JSON
await store.importAll(exported);
```

### Custom Storage Backend

Implement custom storage (e.g., database):

```javascript
class DatabaseStorage {
  async save(key, data) {
    await db.schemas.insert({ key, data });
  }

  async load(key) {
    const row = await db.schemas.findOne({ key });
    return row ? row.data : null;
  }

  async exists(key) {
    return await db.schemas.exists({ key });
  }

  async delete(key) {
    await db.schemas.delete({ key });
  }

  async list() {
    const rows = await db.schemas.find({});
    return rows.map(r => r.key);
  }
}

const store = new SchemaStore({
  storage: new DatabaseStorage(),
  cache: true,
});
```

## Remote Registries

### Fetching from Remote

```javascript
import { createRemoteRegistry } from 'zod-to-from/core';

const remote = createRemoteRegistry('https://schemas.example.com', {
  apiKey: process.env.SCHEMA_REGISTRY_API_KEY,
  timeout: 5000,
  headers: {
    'X-Custom-Header': 'value',
  },
});

// Fetch schema
const schema = await remote.fetchSchema('User', '1.0.0');

// Search remote registry
const results = await remote.searchSchemas({
  tags: ['auth'],
});

// Publish to remote
await remote.publishSchema('User', '1.0.0', metadata);
```

### Synchronization

Sync between local and remote registries:

```javascript
import { createSynchronizer } from 'zod-to-from/core';

const local = createFileStore('./schemas');
const remote1 = createRemoteRegistry('https://registry1.example.com');
const remote2 = createRemoteRegistry('https://registry2.example.com');

const sync = createSynchronizer(local, [remote1, remote2]);

// Sync from remote to local
await sync.syncFromRemote('User', '1.0.0', 0); // From remote1

// Sync from local to remote
await sync.syncToRemote('Product', '1.0.0', metadata, 0);

// Search all remotes
const results = await sync.searchAllRemotes({ tags: ['core'] });
```

## Export/Import

### Export Registry

```javascript
import { exportRegistry } from 'zod-to-from/core';

// Export all schemas
const exported = exportRegistry();

// Export by namespace
const myAppExport = exportRegistry({ namespace: 'myapp' });

// Export only published
const publishedExport = exportRegistry({ publishedOnly: true });

// Save to file
await fs.writeFile('registry.json', JSON.stringify(exported, null, 2));
```

### Import Registry

```javascript
import { importRegistry } from 'zod-to-from/core';

// Load from file
const data = JSON.parse(await fs.readFile('registry.json', 'utf8'));

// Provide actual schemas
const schemasMap = {
  User: UserSchema,
  Product: ProductSchema,
  Order: OrderSchema,
};

// Import (skip existing by default)
const imported = importRegistry(data, schemasMap);

// Import and overwrite existing
const imported = importRegistry(data, schemasMap, { overwrite: true });

console.log(`Imported ${imported} schemas`);
```

## Integration with Conversions

Use registered schemas in conversions:

```javascript
import { fromJson, toJson } from 'zod-to-from';
import { getSchema } from 'zod-to-from/core';

// Register schema once
registerSchema('User', UserSchema);

// Use anywhere
const userData = await fromJson(getSchema('User'), jsonString);
const jsonOutput = await toJson(getSchema('User'), userData);

// With versioning
const userV1 = await fromJson(getSchema('User', '1.0.0'), legacyJson);
const userV2 = await fromJson(getSchema('User', '2.0.0'), newJson);
```

## Registry Instance

Create isolated registry instances:

```javascript
import { createRegistry } from 'zod-to-from/core';

const registry = createRegistry();

// All methods available
registry.register('User', UserSchema);
const schema = registry.get('User');
const results = registry.search({ tags: ['auth'] });
const stats = registry.stats();

// Useful for testing or multi-tenant scenarios
const tenantRegistry = createRegistry();
tenantRegistry.register('User', TenantUserSchema, {
  namespace: 'tenant-123',
});
```

## API Reference

### Registration

- `registerSchema(name, schema, options?)` - Register a schema
- `deleteSchema(name, version)` - Delete a schema version
- `publishSchema(name, version?)` - Publish a schema
- `unpublishSchema(name, version?)` - Unpublish a schema
- `updateMetadata(name, version, updates)` - Update metadata

### Retrieval

- `getSchema(name, version?)` - Get schema
- `getSchemaMetadata(name, version?)` - Get metadata
- `getSchemaEntry(name, version?)` - Get schema + metadata
- `listVersions(name)` - List all versions
- `listSchemas(options?)` - List schema names

### Discovery

- `searchSchemas(criteria)` - Search by criteria
- `getDependencies(name, version?)` - Get dependencies
- `getDependents(name)` - Get reverse dependencies

### Validation

- `validateSchema(schema)` - Validate Zod schema
- `checkCompatibility(name, oldVersion, newVersion)` - Check version compatibility

### Management

- `exportRegistry(options?)` - Export to JSON
- `importRegistry(data, schemasMap, options?)` - Import from JSON
- `clearRegistry(options?)` - Clear registry
- `getRegistryStats()` - Get statistics
- `createRegistry()` - Create registry instance

### Storage

- `createMemoryStore(options?)` - Create memory store
- `createFileStore(storageDir, options?)` - Create file store
- `createRemoteRegistry(url, options?)` - Create remote client
- `createSynchronizer(local, remotes?)` - Create synchronizer

## Best Practices

1. **Semantic Versioning**: Use proper semver (major.minor.patch)
   - Major: Breaking changes
   - Minor: New features, backward compatible
   - Patch: Bug fixes

2. **Namespaces**: Organize schemas by application/module
   ```javascript
   registerSchema('User', schema, { namespace: 'myapp/auth' });
   ```

3. **Tags**: Use consistent tags for discovery
   ```javascript
   tags: ['domain', 'subdomain', 'feature']
   ```

4. **Dependencies**: Always declare schema references
   ```javascript
   dependencies: ['User', 'Product']
   ```

5. **Changelogs**: Document version changes
   ```javascript
   changelog: 'Added email validation, removed legacy fields'
   ```

6. **Publishing**: Use draft mode during development
   ```javascript
   registerSchema('User', schema, { published: false });
   // Test and validate
   publishSchema('User');
   ```

## Examples

### Complete Workflow

```javascript
import { z } from 'zod';
import {
  registerSchema,
  getSchema,
  searchSchemas,
  exportRegistry,
  createFileStore,
} from 'zod-to-from/core';
import { fromJson, toJson } from 'zod-to-from';

// 1. Define schemas
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
});

// 2. Register schemas
registerSchema('User', UserSchema, {
  version: '1.0.0',
  description: 'User account schema',
  tags: ['auth', 'core'],
  namespace: 'myapp',
});

registerSchema('Product', ProductSchema, {
  version: '1.0.0',
  description: 'Product catalog schema',
  tags: ['catalog', 'core'],
  namespace: 'myapp',
});

// 3. Use in conversions
const userJson = '{"id":"1","name":"Alice","email":"alice@example.com"}';
const user = await fromJson(getSchema('User'), userJson);

// 4. Search and discover
const coreSchemas = searchSchemas({ tags: ['core'] });
console.log('Core schemas:', coreSchemas.map(s => s.metadata.name));

// 5. Persist to disk
const store = createFileStore('./schemas');
const exported = exportRegistry({ namespace: 'myapp' });

for (const item of exported.schemas) {
  await store.saveMetadata(item.name, item.version, item.metadata);
}

// 6. Load in another process
const loaded = await store.loadMetadata('User', '1.0.0');
console.log('Loaded:', loaded.description);
```

## Migration Guide

### From Manual Schema Management

Before:
```javascript
import { UserSchema } from './schemas/user.js';
import { ProductSchema } from './schemas/product.js';

const user = await fromJson(UserSchema, json);
```

After:
```javascript
import { getSchema } from 'zod-to-from/core';

// Register once at startup
registerSchema('User', UserSchema);
registerSchema('Product', ProductSchema);

// Use anywhere
const user = await fromJson(getSchema('User'), json);
```

### Benefits

- Centralized schema management
- Version control and compatibility checking
- Schema discovery and search
- Dependency tracking
- Metadata and documentation
- Export/import for sharing
- Remote registry support

## See Also

- [Core API Documentation](./core-api.md)
- [Adapter Registry](./adapter-registry.md)
- [Version Management](./versioning.md)
