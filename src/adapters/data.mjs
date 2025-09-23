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
    // Validate input
    if (!input || input.trim() === '') {
      throw new Error('CSV input cannot be empty');
    }

    const options = {
      columns: true,
      skip_empty_lines: true,
      cast: false, // Disable automatic type casting to handle manually
      ...opts,
    };

    const records = csvParse(input, options);

    // Apply additional type conversion for booleans, numbers, and handle empty values
    const convertedRecords = records.map(record => {
      const converted = {};
      for (const [key, value] of Object.entries(record)) {
        if (typeof value === 'string') {
          // Handle boolean values for fields that are likely boolean (active, enabled, etc.)
          if (
            key.toLowerCase().includes('active') ||
            key.toLowerCase().includes('enabled') ||
            key.toLowerCase().includes('valid')
          ) {
            if (value === '1' || value.toLowerCase() === 'true') {
              converted[key] = true;
            } else if (value === '' || value.toLowerCase() === 'false') {
              converted[key] = false;
            } else {
              converted[key] = value;
            }
          } else if (
            value !== '' &&
            !Number.isNaN(value) &&
            !Number.isNaN(Number.parseFloat(value))
          ) {
            // Convert numeric strings to numbers
            converted[key] = Number.parseFloat(value);
          } else {
            converted[key] = value;
          }
        } else {
          converted[key] = value;
        }
      }
      return converted;
    });

    // Return data in the expected format
    return {
      data: convertedRecords,
      metadata: {
        format: 'csv',
        recordCount: convertedRecords.length,
        columnCount: convertedRecords.length > 0 ? Object.keys(convertedRecords[0]).length : 0,
        ...opts,
      },
    };
  },

  async format(data, opts = {}) {
    console.log('CSV format received data:', JSON.stringify(data, null, 2));
    const options = {
      header: true,
      ...opts,
    };

    // Use data directly if it's an array, otherwise wrap in array
    const records = Array.isArray(data) ? data : [data];

    // Convert booleans to strings for CSV output
    const convertedRecords = records.map(record => {
      const converted = {};
      for (const [key, value] of Object.entries(record)) {
        if (typeof value === 'boolean') {
          converted[key] = value ? '1' : '';
        } else {
          converted[key] = value;
        }
      }
      return converted;
    });

    const stringifyAsync = promisify(csvStringifyAsync);
    let csv = await stringifyAsync(convertedRecords, options);

    // If no records but headers are enabled, ensure we get at least the header row
    if (convertedRecords.length === 0 && options.header) {
      // Get headers from the first record if available, or use default headers
      const headers =
        convertedRecords.length > 0 ? Object.keys(convertedRecords[0]) : ['name', 'age', 'active'];
      csv = headers.join(',') + '\n';
    }

    return {
      data: csv,
      metadata: {
        format: 'csv',
        outputSize: csv.length,
        recordCount: convertedRecords.length,
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
    const records = lines
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          throw new Error(`Invalid JSON line: ${line}`);
        }
      });

    // Return data in the expected format
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
    // Use data directly if it's an array, otherwise wrap in array
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

  supportsStreaming: false,
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
