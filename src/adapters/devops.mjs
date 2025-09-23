/**
 * @typedef {import('../core/registry.mjs').Adapter} Adapter
 */

import { createPackManifest, registerPack } from '../core/index.mjs';

/**
 * Docker Compose adapter for parsing and formatting docker-compose.yml files
 * Uses js-yaml library for YAML processing
 */
const composeAdapter = {
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

/**
 * Kubernetes YAML adapter for parsing and formatting Kubernetes manifests
 * Uses js-yaml library for YAML processing with Kubernetes-specific enhancements
 */
const k8sAdapter = {
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

/**
 * Terraform HCL adapter for parsing and formatting Terraform configuration files
 * Uses hcl2-parser library for HCL processing
 */
const terraformHclAdapter = {
  async parse(input, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const { parse } = await import('hcl2-parser');

      const { withSourceMap = false, ...otherOpts } = opts;

      const parseOptions = {
        withSourceMap,
        ...otherOpts,
      };

      const ast = parse(input, parseOptions);

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

/**
 * TOML adapter for parsing and formatting TOML files
 * Uses toml library for TOML processing
 */
const tomlAdapter = {
  async parse(input, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const toml = await import('toml');

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
        throw new Error('TOML support requires toml library. Install with: pnpm add toml');
      }
      throw new Error(`TOML parsing failed: ${error.message}`);
    }
  },

  async format(data, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const toml = await import('toml');

      // The toml library only provides parsing, not stringifying
      // For now, we'll use a simple JSON.stringify approach
      // In a production environment, you might want to use a different library like @iarna/toml
      const { indent = 2, ...otherOpts } = opts;

      // Simple TOML-like formatting (basic implementation)
      const formatValue = (value, indentLevel = 0) => {
        const spaces = '  '.repeat(indentLevel);

        if (typeof value === 'string') {
          return `"${value.replace(/"/g, String.raw`\"`)}"`;
        } else if (typeof value === 'number') {
          return value.toString();
        } else if (typeof value === 'boolean') {
          return value.toString();
        } else if (Array.isArray(value)) {
          return `[${value.map(v => formatValue(v)).join(', ')}]`;
        } else if (typeof value === 'object' && value !== null) {
          const lines = [];
          for (const [key, val] of Object.entries(value)) {
            lines.push(`${spaces}${key} = ${formatValue(val, indentLevel + 1)}`);
          }
          return lines.join('\n');
        }
        return String(value);
      };

      const tomlString = formatValue(data);

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
        throw new Error('TOML support requires toml library. Install with: pnpm add toml');
      }
      throw new Error(`TOML formatting failed: ${error.message}`);
    }
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

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
