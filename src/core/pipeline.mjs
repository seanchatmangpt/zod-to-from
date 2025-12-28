/**
 * Pipeline Builder - Chain multiple transformations with validation
 * @fileoverview Advanced pipeline system for composable, validated transformations
 */

import { getAdapter, createProvenance, simpleHash } from './registry.mjs';

/**
 * @typedef {import('zod').ZodSchema} ZodSchema
 */

/**
 * Pipeline step types
 * @typedef {'parse'|'format'|'validate'|'transform'|'branch'|'parallel'|'compose'} StepType
 */

/**
 * Pipeline step metadata
 * @typedef {Object} PipelineStep
 * @property {StepType} type - Step type
 * @property {string} [format] - Format name (for parse/format steps)
 * @property {ZodSchema} [schema] - Schema (for validate steps)
 * @property {Function} [fn] - Transform function
 * @property {any} [metadata] - Additional metadata
 * @property {string} stepId - Unique step identifier
 * @property {number} timestamp - Step execution timestamp
 * @property {number} [duration] - Step execution duration in ms
 * @property {any} [result] - Step result (for partial execution)
 * @property {Error} [error] - Error if step failed
 */

/**
 * Pipeline provenance tracking
 * @typedef {Object} PipelineProvenance
 * @property {string} pipelineId - Unique pipeline identifier
 * @property {PipelineStep[]} steps - All pipeline steps executed
 * @property {string[]} pipelineSteps - Human-readable step descriptions
 * @property {number} totalDuration - Total execution time in ms
 * @property {string} startTime - ISO timestamp of start
 * @property {string} endTime - ISO timestamp of end
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * Pipeline execution result
 * @typedef {Object} PipelineResult
 * @property {any} data - The final result data
 * @property {PipelineProvenance} [provenance] - Pipeline execution provenance
 * @property {number} [stepsExecuted] - Number of steps executed (for partial execution)
 */

/**
 * Pipeline execution options
 * @typedef {Object} PipelineOptions
 * @property {boolean} [includeProvenance] - Include provenance metadata
 * @property {boolean} [dryRun] - Simulate execution without actually running
 * @property {number} [stopAt] - Stop execution at step N (0-indexed)
 * @property {boolean} [streaming] - Enable streaming for large datasets
 * @property {Object} [metadata] - Custom metadata to include
 * @property {Function} [onStep] - Callback for each step execution
 */

/**
 * Pipeline builder class
 */
class Pipeline {
  /**
   * @param {Object} [config] - Pipeline configuration
   */
  constructor(config = {}) {
    /** @type {Array<{type: StepType, config: any}>} */
    this.steps = [];
    this.config = config;
    this.pipelineId = `pipeline-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  /**
   * Parse from a format (initial step)
   * @param {string} format - Format to parse from
   * @param {Object} [opts] - Adapter-specific options
   * @returns {Pipeline} This pipeline for chaining
   */
  from(format, opts = {}) {
    this.steps.push({
      type: 'parse',
      config: { format, opts },
    });
    return this;
  }

  /**
   * Validate data against a schema
   * @param {ZodSchema} schema - Zod schema to validate against
   * @param {Object} [opts] - Validation options
   * @returns {Pipeline} This pipeline for chaining
   */
  validate(schema, opts = {}) {
    this.steps.push({
      type: 'validate',
      config: { schema, opts },
    });
    return this;
  }

  /**
   * Transform data with a function
   * @param {Function} fn - Transform function (can be async)
   * @param {Object} [opts] - Transform options
   * @returns {Pipeline} This pipeline for chaining
   */
  transform(fn, opts = {}) {
    if (typeof fn !== 'function') {
      throw new TypeError('Transform requires a function');
    }
    this.steps.push({
      type: 'transform',
      config: { fn, opts },
    });
    return this;
  }

  /**
   * Conditional branch in pipeline
   * @param {Function} condition - Condition function (data => boolean)
   * @param {Function} thenBranch - Pipeline builder for true branch
   * @param {Function} [elseBranch] - Pipeline builder for false branch
   * @returns {Pipeline} This pipeline for chaining
   */
  branch(condition, thenBranch, elseBranch = null) {
    this.steps.push({
      type: 'branch',
      config: { condition, thenBranch, elseBranch },
    });
    return this;
  }

  /**
   * Execute multiple transforms in parallel (fan-out/fan-in)
   * @param {Function[]} builders - Array of pipeline builder functions
   * @param {Function} [merger] - Function to merge results (defaults to array)
   * @returns {Pipeline} This pipeline for chaining
   */
  parallel(builders, merger = null) {
    if (!Array.isArray(builders) || builders.length === 0) {
      throw new Error('Parallel requires non-empty array of builder functions');
    }
    this.steps.push({
      type: 'parallel',
      config: { builders, merger },
    });
    return this;
  }

  /**
   * Compose another pipeline into this one
   * @param {Pipeline} pipeline - Pipeline to compose
   * @returns {Pipeline} This pipeline for chaining
   */
  compose(pipeline) {
    if (!(pipeline instanceof Pipeline)) {
      throw new TypeError('Compose requires a Pipeline instance');
    }
    this.steps.push({
      type: 'compose',
      config: { pipeline },
    });
    return this;
  }

  /**
   * Format to output format (final step)
   * @param {string} format - Format to output to
   * @param {Object} [opts] - Adapter-specific options
   * @returns {Pipeline} This pipeline for chaining
   */
  to(format, opts = {}) {
    this.steps.push({
      type: 'format',
      config: { format, opts },
    });
    return this;
  }

  /**
   * Execute the pipeline
   * @param {any} input - Initial input data
   * @param {PipelineOptions} [opts] - Execution options
   * @returns {Promise<any|PipelineResult>} Result data or PipelineResult with provenance
   */
  async execute(input, opts = {}) {
    const startTime = Date.now();
    const provenance = {
      pipelineId: this.pipelineId,
      steps: [],
      pipelineSteps: [],
      startTime: new Date().toISOString(),
      metadata: opts.metadata || {},
    };

    let data = input;
    let stepsExecuted = 0;

    // Dry run mode - just build provenance without execution
    if (opts.dryRun) {
      for (let i = 0; i < this.steps.length; i++) {
        const step = this.steps[i];
        provenance.pipelineSteps.push(this._stepDescription(step, i));
      }
      provenance.endTime = new Date().toISOString();
      provenance.totalDuration = 0;
      return {
        data: null,
        provenance,
        stepsExecuted: 0,
        dryRun: true,
      };
    }

    // Execute each step
    for (let i = 0; i < this.steps.length; i++) {
      // Check if we should stop
      if (opts.stopAt !== undefined && i >= opts.stopAt) {
        break;
      }

      const step = this.steps[i];
      const stepStart = Date.now();
      const stepId = `step-${i}-${step.type}`;

      try {
        // Execute step based on type
        const result = await this._executeStep(step, data, opts);
        data = result.data;

        const stepDuration = Date.now() - stepStart;
        const stepMetadata = {
          type: step.type,
          stepId,
          timestamp: Date.now(),
          duration: stepDuration,
          ...result.metadata,
        };

        provenance.steps.push(stepMetadata);
        provenance.pipelineSteps.push(this._stepDescription(step, i));

        // Call onStep callback if provided
        if (opts.onStep) {
          await opts.onStep(stepMetadata, data);
        }

        stepsExecuted++;
      } catch (error) {
        // Add error to provenance
        const stepMetadata = {
          type: step.type,
          stepId,
          timestamp: Date.now(),
          duration: Date.now() - stepStart,
          error: {
            message: error.message,
            name: error.name,
            stack: error.stack,
          },
        };

        provenance.steps.push(stepMetadata);
        provenance.endTime = new Date().toISOString();
        provenance.totalDuration = Date.now() - startTime;

        // Re-throw with context
        const pipelineError = new Error(
          `Pipeline failed at step ${i} (${step.type}): ${error.message}`
        );
        pipelineError.originalError = error;
        pipelineError.provenance = provenance;
        pipelineError.stepIndex = i;
        throw pipelineError;
      }
    }

    provenance.endTime = new Date().toISOString();
    provenance.totalDuration = Date.now() - startTime;

    // Return with or without provenance
    if (opts.includeProvenance) {
      return {
        data,
        provenance,
        stepsExecuted,
      };
    }

    return data;
  }

  /**
   * Execute a single step
   * @private
   */
  async _executeStep(step, data, opts) {
    switch (step.type) {
      case 'parse': {
        const { format, opts: adapterOpts } = step.config;
        const adapter = getAdapter(format);
        if (!adapter) {
          throw new Error(`No adapter found for format: ${format}`);
        }
        const result = await adapter.parse(data, adapterOpts);
        return {
          data: result.data,
          metadata: { format, ...result.metadata },
        };
      }

      case 'format': {
        const { format, opts: adapterOpts } = step.config;
        const adapter = getAdapter(format);
        if (!adapter) {
          throw new Error(`No adapter found for format: ${format}`);
        }
        const result = await adapter.format(data, adapterOpts);
        return {
          data: result.data,
          metadata: { format, ...result.metadata },
        };
      }

      case 'validate': {
        const { schema, opts: validateOpts } = step.config;
        const validatedData = schema.parse(data);
        return {
          data: validatedData,
          metadata: {
            schemaHash: simpleHash(schema.toString()),
            ...validateOpts,
          },
        };
      }

      case 'transform': {
        const { fn, opts: transformOpts } = step.config;
        const transformedData = await fn(data);
        return {
          data: transformedData,
          metadata: {
            functionName: fn.name || 'anonymous',
            ...transformOpts,
          },
        };
      }

      case 'branch': {
        const { condition, thenBranch, elseBranch } = step.config;
        const shouldTakeThen = await condition(data);
        const branch = shouldTakeThen ? thenBranch : elseBranch;

        if (!branch) {
          return { data, metadata: { branchTaken: 'none' } };
        }

        // Create a sub-pipeline
        const subPipeline = new Pipeline();
        branch(subPipeline);

        const result = await subPipeline.execute(data, {
          ...opts,
          includeProvenance: false,
        });

        return {
          data: result,
          metadata: { branchTaken: shouldTakeThen ? 'then' : 'else' },
        };
      }

      case 'parallel': {
        const { builders, merger } = step.config;

        // Execute all branches in parallel
        const results = await Promise.all(
          builders.map(async (builder) => {
            const subPipeline = new Pipeline();
            builder(subPipeline);
            return subPipeline.execute(data, {
              ...opts,
              includeProvenance: false,
            });
          })
        );

        // Merge results
        const mergedData = merger ? await merger(results) : results;

        return {
          data: mergedData,
          metadata: { parallelBranches: builders.length },
        };
      }

      case 'compose': {
        const { pipeline } = step.config;
        const result = await pipeline.execute(data, {
          ...opts,
          includeProvenance: false,
        });
        return {
          data: result,
          metadata: { composedPipeline: pipeline.pipelineId },
        };
      }

      default: {
        throw new Error(`Unknown step type: ${step.type}`);
      }
    }
  }

  /**
   * Generate human-readable step description
   * @private
   */
  _stepDescription(step, index) {
    switch (step.type) {
      case 'parse': {
        return `${index}: parse from ${step.config.format}`;
      }
      case 'format': {
        return `${index}: format to ${step.config.format}`;
      }
      case 'validate': {
        return `${index}: validate schema`;
      }
      case 'transform': {
        const fnName = step.config.fn.name || 'fn';
        return `${index}: transform ${fnName}`;
      }
      case 'branch': {
        return `${index}: conditional branch`;
      }
      case 'parallel': {
        return `${index}: parallel execution (${step.config.builders.length} branches)`;
      }
      case 'compose': {
        return `${index}: compose pipeline`;
      }
      default: {
        return `${index}: ${step.type}`;
      }
    }
  }

  /**
   * Clone this pipeline
   * @returns {Pipeline} New pipeline with same steps
   */
  clone() {
    const cloned = new Pipeline(this.config);
    cloned.steps = [...this.steps];
    return cloned;
  }

  /**
   * Get pipeline summary
   * @returns {Object} Pipeline summary
   */
  summary() {
    return {
      pipelineId: this.pipelineId,
      stepCount: this.steps.length,
      steps: this.steps.map((step, i) => this._stepDescription(step, i)),
    };
  }
}

/**
 * Create a new pipeline builder
 * @param {Object} [config] - Pipeline configuration
 * @returns {Pipeline} New pipeline instance
 */
export function createPipeline(config = {}) {
  return new Pipeline(config);
}

/**
 * Create a reusable pipeline template
 * @param {string} name - Template name
 * @param {Function} builder - Pipeline builder function
 * @returns {Function} Template function that creates configured pipelines
 */
export function createTemplate(name, builder) {
  return (config = {}) => {
    const pipeline = new Pipeline({ ...config, templateName: name });
    builder(pipeline, config);
    return pipeline;
  };
}

/**
 * Compose multiple pipelines into one
 * @param {...Pipeline} pipelines - Pipelines to compose
 * @returns {Pipeline} Composed pipeline
 */
export function composePipelines(...pipelines) {
  if (pipelines.length === 0) {
    throw new Error('composePipelines requires at least one pipeline');
  }

  const composed = new Pipeline();
  for (const pipeline of pipelines) {
    composed.compose(pipeline);
  }
  return composed;
}

/**
 * Create a streaming pipeline for large datasets
 * @param {Object} [config] - Pipeline configuration
 * @returns {Pipeline} New streaming pipeline
 */
export function createStreamingPipeline(config = {}) {
  return new Pipeline({ ...config, streaming: true });
}

// Export Pipeline class for advanced usage
export { Pipeline };
