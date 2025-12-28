/**
 * Enhanced Provenance System Tests
 * @fileoverview Comprehensive tests for provenance tracking, queries, and exports
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  configureProvenance,
  createEnhancedProvenance,
  registerProvenance,
  getProvenance,
  getAllProvenance,
  clearProvenanceRegistry,
  verifySignature,
  createLineageGraph,
  getProvenanceStats,
  exportToJSON,
  importFromJSON,
  trackOperation,
  hashData,
} from '../../src/core/provenance.mjs';

import {
  query,
  agg,
  generateComplianceReport,
  generateVisualizationData,
} from '../../src/core/provenance-query.mjs';

import {
  exportProvenance,
  exportToJSONLD,
  exportToTurtle,
  exportToProvJSON,
  exportToProvN,
} from '../../src/core/provenance-export.mjs';

describe('Enhanced Provenance System', () => {
  beforeEach(() => {
    clearProvenanceRegistry();
    configureProvenance({
      enableSignatures: false,
      trackPerformance: true,
      trackEnvironment: true,
    });
  });

  describe('Basic Provenance Creation', () => {
    it('should create enhanced provenance entry', () => {
      const prov = createEnhancedProvenance({
        adapter: 'json',
        sourceFormat: 'json',
        targetFormat: 'yaml',
        performance: {
          duration: 150,
          memory: 1024,
        },
      });

      expect(prov).toHaveProperty('id');
      expect(prov).toHaveProperty('timestamp');
      expect(prov.adapter).toBe('json');
      expect(prov.sourceFormat).toBe('json');
      expect(prov.targetFormat).toBe('yaml');
      expect(prov.performance.duration).toBe(150);
      expect(prov.performance.memory).toBe(1024);
      expect(prov.environment).toBeDefined();
    });

    it('should register and retrieve provenance', () => {
      const prov = createEnhancedProvenance({
        adapter: 'csv',
        performance: { duration: 200 },
      });

      const id = registerProvenance(prov);
      const retrieved = getProvenance(id);

      expect(retrieved).toEqual(prov);
    });

    it('should get all provenance entries', () => {
      const prov1 = createEnhancedProvenance({ adapter: 'json' });
      const prov2 = createEnhancedProvenance({ adapter: 'yaml' });

      registerProvenance(prov1);
      registerProvenance(prov2);

      const all = getAllProvenance();
      expect(all).toHaveLength(2);
    });
  });

  describe('Cryptographic Signatures', () => {
    it('should create signatures when enabled', () => {
      configureProvenance({ enableSignatures: true });

      const prov = createEnhancedProvenance({
        adapter: 'json',
        dataHash: hashData({ test: 'data' }),
      });

      expect(prov.signature).toBeDefined();
      expect(typeof prov.signature).toBe('string');
    });

    it('should verify valid signatures', () => {
      configureProvenance({ enableSignatures: true });

      const prov = createEnhancedProvenance({
        adapter: 'json',
        dataHash: hashData({ test: 'data' }),
      });

      expect(verifySignature(prov)).toBe(true);
    });

    it('should detect tampered signatures', () => {
      configureProvenance({ enableSignatures: true });

      const prov = createEnhancedProvenance({
        adapter: 'json',
        dataHash: hashData({ test: 'data' }),
      });

      // Tamper with data
      prov.adapter = 'yaml';

      expect(verifySignature(prov)).toBe(false);
    });
  });

  describe('AI Provenance Tracking', () => {
    it('should track AI model usage', () => {
      const prov = createEnhancedProvenance({
        adapter: 'docx-ai',
        ai: {
          model: 'gpt-4',
          promptHash: hashData('Extract data'),
          cost: 0.05,
          tokens: 1500,
        },
      });

      expect(prov.ai.model).toBe('gpt-4');
      expect(prov.ai.cost).toBe(0.05);
      expect(prov.ai.tokens).toBe(1500);
    });
  });

  describe('User Attribution', () => {
    it('should track user information', () => {
      const prov = createEnhancedProvenance({
        adapter: 'json',
        user: {
          id: 'user123',
          name: 'John Doe',
        },
      });

      expect(prov.user.id).toBe('user123');
      expect(prov.user.name).toBe('John Doe');
    });
  });

  describe('Data Lineage', () => {
    it('should create lineage graph', () => {
      const prov = createEnhancedProvenance({
        adapter: 'json',
        transformations: ['parse', 'validate', 'transform', 'format'],
      });

      registerProvenance(prov);
      const graph = createLineageGraph(prov.id);

      expect(graph).toBeDefined();
      expect(graph.root).toBe(prov.id);
      expect(graph.nodes).toHaveLength(1);
      expect(graph.edges).toHaveLength(3);
    });
  });

  describe('Performance Tracking', () => {
    it('should track performance metrics', () => {
      const prov = createEnhancedProvenance({
        adapter: 'json',
        performance: {
          duration: 250,
          memory: 2048,
          inputSize: 1000,
          outputSize: 1200,
        },
      });

      expect(prov.performance.duration).toBe(250);
      expect(prov.performance.memory).toBe(2048);
      expect(prov.performance.inputSize).toBe(1000);
      expect(prov.performance.outputSize).toBe(1200);
    });
  });

  describe('Statistics', () => {
    it('should generate provenance statistics', () => {
      registerProvenance(
        createEnhancedProvenance({
          adapter: 'json',
          performance: { duration: 100 },
        })
      );

      registerProvenance(
        createEnhancedProvenance({
          adapter: 'yaml',
          performance: { duration: 200 },
        })
      );

      registerProvenance(
        createEnhancedProvenance({
          adapter: 'json',
          performance: { duration: 150 },
          ai: { model: 'gpt-4', cost: 0.05, tokens: 1000 },
        })
      );

      const stats = getProvenanceStats();

      expect(stats.totalEntries).toBe(3);
      expect(stats.adapters.json).toBe(2);
      expect(stats.adapters.yaml).toBe(1);
      expect(stats.avgDuration).toBe(150);
      expect(stats.totalCost).toBe(0.05);
      expect(stats.totalTokens).toBe(1000);
    });
  });

  describe('Import/Export JSON', () => {
    it('should export to JSON', () => {
      const prov = createEnhancedProvenance({ adapter: 'json' });
      registerProvenance(prov);

      const json = exportToJSON();
      expect(json).toBeDefined();
      expect(typeof json).toBe('string');

      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe(prov.id);
    });

    it('should import from JSON', () => {
      const prov = createEnhancedProvenance({ adapter: 'json' });
      registerProvenance(prov);

      const json = exportToJSON();
      clearProvenanceRegistry();

      importFromJSON(json);
      const all = getAllProvenance();

      expect(all).toHaveLength(1);
      expect(all[0].id).toBe(prov.id);
    });
  });

  describe('Track Operation', () => {
    it('should automatically track operation provenance', async () => {
      const result = await trackOperation(
        async () => {
          return { success: true };
        },
        {
          adapter: 'json',
          sourceFormat: 'json',
        }
      );

      expect(result.result.success).toBe(true);
      expect(result.provenance).toBeDefined();
      expect(result.provenance.performance.duration).toBeGreaterThanOrEqual(0);
    });

    it('should track failed operations', async () => {
      await expect(
        trackOperation(
          async () => {
            throw new Error('Operation failed');
          },
          { adapter: 'json' }
        )
      ).rejects.toThrow('Operation failed');

      const all = getAllProvenance();
      expect(all).toHaveLength(1);
      expect(all[0].metadata.failed).toBe(true);
    });
  });
});

describe('Provenance Query System', () => {
  beforeEach(() => {
    clearProvenanceRegistry();

    // Create sample data
    const now = new Date();
    const yesterday = new Date(now - 24 * 60 * 60 * 1000);

    registerProvenance(
      createEnhancedProvenance({
        adapter: 'json',
        sourceFormat: 'json',
        targetFormat: 'yaml',
        performance: { duration: 100 },
      })
    );

    registerProvenance(
      createEnhancedProvenance({
        adapter: 'csv',
        sourceFormat: 'csv',
        targetFormat: 'json',
        performance: { duration: 200 },
        user: { id: 'user1', name: 'Alice' },
      })
    );

    registerProvenance(
      createEnhancedProvenance({
        adapter: 'json',
        sourceFormat: 'json',
        targetFormat: 'xml',
        performance: { duration: 150 },
        ai: { model: 'gpt-4', cost: 0.05, tokens: 1000 },
      })
    );
  });

  describe('Basic Queries', () => {
    it('should filter by adapter', () => {
      const results = query().where('adapter', 'json').toArray();
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.adapter === 'json')).toBe(true);
    });

    it('should filter by multiple conditions', () => {
      const results = query().where('adapter', 'json').where('sourceFormat', 'json').toArray();

      expect(results).toHaveLength(2);
    });

    it('should count results', () => {
      const count = query().where('adapter', 'json').count();
      expect(count).toBe(2);
    });

    it('should get first result', () => {
      const result = query().where('adapter', 'csv').first();
      expect(result).toBeDefined();
      expect(result.adapter).toBe('csv');
    });

    it('should limit results', () => {
      const results = query().limit(2).toArray();
      expect(results).toHaveLength(2);
    });
  });

  describe('Performance Queries', () => {
    it('should filter by performance', () => {
      const results = query()
        .performance({ minDuration: 150 })
        .toArray();

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.performance.duration >= 150)).toBe(true);
    });

    it('should filter by duration range', () => {
      const results = query()
        .performance({ minDuration: 100, maxDuration: 150 })
        .toArray();

      expect(results).toHaveLength(2);
    });
  });

  describe('User Queries', () => {
    it('should filter by user', () => {
      const results = query().user('user1').toArray();
      expect(results).toHaveLength(1);
      expect(results[0].user.id).toBe('user1');
    });
  });

  describe('AI Queries', () => {
    it('should filter by AI model', () => {
      const results = query().aiModel('gpt-4').toArray();
      expect(results).toHaveLength(1);
      expect(results[0].ai.model).toBe('gpt-4');
    });
  });

  describe('Sorting', () => {
    it('should sort by field ascending', () => {
      const results = query().sort('performance.duration', 'asc').toArray();
      expect(results[0].performance.duration).toBe(100);
      expect(results[2].performance.duration).toBe(200);
    });

    it('should sort by field descending', () => {
      const results = query().sort('performance.duration', 'desc').toArray();
      expect(results[0].performance.duration).toBe(200);
      expect(results[2].performance.duration).toBe(100);
    });
  });

  describe('Aggregations', () => {
    it('should group by adapter', () => {
      const results = query().groupBy('adapter').toArray();

      expect(results.json).toHaveLength(2);
      expect(results.csv).toHaveLength(1);
    });

    it('should aggregate with count', () => {
      const results = query()
        .groupBy('adapter')
        .aggregate({ count: agg.count() })
        .toArray();

      expect(results.json.count).toBe(2);
      expect(results.csv.count).toBe(1);
    });

    it('should aggregate with sum', () => {
      const results = query()
        .groupBy('adapter')
        .aggregate({ totalDuration: agg.sum('performance.duration') })
        .toArray();

      expect(results.json.totalDuration).toBe(250);
      expect(results.csv.totalDuration).toBe(200);
    });

    it('should aggregate with average', () => {
      const results = query()
        .groupBy('adapter')
        .aggregate({ avgDuration: agg.avg('performance.duration') })
        .toArray();

      expect(results.json.avgDuration).toBe(125);
      expect(results.csv.avgDuration).toBe(200);
    });

    it('should aggregate with min/max', () => {
      const results = query()
        .aggregate({
          minDuration: agg.min('performance.duration'),
          maxDuration: agg.max('performance.duration'),
        })
        .toArray();

      expect(results.minDuration).toBe(100);
      expect(results.maxDuration).toBe(200);
    });
  });
});

describe('Compliance Reports', () => {
  beforeEach(() => {
    clearProvenanceRegistry();
    configureProvenance({ enableSignatures: true });

    // Create sample compliance data
    registerProvenance(
      createEnhancedProvenance({
        adapter: 'json',
        user: { id: 'user1', name: 'Alice' },
        dataHash: hashData({ test: 'data1' }),
      })
    );

    registerProvenance(
      createEnhancedProvenance({
        adapter: 'csv',
        user: { id: 'user2', name: 'Bob' },
        ai: { model: 'gpt-4', cost: 0.05, tokens: 1000 },
        dataHash: hashData({ test: 'data2' }),
      })
    );
  });

  it('should generate GDPR compliance report', async () => {
    const report = await generateComplianceReport({ standard: 'GDPR' });

    expect(report.standard).toBe('GDPR');
    expect(report.totalOperations).toBe(2);
    expect(report.compliance.dataMinimization).toBe(true);
    expect(report.compliance.storageWithAuditTrail).toBe(true);
  });

  it('should generate HIPAA compliance report', async () => {
    const report = await generateComplianceReport({ standard: 'HIPAA' });

    expect(report.standard).toBe('HIPAA');
    expect(report.compliance.auditControls).toBe(true);
    expect(report.compliance.integrityControls).toBe(true);
  });

  it('should generate SOC2 compliance report', async () => {
    const report = await generateComplianceReport({ standard: 'SOC2' });

    expect(report.standard).toBe('SOC2');
    expect(report.compliance.changeManagement).toBe(true);
  });

  it('should include user breakdown', async () => {
    const report = await generateComplianceReport();

    expect(report.users.user1).toBe(1);
    expect(report.users.user2).toBe(1);
  });
});

describe('Visualization Data', () => {
  beforeEach(() => {
    clearProvenanceRegistry();

    registerProvenance(
      createEnhancedProvenance({
        adapter: 'json',
        performance: { duration: 100 },
      })
    );

    registerProvenance(
      createEnhancedProvenance({
        adapter: 'yaml',
        performance: { duration: 200 },
      })
    );

    registerProvenance(
      createEnhancedProvenance({
        adapter: 'json',
        performance: { duration: 150 },
      })
    );
  });

  it('should generate adapter chart data', () => {
    const data = generateVisualizationData('adapter');

    expect(data.labels).toContain('json');
    expect(data.labels).toContain('yaml');
    expect(data.data).toHaveLength(data.labels.length);
  });

  it('should generate performance chart data', () => {
    const data = generateVisualizationData('performance');

    expect(data.min).toBe(100);
    expect(data.max).toBe(200);
    expect(data.avg).toBe(150);
    expect(data.data).toHaveLength(3);
  });

  it('should generate timeline chart data', () => {
    const data = generateVisualizationData('timeline');

    expect(data.labels).toBeDefined();
    expect(data.data).toBeDefined();
    expect(data.labels.length).toBe(data.data.length);
  });
});

describe('RDF Exports', () => {
  let sampleProvenance;

  beforeEach(() => {
    sampleProvenance = createEnhancedProvenance({
      adapter: 'json',
      sourceFormat: 'json',
      targetFormat: 'yaml',
      user: { id: 'user1', name: 'Alice' },
      performance: { duration: 150, memory: 2048 },
      dataHash: hashData({ test: 'data' }),
      schemaHash: hashData('schema'),
    });
  });

  describe('JSON-LD Export', () => {
    it('should export to JSON-LD', async () => {
      const jsonld = await exportToJSONLD(sampleProvenance);

      expect(jsonld).toBeDefined();
      expect(typeof jsonld).toBe('string');

      const parsed = JSON.parse(jsonld);
      expect(parsed['@context']).toBeDefined();
    });

    it('should export array to JSON-LD', async () => {
      const prov2 = createEnhancedProvenance({ adapter: 'csv' });
      const jsonld = await exportToJSONLD([sampleProvenance, prov2]);

      const parsed = JSON.parse(jsonld);
      expect(parsed['@graph']).toHaveLength(4); // 2 activities + 2 entities
    });
  });

  describe('Turtle Export', () => {
    it('should export to Turtle RDF', async () => {
      const turtle = await exportToTurtle(sampleProvenance);

      expect(turtle).toBeDefined();
      expect(typeof turtle).toBe('string');
      expect(turtle).toContain('prov:Activity');
      expect(turtle).toContain('prov:Entity');
      expect(turtle).toContain('ztf:adapter');
    });
  });

  describe('PROV-JSON Export', () => {
    it('should export to PROV-JSON', () => {
      const provJson = exportToProvJSON(sampleProvenance);

      expect(provJson).toBeDefined();
      expect(provJson.activity).toBeDefined();
      expect(provJson.entity).toBeDefined();
      expect(provJson.agent).toBeDefined();
    });
  });

  describe('PROV-N Export', () => {
    it('should export to PROV-N notation', () => {
      const provN = exportToProvN(sampleProvenance);

      expect(provN).toBeDefined();
      expect(typeof provN).toBe('string');
      expect(provN).toContain('activity(');
      expect(provN).toContain('entity(');
      expect(provN).toContain('wasGeneratedBy(');
    });
  });

  describe('Generic Export', () => {
    it('should export to specified format', async () => {
      const jsonld = await exportProvenance(sampleProvenance, 'jsonld');
      expect(jsonld).toBeDefined();

      const turtle = await exportProvenance(sampleProvenance, 'turtle');
      expect(turtle).toBeDefined();

      const provJson = await exportProvenance(sampleProvenance, 'prov-json');
      expect(provJson).toBeDefined();
    });

    it('should throw error for unsupported format', async () => {
      await expect(exportProvenance(sampleProvenance, 'invalid')).rejects.toThrow(
        'Unsupported export format'
      );
    });
  });
});
