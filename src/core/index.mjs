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
