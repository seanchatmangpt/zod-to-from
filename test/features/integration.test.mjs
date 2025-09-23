/**
 * Integration Tests
 * @fileoverview Complex workflow and adapter interaction tests
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { convert, formatTo, parseFrom, registerAdapter } from '../setup.mjs';

describe('Integration Tests', () => {
  const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    age: z.number().min(0).max(150),
    active: z.boolean(),
    metadata: z.object({
      tags: z.array(z.string()),
      score: z.number().min(0).max(100),
      lastLogin: z.string().optional(),
    }),
  });

  const UserArraySchema = z.object({
    users: z.array(UserSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  });

  beforeEach(() => {
    // Ensure clean state for each test
  });

  describe('Complex Data Workflows', () => {
    it('should handle complex user data through multiple format conversions', async () => {
      const userData = {
        users: [
          {
            id: 'user-1',
            name: 'John Doe',
            email: 'john@example.com',
            age: 30,
            active: true,
            metadata: {
              tags: ['premium', 'verified'],
              score: 85,
              lastLogin: '2024-01-15T10:30:00Z',
            },
          },
          {
            id: 'user-2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            age: 25,
            active: false,
            metadata: {
              tags: ['basic'],
              score: 60,
            },
          },
        ],
        total: 2,
        page: 1,
        limit: 10,
      };

      // Convert through multiple formats
      const jsonResult = await formatTo(UserArraySchema, 'json', userData, { deterministic: true });
      const csvResult = await convert(UserArraySchema, { from: 'json', to: 'csv' }, jsonResult);
      const ndjsonResult = await convert(UserArraySchema, { from: 'csv', to: 'ndjson' }, csvResult);
      const finalJsonResult = await convert(
        UserArraySchema,
        { from: 'ndjson', to: 'json' },
        ndjsonResult
      );

      // Parse final result and verify data integrity
      const finalParsed = JSON.parse(finalJsonResult);
      expect(finalParsed.users).toHaveLength(2);
      expect(finalParsed.total).toBe(2);
      expect(finalParsed.page).toBe(1);
      expect(finalParsed.limit).toBe(10);
    });

    it('should handle large dataset processing workflow', async () => {
      // Generate large dataset
      const largeDataset = {
        users: Array.from({ length: 1000 }, (_, i) => ({
          id: `user-${i + 1}`,
          name: `User ${i + 1}`,
          email: `user${i + 1}@example.com`,
          age: 20 + (i % 50),
          active: i % 2 === 0,
          metadata: {
            tags: [`tag-${i % 10}`],
            score: 50 + (i % 50),
          },
        })),
        total: 1000,
        page: 1,
        limit: 1000,
      };

      const startTime = Date.now();

      // Process through multiple formats
      const jsonResult = await formatTo(UserArraySchema, 'json', largeDataset, {
        deterministic: true,
      });
      const csvResult = await convert(UserArraySchema, { from: 'json', to: 'csv' }, jsonResult);
      const ndjsonResult = await convert(UserArraySchema, { from: 'csv', to: 'ndjson' }, csvResult);
      const finalJsonResult = await convert(
        UserArraySchema,
        { from: 'ndjson', to: 'json' },
        ndjsonResult
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify data integrity
      const finalParsed = JSON.parse(finalJsonResult);
      expect(finalParsed.users).toHaveLength(1000);
      expect(finalParsed.total).toBe(1000);

      // Verify performance
      expect(duration).toBeLessThan(10_000); // Should complete within 10 seconds
    });

    it('should handle streaming workflow with large data', async () => {
      const largeDataset = {
        users: Array.from({ length: 5000 }, (_, i) => ({
          id: `user-${i + 1}`,
          name: `User ${i + 1}`,
          email: `user${i + 1}@example.com`,
          age: 20 + (i % 50),
          active: i % 2 === 0,
          metadata: {
            tags: [`tag-${i % 10}`],
            score: 50 + (i % 50),
          },
        })),
        total: 5000,
        page: 1,
        limit: 5000,
      };

      const startTime = Date.now();

      // Use streaming for large data
      const csvResult = await formatTo(UserArraySchema, 'csv', largeDataset, { streaming: true });
      const ndjsonResult = await convert(
        UserArraySchema,
        { from: 'csv', to: 'ndjson' },
        csvResult,
        { streaming: true }
      );
      const finalCsvResult = await convert(
        UserArraySchema,
        { from: 'ndjson', to: 'csv' },
        ndjsonResult,
        { streaming: true }
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify performance
      expect(duration).toBeLessThan(15_000); // Should complete within 15 seconds
      expect(finalCsvResult).toBeDefined();
    });
  });

  describe('Adapter Interaction Workflows', () => {
    it('should handle custom adapter registration and usage', async () => {
      // Register a custom adapter
      const customAdapter = {
        async parse(input, opts = {}) {
          // Custom parsing logic
          const lines = input.split('\n');
          const data = lines.map(line => {
            const [id, name, email] = line.split('|');
            return { id, name, email, age: 30, active: true, metadata: { tags: [], score: 50 } };
          });
          return { data: { users: data, total: data.length, page: 1, limit: 10 }, metadata: {} };
        },
        async format(data, opts = {}) {
          // Custom formatting logic
          const lines = data.users.map(user => `${user.id}|${user.name}|${user.email}`);
          return { data: lines.join('\n'), metadata: {} };
        },
        supportsStreaming: true,
        isAI: false,
        version: '1.0.0',
      };

      registerAdapter('custom', customAdapter);

      // Test the custom adapter
      const input = 'user-1|John Doe|john@example.com\nuser-2|Jane Smith|jane@example.com';
      const result = await parseFrom(UserArraySchema, 'custom', input);

      expect(result.users).toHaveLength(2);
      expect(result.users[0].name).toBe('John Doe');
      expect(result.users[1].name).toBe('Jane Smith');

      // Test formatting
      const formatted = await formatTo(UserArraySchema, 'custom', result);
      expect(formatted).toContain('user-1|John Doe|john@example.com');
      expect(formatted).toContain('user-2|Jane Smith|jane@example.com');
    });

    it('should handle adapter chaining and composition', async () => {
      const userData = {
        users: [
          {
            id: 'user-1',
            name: 'John Doe',
            email: 'john@example.com',
            age: 30,
            active: true,
            metadata: {
              tags: ['premium'],
              score: 85,
            },
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      };

      // Chain multiple conversions
      const step1 = await formatTo(UserArraySchema, 'json', userData, { deterministic: true });
      const step2 = await convert(UserArraySchema, { from: 'json', to: 'csv' }, step1);
      const step3 = await convert(UserArraySchema, { from: 'csv', to: 'ndjson' }, step2);
      const step4 = await convert(UserArraySchema, { from: 'ndjson', to: 'json' }, step3);
      const step5 = await convert(UserArraySchema, { from: 'json', to: 'csv' }, step4);

      // Verify each step produces valid output
      expect(step1).toBeDefined();
      expect(step2).toBeDefined();
      expect(step3).toBeDefined();
      expect(step4).toBeDefined();
      expect(step5).toBeDefined();

      // Verify final result maintains data integrity
      const finalParsed = await parseFrom(UserArraySchema, 'csv', step5);
      expect(finalParsed.users).toHaveLength(1);
      expect(finalParsed.users[0].name).toBe('John Doe');
    });

    it('should handle mixed adapter types in workflow', async () => {
      const userData = {
        users: [
          {
            id: 'user-1',
            name: 'John Doe',
            email: 'john@example.com',
            age: 30,
            active: true,
            metadata: {
              tags: ['premium'],
              score: 85,
            },
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      };

      // Mix streaming and non-streaming adapters
      const jsonResult = await formatTo(UserArraySchema, 'json', userData, { deterministic: true });
      const csvResult = await convert(UserArraySchema, { from: 'json', to: 'csv' }, jsonResult, {
        streaming: true,
      });
      const ndjsonResult = await convert(
        UserArraySchema,
        { from: 'csv', to: 'ndjson' },
        csvResult,
        { streaming: true }
      );
      const finalJsonResult = await convert(
        UserArraySchema,
        { from: 'ndjson', to: 'json' },
        ndjsonResult
      );

      // Verify data integrity
      const finalParsed = JSON.parse(finalJsonResult);
      expect(finalParsed.users).toHaveLength(1);
      expect(finalParsed.users[0].name).toBe('John Doe');
    });
  });

  describe('Error Recovery Workflows', () => {
    it('should handle partial failures in complex workflows', async () => {
      const userData = {
        users: [
          {
            id: 'user-1',
            name: 'John Doe',
            email: 'john@example.com',
            age: 30,
            active: true,
            metadata: {
              tags: ['premium'],
              score: 85,
            },
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      };

      // Start with valid data
      const jsonResult = await formatTo(UserArraySchema, 'json', userData, { deterministic: true });
      const csvResult = await convert(UserArraySchema, { from: 'json', to: 'csv' }, jsonResult);

      // Introduce an error by trying to parse malformed data
      const malformedCsv = csvResult + '\ninvalid,data,row';

      try {
        await parseFrom(UserArraySchema, 'csv', malformedCsv);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Verify that we can still process valid data after the error
      const recoveredResult = await parseFrom(UserArraySchema, 'csv', csvResult);
      expect(recoveredResult.users).toHaveLength(1);
      expect(recoveredResult.users[0].name).toBe('John Doe');
    });

    it('should handle schema validation errors in workflows', async () => {
      const invalidUserData = {
        users: [
          {
            id: 'user-1',
            name: 'John Doe',
            email: 'invalid-email', // Invalid email format
            age: 30,
            active: true,
            metadata: {
              tags: ['premium'],
              score: 85,
            },
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      };

      // Should fail at format stage due to invalid email
      try {
        await formatTo(UserArraySchema, 'json', invalidUserData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toContain('email');
      }

      // Verify that valid data still works
      const validUserData = {
        ...invalidUserData,
        users: [
          {
            ...invalidUserData.users[0],
            email: 'john@example.com', // Valid email
          },
        ],
      };

      const result = await formatTo(UserArraySchema, 'json', validUserData);
      expect(result).toBeDefined();
    });
  });

  describe('Performance Integration Tests', () => {
    it('should handle concurrent complex workflows', async () => {
      const userData = {
        users: Array.from({ length: 100 }, (_, i) => ({
          id: `user-${i + 1}`,
          name: `User ${i + 1}`,
          email: `user${i + 1}@example.com`,
          age: 20 + (i % 50),
          active: i % 2 === 0,
          metadata: {
            tags: [`tag-${i % 10}`],
            score: 50 + (i % 50),
          },
        })),
        total: 100,
        page: 1,
        limit: 100,
      };

      // Create multiple concurrent workflows
      const workflows = Array.from({ length: 10 }, (_, i) =>
        convert(UserArraySchema, { from: 'json', to: 'csv' }, JSON.stringify(userData))
      );

      const startTime = Date.now();
      const results = await Promise.all(workflows);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify all workflows completed successfully
      expect(results).toHaveLength(10);
      for (const result of results) {
        expect(result).toBeDefined();
        expect(result).toContain('id,name,email,age,active');
      }

      // Verify performance
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle memory-efficient large data processing', async () => {
      const largeDataset = {
        users: Array.from({ length: 10_000 }, (_, i) => ({
          id: `user-${i + 1}`,
          name: `User ${i + 1}`,
          email: `user${i + 1}@example.com`,
          age: 20 + (i % 50),
          active: i % 2 === 0,
          metadata: {
            tags: [`tag-${i % 10}`],
            score: 50 + (i % 50),
          },
        })),
        total: 10_000,
        page: 1,
        limit: 10_000,
      };

      const startTime = Date.now();
      const memoryBefore = process.memoryUsage();

      // Process large dataset with streaming
      const csvResult = await formatTo(UserArraySchema, 'csv', largeDataset, { streaming: true });
      const ndjsonResult = await convert(
        UserArraySchema,
        { from: 'csv', to: 'ndjson' },
        csvResult,
        { streaming: true }
      );
      const finalCsvResult = await convert(
        UserArraySchema,
        { from: 'ndjson', to: 'csv' },
        ndjsonResult,
        { streaming: true }
      );

      const endTime = Date.now();
      const memoryAfter = process.memoryUsage();
      const duration = endTime - startTime;

      // Verify results
      expect(finalCsvResult).toBeDefined();
      expect(duration).toBeLessThan(30_000); // Should complete within 30 seconds

      // Verify memory usage is reasonable (not more than 2x initial)
      const memoryIncrease = memoryAfter.heapUsed - memoryBefore.heapUsed;
      expect(memoryIncrease).toBeLessThan(memoryBefore.heapUsed * 2);
    });
  });

  describe('Real-World Scenario Tests', () => {
    it('should handle data export workflow', async () => {
      // Simulate exporting user data from database to multiple formats
      const userData = {
        users: [
          {
            id: 'user-1',
            name: 'John Doe',
            email: 'john@example.com',
            age: 30,
            active: true,
            metadata: {
              tags: ['premium', 'verified'],
              score: 85,
              lastLogin: '2024-01-15T10:30:00Z',
            },
          },
          {
            id: 'user-2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            age: 25,
            active: false,
            metadata: {
              tags: ['basic'],
              score: 60,
            },
          },
        ],
        total: 2,
        page: 1,
        limit: 10,
      };

      // Export to JSON
      const jsonExport = await formatTo(UserArraySchema, 'json', userData, { deterministic: true });

      // Export to CSV
      const csvExport = await formatTo(UserArraySchema, 'csv', userData);

      // Export to NDJSON
      const ndjsonExport = await formatTo(UserArraySchema, 'ndjson', userData);

      // Verify all exports are valid
      expect(jsonExport).toBeDefined();
      expect(csvExport).toBeDefined();
      expect(ndjsonExport).toBeDefined();

      // Verify JSON export can be parsed back
      const jsonParsed = JSON.parse(jsonExport);
      expect(jsonParsed.users).toHaveLength(2);

      // Verify CSV export can be parsed back
      const csvParsed = await parseFrom(UserArraySchema, 'csv', csvExport);
      expect(csvParsed.users).toHaveLength(2);

      // Verify NDJSON export can be parsed back
      const ndjsonParsed = await parseFrom(UserArraySchema, 'ndjson', ndjsonExport);
      expect(ndjsonParsed.users).toHaveLength(2);
    });

    it('should handle data import workflow', async () => {
      // Simulate importing user data from external sources
      const csvImport = `id,name,email,age,active
user-1,John Doe,john@example.com,30,true
user-2,Jane Smith,jane@example.com,25,false`;

      const ndjsonImport = `{"id": "user-3", "name": "Bob Johnson", "email": "bob@example.com", "age": 35, "active": true}
{"id": "user-4", "name": "Alice Brown", "email": "alice@example.com", "age": 28, "active": false}`;

      // Import from CSV
      const csvData = await parseFrom(UserArraySchema, 'csv', csvImport);

      // Import from NDJSON
      const ndjsonData = await parseFrom(UserArraySchema, 'ndjson', ndjsonImport);

      // Verify imports
      expect(csvData.users).toHaveLength(2);
      expect(ndjsonData.users).toHaveLength(2);

      // Merge and export
      const mergedData = {
        users: [...csvData.users, ...ndjsonData.users],
        total: 4,
        page: 1,
        limit: 10,
      };

      const finalExport = await formatTo(UserArraySchema, 'json', mergedData, {
        deterministic: true,
      });
      const finalParsed = JSON.parse(finalExport);

      expect(finalParsed.users).toHaveLength(4);
      expect(finalParsed.total).toBe(4);
    });

    it('should handle data transformation workflow', async () => {
      // Simulate transforming data between different systems
      const sourceData = {
        users: [
          {
            id: 'user-1',
            name: 'John Doe',
            email: 'john@example.com',
            age: 30,
            active: true,
            metadata: {
              tags: ['premium'],
              score: 85,
            },
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      };

      // Transform: JSON -> CSV -> NDJSON -> JSON
      const step1 = await formatTo(UserArraySchema, 'json', sourceData, { deterministic: true });
      const step2 = await convert(UserArraySchema, { from: 'json', to: 'csv' }, step1);
      const step3 = await convert(UserArraySchema, { from: 'csv', to: 'ndjson' }, step2);
      const step4 = await convert(UserArraySchema, { from: 'ndjson', to: 'json' }, step3);

      // Verify transformation maintains data integrity
      const originalParsed = JSON.parse(step1);
      const finalParsed = JSON.parse(step4);

      expect(originalParsed.users).toEqual(finalParsed.users);
      expect(originalParsed.total).toBe(finalParsed.total);
      expect(originalParsed.page).toBe(finalParsed.page);
      expect(originalParsed.limit).toBe(finalParsed.limit);
    });
  });
});
