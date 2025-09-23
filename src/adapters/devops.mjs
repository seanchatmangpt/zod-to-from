/**
 * @typedef {import('../core/index.mjs').Adapter} Adapter
 */

import { createPackManifest, registerPack } from '../core/index.mjs';

/**
 * Docker Compose adapter placeholder
 * Note: Would require js-yaml library
 */
const composeAdapter = {
  async parse(input, opts = {}) {
    throw new Error('Docker Compose support requires additional dependencies (js-yaml)');
  },

  async format(data, opts = {}) {
    throw new Error('Docker Compose support requires additional dependencies (js-yaml)');
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * Dockerfile adapter placeholder
 * Note: Would require docker-file-parser library
 */
const dockerfileAdapter = {
  async parse(input, opts = {}) {
    throw new Error('Dockerfile support requires additional dependencies (docker-file-parser)');
  },

  async format(data, opts = {}) {
    throw new Error('Dockerfile support requires additional dependencies (docker-file-parser)');
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
      if (!line) continue;
      
      // Handle comments
      if (line.startsWith('#')) {
        comments.push({ line: i + 1, comment: line });
        continue;
      }
      
      // Parse key=value pairs
      const equalIndex = line.indexOf('=');
      if (equalIndex === -1) {
        throw new Error(`Invalid environment variable format at line ${i + 1}: ${line}`);
      }
      
      const key = line.slice(0, equalIndex).trim();
      let value = line.slice(equalIndex + 1).trim();
      
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
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
 * INI adapter placeholder
 * Note: Would require ini library
 */
const iniAdapter = {
  async parse(input, opts = {}) {
    throw new Error('INI support requires additional dependencies (ini)');
  },

  async format(data, opts = {}) {
    throw new Error('INI support requires additional dependencies (ini)');
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * Kubernetes YAML adapter placeholder
 * Note: Would require js-yaml library
 */
const k8sAdapter = {
  async parse(input, opts = {}) {
    throw new Error('Kubernetes YAML support requires additional dependencies (js-yaml)');
  },

  async format(data, opts = {}) {
    throw new Error('Kubernetes YAML support requires additional dependencies (js-yaml)');
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * Terraform HCL adapter placeholder
 * Note: Would require hcl2-parser library
 */
const terraformHclAdapter = {
  async parse(input, opts = {}) {
    throw new Error('Terraform HCL support requires additional dependencies (hcl2-parser)');
  },

  async format(data, opts = {}) {
    throw new Error('Terraform HCL support requires additional dependencies (hcl2-parser)');
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * TOML adapter placeholder
 * Note: Would require toml library
 */
const tomlAdapter = {
  async parse(input, opts = {}) {
    throw new Error('TOML support requires additional dependencies (toml)');
  },

  async format(data, opts = {}) {
    throw new Error('TOML support requires additional dependencies (toml)');
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * YAML adapter placeholder
 * Note: Would require js-yaml library
 */
const yamlAdapter = {
  async parse(input, opts = {}) {
    throw new Error('YAML support requires additional dependencies (js-yaml)');
  },

  async format(data, opts = {}) {
    throw new Error('YAML support requires additional dependencies (js-yaml)');
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
