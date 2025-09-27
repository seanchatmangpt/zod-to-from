# Log Processing Cookbook

> **The 80/20 Pattern: Log File Analysis and Aggregation**

This cookbook covers the most common log processing patterns - parsing log
files, extracting insights, aggregating data, and generating reports. This
pattern handles 80% of log analysis use cases.

## 🎯 Use Case

**Problem**: You have log files in various formats (JSON, NDJSON, CSV, etc.) and
need to analyze them, extract insights, and generate reports for monitoring and
debugging.

**Solution**: Use ZTF to create robust log processing pipelines with schema
validation, data aggregation, and report generation.

## 📋 Prerequisites

- Understanding of log formats and structures
- ZTF installed and configured
- Zod schemas for log validation
- Basic knowledge of data analysis

## 🍳 Recipe

### Step 1: Define Log Schemas

```javascript
import { z } from 'zod';

// Common log entry schema
const LogEntrySchema = z.object({
  timestamp: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
  level: z.enum(['debug', 'info', 'warn', 'error', 'fatal']),
  message: z.string(),
  source: z.string().optional(),
  service: z.string().optional(),
  requestId: z.string().optional(),
  userId: z.string().optional(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  duration: z.number().optional(),
  statusCode: z.number().optional(),
  method: z.string().optional(),
  path: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Application log schema
const AppLogSchema = z.object({
  timestamp: z.string(),
  level: z.enum(['debug', 'info', 'warn', 'error']),
  message: z.string(),
  component: z.string(),
  action: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  data: z.record(z.any()).optional(),
});

// Web server log schema
const WebLogSchema = z.object({
  timestamp: z.string(),
  ip: z.string(),
  method: z.string(),
  path: z.string(),
  statusCode: z.number(),
  responseTime: z.number(),
  userAgent: z.string(),
  referer: z.string().optional(),
  requestSize: z.number().optional(),
  responseSize: z.number().optional(),
});

// Error log schema
const ErrorLogSchema = z.object({
  timestamp: z.string(),
  level: z.literal('error'),
  message: z.string(),
  stack: z.string().optional(),
  error: z.object({
    name: z.string(),
    message: z.string(),
    code: z.string().optional(),
  }),
  context: z.record(z.any()).optional(),
  request: z
    .object({
      method: z.string(),
      path: z.string(),
      headers: z.record(z.string()).optional(),
      body: z.any().optional(),
    })
    .optional(),
});
```

### Step 2: Basic Log Processing

```javascript
import { parseFrom, formatTo } from 'zod-to-from';
import fs from 'fs';

async function processLogFile(logFile, schema, outputFormat) {
  try {
    // Read and parse log file
    const logData = fs.readFileSync(logFile, 'utf8');
    const logs = await parseFrom(schema, 'ndjson', logData);

    // Process logs
    const processedLogs = logs.map(log => ({
      ...log,
      // Add computed fields
      hour: new Date(log.timestamp).getHours(),
      day: new Date(log.timestamp).getDate(),
      month: new Date(log.timestamp).getMonth() + 1,
      year: new Date(log.timestamp).getFullYear(),
      // Add severity score
      severity: getSeverityScore(log.level),
      // Add processing metadata
      processedAt: new Date().toISOString(),
    }));

    // Output processed logs
    const outputData = await formatTo(schema, outputFormat, processedLogs);
    fs.writeFileSync(`processed-${logFile}`, outputData);

    return {
      success: true,
      totalLogs: logs.length,
      processedLogs: processedLogs.length,
      outputFile: `processed-${logFile}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      totalLogs: 0,
    };
  }
}

function getSeverityScore(level) {
  const scores = {
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
    fatal: 5,
  };
  return scores[level] || 0;
}

// Usage
const result = await processLogFile('app.log', AppLogSchema, 'json');
```

### Step 3: Log Analysis and Aggregation

```javascript
async function analyzeLogs(logFile, schema) {
  try {
    // Read and parse logs
    const logData = fs.readFileSync(logFile, 'utf8');
    const logs = await parseFrom(schema, 'ndjson', logData);

    // Initialize analysis results
    const analysis = {
      summary: {
        totalLogs: logs.length,
        timeRange: {
          start: null,
          end: null,
        },
        levelDistribution: {},
        errorRate: 0,
        averageResponseTime: 0,
      },
      trends: {
        hourly: {},
        daily: {},
        weekly: {},
      },
      topErrors: [],
      performance: {
        slowestRequests: [],
        fastestRequests: [],
        averageResponseTime: 0,
      },
      security: {
        suspiciousIPs: [],
        failedLogins: [],
        unusualPatterns: [],
      },
    };

    // Analyze each log entry
    for (const log of logs) {
      const timestamp = new Date(log.timestamp);

      // Update time range
      if (
        !analysis.summary.timeRange.start ||
        timestamp < analysis.summary.timeRange.start
      ) {
        analysis.summary.timeRange.start = timestamp;
      }
      if (
        !analysis.summary.timeRange.end ||
        timestamp > analysis.summary.timeRange.end
      ) {
        analysis.summary.timeRange.end = timestamp;
      }

      // Count log levels
      analysis.summary.levelDistribution[log.level] =
        (analysis.summary.levelDistribution[log.level] || 0) + 1;

      // Track hourly trends
      const hour = timestamp.getHours();
      analysis.trends.hourly[hour] = (analysis.trends.hourly[hour] || 0) + 1;

      // Track daily trends
      const day = timestamp.toISOString().split('T')[0];
      analysis.trends.daily[day] = (analysis.trends.daily[day] || 0) + 1;

      // Track errors
      if (log.level === 'error') {
        analysis.topErrors.push({
          timestamp: log.timestamp,
          message: log.message,
          source: log.source,
          count: 1,
        });
      }

      // Track performance metrics
      if (log.duration) {
        analysis.performance.slowestRequests.push({
          timestamp: log.timestamp,
          duration: log.duration,
          path: log.path,
          method: log.method,
        });
      }

      // Track security events
      if (log.level === 'error' && log.message.includes('authentication')) {
        analysis.security.failedLogins.push({
          timestamp: log.timestamp,
          ip: log.ip,
          message: log.message,
        });
      }
    }

    // Calculate derived metrics
    analysis.summary.errorRate =
      ((analysis.summary.levelDistribution.error || 0) / logs.length) * 100;

    if (analysis.performance.slowestRequests.length > 0) {
      analysis.performance.averageResponseTime =
        analysis.performance.slowestRequests.reduce(
          (sum, req) => sum + req.duration,
          0
        ) / analysis.performance.slowestRequests.length;
    }

    // Sort and limit top results
    analysis.topErrors = analysis.topErrors
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    analysis.performance.slowestRequests = analysis.performance.slowestRequests
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    // Output analysis results
    const outputData = await formatTo(z.any(), 'json', analysis);
    fs.writeFileSync('log-analysis.json', outputData);

    return {
      success: true,
      analysis,
      summary: analysis.summary,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}
```

### Step 4: Real-time Log Processing

```javascript
async function processLogStream(logFile, schema, onLogProcessed) {
  const logStream = fs.createReadStream(logFile);
  let processedCount = 0;
  let errorCount = 0;

  try {
    // Process logs in streaming mode
    const result = await parseFrom(schema, 'ndjson', logStream, {
      streaming: true,
      adapter: {
        chunkSize: 100, // Process 100 logs at a time
      },
    });

    // Process each chunk
    for await (const chunk of result) {
      for (const log of chunk) {
        try {
          // Process individual log
          const processedLog = await processLogEntry(log);

          // Call callback for real-time processing
          if (onLogProcessed) {
            await onLogProcessed(processedLog);
          }

          processedCount++;
        } catch (error) {
          errorCount++;
          console.error('Error processing log entry:', error.message);
        }
      }
    }

    return {
      success: true,
      processed: processedCount,
      errors: errorCount,
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

async function processLogEntry(log) {
  return {
    ...log,
    // Add real-time processing
    processedAt: new Date().toISOString(),
    severity: getSeverityScore(log.level),
    // Add alert conditions
    needsAlert: log.level === 'error' || log.level === 'fatal',
    // Add categorization
    category: categorizeLog(log),
  };
}

function categorizeLog(log) {
  if (log.message.includes('authentication') || log.message.includes('login')) {
    return 'authentication';
  }
  if (log.message.includes('database') || log.message.includes('query')) {
    return 'database';
  }
  if (log.message.includes('api') || log.message.includes('request')) {
    return 'api';
  }
  if (log.message.includes('payment') || log.message.includes('transaction')) {
    return 'payment';
  }
  return 'general';
}
```

## 🔧 Variations

### Variation 1: Log Aggregation and Reporting

```javascript
async function generateLogReport(logFiles, schema) {
  const report = {
    summary: {
      totalLogs: 0,
      timeRange: { start: null, end: null },
      levelDistribution: {},
      errorRate: 0,
      topErrors: [],
      performanceMetrics: {},
    },
    details: {},
  };

  // Process each log file
  for (const logFile of logFiles) {
    try {
      const logData = fs.readFileSync(logFile, 'utf8');
      const logs = await parseFrom(schema, 'ndjson', logData);

      // Aggregate data
      report.summary.totalLogs += logs.length;

      for (const log of logs) {
        const timestamp = new Date(log.timestamp);

        // Update time range
        if (
          !report.summary.timeRange.start ||
          timestamp < report.summary.timeRange.start
        ) {
          report.summary.timeRange.start = timestamp;
        }
        if (
          !report.summary.timeRange.end ||
          timestamp > report.summary.timeRange.end
        ) {
          report.summary.timeRange.end = timestamp;
        }

        // Count levels
        report.summary.levelDistribution[log.level] =
          (report.summary.levelDistribution[log.level] || 0) + 1;

        // Track errors
        if (log.level === 'error') {
          report.summary.topErrors.push({
            message: log.message,
            timestamp: log.timestamp,
            source: log.source,
            file: logFile,
          });
        }
      }

      // Store file-specific details
      report.details[logFile] = {
        totalLogs: logs.length,
        levelDistribution: {},
        errors: logs.filter(log => log.level === 'error').length,
        warnings: logs.filter(log => log.level === 'warn').length,
      };
    } catch (error) {
      console.error(`Error processing ${logFile}:`, error.message);
    }
  }

  // Calculate error rate
  report.summary.errorRate =
    ((report.summary.levelDistribution.error || 0) / report.summary.totalLogs) *
    100;

  // Sort top errors
  report.summary.topErrors = report.summary.topErrors
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 20);

  // Generate report in multiple formats
  const jsonReport = await formatTo(z.any(), 'json', report);
  const csvReport = await formatTo(z.any(), 'csv', report.summary.topErrors);

  fs.writeFileSync('log-report.json', jsonReport);
  fs.writeFileSync('top-errors.csv', csvReport);

  return report;
}
```

### Variation 2: Log Monitoring and Alerting

```javascript
class LogMonitor {
  constructor(alertThresholds = {}) {
    this.thresholds = {
      errorRate: 5, // 5% error rate
      responseTime: 1000, // 1 second response time
      errorCount: 10, // 10 errors in 5 minutes
      ...alertThresholds,
    };
    this.alerts = [];
    this.metrics = {
      errorCount: 0,
      responseTimeSum: 0,
      responseTimeCount: 0,
      lastReset: Date.now(),
    };
  }

  async monitorLogs(logFile, schema) {
    const logStream = fs.createReadStream(logFile);

    const result = await parseFrom(schema, 'ndjson', logStream, {
      streaming: true,
      adapter: { chunkSize: 50 },
    });

    for await (const chunk of result) {
      for (const log of chunk) {
        await this.processLog(log);
      }
    }

    return this.alerts;
  }

  async processLog(log) {
    const now = Date.now();

    // Reset metrics every 5 minutes
    if (now - this.metrics.lastReset > 300000) {
      this.metrics = {
        errorCount: 0,
        responseTimeSum: 0,
        responseTimeCount: 0,
        lastReset: now,
      };
    }

    // Track errors
    if (log.level === 'error') {
      this.metrics.errorCount++;

      if (this.metrics.errorCount >= this.thresholds.errorCount) {
        this.addAlert('HIGH_ERROR_COUNT', {
          message: `High error count: ${this.metrics.errorCount} errors in 5 minutes`,
          count: this.metrics.errorCount,
          threshold: this.thresholds.errorCount,
        });
      }
    }

    // Track response times
    if (log.duration) {
      this.metrics.responseTimeSum += log.duration;
      this.metrics.responseTimeCount++;

      if (log.duration > this.thresholds.responseTime) {
        this.addAlert('SLOW_RESPONSE', {
          message: `Slow response time: ${log.duration}ms`,
          duration: log.duration,
          threshold: this.thresholds.responseTime,
          path: log.path,
        });
      }
    }

    // Check for specific error patterns
    if (log.level === 'error' && log.message.includes('database connection')) {
      this.addAlert('DATABASE_ERROR', {
        message: 'Database connection error detected',
        details: log.message,
        timestamp: log.timestamp,
      });
    }

    if (
      log.level === 'error' &&
      log.message.includes('authentication failed')
    ) {
      this.addAlert('AUTH_FAILURE', {
        message: 'Authentication failure detected',
        details: log.message,
        ip: log.ip,
        timestamp: log.timestamp,
      });
    }
  }

  addAlert(type, details) {
    const alert = {
      type,
      details,
      timestamp: new Date().toISOString(),
      severity: this.getAlertSeverity(type),
    };

    this.alerts.push(alert);
    console.log(`ALERT [${type}]: ${details.message}`);
  }

  getAlertSeverity(type) {
    const severities = {
      HIGH_ERROR_COUNT: 'critical',
      SLOW_RESPONSE: 'warning',
      DATABASE_ERROR: 'critical',
      AUTH_FAILURE: 'warning',
    };
    return severities[type] || 'info';
  }
}

// Usage
const monitor = new LogMonitor({
  errorCount: 5,
  responseTime: 500,
});

const alerts = await monitor.monitorLogs('app.log', AppLogSchema);
```

### Variation 3: Log Data Export

```javascript
async function exportLogData(logFile, schema, exportFormat, filters = {}) {
  try {
    // Read and parse logs
    const logData = fs.readFileSync(logFile, 'utf8');
    const logs = await parseFrom(schema, 'ndjson', logData);

    // Apply filters
    let filteredLogs = logs;

    if (filters.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filters.level);
    }

    if (filters.startDate) {
      filteredLogs = filteredLogs.filter(
        log => new Date(log.timestamp) >= new Date(filters.startDate)
      );
    }

    if (filters.endDate) {
      filteredLogs = filteredLogs.filter(
        log => new Date(log.timestamp) <= new Date(filters.endDate)
      );
    }

    if (filters.source) {
      filteredLogs = filteredLogs.filter(log => log.source === filters.source);
    }

    if (filters.message) {
      filteredLogs = filteredLogs.filter(log =>
        log.message.toLowerCase().includes(filters.message.toLowerCase())
      );
    }

    // Transform data for export
    const exportData = filteredLogs.map(log => ({
      timestamp: log.timestamp,
      level: log.level,
      message: log.message,
      source: log.source,
      service: log.service,
      requestId: log.requestId,
      userId: log.userId,
      ip: log.ip,
      duration: log.duration,
      statusCode: log.statusCode,
      method: log.method,
      path: log.path,
    }));

    // Export in requested format
    const outputData = await formatTo(z.any(), exportFormat, exportData);
    const outputFile = `exported-logs.${exportFormat}`;
    fs.writeFileSync(outputFile, outputData);

    return {
      success: true,
      totalLogs: logs.length,
      filteredLogs: filteredLogs.length,
      outputFile,
      format: exportFormat,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// Usage examples
await exportLogData('app.log', AppLogSchema, 'csv', {
  level: 'error',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
});

await exportLogData('app.log', AppLogSchema, 'json', {
  source: 'api',
  message: 'timeout',
});
```

## ⚠️ Common Pitfalls

### 1. Memory Issues with Large Log Files

```javascript
// ❌ Wrong - loading entire log file into memory
const allLogs = fs.readFileSync('large-log-file.log', 'utf8');
const parsed = await parseFrom(Schema, 'ndjson', allLogs);

// ✅ Correct - using streaming
const logStream = fs.createReadStream('large-log-file.log');
const result = await parseFrom(Schema, 'ndjson', logStream, {
  streaming: true,
});
```

### 2. Missing Log Validation

```javascript
// ❌ Wrong - no validation
const logs = JSON.parse(logData);

// ✅ Correct - validate log structure
const logs = await parseFrom(LogSchema, 'ndjson', logData);
```

### 3. Inefficient Log Processing

```javascript
// ❌ Wrong - processing logs one by one
for (const log of logs) {
  await processLog(log);
}

// ✅ Correct - batch processing
const chunks = chunkArray(logs, 100);
for (const chunk of chunks) {
  await Promise.all(chunk.map(log => processLog(log)));
}
```

## 🚀 Advanced Techniques

### 1. Log Correlation

```javascript
async function correlateLogs(logFiles, correlationKey = 'requestId') {
  const correlatedLogs = new Map();

  for (const logFile of logFiles) {
    const logData = fs.readFileSync(logFile, 'utf8');
    const logs = await parseFrom(LogEntrySchema, 'ndjson', logData);

    for (const log of logs) {
      const key = log[correlationKey];
      if (key) {
        if (!correlatedLogs.has(key)) {
          correlatedLogs.set(key, []);
        }
        correlatedLogs.get(key).push({
          ...log,
          source: logFile,
        });
      }
    }
  }

  // Sort correlated logs by timestamp
  for (const [key, logs] of correlatedLogs) {
    logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  return correlatedLogs;
}
```

### 2. Log Pattern Detection

```javascript
class LogPatternDetector {
  constructor() {
    this.patterns = new Map();
  }

  addPattern(name, pattern) {
    this.patterns.set(name, pattern);
  }

  async detectPatterns(logFile, schema) {
    const logData = fs.readFileSync(logFile, 'utf8');
    const logs = await parseFrom(schema, 'ndjson', logData);

    const detectedPatterns = new Map();

    for (const [patternName, pattern] of this.patterns) {
      const matches = logs.filter(log => pattern.test(log.message));
      if (matches.length > 0) {
        detectedPatterns.set(patternName, {
          count: matches.length,
          examples: matches.slice(0, 5),
        });
      }
    }

    return detectedPatterns;
  }
}

// Usage
const detector = new LogPatternDetector();
detector.addPattern('database_error', /database|connection|query/i);
detector.addPattern('auth_failure', /authentication|login|password/i);
detector.addPattern('timeout', /timeout|slow|delay/i);

const patterns = await detector.detectPatterns('app.log', AppLogSchema);
```

### 3. Log Data Visualization

```javascript
async function generateLogVisualization(logFile, schema) {
  const logData = fs.readFileSync(logFile, 'utf8');
  const logs = await parseFrom(schema, 'ndjson', logData);

  // Generate time series data
  const timeSeries = {};
  const hourlyData = {};
  const dailyData = {};

  for (const log of logs) {
    const timestamp = new Date(log.timestamp);
    const hour = timestamp.getHours();
    const day = timestamp.toISOString().split('T')[0];

    // Hourly data
    if (!hourlyData[hour]) {
      hourlyData[hour] = { total: 0, errors: 0, warnings: 0 };
    }
    hourlyData[hour].total++;
    if (log.level === 'error') hourlyData[hour].errors++;
    if (log.level === 'warn') hourlyData[hour].warnings++;

    // Daily data
    if (!dailyData[day]) {
      dailyData[day] = { total: 0, errors: 0, warnings: 0 };
    }
    dailyData[day].total++;
    if (log.level === 'error') dailyData[day].errors++;
    if (log.level === 'warn') dailyData[day].warnings++;
  }

  // Generate visualization data
  const visualizationData = {
    hourly: Object.entries(hourlyData).map(([hour, data]) => ({
      hour: parseInt(hour),
      total: data.total,
      errors: data.errors,
      warnings: data.warnings,
    })),
    daily: Object.entries(dailyData).map(([day, data]) => ({
      day,
      total: data.total,
      errors: data.errors,
      warnings: data.warnings,
    })),
    summary: {
      totalLogs: logs.length,
      errorRate:
        (logs.filter(log => log.level === 'error').length / logs.length) * 100,
      warningRate:
        (logs.filter(log => log.level === 'warn').length / logs.length) * 100,
    },
  };

  // Export visualization data
  const outputData = await formatTo(z.any(), 'json', visualizationData);
  fs.writeFileSync('log-visualization.json', outputData);

  return visualizationData;
}
```

## 📊 Performance Tips

### 1. Parallel Log Processing

```javascript
async function processMultipleLogFiles(logFiles, schema) {
  const results = await Promise.all(
    logFiles.map(async logFile => {
      try {
        const result = await processLogFile(logFile, schema, 'json');
        return { file: logFile, ...result };
      } catch (error) {
        return { file: logFile, success: false, error: error.message };
      }
    })
  );

  return results;
}
```

### 2. Log Data Compression

```javascript
async function compressLogData(logFile, schema) {
  const logData = fs.readFileSync(logFile, 'utf8');
  const logs = await parseFrom(schema, 'ndjson', logData);

  // Remove unnecessary fields for compression
  const compressedLogs = logs.map(log => ({
    t: log.timestamp,
    l: log.level,
    m: log.message,
    s: log.source,
    r: log.requestId,
    u: log.userId,
  }));

  const outputData = await formatTo(z.any(), 'json', compressedLogs);
  fs.writeFileSync('compressed-logs.json', outputData);

  return {
    originalSize: logData.length,
    compressedSize: outputData.length,
    compressionRatio: (1 - outputData.length / logData.length) * 100,
  };
}
```

## 🧪 Testing

### Unit Tests

```javascript
import { describe, it, expect } from 'vitest';

describe('Log Processing', () => {
  it('should process log file correctly', async () => {
    const logData =
      '{"timestamp":"2024-01-01T10:00:00Z","level":"info","message":"Test log"}';
    const result = await processLogFile('test.log', LogEntrySchema, 'json');

    expect(result.success).toBe(true);
    expect(result.totalLogs).toBe(1);
  });

  it('should analyze logs correctly', async () => {
    const logData = `
      {"timestamp":"2024-01-01T10:00:00Z","level":"info","message":"Info log"}
      {"timestamp":"2024-01-01T10:01:00Z","level":"error","message":"Error log"}
    `;

    const result = await analyzeLogs('test.log', LogEntrySchema);

    expect(result.success).toBe(true);
    expect(result.analysis.summary.totalLogs).toBe(2);
    expect(result.analysis.summary.errorRate).toBe(50);
  });

  it('should detect log patterns', async () => {
    const detector = new LogPatternDetector();
    detector.addPattern('error', /error/i);

    const logData =
      '{"timestamp":"2024-01-01T10:00:00Z","level":"error","message":"Database error"}';
    const patterns = await detector.detectPatterns('test.log', LogEntrySchema);

    expect(patterns.has('error')).toBe(true);
    expect(patterns.get('error').count).toBe(1);
  });
});
```

---

**Next: [Office Documents Cookbook](office-documents.md)**


