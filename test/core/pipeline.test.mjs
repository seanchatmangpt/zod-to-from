/**
 * Pipeline Tests - Comprehensive test suite for pipeline functionality
 * @fileoverview Tests for createPipeline, templates, composition, and advanced features
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  createPipeline,
  createTemplate,
  composePipelines,
  createStreamingPipeline,
  registerAdapter,
} from '../../src/core/index.mjs';

// Test schemas
const RawDataSchema = z.object({
  id: z.number(),
  value: z.string(),
});

const EnrichedSchema = z.object({
  id: z.number(),
  value: z.string(),
  enriched: z.boolean(),
});

const FinalSchema = z.object({
  id: z.number(),
  value: z.string(),
  enriched: z.boolean(),
  normalized: z.boolean(),
});

// Test transform functions
const enrichData = (data) => ({
  ...data,
  enriched: true,
});

const normalizeData = (data) => ({
  ...data,
  normalized: true,
});

const doubleValue = (data) => ({
  ...data,
  value: data.value + data.value,
});

describe('Pipeline Core Features', () => {
  it('should create a basic pipeline', () => {
    const pipeline = createPipeline();
    expect(pipeline).toBeDefined();
    expect(pipeline.steps).toEqual([]);
  });

  it('should chain from().validate().transform().to() steps', async () => {
    const pipeline = createPipeline()
      .from('json')
      .validate(RawDataSchema)
      .transform(enrichData)
      .validate(EnrichedSchema)
      .to('json');

    const input = JSON.stringify({ id: 1, value: 'test' });
    const result = await pipeline.execute(input);

    const parsed = JSON.parse(result);
    expect(parsed).toEqual({
      id: 1,
      value: 'test',
      enriched: true,
    });
  });

  it('should track provenance through entire pipeline', async () => {
    const pipeline = createPipeline()
      .from('json')
      .validate(RawDataSchema)
      .transform(enrichData)
      .validate(EnrichedSchema)
      .to('json');

    const input = JSON.stringify({ id: 1, value: 'test' });
    const result = await pipeline.execute(input, { includeProvenance: true });

    expect(result.provenance).toBeDefined();
    expect(result.provenance.pipelineId).toBeDefined();
    expect(result.provenance.steps).toHaveLength(5);
    expect(result.provenance.pipelineSteps).toContain('0: parse from json');
    expect(result.provenance.pipelineSteps).toContain('4: format to json');
    expect(result.provenance.totalDuration).toBeGreaterThanOrEqual(0);
    expect(result.provenance.startTime).toBeDefined();
    expect(result.provenance.endTime).toBeDefined();
  });

  it('should validate at each step', async () => {
    const pipeline = createPipeline()
      .from('json')
      .validate(RawDataSchema)
      .transform(enrichData)
      .validate(EnrichedSchema); // This should pass

    const input = JSON.stringify({ id: 1, value: 'test' });
    const result = await pipeline.execute(input);

    expect(result).toEqual({
      id: 1,
      value: 'test',
      enriched: true,
    });
  });

  it('should fail validation if schema does not match', async () => {
    const pipeline = createPipeline()
      .from('json')
      .validate(RawDataSchema)
      .transform(() => ({ invalid: true })) // Returns wrong shape
      .validate(EnrichedSchema); // This should fail

    const input = JSON.stringify({ id: 1, value: 'test' });

    await expect(pipeline.execute(input)).rejects.toThrow(/Pipeline failed at step/);
  });

  it('should handle transform errors with context', async () => {
    const pipeline = createPipeline()
      .from('json')
      .validate(RawDataSchema)
      .transform(() => {
        throw new Error('Transform failed');
      });

    const input = JSON.stringify({ id: 1, value: 'test' });

    try {
      await pipeline.execute(input);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error.message).toContain('Pipeline failed at step 2');
      expect(error.message).toContain('Transform failed');
      expect(error.stepIndex).toBe(2);
      expect(error.provenance).toBeDefined();
      expect(error.provenance.steps[2].error).toBeDefined();
    }
  });
});

describe('Partial Pipeline Execution', () => {
  it('should stop at specified step', async () => {
    const pipeline = createPipeline()
      .from('json')
      .validate(RawDataSchema)
      .transform(enrichData)
      .validate(EnrichedSchema)
      .to('json');

    const input = JSON.stringify({ id: 1, value: 'test' });
    const result = await pipeline.execute(input, {
      stopAt: 3,
      includeProvenance: true,
    });

    expect(result.stepsExecuted).toBe(3);
    expect(result.provenance.steps).toHaveLength(3);
  });

  it('should return intermediate data when stopped early', async () => {
    const pipeline = createPipeline()
      .from('json')
      .validate(RawDataSchema)
      .transform(enrichData);

    const input = JSON.stringify({ id: 1, value: 'test' });
    const result = await pipeline.execute(input, { stopAt: 2 });

    // Should stop after validate, before transform
    expect(result).toEqual({ id: 1, value: 'test' });
  });
});

describe('Pipeline Composition', () => {
  it('should compose two pipelines', async () => {
    const pipeline1 = createPipeline()
      .from('json')
      .validate(RawDataSchema)
      .transform(enrichData);

    const pipeline2 = createPipeline()
      .validate(EnrichedSchema)
      .transform(normalizeData)
      .to('json');

    const composed = createPipeline().compose(pipeline1).compose(pipeline2);

    const input = JSON.stringify({ id: 1, value: 'test' });
    const result = await composed.execute(input);

    const parsed = JSON.parse(result);
    expect(parsed).toEqual({
      id: 1,
      value: 'test',
      enriched: true,
      normalized: true,
    });
  });

  it('should compose multiple pipelines with composePipelines helper', async () => {
    const p1 = createPipeline().from('json').validate(RawDataSchema);
    const p2 = createPipeline().transform(enrichData).validate(EnrichedSchema);
    const p3 = createPipeline().transform(normalizeData).to('json');

    const composed = composePipelines(p1, p2, p3);

    const input = JSON.stringify({ id: 1, value: 'test' });
    const result = await composed.execute(input);

    const parsed = JSON.parse(result);
    expect(parsed.enriched).toBe(true);
    expect(parsed.normalized).toBe(true);
  });
});

describe('Conditional Branches', () => {
  it('should execute then branch when condition is true', async () => {
    const pipeline = createPipeline()
      .from('json')
      .validate(RawDataSchema)
      .branch(
        (data) => data.id > 0,
        (p) => p.transform(enrichData),
        (p) => p.transform(doubleValue)
      )
      .to('json');

    const input = JSON.stringify({ id: 1, value: 'test' });
    const result = await pipeline.execute(input);

    const parsed = JSON.parse(result);
    expect(parsed.enriched).toBe(true);
    expect(parsed.value).toBe('test'); // Not doubled
  });

  it('should execute else branch when condition is false', async () => {
    const pipeline = createPipeline()
      .from('json')
      .validate(RawDataSchema)
      .branch(
        (data) => data.id < 0,
        (p) => p.transform(enrichData),
        (p) => p.transform(doubleValue)
      )
      .to('json');

    const input = JSON.stringify({ id: 1, value: 'test' });
    const result = await pipeline.execute(input);

    const parsed = JSON.parse(result);
    expect(parsed.enriched).toBeUndefined();
    expect(parsed.value).toBe('testtest'); // Doubled
  });

  it('should handle missing else branch', async () => {
    const pipeline = createPipeline()
      .from('json')
      .validate(RawDataSchema)
      .branch(
        (data) => data.id < 0,
        (p) => p.transform(enrichData)
        // No else branch
      )
      .to('json');

    const input = JSON.stringify({ id: 1, value: 'test' });
    const result = await pipeline.execute(input);

    const parsed = JSON.parse(result);
    expect(parsed).toEqual({ id: 1, value: 'test' }); // Unchanged
  });
});

describe('Parallel Pipelines (Fan-out/Fan-in)', () => {
  it('should execute multiple transforms in parallel', async () => {
    const addA = (data) => ({ ...data, a: true });
    const addB = (data) => ({ ...data, b: true });
    const addC = (data) => ({ ...data, c: true });

    const pipeline = createPipeline()
      .from('json')
      .validate(RawDataSchema)
      .parallel([
        (p) => p.transform(addA),
        (p) => p.transform(addB),
        (p) => p.transform(addC),
      ])
      .to('json');

    const input = JSON.stringify({ id: 1, value: 'test' });
    const result = await pipeline.execute(input);

    const parsed = JSON.parse(result);
    // Default merger returns array of results
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(3);
    expect(parsed[0].a).toBe(true);
    expect(parsed[1].b).toBe(true);
    expect(parsed[2].c).toBe(true);
  });

  it('should use custom merger for parallel results', async () => {
    const addA = (data) => ({ ...data, a: true });
    const addB = (data) => ({ ...data, b: true });

    const merger = (results) => ({
      ...results[0],
      ...results[1],
    });

    const pipeline = createPipeline()
      .from('json')
      .validate(RawDataSchema)
      .parallel([(p) => p.transform(addA), (p) => p.transform(addB)], merger)
      .to('json');

    const input = JSON.stringify({ id: 1, value: 'test' });
    const result = await pipeline.execute(input);

    const parsed = JSON.parse(result);
    expect(parsed.a).toBe(true);
    expect(parsed.b).toBe(true);
    expect(parsed.id).toBe(1);
  });

  it('should track parallel execution in provenance', async () => {
    const pipeline = createPipeline()
      .from('json')
      .parallel([(p) => p.transform(enrichData), (p) => p.transform(doubleValue)])
      .to('json');

    const input = JSON.stringify({ id: 1, value: 'test' });
    const result = await pipeline.execute(input, { includeProvenance: true });

    const parallelStep = result.provenance.steps.find((s) => s.type === 'parallel');
    expect(parallelStep).toBeDefined();
    expect(parallelStep.parallelBranches).toBe(2);
  });
});

describe('Pipeline Templates', () => {
  it('should create reusable pipeline template', async () => {
    const enrichmentTemplate = createTemplate('enrichment', (pipeline, config) => {
      pipeline
        .from(config.inputFormat || 'json')
        .validate(RawDataSchema)
        .transform(enrichData)
        .validate(EnrichedSchema)
        .to(config.outputFormat || 'json');
    });

    const pipeline = enrichmentTemplate({
      inputFormat: 'json',
      outputFormat: 'json',
    });

    const input = JSON.stringify({ id: 1, value: 'test' });
    const result = await pipeline.execute(input);

    const parsed = JSON.parse(result);
    expect(parsed.enriched).toBe(true);
  });

  it('should reuse template with different configurations', async () => {
    const transformTemplate = createTemplate('transform', (pipeline, config) => {
      pipeline.from('json').validate(RawDataSchema);

      if (config.enrich) {
        pipeline.transform(enrichData);
      }

      if (config.normalize) {
        pipeline.transform(normalizeData);
      }

      pipeline.to('json');
    });

    const pipeline1 = transformTemplate({ enrich: true, normalize: false });
    const pipeline2 = transformTemplate({ enrich: false, normalize: true });

    const input = JSON.stringify({ id: 1, value: 'test' });

    const result1 = await pipeline1.execute(input);
    const parsed1 = JSON.parse(result1);
    expect(parsed1.enriched).toBe(true);
    expect(parsed1.normalized).toBeUndefined();

    const result2 = await pipeline2.execute(input);
    const parsed2 = JSON.parse(result2);
    expect(parsed2.enriched).toBeUndefined();
    expect(parsed2.normalized).toBe(true);
  });
});

describe('Dry Run Mode', () => {
  it('should simulate pipeline execution without running', async () => {
    const pipeline = createPipeline()
      .from('json')
      .validate(RawDataSchema)
      .transform(enrichData)
      .validate(EnrichedSchema)
      .to('json');

    const input = JSON.stringify({ id: 1, value: 'test' });
    const result = await pipeline.execute(input, { dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.data).toBeNull();
    expect(result.stepsExecuted).toBe(0);
    expect(result.provenance.pipelineSteps).toHaveLength(5);
    expect(result.provenance.totalDuration).toBe(0);
  });

  it('should show all steps in dry run', async () => {
    const pipeline = createPipeline()
      .from('json')
      .validate(RawDataSchema)
      .transform(enrichData)
      .branch((d) => d.id > 0, (p) => p.transform(normalizeData))
      .parallel([(p) => p.transform(doubleValue)])
      .to('json');

    const input = JSON.stringify({ id: 1, value: 'test' });
    const result = await pipeline.execute(input, { dryRun: true });

    expect(result.provenance.pipelineSteps).toContain('0: parse from json');
    expect(result.provenance.pipelineSteps).toContain('1: validate schema');
    expect(result.provenance.pipelineSteps).toContain('2: transform enrichData');
    expect(result.provenance.pipelineSteps).toContain('3: conditional branch');
    expect(result.provenance.pipelineSteps).toContain('4: parallel execution (1 branches)');
    expect(result.provenance.pipelineSteps).toContain('5: format to json');
  });
});

describe('Pipeline Callbacks', () => {
  it('should call onStep callback for each step', async () => {
    const steps = [];

    const pipeline = createPipeline()
      .from('json')
      .validate(RawDataSchema)
      .transform(enrichData)
      .to('json');

    const input = JSON.stringify({ id: 1, value: 'test' });
    await pipeline.execute(input, {
      onStep: async (step, data) => {
        steps.push({ type: step.type, data });
      },
    });

    expect(steps).toHaveLength(4);
    expect(steps[0].type).toBe('parse');
    expect(steps[1].type).toBe('validate');
    expect(steps[2].type).toBe('transform');
    expect(steps[3].type).toBe('format');
  });

  it('should receive correct data in onStep callback', async () => {
    let transformedData = null;

    const pipeline = createPipeline()
      .from('json')
      .validate(RawDataSchema)
      .transform(enrichData);

    const input = JSON.stringify({ id: 1, value: 'test' });
    await pipeline.execute(input, {
      onStep: async (step, data) => {
        if (step.type === 'transform') {
          transformedData = data;
        }
      },
    });

    expect(transformedData).toEqual({
      id: 1,
      value: 'test',
      enriched: true,
    });
  });
});

describe('Pipeline Utilities', () => {
  it('should clone a pipeline', async () => {
    const original = createPipeline()
      .from('json')
      .validate(RawDataSchema)
      .transform(enrichData);

    const cloned = original.clone();
    cloned.to('json');

    expect(cloned.steps).toHaveLength(4);
    expect(original.steps).toHaveLength(3); // Original unchanged
  });

  it('should generate pipeline summary', () => {
    const pipeline = createPipeline()
      .from('json')
      .validate(RawDataSchema)
      .transform(enrichData)
      .to('json');

    const summary = pipeline.summary();

    expect(summary.pipelineId).toBeDefined();
    expect(summary.stepCount).toBe(4);
    expect(summary.steps).toContain('0: parse from json');
    expect(summary.steps).toContain('1: validate schema');
    expect(summary.steps).toContain('2: transform enrichData');
    expect(summary.steps).toContain('3: format to json');
  });
});

describe('Advanced Pipeline Patterns', () => {
  it('should handle complex nested pipeline', async () => {
    const preprocessPipeline = createPipeline()
      .from('json')
      .validate(RawDataSchema)
      .transform(enrichData);

    const postprocessPipeline = createPipeline()
      .validate(EnrichedSchema)
      .transform(normalizeData)
      .to('json');

    const mainPipeline = createPipeline()
      .compose(preprocessPipeline)
      .branch(
        (data) => data.id > 0,
        (p) => p.transform(doubleValue)
      )
      .compose(postprocessPipeline);

    const input = JSON.stringify({ id: 1, value: 'test' });
    const result = await mainPipeline.execute(input);

    const parsed = JSON.parse(result);
    expect(parsed.enriched).toBe(true);
    expect(parsed.normalized).toBe(true);
    expect(parsed.value).toBe('testtest');
  });

  it('should handle parallel branches with different schemas', async () => {
    const Schema1 = z.object({ type: z.literal('a'), value: z.string() });
    const Schema2 = z.object({ type: z.literal('b'), value: z.number() });

    const merger = (results) => ({
      combined: results,
    });

    const pipeline = createPipeline()
      .from('json')
      .parallel(
        [
          (p) => p.transform((d) => ({ type: 'a', value: d.value })).validate(Schema1),
          (p) => p.transform((d) => ({ type: 'b', value: d.id })).validate(Schema2),
        ],
        merger
      )
      .to('json');

    const input = JSON.stringify({ id: 42, value: 'test' });
    const result = await pipeline.execute(input);

    const parsed = JSON.parse(result);
    expect(parsed.combined).toHaveLength(2);
    expect(parsed.combined[0]).toEqual({ type: 'a', value: 'test' });
    expect(parsed.combined[1]).toEqual({ type: 'b', value: 42 });
  });

  it('should track metadata through complex pipeline', async () => {
    const pipeline = createPipeline()
      .from('json')
      .validate(RawDataSchema)
      .transform(enrichData)
      .branch(
        (d) => true,
        (p) => p.transform(normalizeData)
      )
      .to('json');

    const input = JSON.stringify({ id: 1, value: 'test' });
    const result = await pipeline.execute(input, {
      includeProvenance: true,
      metadata: { requestId: 'test-123' },
    });

    expect(result.provenance.metadata.requestId).toBe('test-123');
    expect(result.provenance.steps.some((s) => s.type === 'branch')).toBe(true);
    expect(result.provenance.steps.every((s) => s.duration >= 0)).toBe(true);
  });
});

describe('Error Handling and Edge Cases', () => {
  it('should throw error for missing adapter', async () => {
    const pipeline = createPipeline().from('nonexistent-format');

    await expect(pipeline.execute('test')).rejects.toThrow(
      'No adapter found for format: nonexistent-format'
    );
  });

  it('should throw error for invalid transform', () => {
    expect(() => {
      createPipeline().transform('not a function');
    }).toThrow('Transform requires a function');
  });

  it('should throw error for invalid parallel configuration', () => {
    expect(() => {
      createPipeline().parallel([]);
    }).toThrow('Parallel requires non-empty array');

    expect(() => {
      createPipeline().parallel('not an array');
    }).toThrow('Parallel requires non-empty array');
  });

  it('should throw error for invalid compose', () => {
    expect(() => {
      createPipeline().compose({});
    }).toThrow('Compose requires a Pipeline instance');
  });

  it('should throw error for composePipelines with no arguments', () => {
    expect(() => {
      composePipelines();
    }).toThrow('composePipelines requires at least one pipeline');
  });

  it('should preserve error stack trace', async () => {
    const errorMessage = 'Custom transform error';
    const pipeline = createPipeline()
      .from('json')
      .transform(() => {
        throw new Error(errorMessage);
      });

    try {
      await pipeline.execute(JSON.stringify({ id: 1, value: 'test' }));
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error.originalError).toBeDefined();
      expect(error.originalError.message).toBe(errorMessage);
      expect(error.originalError.stack).toBeDefined();
    }
  });
});

describe('Streaming Pipeline', () => {
  it('should create streaming pipeline', () => {
    const pipeline = createStreamingPipeline();
    expect(pipeline).toBeDefined();
    expect(pipeline.config.streaming).toBe(true);
  });

  it('should pass streaming option to execute', async () => {
    const pipeline = createStreamingPipeline()
      .from('json')
      .validate(RawDataSchema)
      .to('json');

    const input = JSON.stringify({ id: 1, value: 'test' });
    const result = await pipeline.execute(input);

    expect(result).toBeDefined();
  });
});
