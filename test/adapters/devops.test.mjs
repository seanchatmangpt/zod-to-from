/**
 * Unit tests for DevOps & Config adapters
 */

import { describe, it, expect } from 'vitest';
import { envAdapter } from '../../src/adapters/devops.mjs';

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
      expect(result.data).toContain('API_KEY="secret-key-123"');
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
        comments: ['Database configuration', 'Connection settings'] 
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
});
