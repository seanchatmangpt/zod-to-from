/**
 * Unit tests for DevOps & Config adapters
 */

import { describe, expect, it } from 'vitest';
import {
  composeAdapter,
  dockerfileAdapter,
  envAdapter,
  iniAdapter,
  k8sAdapter,
  terraformHclAdapter,
  tomlAdapter,
  yamlAdapter,
} from '../../src/adapters/devops.mjs';

describe('DevOps & Config Adapters', () => {
  describe('Environment Variables Adapter', () => {
    it('should parse environment variables', async () => {
      const input = `
# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp
DEBUG=true

# API settings
API_KEY="secret-key-123"
API_URL=https://api.example.com
      `;

      const result = await envAdapter.parse(input);

      expect(result.data.DB_HOST).toBe('localhost');
      expect(result.data.DB_PORT).toBe('5432');
      expect(result.data.DB_NAME).toBe('myapp');
      expect(result.data.DEBUG).toBe(true);
      expect(result.data.API_KEY).toBe('secret-key-123');
      expect(result.data.API_URL).toBe('https://api.example.com');
      expect(result.metadata.format).toBe('env');
      expect(result.metadata.variableCount).toBe(6);
    });

    it('should format data to environment variables', async () => {
      const data = {
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_NAME: 'myapp',
        DEBUG: true,
        API_KEY: 'secret-key-123',
        API_URL: 'https://api.example.com',
      };

      const result = await envAdapter.format(data);

      expect(result.data).toContain('DB_HOST=localhost');
      expect(result.data).toContain('DB_PORT=5432');
      expect(result.data).toContain('DB_NAME=myapp');
      expect(result.data).toContain('DEBUG=true');
      expect(result.data).toContain('API_KEY=secret-key-123');
      expect(result.data).toContain('API_URL=https://api.example.com');
      expect(result.metadata.format).toBe('env');
      expect(result.metadata.variableCount).toBe(6);
    });

    it('should handle empty environment file', async () => {
      const input = '';
      const result = await envAdapter.parse(input);

      expect(result.data).toEqual({});
      expect(result.metadata.variableCount).toBe(0);
    });

    it('should handle environment file with comments only', async () => {
      const input = `
# This is a comment
# Another comment
      `;

      const result = await envAdapter.parse(input);

      expect(result.data).toEqual({});
      expect(result.metadata.variableCount).toBe(0);
      expect(result.metadata.commentCount).toBe(2);
    });

    it('should handle environment file with quoted values', async () => {
      const input = `
SINGLE_QUOTED='single quoted value'
DOUBLE_QUOTED="double quoted value"
UNQUOTED=unquoted value
      `;

      const result = await envAdapter.parse(input);

      expect(result.data.SINGLE_QUOTED).toBe('single quoted value');
      expect(result.data.DOUBLE_QUOTED).toBe('double quoted value');
      expect(result.data.UNQUOTED).toBe('unquoted value');
    });

    it('should handle environment file with special characters', async () => {
      const input = `
PASSWORD="pass word with spaces"
URL="https://example.com/path?param=value"
      `;

      const result = await envAdapter.parse(input);

      expect(result.data.PASSWORD).toBe('pass word with spaces');
      expect(result.data.URL).toBe('https://example.com/path?param=value');
    });

    it('should format with sorting option', async () => {
      const data = {
        Z_VAR: 'last',
        A_VAR: 'first',
        M_VAR: 'middle',
      };

      const result = await envAdapter.format(data, { sort: true });

      const lines = result.data.split('\n');
      expect(lines[0]).toContain('A_VAR=first');
      expect(lines[1]).toContain('M_VAR=middle');
      expect(lines[2]).toContain('Z_VAR=last');
    });

    it('should format with comments', async () => {
      const data = {
        DB_HOST: 'localhost',
        DB_PORT: 5432,
      };

      const result = await envAdapter.format(data, {
        comments: ['Database configuration', 'Connection settings'],
      });

      expect(result.data).toContain('# Database configuration');
      expect(result.data).toContain('# Connection settings');
      expect(result.data).toContain('DB_HOST=localhost');
      expect(result.data).toContain('DB_PORT=5432');
    });

    it('should throw error for invalid format', async () => {
      const input = 'INVALID_LINE_WITHOUT_EQUALS';

      await expect(envAdapter.parse(input)).rejects.toThrow('Invalid environment variable format');
    });
  });

  describe('YAML Adapter', () => {
    it('should parse YAML content', async () => {
      const input = `
name: test-app
version: 1.0.0
dependencies:
  - express
  - lodash
config:
  port: 3000
  debug: true
      `;

      const result = await yamlAdapter.parse(input);

      expect(result.data.name).toBe('test-app');
      expect(result.data.version).toBe('1.0.0');
      expect(result.data.dependencies).toEqual(['express', 'lodash']);
      expect(result.data.config.port).toBe(3000);
      expect(result.data.config.debug).toBe(true);
      expect(result.metadata.format).toBe('yaml');
    });

    it('should format data to YAML', async () => {
      const data = {
        name: 'test-app',
        version: '1.0.0',
        dependencies: ['express', 'lodash'],
        config: {
          port: 3000,
          debug: true,
        },
      };

      const result = await yamlAdapter.format(data);

      expect(result.data).toContain('name: test-app');
      expect(result.data).toContain('version: 1.0.0');
      expect(result.data).toContain('port: 3000');
      expect(result.metadata.format).toBe('yaml');
    });

    it('should handle empty YAML', async () => {
      const input = '';
      const result = await yamlAdapter.parse(input);

      expect(result.data).toBeUndefined();
      expect(result.metadata.format).toBe('yaml');
    });
  });

  describe('TOML Adapter', () => {
    it('should parse TOML content', async () => {
      const input = `
name = "test-app"
version = "1.0.0"

[dependencies]
express = "^4.18.0"
lodash = "^4.17.0"

[config]
port = 3000
debug = true
      `;

      const result = await tomlAdapter.parse(input);

      expect(result.data.name).toBe('test-app');
      expect(result.data.version).toBe('1.0.0');
      expect(result.data.dependencies.express).toBe('^4.18.0');
      expect(result.data.dependencies.lodash).toBe('^4.17.0');
      expect(result.data.config.port).toBe(3000);
      expect(result.data.config.debug).toBe(true);
      expect(result.metadata.format).toBe('toml');
    });

    it('should format data to TOML', async () => {
      const data = {
        name: 'test-app',
        version: '1.0.0',
        dependencies: {
          express: '^4.18.0',
          lodash: '^4.17.0',
        },
        config: {
          port: 3000,
          debug: true,
        },
      };

      const result = await tomlAdapter.format(data);

      expect(result.data).toContain('name = "test-app"');
      expect(result.data).toContain('version = "1.0.0"');
      expect(result.metadata.format).toBe('toml');
    });
  });

  describe('INI Adapter', () => {
    it('should parse INI content', async () => {
      const input = `
[section1]
key1 = value1
key2 = value2

[section2]
key3 = value3
key4 = value4
      `;

      const result = await iniAdapter.parse(input);

      expect(result.data.section1.key1).toBe('value1');
      expect(result.data.section1.key2).toBe('value2');
      expect(result.data.section2.key3).toBe('value3');
      expect(result.data.section2.key4).toBe('value4');
      expect(result.metadata.format).toBe('ini');
      expect(result.metadata.sectionCount).toBe(2);
    });

    it('should format data to INI', async () => {
      const data = {
        section1: {
          key1: 'value1',
          key2: 'value2',
        },
        section2: {
          key3: 'value3',
          key4: 'value4',
        },
      };

      const result = await iniAdapter.format(data);

      expect(result.data).toContain('[section1]');
      expect(result.data).toContain('key1=value1');
      expect(result.data).toContain('[section2]');
      expect(result.data).toContain('key3=value3');
      expect(result.metadata.format).toBe('ini');
      expect(result.metadata.sectionCount).toBe(2);
    });
  });

  describe('Dockerfile Adapter', () => {
    it('should handle missing docker-file-parser dependency', async () => {
      const input = `
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm", "start"]
      `;

      await expect(dockerfileAdapter.parse(input)).rejects.toThrow('Dockerfile parsing failed');
    });

    it('should handle missing docker-file-parser dependency for formatting', async () => {
      const data = {
        instructions: [
          { name: 'FROM', args: 'node:18-alpine' },
          { name: 'WORKDIR', args: '/app' },
          { name: 'COPY', args: 'package*.json ./' },
          { name: 'RUN', args: 'npm install' },
          { name: 'COPY', args: '. .' },
          { name: 'EXPOSE', args: '3000' },
          { name: 'ENV', args: 'NODE_ENV=production' },
          { name: 'CMD', args: '["npm", "start"]' },
        ],
      };

      await expect(dockerfileAdapter.format(data)).rejects.toThrow('Dockerfile formatting failed');
    });
  });

  describe('Docker Compose Adapter', () => {
    it('should parse Docker Compose content', async () => {
      const input = `
version: '3.8'
services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=myapp
volumes:
  postgres_data:
      `;

      const result = await composeAdapter.parse(input);

      expect(result.data.version).toBe('3.8');
      expect(result.data.services.web.build).toBe('.');
      expect(result.data.services.web.ports).toContain('3000:3000');
      expect(result.data.services.db.image).toBe('postgres:13');
      expect(result.data._metadata.serviceCount).toBe(2);
      expect(result.data._metadata.volumeCount).toBe(1);
      expect(result.metadata.format).toBe('compose');
    });

    it('should format Docker Compose data', async () => {
      const data = {
        version: '3.8',
        services: {
          web: {
            build: '.',
            ports: ['3000:3000'],
            environment: ['NODE_ENV=production'],
          },
          db: {
            image: 'postgres:13',
            environment: ['POSTGRES_DB=myapp'],
          },
        },
        volumes: {
          postgres_data: {},
        },
      };

      const result = await composeAdapter.format(data);

      expect(result.data).toContain("version: '3.8'");
      expect(result.data).toContain('services:');
      expect(result.data).toContain('web:');
      expect(result.data).toContain('db:');
      expect(result.metadata.format).toBe('compose');
    });
  });

  describe('Kubernetes Adapter', () => {
    it('should parse Kubernetes manifest', async () => {
      const input = `
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  namespace: default
  labels:
    app: test-app
spec:
  containers:
  - name: test-container
    image: nginx:1.20
    ports:
    - containerPort: 80
      `;

      const result = await k8sAdapter.parse(input);

      expect(result.data.apiVersion).toBe('v1');
      expect(result.data.kind).toBe('Pod');
      expect(result.data.metadata.name).toBe('test-pod');
      expect(result.data.metadata.namespace).toBe('default');
      expect(result.data.metadata.labels.app).toBe('test-app');
      expect(result.data._metadata.kind).toBe('Pod');
      expect(result.data._metadata.name).toBe('test-pod');
      expect(result.data._metadata.namespace).toBe('default');
      expect(result.metadata.format).toBe('k8s');
    });

    it('should format Kubernetes manifest', async () => {
      const data = {
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: {
          name: 'test-pod',
          namespace: 'default',
          labels: {
            app: 'test-app',
          },
        },
        spec: {
          containers: [
            {
              name: 'test-container',
              image: 'nginx:1.20',
              ports: [
                {
                  containerPort: 80,
                },
              ],
            },
          ],
        },
      };

      const result = await k8sAdapter.format(data);

      expect(result.data).toContain('apiVersion: v1');
      expect(result.data).toContain('kind: Pod');
      expect(result.data).toContain('name: test-pod');
      expect(result.metadata.format).toBe('k8s');
    });
  });

  describe('Terraform HCL Adapter', () => {
    it('should handle missing hcl2-parser dependency', async () => {
      const input = `
terraform {
  required_version = ">= 1.0"
}

provider "aws" {
  region = "us-west-2"
}

resource "aws_instance" "example" {
  ami           = "ami-0c55b159cbfafe1d0"
  instance_type = "t2.micro"
}

variable "instance_count" {
  description = "Number of instances"
  type        = number
  default     = 1
}
      `;

      await expect(terraformHclAdapter.parse(input)).rejects.toThrow(
        'Terraform HCL parsing failed'
      );
    });

    it('should handle missing hcl2-parser dependency for formatting', async () => {
      const data = {
        ast: {
          body: [
            {
              type: 'terraform',
              blockLabels: [],
              body: {
                body: [
                  {
                    type: 'attribute',
                    name: 'required_version',
                    value: '>= 1.0',
                  },
                ],
              },
            },
          ],
        },
      };

      await expect(terraformHclAdapter.format(data)).rejects.toThrow(
        'Terraform HCL formatting failed'
      );
    });
  });
});
