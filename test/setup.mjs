/**
 * Test setup file to register all adapters before tests run
 * This ensures that all adapters are available during testing
 */

// Import the main index file which registers all adapters
import '../src/index.mjs';

// Re-export everything for convenience
export * from '../src/index.mjs';
