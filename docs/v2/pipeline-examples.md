# Complex Pipeline Examples

> Real-world examples demonstrating advanced pipeline features

## Table of Contents

- [Multi-Stage ETL Pipeline](#multi-stage-etl-pipeline)
- [Data Quality Pipeline](#data-quality-pipeline)
- [Multi-Format Export Pipeline](#multi-format-export-pipeline)
- [Conditional Processing Pipeline](#conditional-processing-pipeline)
- [Real-Time Data Processing](#real-time-data-processing)
- [ML Feature Engineering Pipeline](#ml-feature-engineering-pipeline)

## Multi-Stage ETL Pipeline

Extract, Transform, Load pipeline with validation at each stage:

```javascript
import { createPipeline } from 'zod-to-from';
import { z } from 'zod';

// Schema definitions for each stage
const RawLogSchema = z.object({
  timestamp: z.string(),
  level: z.string(),
  service: z.string(),
  message: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

const CleanedLogSchema = z.object({
  timestamp: z.date(),
  level: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']),
  service: z.string(),
  message: z.string(),
  metadata: z.record(z.unknown()),
});

const EnrichedLogSchema = z.object({
  timestamp: z.date(),
  level: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']),
  service: z.string(),
  message: z.string(),
  metadata: z.record(z.unknown()),
  severity: z.number().min(1).max(5),
  tags: z.array(z.string()),
  region: z.string(),
});

const AggregatedLogSchema = z.object({
  timestamp: z.date(),
  level: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']),
  service: z.string(),
  message: z.string(),
  metadata: z.record(z.unknown()),
  severity: z.number().min(1).max(5),
  tags: z.array(z.string()),
  region: z.string(),
  count: z.number(),
  firstSeen: z.date(),
  lastSeen: z.date(),
});

// Transform functions
const cleanLogs = (data) => ({
  timestamp: new Date(data.timestamp),
  level: data.level.toUpperCase(),
  service: data.service.trim(),
  message: data.message.trim(),
  metadata: data.metadata || {},
});

const enrichLogs = (data) => {
  const severityMap = {
    DEBUG: 1,
    INFO: 2,
    WARN: 3,
    ERROR: 4,
    FATAL: 5,
  };

  return {
    ...data,
    severity: severityMap[data.level] || 2,
    tags: extractTags(data.message),
    region: determineRegion(data.service),
  };
};

const aggregateLogs = (data) => ({
  ...data,
  count: 1,
  firstSeen: data.timestamp,
  lastSeen: data.timestamp,
});

function extractTags(message) {
  const tagRegex = /#(\w+)/g;
  const matches = message.match(tagRegex) || [];
  return matches.map((tag) => tag.slice(1));
}

function determineRegion(service) {
  // Determine region based on service name
  if (service.includes('-us-')) return 'US';
  if (service.includes('-eu-')) return 'EU';
  if (service.includes('-ap-')) return 'APAC';
  return 'UNKNOWN';
}

// Create the ETL pipeline
const etlPipeline = createPipeline()
  // Extract: Parse from NDJSON
  .from('ndjson')
  .validate(RawLogSchema)

  // Transform: Clean data
  .transform(cleanLogs)
  .validate(CleanedLogSchema)

  // Transform: Enrich with metadata
  .transform(enrichLogs)
  .validate(EnrichedLogSchema)

  // Transform: Aggregate
  .transform(aggregateLogs)
  .validate(AggregatedLogSchema)

  // Load: Output to JSON
  .to('json');

// Execute with monitoring
const result = await etlPipeline.execute(ndjsonLogs, {
  includeProvenance: true,
  metadata: {
    pipelineVersion: '2.0',
    environment: 'production',
  },
  onStep: (step, data) => {
    console.log(`Step ${step.stepId} completed in ${step.duration}ms`);
  },
});

console.log('ETL Pipeline completed');
console.log('Total duration:', result.provenance.totalDuration, 'ms');
console.log('Steps executed:', result.provenance.steps.length);
```

## Data Quality Pipeline

Pipeline with parallel quality checks and conditional routing:

```javascript
import { createPipeline } from 'zod-to-from';
import { z } from 'zod';

const RawDataSchema = z.object({
  id: z.string(),
  email: z.string(),
  age: z.string(),
  income: z.string(),
});

const ValidatedDataSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().min(0).max(150),
  income: z.number().nonnegative(),
});

const QualityDataSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().min(0).max(150),
  income: z.number().nonnegative(),
  qualityScore: z.number().min(0).max(100),
  dataCompleteness: z.number().min(0).max(100),
  validationPassed: z.boolean(),
  issues: z.array(z.string()),
});

// Data cleaning
const cleanData = (data) => ({
  id: data.id.trim(),
  email: data.email.toLowerCase().trim(),
  age: parseInt(data.age),
  income: parseFloat(data.income),
});

// Quality assessment
const assessQuality = (data) => {
  const issues = [];
  let qualityScore = 100;

  // Check data completeness
  const fields = Object.values(data).filter((v) => v !== null && v !== undefined);
  const dataCompleteness = (fields.length / 4) * 100;

  // Deduct points for quality issues
  if (data.age < 18) {
    issues.push('Age below minimum');
    qualityScore -= 20;
  }
  if (data.income === 0) {
    issues.push('Zero income');
    qualityScore -= 10;
  }
  if (!data.email.includes('.')) {
    issues.push('Email domain missing TLD');
    qualityScore -= 15;
  }

  return {
    ...data,
    qualityScore,
    dataCompleteness,
    validationPassed: qualityScore >= 70,
    issues,
  };
};

// Parallel enrichment
const enrichWithDemographics = async (data) => {
  const demographics = await fetchDemographics(data.id);
  return { ...data, ...demographics };
};

const enrichWithCreditScore = async (data) => {
  const creditScore = await fetchCreditScore(data.id);
  return { ...data, creditScore };
};

const enrichWithLocation = async (data) => {
  const location = await fetchLocation(data.email);
  return { ...data, location };
};

// Create quality pipeline
const qualityPipeline = createPipeline()
  .from('csv')
  .validate(RawDataSchema)

  // Clean and normalize
  .transform(cleanData)
  .validate(ValidatedDataSchema)

  // Assess quality
  .transform(assessQuality)
  .validate(QualityDataSchema)

  // Branch based on quality score
  .branch(
    (data) => data.qualityScore >= 80,
    // High quality: full enrichment
    (p) =>
      p.parallel(
        [enrichWithDemographics, enrichWithCreditScore, enrichWithLocation],
        (results) => Object.assign({}, ...results)
      ),
    // Low quality: basic enrichment only
    (p) => p.transform((data) => ({ ...data, enrichmentLevel: 'basic' }))
  )

  // Output to appropriate format
  .branch(
    (data) => data.qualityScore >= 70,
    (p) => p.to('json'), // Good data -> JSON
    (p) => p.to('csv') // Poor data -> CSV for review
  );

const result = await qualityPipeline.execute(csvData, {
  includeProvenance: true,
});
```

## Multi-Format Export Pipeline

Export data to multiple formats in parallel:

```javascript
import { createPipeline, createTemplate } from 'zod-to-from';
import { z } from 'zod';

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

// Create export template
const exportTemplate = createTemplate('export', (pipeline, config) => {
  pipeline
    .from(config.inputFormat)
    .validate(config.schema)
    .transform(config.prepareForExport || ((x) => x))
    .to(config.outputFormat);
});

// Main pipeline with parallel exports
const multiExportPipeline = createPipeline()
  .from('json')
  .validate(UserSchema)

  // Prepare data for export
  .transform((data) => ({
    ...data,
    createdAt: data.createdAt.toISOString(),
  }))

  // Export to multiple formats in parallel
  .parallel([
    // Export to JSON
    (p) => p.to('json'),

    // Export to CSV
    (p) => p.to('csv'),

    // Export to YAML
    (p) => p.to('yaml'),

    // Export to XML
    (p) =>
      p.transform((data) => ({
        user: data,
      })).to('xml'),
  ]);

const exports = await multiExportPipeline.execute(userData);

// exports is an array of [jsonData, csvData, yamlData, xmlData]
const [jsonExport, csvExport, yamlExport, xmlExport] = exports;
```

## Conditional Processing Pipeline

Complex conditional logic with nested branches:

```javascript
import { createPipeline } from 'zod-to-from';
import { z } from 'zod';

const OrderSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number(),
      price: z.number(),
    })
  ),
  total: z.number(),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered']),
});

const orderPipeline = createPipeline()
  .from('json')
  .validate(OrderSchema)

  // Calculate totals
  .transform((order) => ({
    ...order,
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: order.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  }))

  // Branch based on order value
  .branch(
    (order) => order.subtotal > 1000,
    // High-value orders
    (p) =>
      p
        .transform((order) => ({
          ...order,
          priority: 'high',
          shippingMethod: 'express',
        }))
        .branch(
          (order) => order.itemCount > 10,
          (p) => p.transform((order) => ({ ...order, bulkDiscount: 0.1 })),
          (p) => p.transform((order) => ({ ...order, bulkDiscount: 0.05 }))
        ),
    // Regular orders
    (p) =>
      p
        .transform((order) => ({
          ...order,
          priority: 'normal',
          shippingMethod: 'standard',
        }))
        .branch(
          (order) => order.status === 'pending',
          (p) => p.transform((order) => ({ ...order, needsReview: true })),
          (p) => p.transform((order) => ({ ...order, needsReview: false }))
        )
  )

  // Final processing
  .transform((order) => ({
    ...order,
    finalTotal: order.subtotal * (1 - (order.bulkDiscount || 0)),
    processedAt: new Date().toISOString(),
  }))

  .to('json');

const processedOrder = await orderPipeline.execute(orderData);
```

## Real-Time Data Processing

Streaming pipeline with backpressure handling:

```javascript
import { createStreamingPipeline } from 'zod-to-from';
import { z } from 'zod';

const EventSchema = z.object({
  eventId: z.string(),
  userId: z.string(),
  eventType: z.string(),
  timestamp: z.number(),
  data: z.record(z.unknown()),
});

const ProcessedEventSchema = z.object({
  eventId: z.string(),
  userId: z.string(),
  eventType: z.string(),
  timestamp: z.number(),
  data: z.record(z.unknown()),
  sessionId: z.string(),
  deviceType: z.string(),
  location: z.object({
    country: z.string(),
    city: z.string(),
  }),
});

// Session management
let sessions = new Map();

const enrichWithSession = (event) => {
  let sessionId = sessions.get(event.userId);
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36)}`;
    sessions.set(event.userId, sessionId);
  }
  return { ...event, sessionId };
};

// Device detection
const detectDevice = (event) => ({
  ...event,
  deviceType: event.data.userAgent?.includes('Mobile') ? 'mobile' : 'desktop',
});

// Geo enrichment
const enrichLocation = async (event) => {
  const location = await geoLookup(event.data.ip);
  return { ...event, location };
};

// Create streaming pipeline
const streamingPipeline = createStreamingPipeline()
  .from('ndjson')
  .validate(EventSchema)

  // Enrich in parallel
  .parallel(
    [enrichWithSession, detectDevice, enrichLocation],
    (results) => Object.assign({}, ...results)
  )

  .validate(ProcessedEventSchema)

  // Branch based on event type
  .branch(
    (event) => event.eventType === 'purchase',
    (p) => p.to('sqlite'), // Store purchases in database
    (p) => p.to('ndjson') // Log other events
  );

// Process stream
const stream = fs.createReadStream('events.ndjson');
const result = await streamingPipeline.execute(stream, {
  streaming: true,
  onStep: (step, data) => {
    console.log(`Processed event: ${data.eventId}`);
  },
});
```

## ML Feature Engineering Pipeline

Pipeline for machine learning feature preparation:

```javascript
import { createPipeline, composePipelines } from 'zod-to-from';
import { z } from 'zod';

// Raw data schema
const RawFeatureSchema = z.object({
  userId: z.string(),
  age: z.number(),
  income: z.number(),
  purchases: z.array(
    z.object({
      amount: z.number(),
      category: z.string(),
      timestamp: z.number(),
    })
  ),
});

// Engineered features schema
const EngineeredFeatureSchema = z.object({
  userId: z.string(),
  age: z.number(),
  income: z.number(),
  purchases: z.array(z.object({
    amount: z.number(),
    category: z.string(),
    timestamp: z.number(),
  })),
  // Derived features
  ageGroup: z.string(),
  incomeGroup: z.string(),
  totalSpent: z.number(),
  avgPurchaseAmount: z.number(),
  purchaseFrequency: z.number(),
  favoriteCategory: z.string(),
  timeSinceLastPurchase: z.number(),
  // Normalized features
  normalizedAge: z.number(),
  normalizedIncome: z.number(),
});

// Feature engineering functions
const createDemographicFeatures = (data) => ({
  ...data,
  ageGroup: data.age < 25 ? 'young' : data.age < 45 ? 'middle' : 'senior',
  incomeGroup:
    data.income < 30000 ? 'low' : data.income < 80000 ? 'medium' : 'high',
});

const createBehavioralFeatures = (data) => {
  const totalSpent = data.purchases.reduce((sum, p) => sum + p.amount, 0);
  const avgPurchaseAmount = totalSpent / data.purchases.length;
  const purchaseFrequency = data.purchases.length;

  const categoryCounts = data.purchases.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});
  const favoriteCategory = Object.entries(categoryCounts).sort(
    ([, a], [, b]) => b - a
  )[0][0];

  const lastPurchase = Math.max(...data.purchases.map((p) => p.timestamp));
  const timeSinceLastPurchase = Date.now() - lastPurchase;

  return {
    ...data,
    totalSpent,
    avgPurchaseAmount,
    purchaseFrequency,
    favoriteCategory,
    timeSinceLastPurchase,
  };
};

const normalizeFeatures = (data) => {
  // Simple min-max normalization (in practice, use dataset-wide stats)
  const normalizedAge = (data.age - 18) / (80 - 18);
  const normalizedIncome = Math.min(data.income / 200000, 1);

  return {
    ...data,
    normalizedAge,
    normalizedIncome,
  };
};

// Create feature engineering pipeline
const featurePipeline = createPipeline()
  .from('json')
  .validate(RawFeatureSchema)

  // Parallel feature engineering
  .parallel(
    [
      (p) => p.transform(createDemographicFeatures),
      (p) => p.transform(createBehavioralFeatures),
      (p) => p.transform(normalizeFeatures),
    ],
    (results) => Object.assign({}, ...results)
  )

  .validate(EngineeredFeatureSchema)

  .to('json');

// Execute with detailed provenance
const result = await featurePipeline.execute(rawUserData, {
  includeProvenance: true,
  metadata: {
    modelVersion: 'v1.2',
    featureSetVersion: 'v3',
  },
});

console.log('Features engineered:', result.data);
console.log('Pipeline provenance:', result.provenance);
```

## Conclusion

These examples demonstrate the power and flexibility of the pipeline API:

1. **Multi-Stage ETL**: Complete extract-transform-load workflows with validation
2. **Data Quality**: Parallel quality checks and conditional routing
3. **Multi-Format Export**: Fan-out pattern for simultaneous exports
4. **Conditional Processing**: Complex nested branching logic
5. **Real-Time Processing**: Streaming with session management
6. **ML Feature Engineering**: Parallel feature generation with normalization

All pipelines include:
- ✅ Schema validation at each step
- ✅ Complete provenance tracking
- ✅ Error handling with context
- ✅ Performance monitoring
- ✅ Flexible composition patterns

For more information, see the [Pipeline API Documentation](./pipelines.md).
