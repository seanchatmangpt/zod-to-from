# Data Pipeline Cookbook

> **The 80/20 Pattern: ETL Workflows and Data Transformation**

This cookbook covers the most common data pipeline patterns - CSV processing,
data validation, format conversion, and ETL workflows. This pattern handles 80%
of data processing use cases.

## 🎯 Use Case

**Problem**: You have data in one format (CSV, JSON, etc.) and need to process,
validate, transform, and output it in another format for different systems.

**Solution**: Use ZTF to create robust ETL pipelines with schema validation,
error handling, and format conversion.

## 📋 Prerequisites

- Understanding of ETL concepts
- ZTF installed and configured
- Zod schemas for data validation
- Basic knowledge of data formats

## 🍳 Recipe

### Step 1: Define Your Data Schema

```javascript
import { z } from 'zod';

const UserSchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().min(0).max(120),
  department: z.string(),
  salary: z.number().min(0).optional(),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isActive: z.boolean(),
});

const ProductSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  category: z.string(),
  price: z.number().min(0),
  stock: z.number().min(0),
  description: z.string().optional(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const SalesSchema = z.object({
  id: z.string(),
  userId: z.number(),
  productId: z.string(),
  quantity: z.number().min(1),
  price: z.number().min(0),
  total: z.number().min(0),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['pending', 'completed', 'cancelled']),
});
```

### Step 2: Basic ETL Pipeline

```javascript
import { parseFrom, formatTo } from 'zod-to-from';
import fs from 'fs';

async function processUserData(
  inputFile,
  outputFile,
  inputFormat,
  outputFormat
) {
  try {
    // Extract: Read and parse input data
    const inputData = fs.readFileSync(inputFile, 'utf8');
    const users = await parseFrom(UserSchema, inputFormat, inputData);

    // Transform: Process and validate data
    const processedUsers = users.map(user => ({
      ...user,
      // Add computed fields
      fullName: user.name,
      emailDomain: user.email.split('@')[1],
      // Normalize data
      department: user.department.toLowerCase().trim(),
      // Validate and clean
      age: Math.max(0, Math.min(120, user.age)),
    }));

    // Load: Output processed data
    const outputData = await formatTo(UserSchema, outputFormat, processedUsers);
    fs.writeFileSync(outputFile, outputData);

    return {
      success: true,
      processed: processedUsers.length,
      output: outputFile,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      processed: 0,
    };
  }
}

// Usage
const result = await processUserData(
  'input/users.csv',
  'output/users.json',
  'csv',
  'json'
);
```

### Step 3: Streaming Pipeline for Large Datasets

```javascript
async function processLargeDataset(
  inputFile,
  outputFile,
  schema,
  inputFormat,
  outputFormat
) {
  const inputStream = fs.createReadStream(inputFile);
  const outputStream = fs.createWriteStream(outputFile);

  let processedCount = 0;
  let errorCount = 0;
  const errors = [];

  try {
    // Process data in chunks
    const result = await parseFrom(schema, inputFormat, inputStream, {
      streaming: true,
      adapter: {
        chunkSize: 1000, // Process 1000 records at a time
      },
    });

    // Process each chunk
    for await (const chunk of result) {
      try {
        // Transform chunk
        const transformedChunk = chunk.map(record => ({
          ...record,
          processedAt: new Date().toISOString(),
        }));

        // Write chunk to output
        const chunkOutput = await formatTo(
          schema,
          outputFormat,
          transformedChunk
        );
        outputStream.write(chunkOutput + '\n');

        processedCount += chunk.length;
      } catch (error) {
        errorCount++;
        errors.push({
          chunk: processedCount,
          error: error.message,
        });
      }
    }

    outputStream.end();

    return {
      success: true,
      processed: processedCount,
      errors: errorCount,
      errorDetails: errors,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      processed: processedCount,
      errors: errorCount,
    };
  }
}
```

### Step 4: Multi-Step Data Pipeline

```javascript
async function multiStepPipeline() {
  const pipeline = [
    {
      name: 'Extract Users',
      input: 'data/raw/users.csv',
      output: 'data/processed/users.json',
      schema: UserSchema,
      transform: users => users.filter(user => user.isActive),
    },
    {
      name: 'Extract Products',
      input: 'data/raw/products.csv',
      output: 'data/processed/products.json',
      schema: ProductSchema,
      transform: products => products.filter(product => product.stock > 0),
    },
    {
      name: 'Extract Sales',
      input: 'data/raw/sales.csv',
      output: 'data/processed/sales.json',
      schema: SalesSchema,
      transform: sales => sales.filter(sale => sale.status === 'completed'),
    },
  ];

  const results = [];

  for (const step of pipeline) {
    try {
      console.log(`Processing step: ${step.name}`);

      // Extract
      const inputData = fs.readFileSync(step.input, 'utf8');
      const rawData = await parseFrom(step.schema, 'csv', inputData);

      // Transform
      const transformedData = step.transform(rawData);

      // Load
      const outputData = await formatTo(step.schema, 'json', transformedData);
      fs.writeFileSync(step.output, outputData);

      results.push({
        step: step.name,
        success: true,
        input: rawData.length,
        output: transformedData.length,
        filtered: rawData.length - transformedData.length,
      });
    } catch (error) {
      results.push({
        step: step.name,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}
```

## 🔧 Variations

### Variation 1: Data Validation and Cleaning

```javascript
async function validateAndCleanData(inputFile, outputFile, schema) {
  const inputData = fs.readFileSync(inputFile, 'utf8');
  const rawData = await parseFrom(schema, 'csv', inputData);

  const validationResults = {
    valid: [],
    invalid: [],
    cleaned: [],
  };

  for (const record of rawData) {
    try {
      // Validate record
      const validatedRecord = schema.parse(record);
      validationResults.valid.push(validatedRecord);
    } catch (error) {
      if (error.name === 'ZodError') {
        // Try to clean the record
        const cleanedRecord = cleanRecord(record, error.issues);
        if (cleanedRecord) {
          validationResults.cleaned.push(cleanedRecord);
        } else {
          validationResults.invalid.push({
            record,
            errors: error.issues,
          });
        }
      }
    }
  }

  // Output cleaned data
  const allValidData = [
    ...validationResults.valid,
    ...validationResults.cleaned,
  ];
  const outputData = await formatTo(schema, 'json', allValidData);
  fs.writeFileSync(outputFile, outputData);

  // Output validation report
  const report = {
    total: rawData.length,
    valid: validationResults.valid.length,
    cleaned: validationResults.cleaned.length,
    invalid: validationResults.invalid.length,
    invalidRecords: validationResults.invalid,
  };

  fs.writeFileSync('validation-report.json', JSON.stringify(report, null, 2));

  return report;
}

function cleanRecord(record, issues) {
  const cleaned = { ...record };

  for (const issue of issues) {
    switch (issue.code) {
      case 'invalid_type':
        if (issue.expected === 'string' && typeof issue.received === 'number') {
          cleaned[issue.path[0]] = issue.received.toString();
        }
        break;
      case 'too_small':
        if (issue.type === 'string') {
          cleaned[issue.path[0]] = issue.received || 'Unknown';
        }
        break;
      case 'invalid_string':
        if (issue.validation === 'email') {
          // Try to fix common email issues
          const email = issue.received;
          if (email && !email.includes('@')) {
            cleaned[issue.path[0]] = `${email}@example.com`;
          }
        }
        break;
    }
  }

  return cleaned;
}
```

### Variation 2: Data Aggregation and Analysis

```javascript
async function aggregateSalesData(salesFile, usersFile, productsFile) {
  // Load all data
  const salesData = await parseFrom(
    SalesSchema,
    'csv',
    fs.readFileSync(salesFile, 'utf8')
  );
  const usersData = await parseFrom(
    UserSchema,
    'json',
    fs.readFileSync(usersFile, 'utf8')
  );
  const productsData = await parseFrom(
    ProductSchema,
    'json',
    fs.readFileSync(productsFile, 'utf8')
  );

  // Create lookup maps
  const usersMap = new Map(usersData.map(user => [user.id, user]));
  const productsMap = new Map(
    productsData.map(product => [product.id, product])
  );

  // Aggregate sales data
  const aggregations = {
    totalSales: salesData.reduce((sum, sale) => sum + sale.total, 0),
    totalQuantity: salesData.reduce((sum, sale) => sum + sale.quantity, 0),
    averageOrderValue: 0,
    salesByUser: new Map(),
    salesByProduct: new Map(),
    salesByDate: new Map(),
    salesByDepartment: new Map(),
  };

  // Calculate aggregations
  for (const sale of salesData) {
    const user = usersMap.get(sale.userId);
    const product = productsMap.get(sale.productId);

    // Sales by user
    const userSales = aggregations.salesByUser.get(sale.userId) || {
      total: 0,
      count: 0,
    };
    userSales.total += sale.total;
    userSales.count += 1;
    aggregations.salesByUser.set(sale.userId, userSales);

    // Sales by product
    const productSales = aggregations.salesByProduct.get(sale.productId) || {
      total: 0,
      count: 0,
    };
    productSales.total += sale.total;
    productSales.count += 1;
    aggregations.salesByProduct.set(sale.productId, productSales);

    // Sales by date
    const dateSales = aggregations.salesByDate.get(sale.date) || {
      total: 0,
      count: 0,
    };
    dateSales.total += sale.total;
    dateSales.count += 1;
    aggregations.salesByDate.set(sale.date, dateSales);

    // Sales by department
    if (user) {
      const deptSales = aggregations.salesByDepartment.get(user.department) || {
        total: 0,
        count: 0,
      };
      deptSales.total += sale.total;
      deptSales.count += 1;
      aggregations.salesByDepartment.set(user.department, deptSales);
    }
  }

  // Calculate average order value
  aggregations.averageOrderValue = aggregations.totalSales / salesData.length;

  // Convert maps to objects for JSON output
  const report = {
    summary: {
      totalSales: aggregations.totalSales,
      totalQuantity: aggregations.totalQuantity,
      averageOrderValue: aggregations.averageOrderValue,
      totalOrders: salesData.length,
    },
    salesByUser: Object.fromEntries(aggregations.salesByUser),
    salesByProduct: Object.fromEntries(aggregations.salesByProduct),
    salesByDate: Object.fromEntries(aggregations.salesByDate),
    salesByDepartment: Object.fromEntries(aggregations.salesByDepartment),
  };

  // Output aggregated data
  const outputData = await formatTo(z.any(), 'json', report);
  fs.writeFileSync('sales-aggregation.json', outputData);

  return report;
}
```

### Variation 3: Data Enrichment Pipeline

```javascript
async function enrichUserData(usersFile, enrichmentFile, outputFile) {
  // Load base user data
  const users = await parseFrom(
    UserSchema,
    'csv',
    fs.readFileSync(usersFile, 'utf8')
  );

  // Load enrichment data (e.g., from external API or database)
  const enrichmentData = await parseFrom(
    z.any(),
    'json',
    fs.readFileSync(enrichmentFile, 'utf8')
  );

  // Create enrichment lookup
  const enrichmentMap = new Map(enrichmentData.map(item => [item.email, item]));

  // Enrich user data
  const enrichedUsers = users.map(user => {
    const enrichment = enrichmentMap.get(user.email);

    return {
      ...user,
      // Add enrichment data
      profile: enrichment?.profile || {},
      preferences: enrichment?.preferences || {},
      lastLogin: enrichment?.lastLogin || null,
      accountStatus: enrichment?.accountStatus || 'active',
      // Add computed fields
      fullName: user.name,
      emailDomain: user.email.split('@')[1],
      // Add metadata
      enrichedAt: new Date().toISOString(),
      enrichmentSource: enrichment ? 'external' : 'default',
    };
  });

  // Output enriched data
  const outputData = await formatTo(z.any(), 'json', enrichedUsers);
  fs.writeFileSync(outputFile, outputData);

  return {
    total: users.length,
    enriched: enrichedUsers.filter(u => u.enrichmentSource === 'external')
      .length,
    default: enrichedUsers.filter(u => u.enrichmentSource === 'default').length,
  };
}
```

## ⚠️ Common Pitfalls

### 1. Memory Issues with Large Datasets

```javascript
// ❌ Wrong - loading entire dataset into memory
const allData = fs.readFileSync('large-file.csv', 'utf8');
const parsed = await parseFrom(Schema, 'csv', allData);

// ✅ Correct - using streaming
const stream = fs.createReadStream('large-file.csv');
const result = await parseFrom(Schema, 'csv', stream, { streaming: true });
```

### 2. Missing Error Handling

```javascript
// ❌ Wrong - no error handling
const data = await parseFrom(Schema, 'csv', input);

// ✅ Correct - proper error handling
try {
  const data = await parseFrom(Schema, 'csv', input);
} catch (error) {
  if (error.name === 'ZodError') {
    console.log('Validation errors:', error.issues);
  } else {
    console.log('Parsing error:', error.message);
  }
}
```

### 3. Schema Mismatch

```javascript
// ❌ Wrong - schema doesn't match data
const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
});
// But CSV has: id,name,email,age

// ✅ Correct - schema matches data structure
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  age: z.number(),
});
```

## 🚀 Advanced Techniques

### 1. Parallel Processing

```javascript
async function parallelDataProcessing(files) {
  const results = await Promise.all(
    files.map(async file => {
      try {
        const data = fs.readFileSync(file.path, 'utf8');
        const parsed = await parseFrom(file.schema, file.format, data);
        const transformed = file.transform ? file.transform(parsed) : parsed;
        const output = await formatTo(
          file.schema,
          file.outputFormat,
          transformed
        );

        fs.writeFileSync(file.output, output);

        return {
          file: file.path,
          success: true,
          records: transformed.length,
        };
      } catch (error) {
        return {
          file: file.path,
          success: false,
          error: error.message,
        };
      }
    })
  );

  return results;
}
```

### 2. Data Quality Monitoring

```javascript
async function monitorDataQuality(inputFile, schema) {
  const data = fs.readFileSync(inputFile, 'utf8');
  const rawData = await parseFrom(schema, 'csv', data);

  const qualityMetrics = {
    totalRecords: rawData.length,
    validRecords: 0,
    invalidRecords: 0,
    completeness: {},
    accuracy: {},
    consistency: {},
  };

  for (const record of rawData) {
    try {
      schema.parse(record);
      qualityMetrics.validRecords++;
    } catch (error) {
      qualityMetrics.invalidRecords++;
    }
  }

  // Calculate completeness
  for (const field of Object.keys(schema.shape)) {
    const nonNullCount = rawData.filter(record => record[field] != null).length;
    qualityMetrics.completeness[field] = (nonNullCount / rawData.length) * 100;
  }

  return qualityMetrics;
}
```

### 3. Incremental Processing

```javascript
async function incrementalProcessing(inputFile, outputFile, lastProcessedFile) {
  // Load last processed timestamp
  let lastProcessed = null;
  if (fs.existsSync(lastProcessedFile)) {
    const lastData = JSON.parse(fs.readFileSync(lastProcessedFile, 'utf8'));
    lastProcessed = new Date(lastData.timestamp);
  }

  // Process only new data
  const data = fs.readFileSync(inputFile, 'utf8');
  const allData = await parseFrom(SalesSchema, 'csv', data);

  const newData = lastProcessed
    ? allData.filter(record => new Date(record.date) > lastProcessed)
    : allData;

  if (newData.length > 0) {
    // Process new data
    const output = await formatTo(SalesSchema, 'json', newData);
    fs.writeFileSync(outputFile, output);

    // Update last processed timestamp
    const latestTimestamp = Math.max(
      ...newData.map(record => new Date(record.date).getTime())
    );
    fs.writeFileSync(
      lastProcessedFile,
      JSON.stringify({ timestamp: new Date(latestTimestamp) })
    );

    return {
      processed: newData.length,
      latestTimestamp: new Date(latestTimestamp),
    };
  }

  return { processed: 0, message: 'No new data to process' };
}
```

## 📊 Performance Tips

### 1. Batch Processing

```javascript
async function batchProcess(data, batchSize = 1000) {
  const batches = [];
  for (let i = 0; i < data.length; i += batchSize) {
    batches.push(data.slice(i, i + batchSize));
  }

  const results = await Promise.all(
    batches.map(async (batch, index) => {
      const output = await formatTo(Schema, 'json', batch);
      const filename = `batch-${index}.json`;
      fs.writeFileSync(filename, output);
      return { batch: index, records: batch.length, file: filename };
    })
  );

  return results;
}
```

### 2. Memory Management

```javascript
async function memoryEfficientProcessing(inputFile, outputFile) {
  const inputStream = fs.createReadStream(inputFile);
  const outputStream = fs.createWriteStream(outputFile);

  let processedCount = 0;
  const maxMemoryRecords = 10000; // Process max 10k records at once

  const result = await parseFrom(Schema, 'csv', inputStream, {
    streaming: true,
    adapter: { chunkSize: maxMemoryRecords },
  });

  for await (const chunk of result) {
    // Process chunk
    const output = await formatTo(Schema, 'json', chunk);
    outputStream.write(output + '\n');

    processedCount += chunk.length;

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  outputStream.end();
  return { processed: processedCount };
}
```

## 🧪 Testing

### Unit Tests

```javascript
import { describe, it, expect } from 'vitest';

describe('Data Pipeline', () => {
  it('should process user data correctly', async () => {
    const csvData =
      'id,name,email,age,department,hireDate,isActive\n1,John,john@example.com,30,Engineering,2023-01-01,true';
    const result = await processUserData(
      'test.csv',
      'output.json',
      'csv',
      'json'
    );

    expect(result.success).toBe(true);
    expect(result.processed).toBe(1);
  });

  it('should handle validation errors', async () => {
    const invalidData = 'id,name,email,age\n1,John,invalid-email,30';

    await expect(parseFrom(UserSchema, 'csv', invalidData)).rejects.toThrow(
      'ZodError'
    );
  });

  it('should aggregate sales data correctly', async () => {
    const salesData = [
      {
        id: '1',
        userId: 1,
        productId: 'A',
        quantity: 2,
        price: 10,
        total: 20,
        date: '2023-01-01',
        status: 'completed',
      },
      {
        id: '2',
        userId: 1,
        productId: 'B',
        quantity: 1,
        price: 15,
        total: 15,
        date: '2023-01-01',
        status: 'completed',
      },
    ];

    const result = await aggregateSalesData(salesData, [], []);
    expect(result.summary.totalSales).toBe(35);
    expect(result.summary.totalOrders).toBe(2);
  });
});
```

---

**Next: [API Integration Cookbook](api-integration.md)**


