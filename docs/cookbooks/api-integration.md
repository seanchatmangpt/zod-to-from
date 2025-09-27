# API Integration Cookbook

> **The 80/20 Pattern: REST API Data Processing**

This cookbook covers the most common API integration patterns - processing REST
API responses, converting between formats, and handling API data workflows. This
pattern handles 80% of API integration use cases.

## 🎯 Use Case

**Problem**: You need to integrate with REST APIs, process their responses,
validate data, and convert between different formats for different systems.

**Solution**: Use ZTF to create robust API integration workflows with schema
validation, error handling, and format conversion.

## 📋 Prerequisites

- Understanding of REST APIs
- ZTF installed and configured
- Zod schemas for API response validation
- Basic knowledge of HTTP and JSON

## 🍳 Recipe

### Step 1: Define API Response Schemas

```javascript
import { z } from 'zod';

// User API response schema
const UserApiSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  username: z.string(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  address: z.object({
    street: z.string(),
    suite: z.string().optional(),
    city: z.string(),
    zipcode: z.string(),
    geo: z.object({
      lat: z.string(),
      lng: z.string(),
    }),
  }),
  company: z.object({
    name: z.string(),
    catchPhrase: z.string().optional(),
    bs: z.string().optional(),
  }),
});

// Post API response schema
const PostApiSchema = z.object({
  userId: z.number(),
  id: z.number(),
  title: z.string(),
  body: z.string(),
});

// Comment API response schema
const CommentApiSchema = z.object({
  postId: z.number(),
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  body: z.string(),
});

// API response wrapper
const ApiResponseSchema = z.object({
  data: z.any(),
  status: z.number(),
  message: z.string().optional(),
  pagination: z
    .object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    })
    .optional(),
});
```

### Step 2: Basic API Data Processing

```javascript
import { parseFrom, formatTo } from 'zod-to-from';

async function processApiResponse(apiResponse, schema, outputFormat) {
  try {
    // Parse and validate API response
    const validatedData = await parseFrom(
      schema,
      'json',
      JSON.stringify(apiResponse)
    );

    // Transform data if needed
    const transformedData = transformApiData(validatedData);

    // Convert to desired format
    const outputData = await formatTo(schema, outputFormat, transformedData);

    return {
      success: true,
      data: outputData,
      recordCount: Array.isArray(transformedData) ? transformedData.length : 1,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      recordCount: 0,
    };
  }
}

function transformApiData(data) {
  if (Array.isArray(data)) {
    return data.map(transformSingleRecord);
  }
  return transformSingleRecord(data);
}

function transformSingleRecord(record) {
  return {
    ...record,
    // Add computed fields
    fullName: record.name,
    emailDomain: record.email.split('@')[1],
    // Normalize data
    name: record.name.trim(),
    email: record.email.toLowerCase(),
    // Add metadata
    processedAt: new Date().toISOString(),
    source: 'api',
  };
}

// Usage
const apiResponse = await fetch(
  'https://jsonplaceholder.typicode.com/users'
).then(r => r.json());
const result = await processApiResponse(apiResponse, UserApiSchema, 'csv');
```

### Step 3: API Data Aggregation

```javascript
async function aggregateApiData() {
  try {
    // Fetch data from multiple APIs
    const [usersResponse, postsResponse, commentsResponse] = await Promise.all([
      fetch('https://jsonplaceholder.typicode.com/users').then(r => r.json()),
      fetch('https://jsonplaceholder.typicode.com/posts').then(r => r.json()),
      fetch('https://jsonplaceholder.typicode.com/comments').then(r =>
        r.json()
      ),
    ]);

    // Parse and validate each response
    const users = await parseFrom(
      UserApiSchema,
      'json',
      JSON.stringify(usersResponse)
    );
    const posts = await parseFrom(
      PostApiSchema,
      'json',
      JSON.stringify(postsResponse)
    );
    const comments = await parseFrom(
      CommentApiSchema,
      'json',
      JSON.stringify(commentsResponse)
    );

    // Create lookup maps
    const usersMap = new Map(users.map(user => [user.id, user]));
    const postsMap = new Map(posts.map(post => [post.id, post]));

    // Aggregate data
    const aggregatedData = {
      users: users.length,
      posts: posts.length,
      comments: comments.length,
      postsByUser: {},
      commentsByPost: {},
      userActivity: {},
    };

    // Calculate posts by user
    for (const post of posts) {
      const userId = post.userId;
      aggregatedData.postsByUser[userId] =
        (aggregatedData.postsByUser[userId] || 0) + 1;
    }

    // Calculate comments by post
    for (const comment of comments) {
      const postId = comment.postId;
      aggregatedData.commentsByPost[postId] =
        (aggregatedData.commentsByPost[postId] || 0) + 1;
    }

    // Calculate user activity
    for (const user of users) {
      const userPosts = aggregatedData.postsByUser[user.id] || 0;
      const userComments = comments.filter(c => {
        const post = postsMap.get(c.postId);
        return post && post.userId === user.id;
      }).length;

      aggregatedData.userActivity[user.id] = {
        name: user.name,
        posts: userPosts,
        comments: userComments,
        totalActivity: userPosts + userComments,
      };
    }

    // Output aggregated data
    const outputData = await formatTo(z.any(), 'json', aggregatedData);
    fs.writeFileSync('api-aggregation.json', outputData);

    return {
      success: true,
      data: aggregatedData,
      summary: {
        users: users.length,
        posts: posts.length,
        comments: comments.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}
```

### Step 4: API Data Pipeline

```javascript
async function apiDataPipeline() {
  const pipeline = [
    {
      name: 'Fetch Users',
      url: 'https://jsonplaceholder.typicode.com/users',
      schema: UserApiSchema,
      transform: users => users.filter(user => user.id <= 5), // Limit for demo
    },
    {
      name: 'Fetch Posts',
      url: 'https://jsonplaceholder.typicode.com/posts',
      schema: PostApiSchema,
      transform: posts => posts.filter(post => post.userId <= 5),
    },
    {
      name: 'Fetch Comments',
      url: 'https://jsonplaceholder.typicode.com/comments',
      schema: CommentApiSchema,
      transform: comments => comments.filter(comment => comment.postId <= 50),
    },
  ];

  const results = [];

  for (const step of pipeline) {
    try {
      console.log(`Processing step: ${step.name}`);

      // Fetch data
      const response = await fetch(step.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawData = await response.json();

      // Parse and validate
      const validatedData = await parseFrom(
        step.schema,
        'json',
        JSON.stringify(rawData)
      );

      // Transform
      const transformedData = step.transform(validatedData);

      // Output
      const outputData = await formatTo(step.schema, 'json', transformedData);
      const outputFile = `output/${step.name.toLowerCase().replace(' ', '-')}.json`;
      fs.writeFileSync(outputFile, outputData);

      results.push({
        step: step.name,
        success: true,
        input: rawData.length,
        output: transformedData.length,
        filtered: rawData.length - transformedData.length,
        outputFile,
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

### Variation 1: API Response Caching

```javascript
class ApiDataCache {
  constructor(ttl = 300000) {
    // 5 minutes default TTL
    this.cache = new Map();
    this.ttl = ttl;
  }

  async get(key, fetcher) {
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }

    // Fetch fresh data
    const data = await fetcher();

    // Cache the data
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    return data;
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

// Usage
const cache = new ApiDataCache();

async function getCachedApiData(url, schema) {
  return await cache.get(url, async () => {
    const response = await fetch(url);
    const data = await response.json();
    return await parseFrom(schema, 'json', JSON.stringify(data));
  });
}
```

### Variation 2: API Error Handling and Retry

```javascript
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

async function robustApiDataProcessing(url, schema) {
  try {
    // Fetch with retry
    const rawData = await fetchWithRetry(url);

    // Parse and validate
    const validatedData = await parseFrom(
      schema,
      'json',
      JSON.stringify(rawData)
    );

    return {
      success: true,
      data: validatedData,
      recordCount: Array.isArray(validatedData) ? validatedData.length : 1,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      recordCount: 0,
    };
  }
}
```

### Variation 3: API Data Transformation

```javascript
async function transformApiDataForSystem(apiData, targetSystem) {
  const transformations = {
    crm: users =>
      users.map(user => ({
        contactId: user.id,
        fullName: user.name,
        emailAddress: user.email,
        phoneNumber: user.phone || '',
        company: user.company.name,
        address: `${user.address.street}, ${user.address.city}`,
        source: 'api',
        importedAt: new Date().toISOString(),
      })),

    analytics: users =>
      users.map(user => ({
        userId: user.id,
        name: user.name,
        email: user.email,
        domain: user.email.split('@')[1],
        company: user.company.name,
        city: user.address.city,
        coordinates: {
          lat: parseFloat(user.address.geo.lat),
          lng: parseFloat(user.address.geo.lng),
        },
      })),

    reporting: users => {
      const summary = {
        totalUsers: users.length,
        usersByCity: {},
        usersByCompany: {},
        usersByDomain: {},
      };

      for (const user of users) {
        // Count by city
        summary.usersByCity[user.address.city] =
          (summary.usersByCity[user.address.city] || 0) + 1;

        // Count by company
        summary.usersByCompany[user.company.name] =
          (summary.usersByCompany[user.company.name] || 0) + 1;

        // Count by email domain
        const domain = user.email.split('@')[1];
        summary.usersByDomain[domain] =
          (summary.usersByDomain[domain] || 0) + 1;
      }

      return summary;
    },
  };

  const transform = transformations[targetSystem];
  if (!transform) {
    throw new Error(`Unknown target system: ${targetSystem}`);
  }

  const transformedData = transform(apiData);
  const outputData = await formatTo(z.any(), 'json', transformedData);

  return {
    success: true,
    data: outputData,
    recordCount: Array.isArray(transformedData) ? transformedData.length : 1,
  };
}
```

## ⚠️ Common Pitfalls

### 1. Missing API Response Validation

```javascript
// ❌ Wrong - no validation
const data = await fetch(url).then(r => r.json());

// ✅ Correct - validate API response
const rawData = await fetch(url).then(r => r.json());
const validatedData = await parseFrom(
  ApiSchema,
  'json',
  JSON.stringify(rawData)
);
```

### 2. No Error Handling

```javascript
// ❌ Wrong - no error handling
const response = await fetch(url);
const data = await response.json();

// ✅ Correct - proper error handling
try {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
} catch (error) {
  console.error('API request failed:', error.message);
}
```

### 3. Schema Mismatch

```javascript
// ❌ Wrong - schema doesn't match API response
const ApiSchema = z.object({
  name: z.string(),
  age: z.number(),
});
// But API returns: { id: 1, name: "John", email: "john@example.com" }

// ✅ Correct - schema matches API response
const ApiSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});
```

## 🚀 Advanced Techniques

### 1. API Rate Limiting

```javascript
class RateLimitedApiClient {
  constructor(requestsPerSecond = 10) {
    this.requestsPerSecond = requestsPerSecond;
    this.requestQueue = [];
    this.isProcessing = false;
  }

  async request(url, options = {}) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ url, options, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const { url, options, resolve, reject } = this.requestQueue.shift();

      try {
        const response = await fetch(url, options);
        const data = await response.json();
        resolve(data);
      } catch (error) {
        reject(error);
      }

      // Rate limiting delay
      await new Promise(resolve =>
        setTimeout(resolve, 1000 / this.requestsPerSecond)
      );
    }

    this.isProcessing = false;
  }
}

// Usage
const apiClient = new RateLimitedApiClient(5); // 5 requests per second

async function fetchMultipleApis(urls) {
  const results = await Promise.all(urls.map(url => apiClient.request(url)));
  return results;
}
```

### 2. API Data Streaming

```javascript
async function streamApiData(url, schema, onChunk) {
  const response = await fetch(url);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = '';
  let recordCount = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete records
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim()) {
          try {
            const record = JSON.parse(line);
            const validatedRecord = await parseFrom(
              schema,
              'json',
              JSON.stringify(record)
            );
            await onChunk(validatedRecord);
            recordCount++;
          } catch (error) {
            console.error('Error processing record:', error.message);
          }
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      const record = JSON.parse(buffer);
      const validatedRecord = await parseFrom(
        schema,
        'json',
        JSON.stringify(record)
      );
      await onChunk(validatedRecord);
      recordCount++;
    }

    return { success: true, recordCount };
  } catch (error) {
    return { success: false, error: error.message, recordCount };
  }
}
```

### 3. API Data Monitoring

```javascript
class ApiDataMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      successes: 0,
      failures: 0,
      responseTimes: [],
      dataSizes: [],
      errors: [],
    };
  }

  async monitorApiCall(apiCall) {
    const startTime = Date.now();
    this.metrics.requests++;

    try {
      const result = await apiCall();
      const responseTime = Date.now() - startTime;

      this.metrics.successes++;
      this.metrics.responseTimes.push(responseTime);

      if (result.data) {
        const dataSize = JSON.stringify(result.data).length;
        this.metrics.dataSizes.push(dataSize);
      }

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.metrics.failures++;
      this.metrics.responseTimes.push(responseTime);
      this.metrics.errors.push({
        timestamp: new Date().toISOString(),
        error: error.message,
        responseTime,
      });

      throw error;
    }
  }

  getMetrics() {
    const avgResponseTime =
      this.metrics.responseTimes.length > 0
        ? this.metrics.responseTimes.reduce((a, b) => a + b, 0) /
          this.metrics.responseTimes.length
        : 0;

    const avgDataSize =
      this.metrics.dataSizes.length > 0
        ? this.metrics.dataSizes.reduce((a, b) => a + b, 0) /
          this.metrics.dataSizes.length
        : 0;

    return {
      ...this.metrics,
      successRate:
        this.metrics.requests > 0
          ? (this.metrics.successes / this.metrics.requests) * 100
          : 0,
      averageResponseTime: avgResponseTime,
      averageDataSize: avgDataSize,
    };
  }
}

// Usage
const monitor = new ApiDataMonitor();

async function monitoredApiCall(url, schema) {
  return await monitor.monitorApiCall(async () => {
    const response = await fetch(url);
    const data = await response.json();
    return await parseFrom(schema, 'json', JSON.stringify(data));
  });
}
```

## 📊 Performance Tips

### 1. Parallel API Calls

```javascript
async function parallelApiCalls(urls, schema) {
  const results = await Promise.allSettled(
    urls.map(async url => {
      const response = await fetch(url);
      const data = await response.json();
      return await parseFrom(schema, 'json', JSON.stringify(data));
    })
  );

  const successful = results
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value);

  const failed = results
    .filter(result => result.status === 'rejected')
    .map(result => result.reason);

  return { successful, failed };
}
```

### 2. API Response Caching

```javascript
const apiCache = new Map();

async function cachedApiCall(url, schema, ttl = 300000) {
  const cacheKey = `${url}:${JSON.stringify(schema.shape)}`;
  const cached = apiCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  const response = await fetch(url);
  const data = await response.json();
  const validatedData = await parseFrom(schema, 'json', JSON.stringify(data));

  apiCache.set(cacheKey, {
    data: validatedData,
    timestamp: Date.now(),
  });

  return validatedData;
}
```

## 🧪 Testing

### Unit Tests

```javascript
import { describe, it, expect, vi } from 'vitest';

describe('API Integration', () => {
  it('should process API response correctly', async () => {
    const mockApiResponse = {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      username: 'johndoe',
    };

    const result = await processApiResponse(
      mockApiResponse,
      UserApiSchema,
      'json'
    );

    expect(result.success).toBe(true);
    expect(result.recordCount).toBe(1);
  });

  it('should handle API errors gracefully', async () => {
    const mockError = new Error('API request failed');

    const result = await robustApiDataProcessing('invalid-url', UserApiSchema);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should aggregate API data correctly', async () => {
    const mockUsers = [
      { id: 1, name: 'John', email: 'john@example.com' },
      { id: 2, name: 'Jane', email: 'jane@example.com' },
    ];

    const result = await transformApiDataForSystem(mockUsers, 'crm');

    expect(result.success).toBe(true);
    expect(result.recordCount).toBe(2);
  });
});
```

---

**Next: [Log Processing Cookbook](log-processing.md)**


