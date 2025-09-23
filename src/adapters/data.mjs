/**
 * @typedef {import('../core/index.mjs').Adapter} Adapter
 */

import { parse as csvParse } from 'csv-parse/sync';
import { stringify as csvStringifyAsync } from 'csv-stringify';
import { promisify } from 'node:util';
import { createPackManifest, registerPack } from '../core/index.mjs';

/**
 * CSV adapter for parsing and formatting CSV data
 */
const csvAdapter = {
  async parse(input, opts = {}) {
    const options = {
      columns: true,
      skip_empty_lines: true,
      ...opts,
    };

    const records = csvParse(input, options);

    return {
      data: records,
      metadata: {
        format: 'csv',
        recordCount: records.length,
        columnCount: records.length > 0 ? Object.keys(records[0]).length : 0,
        ...opts,
      },
    };
  },

  async format(data, opts = {}) {
    const options = {
      header: true,
      ...opts,
    };

    const stringifyAsync = promisify(csvStringifyAsync);
    const csv = await stringifyAsync(data, options);

    return {
      data: csv,
      metadata: {
        format: 'csv',
        outputSize: csv.length,
        recordCount: Array.isArray(data) ? data.length : 1,
        ...opts,
      },
    };
  },

  supportsStreaming: true,
  isAI: false,
  version: '1.0.0',
};

/**
 * NDJSON (Newline Delimited JSON) adapter
 */
const ndjsonAdapter = {
  async parse(input, opts = {}) {
    const lines = input.trim().split('\n');
    const records = lines.filter(line => line.trim()).map(line => {
      try {
        return JSON.parse(line);
      } catch {
        throw new Error(`Invalid JSON line: ${line}`);
      }
    });

    return {
      data: records,
      metadata: {
        format: 'ndjson',
        recordCount: records.length,
        ...opts,
      },
    };
  },

  async format(data, opts = {}) {
    const records = Array.isArray(data) ? data : [data];
    const ndjson = records.map(record => JSON.stringify(record)).join('\n');

    return {
      data: ndjson,
      metadata: {
        format: 'ndjson',
        outputSize: ndjson.length,
        recordCount: records.length,
        ...opts,
      },
    };
  },

  supportsStreaming: true,
  isAI: false,
  version: '1.0.0',
};

/**
 * SQLite adapter for database operations
 */
const sqliteAdapter = {
  async parse(input, opts = {}) {
    const sqlite3 = await import('sqlite3');
    const { Database } = sqlite3.default;

    return new Promise((resolve, reject) => {
      const db = new Database(input);
      const query = opts.query || 'SELECT * FROM sqlite_master';

      db.all(query, [], (err, rows) => {
        if (err) {
          reject(new Error(`SQLite query failed: ${err.message}`));
          return;
        }

        db.close(closeErr => {
          if (closeErr) {
            console.warn('Warning: Failed to close database:', closeErr.message);
          }

          resolve({
            data: rows,
            metadata: {
              format: 'sqlite',
              recordCount: rows.length,
              query,
              ...opts,
            },
          });
        });
      });
    });
  },

  async format(data, opts = {}) {
    // Note: SQLite formatting would require creating a database file
    // This is a complex operation that would need schema definition
    throw new Error('SQLite formatting not yet implemented - requires schema definition');
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * Parquet adapter placeholder
 * Note: Would require parquet-wasm or similar library
 */
const parquetAdapter = {
  async parse(input, opts = {}) {
    throw new Error('Parquet support requires additional dependencies (parquet-wasm)');
  },

  async format(data, opts = {}) {
    throw new Error('Parquet support requires additional dependencies (parquet-wasm)');
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * Arrow adapter placeholder
 * Note: Would require apache-arrow library
 */
const arrowAdapter = {
  async parse(input, opts = {}) {
    throw new Error('Arrow support requires additional dependencies (apache-arrow)');
  },

  async format(data, opts = {}) {
    throw new Error('Arrow support requires additional dependencies (apache-arrow)');
  },

  supportsStreaming: true,
  isAI: false,
  version: '1.0.0',
};

/**
 * JSON adapter for parsing and formatting JSON data
 */
const jsonAdapter = {
  async parse(input, opts = {}) {
    try {
      const data = JSON.parse(input);
      return {
        data,
        metadata: {
          format: 'json',
          size: input.length,
          ...opts,
        },
      };
    } catch (error) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
  },

  async format(data, opts = {}) {
    const { deterministic = false } = opts;
    let json;
    
    if (deterministic) {
      // Use deterministic stringify for stable output
      const { deterministicStringify } = await import('../core/registry.mjs');
      json = deterministicStringify(data);
    } else {
      json = JSON.stringify(data, undefined, 2);
    }

    return {
      data: json,
      metadata: {
        format: 'json',
        outputSize: json.length,
        deterministic,
        ...opts,
      },
    };
  },

  supportsStreaming: true,
  isAI: false,
  version: '1.0.0',
};

/**
 * Avro adapter placeholder
 * Note: Would require avro-js library
 */
const avroAdapter = {
  async parse(input, opts = {}) {
    throw new Error('Avro support requires additional dependencies (avro-js)');
  },

  async format(data, opts = {}) {
    throw new Error('Avro support requires additional dependencies (avro-js)');
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * Protobuf adapter placeholder
 * Note: Would require protobufjs library
 */
const protobufAdapter = {
  async parse(input, opts = {}) {
    throw new Error('Protobuf support requires additional dependencies (protobufjs)');
  },

  async format(data, opts = {}) {
    throw new Error('Protobuf support requires additional dependencies (protobufjs)');
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

// Create pack manifest
const packManifest = createPackManifest(
  'ztf-pack-data',
  ['csv', 'ndjson', 'json', 'sqlite', 'parquet', 'arrow', 'avro', 'protobuf'],
  {
    version: '1.0.0',
    description: 'Data analytics format adapters for ZTF',
    dependencies: ['csv-parse', 'csv-stringify', 'sqlite3'],
  }
);

// Register all adapters
const adapters = {
  csv: csvAdapter,
  ndjson: ndjsonAdapter,
  json: jsonAdapter,
  sqlite: sqliteAdapter,
  parquet: parquetAdapter,
  arrow: arrowAdapter,
  avro: avroAdapter,
  protobuf: protobufAdapter,
};

registerPack(packManifest, adapters);

export {
  arrowAdapter,
  avroAdapter,
  csvAdapter,
  jsonAdapter,
  ndjsonAdapter,
  parquetAdapter,
  protobufAdapter,
  sqliteAdapter,
};
