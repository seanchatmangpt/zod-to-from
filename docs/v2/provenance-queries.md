# Enhanced Provenance Queries - zod-to-from v2

## Overview

The enhanced provenance system in zod-to-from v2 provides comprehensive audit trails, data lineage tracking, and compliance reporting capabilities. This guide covers how to query, aggregate, and export provenance data.

## Table of Contents

- [Core Concepts](#core-concepts)
- [Creating Provenance](#creating-provenance)
- [Querying Provenance](#querying-provenance)
- [Aggregations](#aggregations)
- [Compliance Reports](#compliance-reports)
- [Export Formats](#export-formats)
- [Advanced Features](#advanced-features)

## Core Concepts

### Enhanced Provenance Entry

Each provenance entry contains:

- **Basic Info**: ID, timestamp, adapter, formats
- **Environment**: OS, runtime version, platform
- **User Attribution**: User ID and name
- **Performance Metrics**: Duration, memory usage, I/O sizes
- **AI Metadata**: Model, cost, tokens (for AI adapters)
- **Data Hashes**: Schema and data integrity hashes
- **Transformations**: Chain of operations
- **Signature**: Cryptographic proof (optional)

## Creating Provenance

### Basic Provenance

```javascript
import { createEnhancedProvenance, registerProvenance } from 'zod-to-from/core/provenance';

const provenance = createEnhancedProvenance({
  adapter: 'json',
  sourceFormat: 'json',
  targetFormat: 'yaml',
  performance: {
    duration: 150,
    memory: 2048,
    inputSize: 1000,
    outputSize: 1200,
  },
});

const provenanceId = registerProvenance(provenance);
```

### With User Attribution

```javascript
const provenance = createEnhancedProvenance({
  adapter: 'csv',
  user: {
    id: 'user123',
    name: 'John Doe',
  },
  performance: {
    duration: 200,
  },
});
```

### With AI Tracking

```javascript
const provenance = createEnhancedProvenance({
  adapter: 'docx-ai',
  ai: {
    model: 'gpt-4',
    promptHash: hashData('Extract structured data'),
    cost: 0.05,
    tokens: 1500,
  },
});
```

### Automatic Tracking

```javascript
import { trackOperation } from 'zod-to-from/core/provenance';

const { result, provenance } = await trackOperation(
  async () => {
    // Your conversion operation
    return await parseFrom(schema, 'json', input);
  },
  {
    adapter: 'json',
    sourceFormat: 'json',
    user: { id: 'user123' },
  }
);

// Provenance is automatically created with performance metrics
console.log(`Operation took ${provenance.performance.duration}ms`);
```

## Querying Provenance

### Basic Queries

```javascript
import { query } from 'zod-to-from/core/provenance-query';

// Find all JSON adapter operations
const jsonOps = query()
  .where('adapter', 'json')
  .toArray();

// Find operations by user
const userOps = query()
  .user('user123')
  .toArray();

// Filter by AI model
const gpt4Ops = query()
  .aiModel('gpt-4')
  .toArray();
```

### Date Range Queries

```javascript
// Operations from last 7 days
const recent = query()
  .after(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
  .toArray();

// Operations in specific date range
const rangeOps = query()
  .between('2024-01-01', '2024-01-31')
  .toArray();
```

### Performance Queries

```javascript
// Slow operations (> 1 second)
const slowOps = query()
  .performance({ minDuration: 1000 })
  .toArray();

// Operations within duration range
const mediumOps = query()
  .performance({
    minDuration: 100,
    maxDuration: 500
  })
  .toArray();

// Memory-intensive operations
const heavyOps = query()
  .performance({
    minMemory: 10 * 1024 * 1024 // 10MB
  })
  .toArray();
```

### Sorting and Pagination

```javascript
// Sort by duration (descending)
const sorted = query()
  .sort('performance.duration', 'desc')
  .toArray();

// Pagination
const page2 = query()
  .limit(20)
  .offset(20)
  .toArray();

// Get first result
const latest = query()
  .sort('timestamp', 'desc')
  .first();
```

### Complex Queries

```javascript
// AI operations by a specific user in the last month
const report = query()
  .user('user123')
  .after(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
  .aiModel('gpt-4')
  .performance({ minDuration: 100 })
  .sort('performance.duration', 'desc')
  .toArray();
```

## Aggregations

### Count Operations

```javascript
import { agg } from 'zod-to-from/core/provenance-query';

// Count by adapter
const byAdapter = query()
  .groupBy('adapter')
  .aggregate({ count: agg.count() })
  .toArray();

// Result: { json: { count: 42 }, yaml: { count: 15 }, ... }
```

### Sum and Average

```javascript
// Total AI cost by model
const costByModel = query()
  .groupBy('ai.model')
  .aggregate({
    totalCost: agg.sum('ai.cost'),
    avgCost: agg.avg('ai.cost'),
    totalTokens: agg.sum('ai.tokens'),
  })
  .toArray();

// Result:
// {
//   'gpt-4': { totalCost: 2.50, avgCost: 0.05, totalTokens: 50000 },
//   'gpt-3.5': { totalCost: 0.80, avgCost: 0.02, totalTokens: 40000 }
// }
```

### Min and Max

```javascript
// Performance stats by adapter
const perfStats = query()
  .groupBy('adapter')
  .aggregate({
    count: agg.count(),
    minDuration: agg.min('performance.duration'),
    maxDuration: agg.max('performance.duration'),
    avgDuration: agg.avg('performance.duration'),
  })
  .toArray();
```

### Unique Values

```javascript
// Get all unique users
const users = query()
  .aggregate({
    uniqueUsers: agg.unique('user.id'),
  })
  .toArray();
```

## Compliance Reports

### GDPR Compliance

```javascript
import { generateComplianceReport } from 'zod-to-from/core/provenance-query';

const gdprReport = await generateComplianceReport({
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  standard: 'GDPR',
});

console.log(gdprReport);
// {
//   standard: 'GDPR',
//   period: { start: '2024-01-01', end: '2024-12-31' },
//   totalOperations: 1523,
//   adapters: { json: 800, csv: 500, ... },
//   users: { user123: 450, user456: 380, ... },
//   dataProcessing: {
//     totalRecords: 1523,
//     aiProcessed: 234,
//     signedEntries: 1523,
//     failedOperations: 12
//   },
//   compliance: {
//     dataMinimization: true,
//     purposeLimitation: true,
//     accuracyMaintained: true,
//     storageWithAuditTrail: true
//   }
// }
```

### HIPAA Compliance

```javascript
const hipaaReport = await generateComplianceReport({
  standard: 'HIPAA',
  startDate: '2024-Q1',
});

// Includes:
// - auditControls
// - integrityControls
// - transmissionSecurity
// - accessControls
```

### SOC2 Compliance

```javascript
const soc2Report = await generateComplianceReport({
  standard: 'SOC2',
});

// Includes:
// - logicalAndPhysicalAccess
// - systemOperations
// - changeManagement
// - riskMitigation
```

## Export Formats

### JSON-LD (Linked Data)

```javascript
import { exportProvenance } from 'zod-to-from/core/provenance-export';

const jsonld = await exportProvenance(provenance, 'jsonld');

// Or query and export
const operations = query()
  .where('adapter', 'json')
  .toArray();

const linkedData = await exportProvenance(operations, 'jsonld');
```

### Turtle RDF

```javascript
const turtle = await exportProvenance(provenance, 'turtle');

// Example output:
// @prefix prov: <http://www.w3.org/ns/prov#> .
// @prefix ztf: <http://zod-to-from.org/provenance#> .
//
// ztf:activity/prov-123 a prov:Activity ;
//   prov:startedAtTime "2024-01-15T10:30:00Z"^^xsd:dateTime ;
//   ztf:adapter "json" ;
//   ztf:duration "150"^^xsd:integer .
```

### W3C PROV-JSON

```javascript
const provJson = await exportProvenance(provenance, 'prov-json');

// Standard W3C PROV format
// {
//   "prefix": { ... },
//   "entity": { ... },
//   "activity": { ... },
//   "agent": { ... },
//   "wasGeneratedBy": { ... }
// }
```

### W3C PROV-N Notation

```javascript
const provN = await exportProvenance(provenance, 'prov-n');

// Human-readable PROV notation
// document
//   prefix prov <http://www.w3.org/ns/prov#>
//   activity(ztf:activity/123, 2024-01-15T10:30:00Z, -)
//   entity(ztf:entity/123, [ztf:dataHash="abc123"])
//   wasGeneratedBy(ztf:entity/123, ztf:activity/123, 2024-01-15T10:30:00Z)
// endDocument
```

## Advanced Features

### Cryptographic Signatures

Enable signatures for tamper-proof audit trails:

```javascript
import { configureProvenance } from 'zod-to-from/core/provenance';

configureProvenance({
  enableSignatures: true,
  signatureAlgorithm: 'sha256',
});

const provenance = createEnhancedProvenance({
  adapter: 'json',
  dataHash: hashData(data),
});

// Provenance now includes cryptographic signature
console.log(provenance.signature);
```

### Verify Signatures

```javascript
import { verifySignature } from 'zod-to-from/core/provenance';

const isValid = verifySignature(provenance);
if (!isValid) {
  console.error('Provenance has been tampered with!');
}
```

### Data Lineage Graphs

```javascript
import { createLineageGraph } from 'zod-to-from/core/provenance';

const graph = createLineageGraph(provenanceId);

// {
//   root: 'prov-123',
//   nodes: [{ id: 'prov-123', ... }],
//   edges: [
//     { from: 'parse', to: 'validate', type: 'transformation' },
//     { from: 'validate', to: 'transform', type: 'transformation' },
//     { from: 'transform', to: 'format', type: 'transformation' }
//   ]
// }
```

### Visualization Data

```javascript
import { generateVisualizationData } from 'zod-to-from/core/provenance-query';

// Timeline chart
const timeline = generateVisualizationData('timeline');
// { labels: ['2024-01-01', '2024-01-02', ...], data: [10, 15, ...] }

// Adapter distribution
const adapters = generateVisualizationData('adapter');
// { labels: ['json', 'yaml', 'csv'], data: [42, 25, 18] }

// Performance metrics
const perf = generateVisualizationData('performance');
// { min: 50, max: 500, avg: 150, data: [50, 100, 150, ...] }
```

### Statistics

```javascript
import { getProvenanceStats } from 'zod-to-from/core/provenance';

const stats = getProvenanceStats();

// {
//   totalEntries: 1523,
//   adapters: { json: 800, csv: 500, ... },
//   formats: { json: 1200, yaml: 800, ... },
//   aiModels: { 'gpt-4': 150, 'gpt-3.5': 84 },
//   avgDuration: 165,
//   totalCost: 12.50,
//   totalTokens: 250000
// }
```

## Best Practices

### 1. Enable Signatures for Compliance

For regulated industries (healthcare, finance):

```javascript
configureProvenance({
  enableSignatures: true,
  trackPerformance: true,
  trackEnvironment: true,
});
```

### 2. Track User Attribution

Always include user information for audit trails:

```javascript
const provenance = createEnhancedProvenance({
  adapter: 'json',
  user: {
    id: getCurrentUserId(),
    name: getCurrentUserName(),
  },
});
```

### 3. Monitor AI Costs

Track AI adapter usage and costs:

```javascript
const aiReport = query()
  .aiModel('gpt-4')
  .after(startOfMonth)
  .aggregate({
    totalCost: agg.sum('ai.cost'),
    totalTokens: agg.sum('ai.tokens'),
    operations: agg.count(),
  })
  .toArray();

console.log(`Monthly AI cost: $${aiReport.totalCost}`);
```

### 4. Performance Monitoring

Identify performance bottlenecks:

```javascript
const slowOps = query()
  .performance({ minDuration: 1000 })
  .sort('performance.duration', 'desc')
  .limit(10)
  .toArray();

// Investigate the slowest operations
```

### 5. Regular Compliance Audits

Generate periodic compliance reports:

```javascript
// Monthly compliance check
const monthlyReport = await generateComplianceReport({
  startDate: startOfMonth,
  endDate: endOfMonth,
  standard: 'GDPR',
});

// Export for external audit
const auditTrail = await exportProvenance(
  query().between(startOfMonth, endOfMonth).toArray(),
  'turtle'
);
```

## API Reference

### Core Functions

- `createEnhancedProvenance(operation)` - Create provenance entry
- `registerProvenance(provenance)` - Register in global registry
- `getProvenance(id)` - Retrieve by ID
- `getAllProvenance()` - Get all entries
- `clearProvenanceRegistry()` - Clear registry
- `trackOperation(fn, context)` - Auto-track operation

### Query Functions

- `query()` - Create query builder
- `where(field, value)` - Filter by field
- `user(userId)` - Filter by user
- `aiModel(model)` - Filter by AI model
- `performance(criteria)` - Filter by performance
- `after(date)` / `before(date)` / `between(start, end)` - Date filters
- `sort(field, order)` - Sort results
- `limit(n)` / `offset(n)` - Pagination
- `groupBy(field)` - Group results
- `aggregate(functions)` - Apply aggregations

### Aggregation Functions

- `agg.count()` - Count entries
- `agg.sum(field)` - Sum values
- `agg.avg(field)` - Average values
- `agg.min(field)` / `agg.max(field)` - Min/max values
- `agg.unique(field)` - Unique values

### Export Functions

- `exportProvenance(provenance, format)` - Export to format
- `exportToJSONLD(provenance)` - JSON-LD export
- `exportToTurtle(provenance)` - Turtle RDF export
- `exportToProvJSON(provenance)` - W3C PROV-JSON export
- `exportToProvN(provenance)` - W3C PROV-N export

### Compliance Functions

- `generateComplianceReport(options)` - Generate compliance report
- `generateVisualizationData(type)` - Generate chart data

## Examples

### Example 1: Cost Tracking

```javascript
// Track monthly AI adapter costs
async function getMonthlyAICost(month, year) {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  const report = query()
    .between(startDate, endDate)
    .groupBy('ai.model')
    .aggregate({
      totalCost: agg.sum('ai.cost'),
      totalTokens: agg.sum('ai.tokens'),
      operations: agg.count(),
      avgCost: agg.avg('ai.cost'),
    })
    .toArray();

  return report;
}
```

### Example 2: User Activity Report

```javascript
// Generate user activity report
async function getUserActivityReport(userId) {
  const operations = query()
    .user(userId)
    .after(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    .sort('timestamp', 'desc')
    .toArray();

  const stats = query()
    .user(userId)
    .aggregate({
      totalOps: agg.count(),
      avgDuration: agg.avg('performance.duration'),
      formats: agg.unique('adapter'),
    })
    .toArray();

  return { operations, stats };
}
```

### Example 3: Performance Dashboard

```javascript
// Generate performance dashboard data
function getPerformanceDashboard() {
  return {
    timeline: generateVisualizationData('timeline'),
    adapters: generateVisualizationData('adapter'),
    performance: generateVisualizationData('performance'),
    stats: getProvenanceStats(),
  };
}
```

## Troubleshooting

### Query returns empty results

Check filters are correct and provenance is registered:

```javascript
// Debug query
const all = getAllProvenance();
console.log(`Total entries: ${all.length}`);

const filtered = query().where('adapter', 'json').toArray();
console.log(`Filtered: ${filtered.length}`);
```

### Export fails

Ensure dependencies are installed:

```bash
npm install jsonld n3
```

### Signatures don't verify

Ensure signatures are enabled before creating provenance:

```javascript
configureProvenance({ enableSignatures: true });
const prov = createEnhancedProvenance({ ... });
```

## See Also

- [Main Documentation](../README.md)
- [API Reference](../api/README.md)
- [Adapters Guide](../adapters/README.md)
