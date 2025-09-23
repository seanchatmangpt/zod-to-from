/**
 * Main entry point for zod-to-from library
 * Re-exports all core functionality and adapters
 */

// Import and register all adapters first
import './adapters/data.mjs';
import './adapters/office.mjs';
import './adapters/graph.mjs';
import './adapters/devops.mjs';
import './adapters/templating.mjs';
import './adapters/ai.mjs';
import './adapters/communications.mjs';
import './adapters/media.mjs';
import './adapters/geo.mjs';

// Export core functionality
export * from './core/index.mjs';
