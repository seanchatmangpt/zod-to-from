#!/usr/bin/env node

/**
 * ZTF CLI - Command-line interface for zod-to-from
 * Structured around nouns (things you operate on) and verbs (actions you take)
 *
 * Core Philosophy:
 * - Nouns: artifact, schema, adapter, audit, test
 * - Verbs: convert, parse, format, validate, migrate, list, export, run
 */

// Import command implementations
import * as adapterCommands from './commands/adapter.mjs';
import * as artifactCommands from './commands/artifact.mjs';
import * as auditCommands from './commands/audit.mjs';
import * as schemaCommands from './commands/schema.mjs';
import * as testCommands from './commands/test.mjs';

// Import adapters to register them
import '../adapters/data.mjs';

/**
 * CLI configuration and options
 * @typedef {Object} CLIOptions
 * @property {string} schema - Path to schema file with export
 * @property {string} from - Source format
 * @property {string} to - Target format
 * @property {string} in - Input file path
 * @property {string} out - Output file path
 * @property {boolean} repair - Enable auto-fix and re-validation
 * @property {string} llmPrompt - Prompt for LLM-assisted adapters
 * @property {boolean} provenance - Include provenance metadata
 * @property {boolean} deterministic - Enforce deterministic output
 * @property {boolean} streaming - Use streaming for large datasets
 * @property {string} format - Output format for audit export
 * @property {string} type - Test type (round-trip, fuzz, etc.)
 * @property {string} name - Adapter name for info command
 */

/**
 * Parse command-line arguments
 * @param {string[]} args - Command line arguments
 * @returns {Object} Parsed command and options
 */
function parseArgs(args) {
  const noun = args[0];
  const verb = args[1];
  const command = `${noun} ${verb}`;
  const options = {};

  // Handle positional arguments for adapter commands
  if (
    noun === 'adapter' &&
    ['show', 'test', 'scaffold'].includes(verb) && // The next argument after the verb is the adapter name
    args[2] &&
    !args[2].startsWith('--')
  ) {
    options.name = args[2];
  }

  // Parse options starting from the appropriate index
  const startIndex =
    noun === 'adapter' && ['show', 'test', 'scaffold'].includes(verb) && options.name ? 3 : 2;

  for (let i = startIndex; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];

    if (key && value) {
      // Convert boolean flags
      if (value === 'true') {
        options[key] = true;
      } else if (value === 'false') {
        options[key] = false;
      } else {
        options[key] = value;
      }
    }
  }

  return { command, options };
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
ZTF CLI - Universal I/O conversion layer for Zod schemas

USAGE:
  ztf <noun> <verb> [options]

NOUNS:
  artifact    Operate on data artifacts (convert, parse, format)
  schema      Manage schemas (migrate, validate)
  adapter     Manage adapters (list, show, test, scaffold)
  audit       Manage audit logs (export, show)
  test        Run tests (run, validate)

VERBS:
  convert     Convert between formats (artifact)
  parse       Parse and validate input (artifact)
  format      Format validated data (artifact)
  migrate     Migrate schema versions (schema)
  list        List available adapters (adapter)
  show        Show detailed adapter information (adapter)
  test        Run adapter conformance tests (adapter)
  scaffold    Generate new adapter boilerplate (adapter)
  export      Export audit logs (audit)
  run         Run tests (test)

EXAMPLES:
  # Convert CSV to Parquet
  ztf artifact convert --from csv --to parquet --schema ./schemas/data.mjs#DataSchema --in data.csv --out data.parquet

  # Parse TOML config
  ztf artifact parse --from toml --schema ./schemas/config.mjs#Config --in config.toml

  # Format JSON to Turtle
  ztf artifact format --to ttl --schema ./schemas/user.mjs#UserSchema --in user.json --out user.ttl

  # List available adapters
  ztf adapter list

  # List adapters with verbose details
  ztf adapter list --verbose

  # Show detailed information about CSV adapter
  ztf adapter show csv

  # Test adapter conformance
  ztf adapter test yaml --type round-trip

  # Scaffold a new custom adapter
  ztf adapter scaffold my-format --pack custom --out ./my-adapters

  # Export audit log
  ztf audit export --format turtle --in provenance.json --out audit.ttl

  # Run round-trip test
  ztf test run --type round-trip --schema ./schemas/data.mjs#DataSchema --format yaml --in data.yaml

OPTIONS:
  --schema <path>     Path to schema file (required for artifact operations)
  --from <format>     Source format
  --to <format>       Target format
  --in <file>         Input file path (defaults to stdin)
  --out <file>        Output file path (defaults to stdout)
  --repair            Enable auto-fix and re-validation
  --llm-prompt <text> Prompt for LLM-assisted adapters
  --provenance        Include provenance metadata
  --deterministic     Enforce deterministic output
  --streaming         Use streaming for large datasets
  --format <format>   Output format for audit export
  --type <name>       Test type (round-trip, fuzz, etc.)

For more information, visit: https://github.com/unjs/zod-to-from
`);
}

/**
 * Main CLI function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help' || args.includes('--help')) {
    showHelp();
    return;
  }

  const { command, options } = parseArgs(args);

  // Validate required options based on command
  if (
    ['artifact convert', 'artifact parse', 'artifact format'].includes(command) &&
    !options.schema
  ) {
    console.error('❌ Error: --schema is required for artifact operations');
    process.exit(1);
  }

  // Execute command
  switch (command) {
    case 'artifact convert': {
      await artifactCommands.convert(options);
      break;
    }
    case 'artifact parse': {
      await artifactCommands.parse(options);
      break;
    }
    case 'artifact format': {
      await artifactCommands.format(options);
      break;
    }
    case 'adapter list': {
      await adapterCommands.list(options);
      break;
    }
    case 'adapter show': {
      await adapterCommands.show(options);
      break;
    }
    case 'adapter test': {
      await adapterCommands.test(options);
      break;
    }
    case 'adapter scaffold': {
      await adapterCommands.scaffold(options);
      break;
    }
    case 'schema migrate': {
      await schemaCommands.migrate(options);
      break;
    }
    case 'schema validate': {
      await schemaCommands.validate(options);
      break;
    }
    case 'audit export': {
      await auditCommands.exportAudit(options);
      break;
    }
    case 'audit show': {
      await auditCommands.show(options);
      break;
    }
    case 'test run': {
      await testCommands.run(options);
      break;
    }
    default: {
      console.error(`❌ Unknown command: ${command}`);
      console.error('Run "ztf help" for usage information');
      process.exit(1);
    }
  }
}

// Execute if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
