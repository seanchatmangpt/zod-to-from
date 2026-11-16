/**
 * @typedef {import('../core/registry.mjs').Adapter} Adapter
 */

import { z } from 'zod';
import { createPackManifest, registerPack } from '../core/index.mjs';

// ============================================================================
// Zod Validation Schemas (80/20 Rule: Common Fields & Patterns)
// ============================================================================

// Docker Compose Schema - covers ~80% of common use cases
const dockerComposeServiceSchema = z.object({
  image: z.string().optional(),
  build: z.union([
    z.string(),
    z.object({
      context: z.string().optional(),
      dockerfile: z.string().optional(),
      args: z.record(z.string()).optional(),
    })
  ]).optional(),
  ports: z.array(z.union([z.string(), z.number()])).optional(),
  environment: z.union([
    z.record(z.union([z.string(), z.number(), z.boolean()])),
    z.array(z.string())
  ]).optional(),
  volumes: z.array(z.string()).optional(),
  depends_on: z.union([
    z.array(z.string()),
    z.record(z.object({
      condition: z.string().optional()
    }))
  ]).optional(),
  command: z.union([z.string(), z.array(z.string())]).optional(),
  networks: z.union([z.array(z.string()), z.record(z.object({}))]).optional(),
  restart: z.enum(['no', 'always', 'on-failure', 'unless-stopped']).optional(),
  healthcheck: z.object({
    test: z.union([z.string(), z.array(z.string())]).optional(),
    interval: z.string().optional(),
    timeout: z.string().optional(),
    retries: z.number().optional(),
  }).optional(),
}).passthrough(); // Allow additional fields

const dockerComposeSchema = z.object({
  version: z.string().optional(),
  services: z.record(dockerComposeServiceSchema).optional(),
  networks: z.record(z.object({}).passthrough()).optional(),
  volumes: z.record(z.object({}).passthrough()).optional(),
}).passthrough();

// Kubernetes Schema - covers ~80% of common resources
const k8sMetadataSchema = z.object({
  name: z.string(),
  namespace: z.string().optional(),
  labels: z.record(z.string()).optional(),
  annotations: z.record(z.string()).optional(),
}).passthrough();

const k8sContainerSchema = z.object({
  name: z.string(),
  image: z.string(),
  ports: z.array(z.object({
    containerPort: z.number(),
    protocol: z.enum(['TCP', 'UDP']).optional(),
  }).passthrough()).optional(),
  env: z.array(z.object({
    name: z.string(),
    value: z.string().optional(),
    valueFrom: z.object({}).passthrough().optional(),
  }).passthrough()).optional(),
  volumeMounts: z.array(z.object({
    name: z.string(),
    mountPath: z.string(),
  }).passthrough()).optional(),
  resources: z.object({
    limits: z.record(z.string()).optional(),
    requests: z.record(z.string()).optional(),
  }).optional(),
}).passthrough();

const k8sSchema = z.object({
  apiVersion: z.string(),
  kind: z.string(),
  metadata: k8sMetadataSchema,
  spec: z.object({}).passthrough().optional(),
  status: z.object({}).passthrough().optional(),
}).passthrough();

// Terraform HCL Schema - basic structure validation
const terraformBlockSchema = z.object({
  type: z.string(),
  labels: z.array(z.string()).optional(),
  body: z.array(z.any()).optional(),
}).passthrough();

const terraformSchema = z.object({
  body: z.array(terraformBlockSchema).optional(),
}).passthrough();

// ============================================================================
// Docker Compose Adapter
// ============================================================================

/**
 * Docker Compose adapter for parsing and formatting docker-compose.yml files
 * Uses js-yaml library for YAML processing with Zod schema validation
 */
const composeAdapter = {
  async parse(input, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const yaml = await import('js-yaml');

      const { schema = yaml.DEFAULT_SCHEMA, json = false, validate = true, ...otherOpts } = opts;

      const parseOptions = {
        schema,
        json,
        ...otherOpts,
      };

      const data = yaml.load(input, parseOptions);

      // Schema validation (enabled by default)
      if (validate) {
        const result = dockerComposeSchema.safeParse(data);
        if (!result.success) {
          const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
          throw new Error(`Invalid Docker Compose structure: ${errors}`);
        }

        // Security checks for common issues
        const securityIssues = [];

        if (data.services) {
          for (const [serviceName, service] of Object.entries(data.services)) {
            // Check for exposed privileged ports
            if (service.ports) {
              const privilegedPorts = service.ports
                .map(p => typeof p === 'string' ? p.split(':')[0] : p)
                .filter(p => [22, 23, 3306, 5432, 6379, 27_017].includes(Number(p)));

              if (privilegedPorts.length > 0) {
                securityIssues.push(`Service '${serviceName}' exposes privileged ports: ${privilegedPorts.join(', ')}`);
              }
            }

            // Check for environment variables that might contain secrets
            if (service.environment) {
              const envVars = Array.isArray(service.environment)
                ? service.environment
                : Object.keys(service.environment);

              const suspiciousVars = envVars.filter(v =>
                /password|secret|token|key|api[_-]?key/i.test(typeof v === 'string' ? v : v)
              );

              if (suspiciousVars.length > 0) {
                securityIssues.push(`Service '${serviceName}' may contain hardcoded secrets in environment variables`);
              }
            }

            // Validate service has either image or build
            if (!service.image && !service.build) {
              throw new Error(`Service '${serviceName}' must specify either 'image' or 'build'`);
            }
          }
        }

        if (securityIssues.length > 0 && opts.strict) {
          throw new Error(`Security issues detected: ${securityIssues.join('; ')}`);
        }
      }

      // Validate and enhance Docker Compose structure
      const enhancedData = {
        ...data,
        _metadata: {
          version: data.version || '3.8',
          serviceCount: data.services ? Object.keys(data.services).length : 0,
          networkCount: data.networks ? Object.keys(data.networks).length : 0,
          volumeCount: data.volumes ? Object.keys(data.volumes).length : 0,
          hasBuildContext: data.services
            ? Object.values(data.services).some(service => service.build)
            : false,
          exposedPorts: data.services
            ? Object.values(data.services)
                .filter(service => service.ports)
                .flatMap(service => service.ports)
            : [],
        },
      };

      return {
        data: enhancedData,
        metadata: {
          format: 'compose',
          inputSize: input.length,
          serviceCount: enhancedData._metadata.serviceCount,
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error(
          'Docker Compose support requires js-yaml library. Install with: pnpm add js-yaml'
        );
      }
      throw new Error(`Docker Compose parsing failed: ${error.message}`);
    }
  },

  async format(data, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const yaml = await import('js-yaml');

      const { indent = 2, lineWidth = 80, noRefs = true, sortKeys = false, ...otherOpts } = opts;

      // Remove metadata before formatting
      const { _metadata, ...composeData } = data;

      const dumpOptions = {
        indent,
        lineWidth,
        noRefs,
        sortKeys,
        ...otherOpts,
      };

      const yamlString = yaml.dump(composeData, dumpOptions);

      return {
        data: yamlString,
        metadata: {
          format: 'compose',
          outputSize: yamlString.length,
          serviceCount: _metadata?.serviceCount || 0,
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error(
          'Docker Compose support requires js-yaml library. Install with: pnpm add js-yaml'
        );
      }
      throw new Error(`Docker Compose formatting failed: ${error.message}`);
    }
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

// ============================================================================
// Dockerfile Adapter
// ============================================================================

/**
 * Dockerfile adapter for parsing and formatting Dockerfile content
 * Uses docker-file-parser library for Dockerfile processing
 */
const dockerfileAdapter = {
  async parse(input, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const { parse } = await import('docker-file-parser');

      const { includeComments = true, includeEmpty = false, ...otherOpts } = opts;

      const parseOptions = {
        includeComments,
        includeEmpty,
        ...otherOpts,
      };

      const instructions = parse(input, parseOptions);

      // Transform instructions into a more structured format
      const data = {
        instructions: instructions.map((instruction, index) => ({
          index,
          name: instruction.name,
          args: instruction.args,
          raw: instruction.raw,
          lineNumber: instruction.lineNumber,
        })),
        metadata: {
          totalInstructions: instructions.length,
          baseImage: instructions.find(inst => inst.name === 'FROM')?.args,
          exposedPorts: instructions
            .filter(inst => inst.name === 'EXPOSE')
            .flatMap(inst => inst.args),
          environmentVariables: (() => {
            const env = {};
            for (const inst of instructions.filter(inst => inst.name === 'ENV')) {
              if (Array.isArray(inst.args)) {
                for (const arg of inst.args) {
                  const [key, value] = arg.split('=');
                  if (key && value) env[key] = value;
                }
              }
            }
            return env;
          })(),
        },
      };

      return {
        data,
        metadata: {
          format: 'dockerfile',
          inputSize: input.length,
          instructionCount: instructions.length,
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error(
          'Dockerfile support requires docker-file-parser library. Install with: pnpm add docker-file-parser'
        );
      }
      throw new Error(`Dockerfile parsing failed: ${error.message}`);
    }
  },

  async format(data, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const { stringify } = await import('docker-file-parser');

      const { newline = '\n', ...otherOpts } = opts;

      // Convert structured data back to instructions format
      const instructions =
        data.instructions?.map(inst => ({
          name: inst.name,
          args: inst.args,
          raw: inst.raw,
        })) || [];

      const dockerfileString = stringify(instructions, {
        newline,
        ...otherOpts,
      });

      return {
        data: dockerfileString,
        metadata: {
          format: 'dockerfile',
          outputSize: dockerfileString.length,
          instructionCount: instructions.length,
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error(
          'Dockerfile support requires docker-file-parser library. Install with: pnpm add docker-file-parser'
        );
      }
      throw new Error(`Dockerfile formatting failed: ${error.message}`);
    }
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

// ============================================================================
// Environment Variables Adapter
// ============================================================================

/**
 * Environment variables adapter for parsing and formatting .env files
 */
const envAdapter = {
  async parse(input, opts = {}) {
    const lines = input.split('\n');
    const data = {};
    const comments = [];

    for (const [i, line] of lines.entries()) {
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) continue;

      // Handle comments
      if (trimmed.startsWith('#')) {
        comments.push({ line: i + 1, comment: trimmed });
        continue;
      }

      // Parse key=value pairs
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex === -1) {
        throw new Error(`Invalid environment variable format at line ${i + 1}: ${trimmed}`);
      }

      const key = trimmed.slice(0, equalIndex).trim();
      let value = trimmed.slice(equalIndex + 1).trim();

      // Remove surrounding quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // Convert boolean strings to actual booleans
      if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      }

      data[key] = value;
    }

    return {
      data,
      metadata: {
        format: 'env',
        variableCount: Object.keys(data).length,
        commentCount: comments.length,
        ...opts,
      },
    };
  },

  async format(data, opts = {}) {
    const { sort = false, comments = [] } = opts;

    let env = '';

    // Add comments first
    for (const comment of comments) {
      env += `# ${comment}\n`;
    }

    // Add environment variables
    const entries = Object.entries(data);
    if (sort) {
      entries.sort(([a], [b]) => a.localeCompare(b));
    }

    for (const [key, value] of entries) {
      // Quote values that contain spaces or special characters
      const quotedValue = /[\s"']/.test(value) ? `"${value.replace(/"/g, String.raw`\"`)}"` : value;
      env += `${key}=${quotedValue}\n`;
    }

    return {
      data: env.trim(),
      metadata: {
        format: 'env',
        outputSize: env.length,
        variableCount: entries.length,
        ...opts,
      },
    };
  },

  supportsStreaming: true,
  isAI: false,
  version: '1.0.0',
};

// ============================================================================
// INI Adapter
// ============================================================================

/**
 * INI adapter for parsing and formatting INI files
 * Uses ini library for INI processing
 */
const iniAdapter = {
  async parse(input, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const ini = await import('ini');

      const { whitespace = true, ...otherOpts } = opts;

      const parseOptions = {
        whitespace,
        ...otherOpts,
      };

      const data = ini.parse(input, parseOptions);

      return {
        data,
        metadata: {
          format: 'ini',
          inputSize: input.length,
          sectionCount: Object.keys(data).length,
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('INI support requires ini library. Install with: pnpm add ini');
      }
      throw new Error(`INI parsing failed: ${error.message}`);
    }
  },

  async format(data, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const ini = await import('ini');

      const { whitespace = false, ...otherOpts } = opts;

      const stringifyOptions = {
        whitespace,
        ...otherOpts,
      };

      const iniString = ini.stringify(data, stringifyOptions);

      return {
        data: iniString,
        metadata: {
          format: 'ini',
          outputSize: iniString.length,
          sectionCount: Object.keys(data).length,
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('INI support requires ini library. Install with: pnpm add ini');
      }
      throw new Error(`INI formatting failed: ${error.message}`);
    }
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

// ============================================================================
// Kubernetes Adapter
// ============================================================================

/**
 * Kubernetes YAML adapter for parsing and formatting Kubernetes manifests
 * Uses js-yaml library for YAML processing with Kubernetes-specific enhancements and Zod validation
 */
const k8sAdapter = {
  async parse(input, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const yaml = await import('js-yaml');

      const { schema = yaml.DEFAULT_SCHEMA, json = false, validate = true, ...otherOpts } = opts;

      const parseOptions = {
        schema,
        json,
        ...otherOpts,
      };

      const data = yaml.load(input, parseOptions);

      // Schema validation (enabled by default)
      if (validate) {
        const result = k8sSchema.safeParse(data);
        if (!result.success) {
          const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
          throw new Error(`Invalid Kubernetes manifest: ${errors}`);
        }

        // Kubernetes-specific validations
        const validKinds = [
          'Pod', 'Deployment', 'Service', 'ConfigMap', 'Secret',
          'StatefulSet', 'DaemonSet', 'Job', 'CronJob', 'Ingress',
          'PersistentVolume', 'PersistentVolumeClaim', 'Namespace',
          'ServiceAccount', 'Role', 'RoleBinding', 'ClusterRole', 'ClusterRoleBinding'
        ];

        if (!validKinds.includes(data.kind)) {
          throw new Error(`Unknown Kubernetes kind: ${data.kind}. Expected one of: ${validKinds.join(', ')}`);
        }

        // Validate apiVersion format
        if (!/^[a-z0-9]+(\.[a-z0-9]+)*\/v[0-9]+(alpha|beta)?[0-9]*$|^v[0-9]+$/.test(data.apiVersion)) {
          throw new Error(`Invalid apiVersion format: ${data.apiVersion}`);
        }

        // Security checks for Pods and Deployments
        if (['Pod', 'Deployment', 'StatefulSet', 'DaemonSet'].includes(data.kind)) {
          const podSpec = data.kind === 'Pod' ? data.spec : data.spec?.template?.spec;
          const securityIssues = [];

          if (podSpec?.containers) {
            for (const container of podSpec.containers) {
              // Check for latest tag
              if (container.image?.endsWith(':latest')) {
                securityIssues.push(`Container '${container.name}' uses :latest tag, which is not recommended for production`);
              }

              // Check for privileged mode
              if (container.securityContext?.privileged) {
                securityIssues.push(`Container '${container.name}' runs in privileged mode`);
              }

              // Check for missing resource limits
              if (!container.resources?.limits) {
                securityIssues.push(`Container '${container.name}' missing resource limits`);
              }
            }
          }

          if (securityIssues.length > 0 && opts.strict) {
            throw new Error(`Security/best practice issues detected: ${securityIssues.join('; ')}`);
          }
        }
      }

      // Enhance Kubernetes manifest with metadata
      const enhancedData = {
        ...data,
        _metadata: {
          apiVersion: data.apiVersion,
          kind: data.kind,
          name: data.metadata?.name,
          namespace: data.metadata?.namespace || 'default',
          labels: data.metadata?.labels || {},
          annotations: data.metadata?.annotations || {},
          hasSpec: !!data.spec,
          hasStatus: !!data.status,
          resourceType: data.kind?.toLowerCase(),
        },
      };

      return {
        data: enhancedData,
        metadata: {
          format: 'k8s',
          inputSize: input.length,
          kind: data.kind,
          apiVersion: data.apiVersion,
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error(
          'Kubernetes YAML support requires js-yaml library. Install with: pnpm add js-yaml'
        );
      }
      throw new Error(`Kubernetes YAML parsing failed: ${error.message}`);
    }
  },

  async format(data, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const yaml = await import('js-yaml');

      const { indent = 2, lineWidth = 80, noRefs = true, sortKeys = false, ...otherOpts } = opts;

      // Remove metadata before formatting
      const { _metadata, ...k8sData } = data;

      const dumpOptions = {
        indent,
        lineWidth,
        noRefs,
        sortKeys,
        ...otherOpts,
      };

      const yamlString = yaml.dump(k8sData, dumpOptions);

      return {
        data: yamlString,
        metadata: {
          format: 'k8s',
          outputSize: yamlString.length,
          kind: _metadata?.kind,
          apiVersion: _metadata?.apiVersion,
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error(
          'Kubernetes YAML support requires js-yaml library. Install with: pnpm add js-yaml'
        );
      }
      throw new Error(`Kubernetes YAML formatting failed: ${error.message}`);
    }
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

// ============================================================================
// Terraform HCL Adapter
// ============================================================================

/**
 * Terraform HCL adapter for parsing and formatting Terraform configuration files
 * Uses hcl2-parser library for HCL processing with Zod schema validation
 */
const terraformHclAdapter = {
  async parse(input, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const { parse } = await import('hcl2-parser');

      const { withSourceMap = false, validate = true, ...otherOpts } = opts;

      const parseOptions = {
        withSourceMap,
        ...otherOpts,
      };

      const ast = parse(input, parseOptions);

      // Schema validation (enabled by default)
      if (validate) {
        const result = terraformSchema.safeParse(ast);
        if (!result.success) {
          const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
          throw new Error(`Invalid Terraform HCL structure: ${errors}`);
        }

        // Terraform-specific validations
        const validBlockTypes = new Set([
          'terraform', 'provider', 'resource', 'data', 'variable',
          'output', 'locals', 'module', 'terraform_provider'
        ]);

        const issues = [];

        if (ast.body) {
          for (const block of ast.body) {
            // Check for valid block types
            if (!validBlockTypes.has(block.type)) {
              issues.push(`Unknown Terraform block type: ${block.type}`);
            }

            // Resource blocks should have 2 labels (type and name)
            if (block.type === 'resource' && (!block.labels || block.labels.length !== 2)) {
              issues.push(`Resource block must have exactly 2 labels (type and name)`);
            }

            // Data blocks should have 2 labels (type and name)
            if (block.type === 'data' && (!block.labels || block.labels.length !== 2)) {
              issues.push(`Data block must have exactly 2 labels (type and name)`);
            }

            // Variable blocks should have 1 label (name)
            if (block.type === 'variable' && (!block.labels || block.labels.length !== 1)) {
              issues.push(`Variable block must have exactly 1 label (name)`);
            }

            // Output blocks should have 1 label (name)
            if (block.type === 'output' && (!block.labels || block.labels.length !== 1)) {
              issues.push(`Output block must have exactly 1 label (name)`);
            }
          }
        }

        // Security checks
        const resources = ast.body?.filter(b => b.type === 'resource') || [];

        for (const resource of resources) {
          const [resourceType] = resource.labels || [];

          // Check for publicly accessible resources
          if (resourceType?.includes('security_group') || resourceType?.includes('firewall')) {
            issues.push(`Security group/firewall resource detected - ensure proper ingress rules`);
          }

          // Check for unencrypted storage
          if (resourceType?.includes('bucket') || resourceType?.includes('storage')) {
            issues.push(`Storage resource detected - ensure encryption is enabled`);
          }
        }

        if (issues.length > 0 && opts.strict) {
          throw new Error(`Terraform validation issues: ${issues.join('; ')}`);
        }
      }

      // Transform AST into a more usable format
      const data = {
        ast,
        _metadata: {
          hasProvider: ast.body?.some(block => block.type === 'terraform_provider'),
          hasResource: ast.body?.some(block => block.type === 'resource'),
          hasData: ast.body?.some(block => block.type === 'data'),
          hasVariable: ast.body?.some(block => block.type === 'variable'),
          hasOutput: ast.body?.some(block => block.type === 'output'),
          hasModule: ast.body?.some(block => block.type === 'module'),
          hasLocal: ast.body?.some(block => block.type === 'locals'),
          blockCount: ast.body?.length || 0,
          resourceCount: ast.body?.filter(block => block.type === 'resource').length || 0,
          dataCount: ast.body?.filter(block => block.type === 'data').length || 0,
        },
      };

      return {
        data,
        metadata: {
          format: 'terraform-hcl',
          inputSize: input.length,
          blockCount: data._metadata.blockCount,
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error(
          'Terraform HCL support requires hcl2-parser library. Install with: pnpm add hcl2-parser'
        );
      }
      throw new Error(`Terraform HCL parsing failed: ${error.message}`);
    }
  },

  async format(data, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const { stringify } = await import('hcl2-parser');

      const { indent = 2, newline = '\n', ...otherOpts } = opts;

      // Extract AST from data
      const ast = data.ast || data;

      const stringifyOptions = {
        indent,
        newline,
        ...otherOpts,
      };

      const hclString = stringify(ast, stringifyOptions);

      return {
        data: hclString,
        metadata: {
          format: 'terraform-hcl',
          outputSize: hclString.length,
          blockCount: data._metadata?.blockCount || 0,
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error(
          'Terraform HCL support requires hcl2-parser library. Install with: pnpm add hcl2-parser'
        );
      }
      throw new Error(`Terraform HCL formatting failed: ${error.message}`);
    }
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

// ============================================================================
// TOML Adapter
// ============================================================================

/**
 * TOML adapter for parsing and formatting TOML files
 * Uses @iarna/toml library for robust TOML processing with both parsing and stringifying
 */
const tomlAdapter = {
  async parse(input, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const toml = await import('@iarna/toml');

      const data = toml.parse(input);

      return {
        data,
        metadata: {
          format: 'toml',
          inputSize: input.length,
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error(
          'TOML support requires @iarna/toml library. Install with: pnpm add @iarna/toml'
        );
      }
      throw new Error(`TOML parsing failed: ${error.message}`);
    }
  },

  async format(data, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const toml = await import('@iarna/toml');

      // @iarna/toml provides proper stringification with TOML v1.0.0 compliance
      const tomlString = toml.stringify(data);

      return {
        data: tomlString,
        metadata: {
          format: 'toml',
          outputSize: tomlString.length,
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error(
          'TOML support requires @iarna/toml library. Install with: pnpm add @iarna/toml'
        );
      }
      throw new Error(`TOML formatting failed: ${error.message}`);
    }
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

// ============================================================================
// YAML Adapter
// ============================================================================

/**
 * YAML adapter for parsing and formatting YAML files
 * Uses js-yaml library for robust YAML processing
 */
const yamlAdapter = {
  async parse(input, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const yaml = await import('js-yaml');

      const { schema = yaml.DEFAULT_SCHEMA, json = false, ...otherOpts } = opts;

      const parseOptions = {
        schema,
        json,
        ...otherOpts,
      };

      const data = yaml.load(input, parseOptions);

      return {
        data,
        metadata: {
          format: 'yaml',
          inputSize: input.length,
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('YAML support requires js-yaml library. Install with: pnpm add js-yaml');
      }
      throw new Error(`YAML parsing failed: ${error.message}`);
    }
  },

  async format(data, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const yaml = await import('js-yaml');

      const { indent = 2, lineWidth = 80, noRefs = true, sortKeys = false, ...otherOpts } = opts;

      const dumpOptions = {
        indent,
        lineWidth,
        noRefs,
        sortKeys,
        ...otherOpts,
      };

      const yamlString = yaml.dump(data, dumpOptions);

      return {
        data: yamlString,
        metadata: {
          format: 'yaml',
          outputSize: yamlString.length,
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('YAML support requires js-yaml library. Install with: pnpm add js-yaml');
      }
      throw new Error(`YAML formatting failed: ${error.message}`);
    }
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

// ============================================================================
// Pack Registration
// ============================================================================

// Create pack manifest
const packManifest = createPackManifest(
  'ztf-pack-devops',
  ['compose', 'dockerfile', 'env', 'ini', 'k8s', 'terraform-hcl', 'toml', 'yaml'],
  {
    version: '1.0.0',
    description: 'DevOps & Config format adapters for ZTF',
    dependencies: [],
  }
);

// Register all adapters
const adapters = {
  compose: composeAdapter,
  dockerfile: dockerfileAdapter,
  env: envAdapter,
  ini: iniAdapter,
  k8s: k8sAdapter,
  'terraform-hcl': terraformHclAdapter,
  toml: tomlAdapter,
  yaml: yamlAdapter,
};

registerPack(packManifest, adapters);

export {
  composeAdapter,
  dockerfileAdapter,
  envAdapter,
  iniAdapter,
  k8sAdapter,
  terraformHclAdapter,
  tomlAdapter,
  yamlAdapter,
};
