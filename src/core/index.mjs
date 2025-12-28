/**
 * Core ZTF API - Main entry point for core functionality
 * @fileoverview Re-exports all core functions and registry utilities
 */

// Export main API functions
export { parseFrom, formatTo, convert } from './main.mjs';

// Export registry functions
export {
  registerAdapter,
  getAdapter,
  listAdapters,
  getAdapterInfo,
  listAdaptersWithInfo,
  adapterSupports,
  createPackManifest,
  registerPack,
  createProvenance,
  simpleHash,
  deterministicStringify,
} from './registry.mjs';

// Export batch operations
export {
  BatchProcessor,
  createBatch,
  createBatchParser,
  createBatchFormatter,
  createBatchConverter,
  detectFormat,
  retryBatch,
  processDirectory,
} from './batch.mjs';

// Export batch scheduler
export {
  BatchScheduler,
  createScheduler,
  Priority,
  ResourcePool,
} from './batch-scheduler.mjs';

// Export streaming validation functions
export {
  createValidationStream,
  createParseStream,
  createFormatStream,
  createValidationPipeline,
  createBackpressureStream,
  createFanOutStream,
  createProgressiveStream,
  autoDetectFormat,
  createMemoryEfficientStream,
} from './streaming.mjs';

// Export stream validators
export {
  createIncrementalCompiler,
  createAggregatorStream,
  createPartialValidatorStream,
  createSchemaEvolutionStream,
  createConditionalValidatorStream,
  createSamplingValidatorStream,
  createDeduplicationStream,
  createRepairStream,
  createBatchedValidatorStream,
} from './stream-validators.mjs';

// Export pipeline functions
export {
  createPipeline,
  createTemplate,
  composePipelines,
  createStreamingPipeline,
  Pipeline,
} from './pipeline.mjs';

// Export schema registry functions
export {
  registerSchema,
  getSchema,
  getSchemaMetadata,
  getSchemaEntry,
  listVersions,
  listSchemas,
  searchSchemas,
  publishSchema,
  unpublishSchema,
  updateMetadata,
  deleteSchema,
  getDependencies,
  getDependents,
  checkCompatibility,
  validateSchema,
  exportRegistry,
  importRegistry,
  clearRegistry,
  getRegistryStats,
  createRegistry,
} from './schema-registry.mjs';

// Export schema store classes and functions
export {
  SchemaStore,
  RemoteRegistry,
  RegistrySynchronizer,
  createFileStore,
  createMemoryStore,
  createRemoteRegistry,
  createSynchronizer,
} from './schema-store.mjs';


// Export schema evolution functions
export {
  createSchemaEvolution,
  addSchemaVersion,
  getSchemaVersion,
  getSchemaEvolution,
  listSchemaVersions,
  getCurrentSchemaVersion,
  findSchemaVersionByHash,
  checkSchemaCompatibility,
  validateMigrationPath,
  createMigrationProvenance,
  listSchemaEvolutions,
  removeSchemaEvolution,
  clearSchemaRegistry,
} from './schema-evolution.mjs';

// Export schema migration functions
export {
  createMigration,
  executeMigration,
  executeBidirectionalMigration,
  buildMigrationChain,
  executeMigrationChain,
  rollbackMigrationChain,
  getMigration,
  listMigrations,
  clearMigrationRegistry,
} from './schema-migration.mjs';

// Export transform functions
export {
  applyTransform,
  testTransform,
  composeTransforms,
  createTransformTemplate,
  registerTransform,
  listTransforms,
  transforms,
} from './transforms.mjs';

// Export transform modules
export { stringTransforms } from '../transforms/string.mjs';
export { numberTransforms } from '../transforms/number.mjs';
export { dateTransforms } from '../transforms/date.mjs';
export { arrayTransforms } from '../transforms/array.mjs';
export { objectTransforms } from '../transforms/object.mjs';

// Export diff functions
export {
  diffData,
  diffFormats,
  summarizeDiff,
} from './diff.mjs';

// Export merge functions
export {
  mergeData,
  mergeTwoWay,
  mergeWithSchemaEvolution,
  createInteractiveResolver,
  summarizeMerge,
} from './merge.mjs';

// Register built-in JSON adapter
import { registerAdapter } from './registry.mjs';

registerAdapter('json', {
  async parse(input, opts = {}) {
    return {
      data: JSON.parse(input),
      metadata: {
        inputSize: input.length,
        ...opts,
      },
    };
  },
  async format(data, opts = {}) {
    const formatted = JSON.stringify(data, undefined, 2);
    return {
      data: formatted,
      metadata: {
        outputSize: formatted.length,
        ...opts,
      },
    };
  },
  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
});
