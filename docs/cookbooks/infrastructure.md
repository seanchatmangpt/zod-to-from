# Infrastructure Cookbook

> **The 80/20 Pattern: Infrastructure as Code Management**

This cookbook covers the most common infrastructure management patterns -
processing Terraform, Kubernetes, Docker, and other infrastructure
configurations, converting between formats, and managing deployments. This
pattern handles 80% of infrastructure automation use cases.

## 🎯 Use Case

**Problem**: You have infrastructure configurations in various formats
(Terraform HCL, Kubernetes YAML, Docker Compose, etc.) and need to process,
validate, convert, and manage them across different environments.

**Solution**: Use ZTF to create robust infrastructure management pipelines with
schema validation, configuration conversion, and deployment automation.

## 📋 Prerequisites

- Understanding of infrastructure as code concepts
- ZTF installed and configured
- Zod schemas for infrastructure validation
- Basic knowledge of Terraform, Kubernetes, Docker

## 🍳 Recipe

### Step 1: Define Infrastructure Schemas

```javascript
import { z } from 'zod';

// Terraform HCL schema
const TerraformSchema = z.object({
  terraform: z
    .object({
      required_providers: z
        .record(
          z.object({
            source: z.string(),
            version: z.string(),
          })
        )
        .optional(),
      backend: z.record(z.any()).optional(),
    })
    .optional(),
  provider: z.record(z.any()).optional(),
  resource: z.record(z.record(z.any())).optional(),
  data: z.record(z.record(z.any())).optional(),
  variable: z.record(z.any()).optional(),
  output: z.record(z.any()).optional(),
  locals: z.record(z.any()).optional(),
  module: z.record(z.any()).optional(),
});

// Kubernetes manifest schema
const KubernetesSchema = z.object({
  apiVersion: z.string(),
  kind: z.string(),
  metadata: z.object({
    name: z.string(),
    namespace: z.string().optional(),
    labels: z.record(z.string()).optional(),
    annotations: z.record(z.string()).optional(),
  }),
  spec: z.any(),
  status: z.any().optional(),
});

// Docker Compose schema
const DockerComposeSchema = z.object({
  version: z.string(),
  services: z.record(
    z.object({
      image: z.string().optional(),
      build: z
        .union([
          z.string(),
          z.object({
            context: z.string(),
            dockerfile: z.string().optional(),
          }),
        ])
        .optional(),
      ports: z.array(z.string()).optional(),
      environment: z
        .union([z.array(z.string()), z.record(z.string())])
        .optional(),
      volumes: z.array(z.string()).optional(),
      depends_on: z.array(z.string()).optional(),
      networks: z.array(z.string()).optional(),
      deploy: z.any().optional(),
    })
  ),
  volumes: z.record(z.any()).optional(),
  networks: z.record(z.any()).optional(),
  secrets: z.record(z.any()).optional(),
  configs: z.record(z.any()).optional(),
});

// Dockerfile schema
const DockerfileSchema = z.object({
  instructions: z.array(
    z.object({
      instruction: z.string(),
      arguments: z.array(z.string()),
      line: z.number(),
    })
  ),
  baseImage: z.string().optional(),
  maintainer: z.string().optional(),
  exposedPorts: z.array(z.number()).optional(),
  volumes: z.array(z.string()).optional(),
  environment: z.record(z.string()).optional(),
  workingDir: z.string().optional(),
  user: z.string().optional(),
  cmd: z.array(z.string()).optional(),
  entrypoint: z.array(z.string()).optional(),
});

// Infrastructure configuration schema
const InfrastructureConfigSchema = z.object({
  name: z.string(),
  environment: z.enum(['development', 'staging', 'production']),
  region: z.string(),
  provider: z.enum(['aws', 'azure', 'gcp', 'local']),
  resources: z.array(
    z.object({
      type: z.string(),
      name: z.string(),
      configuration: z.any(),
    })
  ),
  dependencies: z.array(z.string()).optional(),
  metadata: z
    .object({
      created: z.string().optional(),
      updated: z.string().optional(),
      version: z.string().optional(),
      tags: z.record(z.string()).optional(),
    })
    .optional(),
});
```

### Step 2: Basic Infrastructure Processing

```javascript
import { parseFrom, formatTo } from 'zod-to-from';
import fs from 'fs';

async function processInfrastructureConfig(
  configFile,
  configType,
  outputFormat
) {
  try {
    // Read configuration file
    const configData = fs.readFileSync(configFile, 'utf8');

    // Parse configuration based on type
    let schema;
    switch (configType) {
      case 'terraform':
        schema = TerraformSchema;
        break;
      case 'kubernetes':
        schema = KubernetesSchema;
        break;
      case 'docker-compose':
        schema = DockerComposeSchema;
        break;
      case 'dockerfile':
        schema = DockerfileSchema;
        break;
      default:
        throw new Error(`Unsupported configuration type: ${configType}`);
    }

    const parsedConfig = await parseFrom(schema, configType, configData);

    // Process configuration
    const processedConfig = await processInfrastructureContent(
      parsedConfig,
      configType
    );

    // Convert to desired format
    const outputData = await formatTo(schema, outputFormat, processedConfig);

    // Save output
    const outputFile = `processed-${configFile.replace(/\.[^/.]+$/, '')}.${outputFormat}`;
    fs.writeFileSync(outputFile, outputData);

    return {
      success: true,
      config: processedConfig,
      outputFile,
      format: outputFormat,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function processInfrastructureContent(config, configType) {
  const processed = { ...config };

  // Add processing metadata
  processed.processedAt = new Date().toISOString();
  processed.processingVersion = '1.0.0';
  processed.configType = configType;

  // Process based on configuration type
  switch (configType) {
    case 'terraform':
      return await processTerraformConfig(processed);
    case 'kubernetes':
      return await processKubernetesConfig(processed);
    case 'docker-compose':
      return await processDockerComposeConfig(processed);
    case 'dockerfile':
      return await processDockerfileConfig(processed);
    default:
      return processed;
  }
}

async function processTerraformConfig(config) {
  const processed = { ...config };

  // Add resource count
  processed.resourceCount = 0;
  if (processed.resource) {
    processed.resourceCount = Object.keys(processed.resource).length;
  }

  // Add provider information
  processed.providers = [];
  if (processed.provider) {
    processed.providers = Object.keys(processed.provider);
  }

  // Add variable count
  processed.variableCount = 0;
  if (processed.variable) {
    processed.variableCount = Object.keys(processed.variable).length;
  }

  // Add output count
  processed.outputCount = 0;
  if (processed.output) {
    processed.outputCount = Object.keys(processed.output).length;
  }

  return processed;
}

async function processKubernetesConfig(config) {
  const processed = { ...config };

  // Add resource information
  processed.resourceType = config.kind;
  processed.resourceName = config.metadata.name;
  processed.namespace = config.metadata.namespace || 'default';

  // Add labels and annotations count
  processed.labelCount = config.metadata.labels
    ? Object.keys(config.metadata.labels).length
    : 0;
  processed.annotationCount = config.metadata.annotations
    ? Object.keys(config.metadata.annotations).length
    : 0;

  return processed;
}

async function processDockerComposeConfig(config) {
  const processed = { ...config };

  // Add service count
  processed.serviceCount = Object.keys(config.services).length;

  // Add service information
  processed.services = Object.entries(config.services).map(
    ([name, service]) => ({
      name,
      image: service.image,
      ports: service.ports || [],
      environment: service.environment || {},
      volumes: service.volumes || [],
      dependsOn: service.depends_on || [],
    })
  );

  // Add volume count
  processed.volumeCount = config.volumes
    ? Object.keys(config.volumes).length
    : 0;

  // Add network count
  processed.networkCount = config.networks
    ? Object.keys(config.networks).length
    : 0;

  return processed;
}

async function processDockerfileConfig(config) {
  const processed = { ...config };

  // Add instruction count
  processed.instructionCount = config.instructions.length;

  // Add instruction types
  processed.instructionTypes = [
    ...new Set(config.instructions.map(inst => inst.instruction)),
  ];

  // Add base image information
  processed.baseImage = config.baseImage;

  // Add exposed ports
  processed.exposedPorts = config.exposedPorts || [];

  // Add environment variables
  processed.environment = config.environment || {};

  return processed;
}
```

### Step 3: Infrastructure Configuration Analysis

```javascript
async function analyzeInfrastructureConfig(configFile, configType) {
  try {
    // Read and parse configuration
    const configData = fs.readFileSync(configFile, 'utf8');
    const schema = getSchemaForType(configType);
    const parsedConfig = await parseFrom(schema, configType, configData);

    const analysis = {
      file: configFile,
      type: configType,
      summary: {
        resourceCount: 0,
        complexity: 0,
        security: {},
        bestPractices: {},
      },
      details: {},
      recommendations: [],
    };

    // Analyze based on configuration type
    switch (configType) {
      case 'terraform':
        analysis.details = await analyzeTerraformConfig(parsedConfig);
        break;
      case 'kubernetes':
        analysis.details = await analyzeKubernetesConfig(parsedConfig);
        break;
      case 'docker-compose':
        analysis.details = await analyzeDockerComposeConfig(parsedConfig);
        break;
      case 'dockerfile':
        analysis.details = await analyzeDockerfileConfig(parsedConfig);
        break;
    }

    // Generate recommendations
    analysis.recommendations = generateRecommendations(analysis, configType);

    return {
      success: true,
      analysis,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      file: configFile,
    };
  }
}

async function analyzeTerraformConfig(config) {
  const analysis = {
    resources: {},
    providers: {},
    variables: {},
    outputs: {},
    security: {},
    bestPractices: {},
  };

  // Analyze resources
  if (config.resource) {
    analysis.resources = Object.entries(config.resource).reduce(
      (acc, [type, resources]) => {
        acc[type] = Object.keys(resources).length;
        return acc;
      },
      {}
    );
  }

  // Analyze providers
  if (config.provider) {
    analysis.providers = Object.keys(config.provider);
  }

  // Analyze variables
  if (config.variable) {
    analysis.variables = Object.entries(config.variable).reduce(
      (acc, [name, variable]) => {
        acc[name] = {
          type: variable.type || 'any',
          default: variable.default !== undefined,
          description: variable.description || '',
        };
        return acc;
      },
      {}
    );
  }

  // Analyze outputs
  if (config.output) {
    analysis.outputs = Object.entries(config.output).reduce(
      (acc, [name, output]) => {
        acc[name] = {
          description: output.description || '',
          sensitive: output.sensitive || false,
        };
        return acc;
      },
      {}
    );
  }

  // Security analysis
  analysis.security = {
    hasBackend: !!config.terraform?.backend,
    hasRequiredProviders: !!config.terraform?.required_providers,
    hasVariables: Object.keys(config.variable || {}).length > 0,
    hasOutputs: Object.keys(config.output || {}).length > 0,
  };

  // Best practices analysis
  analysis.bestPractices = {
    hasVersionConstraints: !!config.terraform?.required_providers,
    hasDescriptions: Object.values(config.variable || {}).some(
      v => v.description
    ),
    hasOutputDescriptions: Object.values(config.output || {}).some(
      o => o.description
    ),
    usesLocals: !!config.locals,
    usesModules: !!config.module,
  };

  return analysis;
}

async function analyzeKubernetesConfig(config) {
  const analysis = {
    resource: {},
    metadata: {},
    security: {},
    bestPractices: {},
  };

  // Analyze resource
  analysis.resource = {
    kind: config.kind,
    apiVersion: config.apiVersion,
    name: config.metadata.name,
    namespace: config.metadata.namespace || 'default',
  };

  // Analyze metadata
  analysis.metadata = {
    labels: config.metadata.labels || {},
    annotations: config.metadata.annotations || {},
    labelCount: Object.keys(config.metadata.labels || {}).length,
    annotationCount: Object.keys(config.metadata.annotations || {}).length,
  };

  // Security analysis
  analysis.security = {
    hasLabels: Object.keys(config.metadata.labels || {}).length > 0,
    hasAnnotations: Object.keys(config.metadata.annotations || {}).length > 0,
    hasNamespace: !!config.metadata.namespace,
  };

  // Best practices analysis
  analysis.bestPractices = {
    hasLabels: Object.keys(config.metadata.labels || {}).length > 0,
    hasNamespace: !!config.metadata.namespace,
    hasAnnotations: Object.keys(config.metadata.annotations || {}).length > 0,
  };

  return analysis;
}

async function analyzeDockerComposeConfig(config) {
  const analysis = {
    services: {},
    volumes: {},
    networks: {},
    security: {},
    bestPractices: {},
  };

  // Analyze services
  analysis.services = Object.entries(config.services).reduce(
    (acc, [name, service]) => {
      acc[name] = {
        image: service.image,
        hasBuild: !!service.build,
        portCount: (service.ports || []).length,
        environmentCount: Object.keys(service.environment || {}).length,
        volumeCount: (service.volumes || []).length,
        dependsOn: service.depends_on || [],
      };
      return acc;
    },
    {}
  );

  // Analyze volumes
  analysis.volumes = config.volumes || {};

  // Analyze networks
  analysis.networks = config.networks || {};

  // Security analysis
  analysis.security = {
    hasSecrets: !!config.secrets,
    hasConfigs: !!config.configs,
    hasNetworks: Object.keys(config.networks || {}).length > 0,
  };

  // Best practices analysis
  analysis.bestPractices = {
    hasVersion: !!config.version,
    hasNetworks: Object.keys(config.networks || {}).length > 0,
    hasVolumes: Object.keys(config.volumes || {}).length > 0,
    hasDependencies: Object.values(config.services).some(
      s => s.depends_on && s.depends_on.length > 0
    ),
  };

  return analysis;
}

async function analyzeDockerfileConfig(config) {
  const analysis = {
    instructions: {},
    security: {},
    bestPractices: {},
  };

  // Analyze instructions
  analysis.instructions = {
    total: config.instructions.length,
    types: [...new Set(config.instructions.map(inst => inst.instruction))],
    countByType: config.instructions.reduce((acc, inst) => {
      acc[inst.instruction] = (acc[inst.instruction] || 0) + 1;
      return acc;
    }, {}),
  };

  // Security analysis
  analysis.security = {
    hasUser: !!config.user,
    hasExposedPorts: (config.exposedPorts || []).length > 0,
    hasEnvironment: Object.keys(config.environment || {}).length > 0,
  };

  // Best practices analysis
  analysis.bestPractices = {
    hasUser: !!config.user,
    hasWorkingDir: !!config.workingDir,
    hasExposedPorts: (config.exposedPorts || []).length > 0,
    hasEnvironment: Object.keys(config.environment || {}).length > 0,
  };

  return analysis;
}

function generateRecommendations(analysis, configType) {
  const recommendations = [];

  switch (configType) {
    case 'terraform':
      if (!analysis.details.security.hasBackend) {
        recommendations.push(
          'Consider adding a backend configuration for state management'
        );
      }
      if (!analysis.details.security.hasRequiredProviders) {
        recommendations.push(
          'Add required_providers block to pin provider versions'
        );
      }
      if (!analysis.details.bestPractices.hasVersionConstraints) {
        recommendations.push(
          'Add version constraints to prevent breaking changes'
        );
      }
      break;

    case 'kubernetes':
      if (!analysis.details.security.hasLabels) {
        recommendations.push('Add labels to improve resource organization');
      }
      if (!analysis.details.security.hasNamespace) {
        recommendations.push(
          'Specify a namespace for better resource isolation'
        );
      }
      break;

    case 'docker-compose':
      if (!analysis.details.bestPractices.hasVersion) {
        recommendations.push('Specify a Compose file version');
      }
      if (!analysis.details.bestPractices.hasNetworks) {
        recommendations.push(
          'Define custom networks for better service isolation'
        );
      }
      break;

    case 'dockerfile':
      if (!analysis.details.bestPractices.hasUser) {
        recommendations.push('Add a USER instruction to avoid running as root');
      }
      if (!analysis.details.bestPractices.hasWorkingDir) {
        recommendations.push('Set a working directory for better organization');
      }
      break;
  }

  return recommendations;
}

function getSchemaForType(configType) {
  switch (configType) {
    case 'terraform':
      return TerraformSchema;
    case 'kubernetes':
      return KubernetesSchema;
    case 'docker-compose':
      return DockerComposeSchema;
    case 'dockerfile':
      return DockerfileSchema;
    default:
      throw new Error(`Unsupported configuration type: ${configType}`);
  }
}
```

### Step 4: Infrastructure Configuration Conversion

```javascript
async function convertInfrastructureConfig(inputFile, inputType, outputType) {
  try {
    // Read input file
    const inputData = fs.readFileSync(inputFile, 'utf8');

    // Parse input configuration
    const inputSchema = getSchemaForType(inputType);
    const parsedConfig = await parseFrom(inputSchema, inputType, inputData);

    // Convert to output format
    const outputSchema = getSchemaForType(outputType);
    const outputData = await formatTo(outputSchema, outputType, parsedConfig);

    // Save output
    const outputFile = inputFile.replace(/\.[^/.]+$/, '') + `.${outputType}`;
    fs.writeFileSync(outputFile, outputData);

    return {
      success: true,
      inputFile,
      outputFile,
      inputType,
      outputType,
      fileSize: outputData.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      inputFile,
      inputType,
      outputType,
    };
  }
}
```

## 🔧 Variations

### Variation 1: Multi-Environment Configuration Management

```javascript
async function manageMultiEnvironmentConfigs(baseConfig, environments) {
  try {
    const results = [];

    for (const environment of environments) {
      const envConfig = await generateEnvironmentConfig(
        baseConfig,
        environment
      );
      const outputData = await formatTo(
        InfrastructureConfigSchema,
        'yaml',
        envConfig
      );

      const outputFile = `config-${environment.name}.yaml`;
      fs.writeFileSync(outputFile, outputData);

      results.push({
        environment: environment.name,
        config: envConfig,
        outputFile,
      });
    }

    return {
      success: true,
      results,
      totalEnvironments: environments.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function generateEnvironmentConfig(baseConfig, environment) {
  const envConfig = { ...baseConfig };

  // Override environment-specific values
  envConfig.environment = environment.name;
  envConfig.region = environment.region;
  envConfig.provider = environment.provider;

  // Override resource configurations
  if (environment.resourceOverrides) {
    envConfig.resources = envConfig.resources.map(resource => {
      const override = environment.resourceOverrides[resource.type];
      if (override) {
        return {
          ...resource,
          configuration: { ...resource.configuration, ...override },
        };
      }
      return resource;
    });
  }

  // Add environment-specific metadata
  envConfig.metadata = {
    ...envConfig.metadata,
    environment: environment.name,
    region: environment.region,
    provider: environment.provider,
    generatedAt: new Date().toISOString(),
  };

  return envConfig;
}
```

### Variation 2: Infrastructure Configuration Validation

```javascript
async function validateInfrastructureConfig(
  configFile,
  configType,
  validationRules
) {
  try {
    // Read and parse configuration
    const configData = fs.readFileSync(configFile, 'utf8');
    const schema = getSchemaForType(configType);
    const parsedConfig = await parseFrom(schema, configType, configData);

    const validation = {
      file: configFile,
      type: configType,
      valid: true,
      errors: [],
      warnings: [],
      summary: {
        totalRules: validationRules.length,
        passed: 0,
        failed: 0,
        warnings: 0,
      },
    };

    // Apply validation rules
    for (const rule of validationRules) {
      const result = await applyValidationRule(parsedConfig, rule, configType);

      if (result.valid) {
        validation.summary.passed++;
      } else {
        validation.summary.failed++;
        validation.valid = false;
        validation.errors.push({
          rule: rule.name,
          message: result.message,
          severity: result.severity,
        });
      }

      if (result.warnings) {
        validation.summary.warnings += result.warnings.length;
        validation.warnings.push(...result.warnings);
      }
    }

    return {
      success: true,
      validation,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      file: configFile,
    };
  }
}

async function applyValidationRule(config, rule, configType) {
  const result = {
    valid: true,
    message: '',
    severity: 'error',
    warnings: [],
  };

  switch (rule.type) {
    case 'required_field':
      result.valid = hasRequiredField(config, rule.field);
      if (!result.valid) {
        result.message = `Required field '${rule.field}' is missing`;
      }
      break;

    case 'field_value':
      result.valid = hasFieldValue(config, rule.field, rule.value);
      if (!result.valid) {
        result.message = `Field '${rule.field}' must have value '${rule.value}'`;
      }
      break;

    case 'field_pattern':
      result.valid = matchesFieldPattern(config, rule.field, rule.pattern);
      if (!result.valid) {
        result.message = `Field '${rule.field}' must match pattern '${rule.pattern}'`;
      }
      break;

    case 'resource_count':
      result.valid = hasResourceCount(config, rule.min, rule.max);
      if (!result.valid) {
        result.message = `Resource count must be between ${rule.min} and ${rule.max}`;
      }
      break;

    case 'security_check':
      result.valid = passesSecurityCheck(config, rule.check);
      if (!result.valid) {
        result.message = `Security check '${rule.check}' failed`;
      }
      break;

    default:
      result.valid = false;
      result.message = `Unknown validation rule type: ${rule.type}`;
  }

  return result;
}

function hasRequiredField(config, field) {
  const fieldPath = field.split('.');
  let current = config;

  for (const part of fieldPath) {
    if (current[part] === undefined) {
      return false;
    }
    current = current[part];
  }

  return true;
}

function hasFieldValue(config, field, value) {
  const fieldPath = field.split('.');
  let current = config;

  for (const part of fieldPath) {
    if (current[part] === undefined) {
      return false;
    }
    current = current[part];
  }

  return current === value;
}

function matchesFieldPattern(config, field, pattern) {
  const fieldPath = field.split('.');
  let current = config;

  for (const part of fieldPath) {
    if (current[part] === undefined) {
      return false;
    }
    current = current[part];
  }

  const regex = new RegExp(pattern);
  return regex.test(String(current));
}

function hasResourceCount(config, min, max) {
  let count = 0;

  if (config.resource) {
    count = Object.keys(config.resource).length;
  }

  return count >= min && count <= max;
}

function passesSecurityCheck(config, check) {
  switch (check) {
    case 'has_backend':
      return !!config.terraform?.backend;
    case 'has_required_providers':
      return !!config.terraform?.required_providers;
    case 'has_labels':
      return Object.keys(config.metadata?.labels || {}).length > 0;
    case 'has_namespace':
      return !!config.metadata?.namespace;
    default:
      return true;
  }
}
```

### Variation 3: Infrastructure Configuration Templating

```javascript
async function generateInfrastructureTemplate(
  templateFile,
  variables,
  outputFile
) {
  try {
    // Read template file
    const templateData = fs.readFileSync(templateFile, 'utf8');

    // Process template with variables
    const processedTemplate = await processTemplate(templateData, variables);

    // Save processed template
    fs.writeFileSync(outputFile, processedTemplate);

    return {
      success: true,
      templateFile,
      outputFile,
      variables: Object.keys(variables),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      templateFile,
    };
  }
}

async function processTemplate(template, variables) {
  let processed = template;

  // Replace {{variable}} placeholders
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    processed = processed.replace(placeholder, String(value));
  });

  // Replace ${variable} placeholders
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = new RegExp(`\\$\\{${key}\\}`, 'g');
    processed = processed.replace(placeholder, String(value));
  });

  // Process conditional blocks
  processed = await processConditionalBlocks(processed, variables);

  // Process loops
  processed = await processLoops(processed, variables);

  return processed;
}

async function processConditionalBlocks(template, variables) {
  // Process {{#if variable}}...{{/if}} blocks
  const ifPattern = /{{#if\s+(\w+)}}(.*?){{\/if}}/gs;

  return template.replace(ifPattern, (match, variable, content) => {
    if (variables[variable]) {
      return content;
    }
    return '';
  });
}

async function processLoops(template, variables) {
  // Process {{#each array}}...{{/each}} blocks
  const eachPattern = /{{#each\s+(\w+)}}(.*?){{\/each}}/gs;

  return template.replace(eachPattern, (match, variable, content) => {
    const array = variables[variable];
    if (Array.isArray(array)) {
      return array
        .map(item => {
          let itemContent = content;
          Object.entries(item).forEach(([key, value]) => {
            const placeholder = new RegExp(`{{${key}}}`, 'g');
            itemContent = itemContent.replace(placeholder, String(value));
          });
          return itemContent;
        })
        .join('');
    }
    return '';
  });
}
```

## ⚠️ Common Pitfalls

### 1. Missing Configuration Validation

```javascript
// ❌ Wrong - no validation
const config = JSON.parse(configFile);

// ✅ Correct - validate configuration structure
const config = await parseFrom(InfrastructureConfigSchema, 'yaml', configFile);
```

### 2. Hardcoded Values

```javascript
// ❌ Wrong - hardcoded values
const config = {
  region: 'us-west-2',
  instanceType: 't3.medium',
};

// ✅ Correct - use variables
const config = {
  region: '${var.region}',
  instanceType: '${var.instance_type}',
};
```

### 3. Missing Environment Separation

```javascript
// ❌ Wrong - same config for all environments
const config = generateConfig();

// ✅ Correct - environment-specific configs
const config = generateEnvironmentConfig(baseConfig, environment);
```

## 🚀 Advanced Techniques

### 1. Infrastructure Configuration Drift Detection

```javascript
async function detectConfigurationDrift(currentConfig, desiredConfig) {
  try {
    const drift = {
      hasDrift: false,
      differences: [],
      summary: {
        added: 0,
        removed: 0,
        modified: 0,
      },
    };

    // Compare configurations
    const differences = compareConfigurations(currentConfig, desiredConfig);

    if (differences.length > 0) {
      drift.hasDrift = true;
      drift.differences = differences;

      // Count changes by type
      differences.forEach(diff => {
        switch (diff.type) {
          case 'added':
            drift.summary.added++;
            break;
          case 'removed':
            drift.summary.removed++;
            break;
          case 'modified':
            drift.summary.modified++;
            break;
        }
      });
    }

    return {
      success: true,
      drift,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

function compareConfigurations(current, desired) {
  const differences = [];

  // Compare resources
  const currentResources = current.resources || [];
  const desiredResources = desired.resources || [];

  // Find added resources
  desiredResources.forEach(desired => {
    const current = currentResources.find(
      r => r.type === desired.type && r.name === desired.name
    );
    if (!current) {
      differences.push({
        type: 'added',
        resource: desired,
        message: `Resource ${desired.type}.${desired.name} was added`,
      });
    }
  });

  // Find removed resources
  currentResources.forEach(current => {
    const desired = desiredResources.find(
      r => r.type === current.type && r.name === current.name
    );
    if (!desired) {
      differences.push({
        type: 'removed',
        resource: current,
        message: `Resource ${current.type}.${current.name} was removed`,
      });
    }
  });

  // Find modified resources
  currentResources.forEach(current => {
    const desired = desiredResources.find(
      r => r.type === current.type && r.name === current.name
    );
    if (desired) {
      const configDiff = compareResourceConfigurations(
        current.configuration,
        desired.configuration
      );
      if (configDiff.length > 0) {
        differences.push({
          type: 'modified',
          resource: current,
          changes: configDiff,
          message: `Resource ${current.type}.${current.name} was modified`,
        });
      }
    }
  });

  return differences;
}

function compareResourceConfigurations(current, desired) {
  const changes = [];

  // Compare configuration properties
  const allKeys = new Set([
    ...Object.keys(current || {}),
    ...Object.keys(desired || {}),
  ]);

  allKeys.forEach(key => {
    const currentValue = current?.[key];
    const desiredValue = desired?.[key];

    if (currentValue !== desiredValue) {
      changes.push({
        property: key,
        current: currentValue,
        desired: desiredValue,
      });
    }
  });

  return changes;
}
```

### 2. Infrastructure Configuration Optimization

```javascript
async function optimizeInfrastructureConfig(config) {
  try {
    const optimized = { ...config };

    // Optimize resources
    if (optimized.resources) {
      optimized.resources = optimized.resources.map(resource =>
        optimizeResource(resource)
      );
    }

    // Optimize dependencies
    if (optimized.dependencies) {
      optimized.dependencies = optimizeDependencies(optimized.dependencies);
    }

    // Add optimization metadata
    optimized.metadata = {
      ...optimized.metadata,
      optimizedAt: new Date().toISOString(),
      optimizationVersion: '1.0.0',
    };

    return {
      success: true,
      optimized,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

function optimizeResource(resource) {
  const optimized = { ...resource };

  // Optimize configuration based on resource type
  switch (resource.type) {
    case 'aws_instance':
      optimized.configuration = optimizeEC2Instance(optimized.configuration);
      break;
    case 'aws_s3_bucket':
      optimized.configuration = optimizeS3Bucket(optimized.configuration);
      break;
    case 'kubernetes_deployment':
      optimized.configuration = optimizeKubernetesDeployment(
        optimized.configuration
      );
      break;
  }

  return optimized;
}

function optimizeEC2Instance(config) {
  const optimized = { ...config };

  // Add default security groups if not specified
  if (!optimized.security_groups) {
    optimized.security_groups = ['default'];
  }

  // Add default tags if not specified
  if (!optimized.tags) {
    optimized.tags = {
      Name: optimized.name || 'default-instance',
      Environment: 'production',
    };
  }

  return optimized;
}

function optimizeS3Bucket(config) {
  const optimized = { ...config };

  // Add versioning if not specified
  if (optimized.versioning === undefined) {
    optimized.versioning = { enabled: true };
  }

  // Add encryption if not specified
  if (!optimized.server_side_encryption_configuration) {
    optimized.server_side_encryption_configuration = {
      rule: {
        apply_server_side_encryption_by_default: {
          sse_algorithm: 'AES256',
        },
      },
    };
  }

  return optimized;
}

function optimizeKubernetesDeployment(config) {
  const optimized = { ...config };

  // Add resource limits if not specified
  if (!optimized.spec?.template?.spec?.containers?.[0]?.resources) {
    optimized.spec.template.spec.containers[0].resources = {
      limits: {
        cpu: '500m',
        memory: '512Mi',
      },
      requests: {
        cpu: '250m',
        memory: '256Mi',
      },
    };
  }

  // Add liveness probe if not specified
  if (!optimized.spec?.template?.spec?.containers?.[0]?.livenessProbe) {
    optimized.spec.template.spec.containers[0].livenessProbe = {
      httpGet: {
        path: '/health',
        port: 8080,
      },
      initialDelaySeconds: 30,
      periodSeconds: 10,
    };
  }

  return optimized;
}

function optimizeDependencies(dependencies) {
  // Remove circular dependencies
  const optimized = [...dependencies];

  // Sort dependencies to minimize conflicts
  optimized.sort();

  return optimized;
}
```

## 📊 Performance Tips

### 1. Parallel Configuration Processing

```javascript
async function processMultipleConfigurations(configFiles) {
  const results = await Promise.allSettled(
    configFiles.map(async file => {
      try {
        const result = await processInfrastructureConfig(
          file.path,
          file.type,
          file.outputFormat
        );
        return { file: file.path, success: true, result };
      } catch (error) {
        return { file: file.path, success: false, error: error.message };
      }
    })
  );

  return results.map((result, index) => ({
    file: configFiles[index].path,
    ...result.value,
  }));
}
```

### 2. Configuration Caching

```javascript
const configCache = new Map();

async function getCachedConfiguration(configFile) {
  const cacheKey = configFile;
  const cached = configCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < 3600000) {
    // 1 hour TTL
    return cached.data;
  }

  const configData = fs.readFileSync(configFile, 'utf8');
  const parsedConfig = await parseFrom(
    InfrastructureConfigSchema,
    'yaml',
    configData
  );

  configCache.set(cacheKey, {
    data: parsedConfig,
    timestamp: Date.now(),
  });

  return parsedConfig;
}
```

## 🧪 Testing

### Unit Tests

```javascript
import { describe, it, expect } from 'vitest';

describe('Infrastructure Configuration', () => {
  it('should process Terraform config correctly', async () => {
    const result = await processInfrastructureConfig(
      'test.tf',
      'terraform',
      'json'
    );

    expect(result.success).toBe(true);
    expect(result.config).toBeDefined();
    expect(result.outputFile).toBeDefined();
  });

  it('should analyze Kubernetes config correctly', async () => {
    const result = await analyzeInfrastructureConfig('test.yaml', 'kubernetes');

    expect(result.success).toBe(true);
    expect(result.analysis).toBeDefined();
    expect(result.analysis.summary).toBeDefined();
  });

  it('should convert Docker Compose config correctly', async () => {
    const result = await convertInfrastructureConfig(
      'test.yml',
      'docker-compose',
      'yaml'
    );

    expect(result.success).toBe(true);
    expect(result.outputFile).toBeDefined();
    expect(result.outputType).toBe('yaml');
  });

  it('should validate infrastructure config correctly', async () => {
    const validationRules = [
      { type: 'required_field', field: 'metadata.name' },
      { type: 'field_value', field: 'environment', value: 'production' },
    ];

    const result = await validateInfrastructureConfig(
      'test.yaml',
      'kubernetes',
      validationRules
    );

    expect(result.success).toBe(true);
    expect(result.validation).toBeDefined();
    expect(result.validation.valid).toBeDefined();
  });
});
```

---

**Next: [Document Intelligence Cookbook](document-intelligence.md)**


