# Transformation Pipelines

> **zod-to-from v2 Feature**: Chain multiple conversions with validation at each step

## Overview

The Pipeline API enables you to build complex, multi-step data transformation workflows with automatic validation, error handling, and provenance tracking. Each step in the pipeline can validate data against Zod schemas, ensuring data integrity throughout the entire transformation chain.

## Table of Contents

- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Basic Usage](#basic-usage)
- [Pipeline Steps](#pipeline-steps)
- [Advanced Features](#advanced-features)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Examples](#examples)

## Quick Start

```javascript
import { createPipeline } from 'zod-to-from';
import { z } from 'zod';

// Define schemas for each stage
const RawDataSchema = z.object({
  id: z.number(),
  name: z.string(),
});

const EnrichedSchema = z.object({
  id: z.number(),
  name: z.string(),
  timestamp: z.string(),
});

// Create and execute pipeline
const pipeline = createPipeline()
  .from('csv')
  .validate(RawDataSchema)
  .transform(data => ({
    ...data,
    timestamp: new Date().toISOString()
  }))
  .validate(EnrichedSchema)
  .to('json');

const result = await pipeline.execute(csvData);
```

## Core Concepts

### Pipeline Builder Pattern

Pipelines use a fluent, chainable API that makes it easy to build complex transformations:

```javascript
createPipeline()
  .from('csv')           // Parse from CSV
  .validate(Schema1)     // Validate input
  .transform(fn1)        // Transform data
  .validate(Schema2)     // Validate output
  .to('json');           // Format to JSON
```

### Step-by-Step Validation

Unlike simple conversions, pipelines validate data after each transformation:

```javascript
const pipeline = createPipeline()
  .from('json')
  .validate(InputSchema)      // ✓ Validates parsed JSON
  .transform(enrichData)
  .validate(EnrichedSchema)   // ✓ Validates enriched data
  .transform(normalize)
  .validate(FinalSchema)      // ✓ Validates final data
  .to('yaml');
```

### Provenance Tracking

Pipelines automatically track execution metadata:

```javascript
const result = await pipeline.execute(data, { includeProvenance: true });

console.log(result.provenance);
// {
//   pipelineId: "pipeline-1234567890-abc",
//   pipelineSteps: [
//     "0: parse from json",
//     "1: validate schema",
//     "2: transform enrichData",
//     ...
//   ],
//   totalDuration: 145,
//   startTime: "2025-01-15T10:30:00.000Z",
//   endTime: "2025-01-15T10:30:00.145Z",
//   steps: [...]
// }
```

## Basic Usage

### Creating a Pipeline

```javascript
import { createPipeline } from 'zod-to-from';

const pipeline = createPipeline();
```

### Adding Steps

#### Parse from Format

```javascript
pipeline.from('csv', { delimiter: ',' });
```

#### Validate Against Schema

```javascript
import { z } from 'zod';

const UserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
});

pipeline.validate(UserSchema);
```

#### Transform Data

```javascript
pipeline.transform(data => {
  return {
    ...data,
    createdAt: new Date().toISOString()
  };
});

// Async transforms work too
pipeline.transform(async data => {
  const enriched = await fetchAdditionalData(data.id);
  return { ...data, ...enriched };
});
```

#### Format to Output

```javascript
pipeline.to('json', { spaces: 2 });
```

### Executing the Pipeline

```javascript
// Simple execution
const result = await pipeline.execute(inputData);

// With options
const result = await pipeline.execute(inputData, {
  includeProvenance: true,
  metadata: { requestId: 'req-123' }
});
```

## Pipeline Steps

### from(format, opts)

Parse input data from a specified format.

```javascript
pipeline.from('csv', {
  delimiter: ',',
  headers: true
});
```

**Parameters:**
- `format` (string): Format to parse from (e.g., 'json', 'csv', 'yaml')
- `opts` (object): Format-specific options

### validate(schema, opts)

Validate data against a Zod schema.

```javascript
pipeline.validate(UserSchema, {
  // Custom validation options
});
```

**Parameters:**
- `schema` (ZodSchema): Zod schema to validate against
- `opts` (object): Validation options

**Throws:** ZodError if validation fails

### transform(fn, opts)

Transform data using a function.

```javascript
pipeline.transform(async (data) => {
  // Your transformation logic
  return transformedData;
}, {
  name: 'enrichment'
});
```

**Parameters:**
- `fn` (Function): Transform function (can be async)
- `opts` (object): Transform options

### to(format, opts)

Format data to output format.

```javascript
pipeline.to('yaml', {
  indent: 2
});
```

**Parameters:**
- `format` (string): Output format
- `opts` (object): Format-specific options

## Advanced Features

### Conditional Branches

Execute different transformations based on conditions:

```javascript
pipeline.branch(
  data => data.type === 'premium',
  // Then branch (for premium users)
  p => p
    .transform(addPremiumFeatures)
    .validate(PremiumSchema),
  // Else branch (for regular users)
  p => p
    .transform(addBasicFeatures)
    .validate(BasicSchema)
);
```

**Parameters:**
- `condition` (Function): Predicate function
- `thenBranch` (Function): Pipeline builder for true case
- `elseBranch` (Function): Pipeline builder for false case (optional)

### Parallel Execution (Fan-out/Fan-in)

Execute multiple transformations in parallel:

```javascript
pipeline.parallel([
  p => p.transform(addMetrics),
  p => p.transform(addAuditLog),
  p => p.transform(addTimestamp)
], results => {
  // Merge results from all parallel branches
  return Object.assign({}, ...results);
});
```

**Use Cases:**
- Independent enrichments
- Multiple format exports
- Parallel validations
- Performance optimization

**Parameters:**
- `builders` (Array<Function>): Array of pipeline builder functions
- `merger` (Function): Function to merge results (defaults to array)

### Pipeline Composition

Compose multiple pipelines together:

```javascript
const preprocessPipeline = createPipeline()
  .from('csv')
  .validate(RawSchema)
  .transform(normalize);

const enrichmentPipeline = createPipeline()
  .validate(NormalizedSchema)
  .transform(enrich)
  .validate(EnrichedSchema);

const outputPipeline = createPipeline()
  .transform(format)
  .to('json');

// Compose them
const fullPipeline = createPipeline()
  .compose(preprocessPipeline)
  .compose(enrichmentPipeline)
  .compose(outputPipeline);
```

**Helper function:**

```javascript
import { composePipelines } from 'zod-to-from';

const fullPipeline = composePipelines(
  preprocessPipeline,
  enrichmentPipeline,
  outputPipeline
);
```

### Pipeline Templates

Create reusable pipeline templates:

```javascript
import { createTemplate } from 'zod-to-from';

const csvToJsonTemplate = createTemplate('csvToJson', (pipeline, config) => {
  pipeline
    .from('csv', { delimiter: config.delimiter || ',' })
    .validate(config.schema)
    .transform(config.transform || (x => x))
    .to('json', { spaces: config.spaces || 2 });
});

// Use template
const pipeline1 = csvToJsonTemplate({
  delimiter: ';',
  schema: UserSchema,
  spaces: 4
});

const pipeline2 = csvToJsonTemplate({
  delimiter: ',',
  schema: ProductSchema
});
```

### Partial Execution

Stop execution at a specific step:

```javascript
const result = await pipeline.execute(data, {
  stopAt: 3,  // Stop after step 3 (0-indexed)
  includeProvenance: true
});

console.log(result.stepsExecuted);  // 3
console.log(result.data);           // Intermediate result
```

**Use Cases:**
- Debugging
- Testing intermediate steps
- Progressive processing
- Checkpoints

### Dry Run Mode

Simulate execution without actually running:

```javascript
const result = await pipeline.execute(data, { dryRun: true });

console.log(result.provenance.pipelineSteps);
// [
//   "0: parse from csv",
//   "1: validate schema",
//   "2: transform enrichData",
//   "3: validate schema",
//   "4: format to json"
// ]

console.log(result.data);           // null
console.log(result.stepsExecuted);  // 0
```

**Use Cases:**
- Pipeline visualization
- Planning
- Cost estimation
- Documentation

### Step Callbacks

Monitor pipeline execution in real-time:

```javascript
const steps = [];

await pipeline.execute(data, {
  onStep: async (stepMetadata, stepData) => {
    console.log(`Step ${stepMetadata.stepId} completed in ${stepMetadata.duration}ms`);
    console.log('Current data:', stepData);

    steps.push({
      type: stepMetadata.type,
      duration: stepMetadata.duration,
      dataSize: JSON.stringify(stepData).length
    });
  }
});

console.log('Total steps:', steps.length);
```

### Streaming Pipelines

For large datasets:

```javascript
import { createStreamingPipeline } from 'zod-to-from';

const pipeline = createStreamingPipeline()
  .from('ndjson')
  .validate(RecordSchema)
  .transform(processRecord)
  .to('parquet');

await pipeline.execute(largeDataStream);
```

## Error Handling

### Pipeline-Level Errors

Errors include context about where the failure occurred:

```javascript
try {
  await pipeline.execute(data);
} catch (error) {
  console.error(`Pipeline failed at step ${error.stepIndex}`);
  console.error('Step type:', error.provenance.steps[error.stepIndex].type);
  console.error('Original error:', error.originalError);

  // Full provenance available
  console.log('Steps completed before error:', error.provenance.steps);
}
```

### Validation Errors

```javascript
try {
  await pipeline.execute(data);
} catch (error) {
  if (error.originalError?.name === 'ZodError') {
    console.error('Validation failed:', error.originalError.errors);
  }
}
```

### Transform Errors

```javascript
pipeline.transform(data => {
  if (!data.required_field) {
    throw new Error('Missing required field');
  }
  return transformedData;
});
```

## Best Practices

### 1. Validate After Each Transform

```javascript
// ✓ Good
pipeline
  .from('csv')
  .validate(RawSchema)
  .transform(enrich)
  .validate(EnrichedSchema)  // Validates enrichment
  .transform(normalize)
  .validate(FinalSchema);    // Validates normalization

// ✗ Bad
pipeline
  .from('csv')
  .transform(enrich)
  .transform(normalize)
  .validate(FinalSchema);    // Only validates at end
```

### 2. Use Descriptive Transform Names

```javascript
// ✓ Good
const enrichUserData = (data) => ({ ...data, enriched: true });
pipeline.transform(enrichUserData);

// ✗ Bad
pipeline.transform(data => ({ ...data, enriched: true }));
```

### 3. Keep Transforms Pure

```javascript
// ✓ Good
pipeline.transform(data => {
  return {
    ...data,
    timestamp: new Date().toISOString()
  };
});

// ✗ Bad (mutates input)
pipeline.transform(data => {
  data.timestamp = new Date().toISOString();
  return data;
});
```

### 4. Use Templates for Common Patterns

```javascript
const dataIngestionTemplate = createTemplate('ingestion', (p, config) => {
  p.from(config.format)
   .validate(config.inputSchema)
   .transform(config.cleanData)
   .validate(config.cleanSchema)
   .transform(config.enrich)
   .to('sqlite');
});
```

### 5. Enable Provenance in Production

```javascript
const result = await pipeline.execute(data, {
  includeProvenance: true,
  metadata: {
    requestId: req.id,
    userId: req.user.id,
    environment: process.env.NODE_ENV
  }
});

// Log for auditing
logger.info('Pipeline executed', {
  pipelineId: result.provenance.pipelineId,
  duration: result.provenance.totalDuration,
  steps: result.provenance.steps.length
});
```

### 6. Use Dry Run for Testing

```javascript
describe('Pipeline', () => {
  it('should have correct steps', async () => {
    const result = await pipeline.execute(null, { dryRun: true });
    expect(result.provenance.pipelineSteps).toMatchSnapshot();
  });
});
```

## Examples

### Example 1: CSV to JSON ETL

```javascript
import { createPipeline } from 'zod-to-from';
import { z } from 'zod';

const RawUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  age: z.string()
});

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  age: z.number(),
  createdAt: z.string().datetime()
});

const pipeline = createPipeline()
  .from('csv')
  .validate(RawUserSchema)
  .transform(data => ({
    id: parseInt(data.id),
    name: data.name.trim(),
    email: data.email.toLowerCase(),
    age: parseInt(data.age),
    createdAt: new Date().toISOString()
  }))
  .validate(UserSchema)
  .to('json');

const csvData = `id,name,email,age
1,John Doe,JOHN@EXAMPLE.COM,30
2,Jane Smith,jane@example.com,25`;

const result = await pipeline.execute(csvData, {
  includeProvenance: true
});

console.log(result.data);
console.log('Executed in', result.provenance.totalDuration, 'ms');
```

### Example 2: Multi-Stage Data Processing

```javascript
const RawLogSchema = z.object({
  timestamp: z.string(),
  level: z.string(),
  message: z.string()
});

const ParsedLogSchema = z.object({
  timestamp: z.date(),
  level: z.enum(['INFO', 'WARN', 'ERROR']),
  message: z.string()
});

const EnrichedLogSchema = z.object({
  timestamp: z.date(),
  level: z.enum(['INFO', 'WARN', 'ERROR']),
  message: z.string(),
  severity: z.number(),
  tags: z.array(z.string())
});

const pipeline = createPipeline()
  .from('ndjson')
  .validate(RawLogSchema)

  // Parse timestamps and normalize levels
  .transform(log => ({
    timestamp: new Date(log.timestamp),
    level: log.level.toUpperCase(),
    message: log.message
  }))
  .validate(ParsedLogSchema)

  // Enrich with metadata
  .transform(log => ({
    ...log,
    severity: log.level === 'ERROR' ? 3 : log.level === 'WARN' ? 2 : 1,
    tags: extractTags(log.message)
  }))
  .validate(EnrichedLogSchema)

  // Branch based on severity
  .branch(
    log => log.severity >= 2,
    p => p.transform(log => ({ ...log, alertSent: true })),
    p => p.transform(log => ({ ...log, alertSent: false }))
  )

  .to('json');

const logs = `{"timestamp":"2025-01-15T10:00:00Z","level":"info","message":"User logged in"}
{"timestamp":"2025-01-15T10:01:00Z","level":"error","message":"Database connection failed"}`;

const result = await pipeline.execute(logs);
```

### Example 3: Parallel Data Enrichment

```javascript
const pipeline = createPipeline()
  .from('json')
  .validate(UserInputSchema)

  // Fan out to parallel enrichments
  .parallel([
    // Get user preferences
    p => p.transform(async data => {
      const prefs = await fetchUserPreferences(data.userId);
      return { ...data, preferences: prefs };
    }),

    // Get user activity
    p => p.transform(async data => {
      const activity = await fetchUserActivity(data.userId);
      return { ...data, activity: activity };
    }),

    // Get user metadata
    p => p.transform(async data => {
      const metadata = await fetchUserMetadata(data.userId);
      return { ...data, metadata: metadata };
    })
  ], results => {
    // Merge all parallel results
    return Object.assign({}, ...results);
  })

  .validate(EnrichedUserSchema)
  .to('json');
```

### Example 4: Pipeline Template for API Processing

```javascript
import { createTemplate } from 'zod-to-from';

const apiResponseTemplate = createTemplate('apiResponse', (pipeline, config) => {
  pipeline
    .from('json')
    .validate(config.inputSchema)

    // Standard API response transformation
    .transform(data => ({
      success: true,
      data: data,
      timestamp: new Date().toISOString(),
      version: config.apiVersion
    }))

    // Optional filtering
    .transform(response => {
      if (config.filter) {
        return {
          ...response,
          data: config.filter(response.data)
        };
      }
      return response;
    })

    .validate(config.outputSchema)
    .to(config.outputFormat || 'json');
});

// Use template for different endpoints
const userEndpoint = apiResponseTemplate({
  inputSchema: UserSchema,
  outputSchema: ApiResponseSchema,
  apiVersion: 'v2',
  filter: user => ({ id: user.id, name: user.name })
});

const productEndpoint = apiResponseTemplate({
  inputSchema: ProductSchema,
  outputSchema: ApiResponseSchema,
  apiVersion: 'v2'
});
```

### Example 5: Error Recovery Pipeline

```javascript
const pipeline = createPipeline()
  .from('csv')
  .validate(InputSchema)

  .transform(data => {
    try {
      return processData(data);
    } catch (error) {
      // Return data with error marker instead of throwing
      return {
        ...data,
        processingError: error.message,
        processed: false
      };
    }
  })

  // Branch on success/failure
  .branch(
    data => !data.processingError,
    // Success path
    p => p
      .validate(ProcessedSchema)
      .transform(finalProcessing)
      .to('json'),
    // Error path
    p => p
      .transform(data => ({
        error: data.processingError,
        originalData: data
      }))
      .to('json')
  );
```

### Example 6: Pipeline Composition for Microservices

```javascript
// Service 1: Data ingestion
const ingestionPipeline = createPipeline()
  .from('csv')
  .validate(RawDataSchema)
  .transform(cleanData)
  .validate(CleanDataSchema);

// Service 2: Business logic
const businessLogicPipeline = createPipeline()
  .transform(applyBusinessRules)
  .validate(BusinessDataSchema)
  .transform(calculateMetrics)
  .validate(MetricsSchema);

// Service 3: Output formatting
const outputPipeline = createPipeline()
  .transform(formatForApi)
  .validate(ApiSchema)
  .to('json');

// Compose full pipeline
const fullPipeline = composePipelines(
  ingestionPipeline,
  businessLogicPipeline,
  outputPipeline
);

const result = await fullPipeline.execute(csvData, {
  includeProvenance: true,
  metadata: { service: 'data-processor' }
});
```

## API Reference

### Functions

#### `createPipeline(config?): Pipeline`

Create a new pipeline builder.

#### `createTemplate(name, builder): Function`

Create a reusable pipeline template.

#### `composePipelines(...pipelines): Pipeline`

Compose multiple pipelines into one.

#### `createStreamingPipeline(config?): Pipeline`

Create a streaming pipeline for large datasets.

### Pipeline Methods

- `from(format, opts?)`: Parse from format
- `validate(schema, opts?)`: Validate with schema
- `transform(fn, opts?)`: Transform data
- `branch(condition, thenBranch, elseBranch?)`: Conditional branching
- `parallel(builders, merger?)`: Parallel execution
- `compose(pipeline)`: Compose another pipeline
- `to(format, opts?)`: Format to output
- `execute(input, opts?)`: Execute pipeline
- `clone()`: Clone pipeline
- `summary()`: Get pipeline summary

### Execution Options

```typescript
interface PipelineOptions {
  includeProvenance?: boolean;    // Include provenance metadata
  dryRun?: boolean;               // Simulate without execution
  stopAt?: number;                // Stop at step N
  streaming?: boolean;            // Enable streaming
  metadata?: Object;              // Custom metadata
  onStep?: Function;              // Step callback
}
```

## Performance Considerations

1. **Parallel Execution**: Use `parallel()` for independent operations
2. **Streaming**: Use `createStreamingPipeline()` for large datasets
3. **Validation**: Validate only when necessary, but after each transform
4. **Transform Purity**: Keep transforms pure for better performance
5. **Provenance**: Only enable in production when needed for auditing

## Conclusion

The Pipeline API provides a powerful, flexible way to build complex data transformation workflows with built-in validation, error handling, and provenance tracking. Use it to create maintainable, auditable data processing systems.

For more examples, see the [examples directory](../../examples/pipelines/) in the repository.
