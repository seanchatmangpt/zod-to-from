# Configuration Management Cookbook

> **The 80/20 Pattern: Config File Conversions**

This cookbook covers the most common configuration management patterns -
converting between YAML, JSON, TOML, and environment variables. This pattern
handles 80% of configuration-related use cases.

## 🎯 Use Case

**Problem**: You have configuration data in one format but need it in another
format for different tools or environments.

**Solution**: Use ZTF to convert between configuration formats while maintaining
data integrity and validation.

## 📋 Prerequisites

- Basic understanding of configuration formats
- ZTF installed and configured
- Zod schemas for validation

## 🍳 Recipe

### Step 1: Define Your Configuration Schema

```javascript
import { z } from 'zod';

const AppConfigSchema = z.object({
  app: z.object({
    name: z.string(),
    version: z.string(),
    environment: z.enum(['development', 'staging', 'production']),
    port: z.number().min(1000).max(65535),
    host: z.string().default('localhost'),
  }),
  database: z.object({
    host: z.string(),
    port: z.number(),
    name: z.string(),
    username: z.string(),
    password: z.string(),
    ssl: z.boolean().default(false),
  }),
  redis: z.object({
    host: z.string(),
    port: z.number(),
    password: z.string().optional(),
  }),
  features: z.object({
    auth: z.boolean(),
    logging: z.boolean(),
    metrics: z.boolean(),
    cache: z.boolean(),
  }),
  cors: z.object({
    origins: z.array(z.string()),
    methods: z.array(z.string()),
    credentials: z.boolean(),
  }),
});
```

### Step 2: Convert Between Formats

```javascript
import { parseFrom, formatTo, convert } from 'zod-to-from';

// YAML to JSON
const yamlConfig = `
app:
  name: "MyApp"
  version: "1.0.0"
  environment: "production"
  port: 3000
  host: "0.0.0.0"
database:
  host: "localhost"
  port: 5432
  name: "myapp"
  username: "admin"
  password: "secret"
  ssl: true
redis:
  host: "localhost"
  port: 6379
features:
  auth: true
  logging: true
  metrics: false
  cache: true
cors:
  origins: ["http://localhost:3000", "https://myapp.com"]
  methods: ["GET", "POST", "PUT", "DELETE"]
  credentials: true
`;

// Parse YAML and convert to JSON
const config = await parseFrom(AppConfigSchema, 'yaml', yamlConfig);
const jsonConfig = await formatTo(AppConfigSchema, 'json', config);

// Or use direct conversion
const jsonConfig2 = await convert(
  AppConfigSchema,
  { from: 'yaml', to: 'json' },
  yamlConfig
);
```

### Step 3: Environment-Specific Configurations

```javascript
// Base configuration
const baseConfig = {
  app: { name: 'MyApp', version: '1.0.0' },
  database: { host: 'localhost', port: 5432, name: 'myapp' },
  redis: { host: 'localhost', port: 6379 },
  features: { auth: true, logging: true, metrics: false, cache: true },
  cors: {
    origins: ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
};

// Environment-specific overrides
const environments = {
  development: {
    app: { environment: 'development', port: 3000 },
    database: { host: 'localhost', ssl: false },
    features: { logging: true, metrics: false },
  },
  staging: {
    app: { environment: 'staging', port: 3001 },
    database: { host: 'staging-db.example.com', ssl: true },
    features: { logging: true, metrics: true },
  },
  production: {
    app: { environment: 'production', port: 3000 },
    database: { host: 'prod-db.example.com', ssl: true },
    redis: { host: 'prod-redis.example.com' },
    features: { logging: false, metrics: true },
  },
};

// Generate configurations for each environment
async function generateEnvironmentConfigs() {
  const configs = {};

  for (const [env, overrides] of Object.entries(environments)) {
    const config = { ...baseConfig, ...overrides };

    // Generate different formats
    configs[env] = {
      yaml: await formatTo(AppConfigSchema, 'yaml', config),
      json: await formatTo(AppConfigSchema, 'json', config),
      toml: await formatTo(AppConfigSchema, 'toml', config),
      env: await formatTo(AppConfigSchema, 'env', config),
    };
  }

  return configs;
}
```

### Step 4: Configuration Validation and Merging

```javascript
import fs from 'fs';

async function loadAndValidateConfig(configPath, format) {
  try {
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = await parseFrom(AppConfigSchema, format, configData);

    // Validate configuration
    if (config.app.environment === 'production' && !config.database.ssl) {
      throw new Error('Production environment requires SSL');
    }

    if (config.app.port < 1000 || config.app.port > 65535) {
      throw new Error('Invalid port number');
    }

    return config;
  } catch (error) {
    if (error.name === 'ZodError') {
      console.error('Configuration validation failed:', error.issues);
    } else {
      console.error('Configuration loading failed:', error.message);
    }
    throw error;
  }
}

// Load and validate configuration
const config = await loadAndValidateConfig('config.yaml', 'yaml');
```

## 🔧 Variations

### Variation 1: Docker Compose Configuration

```javascript
const DockerComposeSchema = z.object({
  version: z.string(),
  services: z.record(
    z.object({
      image: z.string(),
      ports: z.array(z.string()).optional(),
      environment: z.array(z.string()).optional(),
      volumes: z.array(z.string()).optional(),
      depends_on: z.array(z.string()).optional(),
    })
  ),
  volumes: z.record(z.any()).optional(),
  networks: z.record(z.any()).optional(),
});

// Convert app config to Docker Compose
async function generateDockerCompose(appConfig) {
  const composeConfig = {
    version: '3.8',
    services: {
      app: {
        image: `${appConfig.app.name}:${appConfig.app.version}`,
        ports: [`${appConfig.app.port}:${appConfig.app.port}`],
        environment: [
          `NODE_ENV=${appConfig.app.environment}`,
          `DB_HOST=${appConfig.database.host}`,
          `DB_PORT=${appConfig.database.port}`,
          `DB_NAME=${appConfig.database.name}`,
        ],
        depends_on: ['database', 'redis'],
      },
      database: {
        image: 'postgres:13',
        environment: [
          `POSTGRES_DB=${appConfig.database.name}`,
          `POSTGRES_USER=${appConfig.database.username}`,
          `POSTGRES_PASSWORD=${appConfig.database.password}`,
        ],
        volumes: ['postgres_data:/var/lib/postgresql/data'],
      },
      redis: {
        image: 'redis:6-alpine',
        ports: [`${appConfig.redis.port}:6379`],
      },
    },
    volumes: {
      postgres_data: {},
    },
  };

  return await formatTo(DockerComposeSchema, 'yaml', composeConfig);
}
```

### Variation 2: Kubernetes Configuration

```javascript
const KubernetesSchema = z.object({
  apiVersion: z.string(),
  kind: z.string(),
  metadata: z.object({
    name: z.string(),
    namespace: z.string().optional(),
    labels: z.record(z.string()).optional(),
  }),
  spec: z.any(),
});

// Generate Kubernetes manifests
async function generateK8sManifests(appConfig) {
  const manifests = {};

  // Deployment
  manifests.deployment = {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: appConfig.app.name,
      labels: { app: appConfig.app.name },
    },
    spec: {
      replicas: 3,
      selector: { matchLabels: { app: appConfig.app.name } },
      template: {
        metadata: { labels: { app: appConfig.app.name } },
        spec: {
          containers: [
            {
              name: appConfig.app.name,
              image: `${appConfig.app.name}:${appConfig.app.version}`,
              ports: [{ containerPort: appConfig.app.port }],
              env: [
                { name: 'NODE_ENV', value: appConfig.app.environment },
                { name: 'DB_HOST', value: appConfig.database.host },
                { name: 'DB_PORT', value: appConfig.database.port.toString() },
              ],
            },
          ],
        },
      },
    },
  };

  // Service
  manifests.service = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: { name: `${appConfig.app.name}-service` },
    spec: {
      selector: { app: appConfig.app.name },
      ports: [{ port: 80, targetPort: appConfig.app.port }],
      type: 'LoadBalancer',
    },
  };

  // Convert to YAML
  const yamlManifests = {};
  for (const [name, manifest] of Object.entries(manifests)) {
    yamlManifests[name] = await formatTo(KubernetesSchema, 'yaml', manifest);
  }

  return yamlManifests;
}
```

### Variation 3: Environment Variables

```javascript
// Convert config to environment variables
async function configToEnvVars(config) {
  const envVars = {
    NODE_ENV: config.app.environment,
    PORT: config.app.port.toString(),
    HOST: config.app.host,
    DB_HOST: config.database.host,
    DB_PORT: config.database.port.toString(),
    DB_NAME: config.database.name,
    DB_USERNAME: config.database.username,
    DB_PASSWORD: config.database.password,
    DB_SSL: config.database.ssl.toString(),
    REDIS_HOST: config.redis.host,
    REDIS_PORT: config.redis.port.toString(),
    FEATURES_AUTH: config.features.auth.toString(),
    FEATURES_LOGGING: config.features.logging.toString(),
    FEATURES_METRICS: config.features.metrics.toString(),
    FEATURES_CACHE: config.features.cache.toString(),
    CORS_ORIGINS: config.cors.origins.join(','),
    CORS_METHODS: config.cors.methods.join(','),
    CORS_CREDENTIALS: config.cors.credentials.toString(),
  };

  return await formatTo(z.any(), 'env', envVars);
}
```

## ⚠️ Common Pitfalls

### 1. Schema Mismatch

```javascript
// ❌ Wrong - schema doesn't match data structure
const BadSchema = z.object({
  app: z.string(), // Should be an object
});

// ✅ Correct - schema matches data structure
const GoodSchema = z.object({
  app: z.object({
    name: z.string(),
    version: z.string(),
  }),
});
```

### 2. Missing Validation

```javascript
// ❌ Wrong - no validation
const config = await parseFrom(z.any(), 'yaml', yamlData);

// ✅ Correct - proper validation
const config = await parseFrom(AppConfigSchema, 'yaml', yamlData);
```

### 3. Environment-Specific Logic

```javascript
// ❌ Wrong - hardcoded values
const config = {
  database: { host: 'localhost' }, // Always localhost
};

// ✅ Correct - environment-specific
const config = {
  database: {
    host:
      process.env.NODE_ENV === 'production'
        ? 'prod-db.example.com'
        : 'localhost',
  },
};
```

## 🚀 Advanced Techniques

### 1. Configuration Inheritance

```javascript
async function loadConfigWithInheritance(basePath, environment) {
  // Load base configuration
  const baseConfig = await parseFrom(
    AppConfigSchema,
    'yaml',
    fs.readFileSync(`${basePath}/base.yaml`, 'utf8')
  );

  // Load environment-specific overrides
  const envConfig = await parseFrom(
    AppConfigSchema,
    'yaml',
    fs.readFileSync(`${basePath}/${environment}.yaml`, 'utf8')
  );

  // Merge configurations (environment overrides base)
  const mergedConfig = { ...baseConfig, ...envConfig };

  return mergedConfig;
}
```

### 2. Configuration Validation Rules

```javascript
const ConfigValidationRules = {
  production: {
    required: ['database.ssl', 'features.metrics'],
    forbidden: ['features.logging'],
    rules: [
      config => config.database.ssl === true,
      config => config.app.port >= 1000,
    ],
  },
  development: {
    required: ['features.logging'],
    rules: [config => config.database.host === 'localhost'],
  },
};

async function validateConfigForEnvironment(config, environment) {
  const rules = ConfigValidationRules[environment];
  if (!rules) return;

  // Check required fields
  for (const field of rules.required) {
    const value = field.split('.').reduce((obj, key) => obj?.[key], config);
    if (!value) {
      throw new Error(`Required field ${field} is missing for ${environment}`);
    }
  }

  // Check forbidden fields
  for (const field of rules.forbidden || []) {
    const value = field.split('.').reduce((obj, key) => obj?.[key], config);
    if (value) {
      throw new Error(`Forbidden field ${field} is present for ${environment}`);
    }
  }

  // Check custom rules
  for (const rule of rules.rules) {
    if (!rule(config)) {
      throw new Error(`Validation rule failed for ${environment}`);
    }
  }
}
```

### 3. Configuration Caching

```javascript
const configCache = new Map();

async function getCachedConfig(configPath, format) {
  const cacheKey = `${configPath}:${format}`;

  if (configCache.has(cacheKey)) {
    return configCache.get(cacheKey);
  }

  const config = await parseFrom(
    AppConfigSchema,
    format,
    fs.readFileSync(configPath, 'utf8')
  );
  configCache.set(cacheKey, config);

  return config;
}
```

## 📊 Performance Tips

### 1. Lazy Loading

```javascript
// Load configurations only when needed
const configLoader = {
  _configs: new Map(),

  async getConfig(environment) {
    if (!this._configs.has(environment)) {
      const config = await loadConfigWithInheritance('./configs', environment);
      this._configs.set(environment, config);
    }
    return this._configs.get(environment);
  },
};
```

### 2. Batch Processing

```javascript
// Generate multiple configurations at once
async function generateAllConfigs() {
  const environments = ['development', 'staging', 'production'];
  const formats = ['yaml', 'json', 'toml', 'env'];

  const results = await Promise.all(
    environments.flatMap(env =>
      formats.map(format => generateConfigForEnvironment(env, format))
    )
  );

  return results;
}
```

## 🧪 Testing

### Unit Tests

```javascript
import { describe, it, expect } from 'vitest';

describe('Configuration Management', () => {
  it('should convert YAML to JSON', async () => {
    const yamlConfig = 'app:\n  name: "TestApp"\n  version: "1.0.0"';
    const result = await convert(
      AppConfigSchema,
      { from: 'yaml', to: 'json' },
      yamlConfig
    );

    expect(result).toContain('"name": "TestApp"');
    expect(result).toContain('"version": "1.0.0"');
  });

  it('should validate configuration schema', async () => {
    const invalidConfig = 'app: "invalid"'; // Should be object, not string

    await expect(
      parseFrom(AppConfigSchema, 'yaml', invalidConfig)
    ).rejects.toThrow('ZodError');
  });

  it('should generate environment-specific configs', async () => {
    const configs = await generateEnvironmentConfigs();

    expect(configs.development.yaml).toContain('environment: development');
    expect(configs.production.yaml).toContain('environment: production');
  });
});
```

---

**Next: [Data Pipeline Cookbook](data-pipeline.md)**


