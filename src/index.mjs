/**
 * Main entry point for zod-to-from library
 * Re-exports all core functionality and adapters
 */

// Import and register all adapters first
import './adapters/ai.mjs';
import './adapters/communications.mjs';
import './adapters/data.mjs';
import './adapters/devops.mjs';
import './adapters/geo.mjs';
import './adapters/graph.mjs';
import './adapters/media.mjs';
import './adapters/office.mjs';
import './adapters/templating.mjs';

// Import all adapter exports

// Export core functionality
export * from './core/index.mjs';

// Import core functions for from/to wrappers
import { formatTo, parseFrom } from './core/main.mjs';

// Helper functions for from/to wrappers
const fromHelper = (schema, format, input, opts) => parseFrom(schema, format, input, opts);
const toHelper = (schema, format, data, opts) => formatTo(schema, format, data, opts);

// AI Adapters - Schema-validated from/to functions
export const fromDocxAi = (schema, input, opts) => fromHelper(schema, 'docx-ai', input, opts);
export const toDocxAi = (schema, data, opts) => toHelper(schema, 'docx-ai', data, opts);
export const fromPptxAi = (schema, input, opts) => fromHelper(schema, 'pptx-ai', input, opts);
export const toPptxAi = (schema, data, opts) => toHelper(schema, 'pptx-ai', data, opts);
export const fromXlsxAi = (schema, input, opts) => fromHelper(schema, 'xlsx-ai', input, opts);
export const toXlsxAi = (schema, data, opts) => toHelper(schema, 'xlsx-ai', data, opts);

// Communications Adapters - Schema-validated from/to functions
export const fromCurl = (schema, input, opts) => fromHelper(schema, 'curl', input, opts);
export const toCurl = (schema, data, opts) => toHelper(schema, 'curl', data, opts);
export const fromEml = (schema, input, opts) => fromHelper(schema, 'eml', input, opts);
export const toEml = (schema, data, opts) => toHelper(schema, 'eml', data, opts);
export const fromIcs = (schema, input, opts) => fromHelper(schema, 'ics', input, opts);
export const toIcs = (schema, data, opts) => toHelper(schema, 'ics', data, opts);
export const fromMsgpack = (schema, input, opts) => fromHelper(schema, 'msgpack', input, opts);
export const toMsgpack = (schema, data, opts) => toHelper(schema, 'msgpack', data, opts);
export const fromVcard = (schema, input, opts) => fromHelper(schema, 'vcard', input, opts);
export const toVcard = (schema, data, opts) => toHelper(schema, 'vcard', data, opts);

// Data Adapters - Schema-validated from/to functions
export const fromArrow = (schema, input, opts) => fromHelper(schema, 'arrow', input, opts);
export const toArrow = (schema, data, opts) => toHelper(schema, 'arrow', data, opts);
export const fromAvro = (schema, input, opts) => fromHelper(schema, 'avro', input, opts);
export const toAvro = (schema, data, opts) => toHelper(schema, 'avro', data, opts);
export const fromCsv = (schema, input, opts) => fromHelper(schema, 'csv', input, opts);
export const toCsv = (schema, data, opts) => toHelper(schema, 'csv', data, opts);
export const fromJson = (schema, input, opts) => fromHelper(schema, 'json', input, opts);
export const toJson = (schema, data, opts) => toHelper(schema, 'json', data, opts);
export const fromNdjson = (schema, input, opts) => fromHelper(schema, 'ndjson', input, opts);
export const toNdjson = (schema, data, opts) => toHelper(schema, 'ndjson', data, opts);
export const fromParquet = (schema, input, opts) => fromHelper(schema, 'parquet', input, opts);
export const toParquet = (schema, data, opts) => toHelper(schema, 'parquet', data, opts);
export const fromProtobuf = (schema, input, opts) => fromHelper(schema, 'protobuf', input, opts);
export const toProtobuf = (schema, data, opts) => toHelper(schema, 'protobuf', data, opts);
export const fromSqlite = (schema, input, opts) => fromHelper(schema, 'sqlite', input, opts);
export const toSqlite = (schema, data, opts) => toHelper(schema, 'sqlite', data, opts);

// DevOps Adapters - Schema-validated from/to functions
export const fromCompose = (schema, input, opts) => fromHelper(schema, 'compose', input, opts);
export const toCompose = (schema, data, opts) => toHelper(schema, 'compose', data, opts);
export const fromDockerfile = (schema, input, opts) =>
  fromHelper(schema, 'dockerfile', input, opts);
export const toDockerfile = (schema, data, opts) => toHelper(schema, 'dockerfile', data, opts);
export const fromEnv = (schema, input, opts) => fromHelper(schema, 'env', input, opts);
export const toEnv = (schema, data, opts) => toHelper(schema, 'env', data, opts);
export const fromIni = (schema, input, opts) => fromHelper(schema, 'ini', input, opts);
export const toIni = (schema, data, opts) => toHelper(schema, 'ini', data, opts);
export const fromK8s = (schema, input, opts) => fromHelper(schema, 'k8s', input, opts);
export const toK8s = (schema, data, opts) => toHelper(schema, 'k8s', data, opts);
export const fromTerraformHcl = (schema, input, opts) =>
  fromHelper(schema, 'terraform-hcl', input, opts);
export const toTerraformHcl = (schema, data, opts) => toHelper(schema, 'terraform-hcl', data, opts);
export const fromToml = (schema, input, opts) => fromHelper(schema, 'toml', input, opts);
export const toToml = (schema, data, opts) => toHelper(schema, 'toml', data, opts);
export const fromYaml = (schema, input, opts) => fromHelper(schema, 'yaml', input, opts);
export const toYaml = (schema, data, opts) => toHelper(schema, 'yaml', data, opts);

// Geo Adapters - Schema-validated from/to functions
export const fromGpx = (schema, input, opts) => fromHelper(schema, 'gpx', input, opts);
export const toGpx = (schema, data, opts) => toHelper(schema, 'gpx', data, opts);
export const fromKml = (schema, input, opts) => fromHelper(schema, 'kml', input, opts);
export const toKml = (schema, data, opts) => toHelper(schema, 'kml', data, opts);
export const fromTopojson = (schema, input, opts) => fromHelper(schema, 'topojson', input, opts);
export const toTopojson = (schema, data, opts) => toHelper(schema, 'topojson', data, opts);
export const fromWkt = (schema, input, opts) => fromHelper(schema, 'wkt', input, opts);
export const toWkt = (schema, data, opts) => toHelper(schema, 'wkt', data, opts);

// Graph Adapters - Schema-validated from/to functions
export const fromJsonld = (schema, input, opts) => fromHelper(schema, 'jsonld', input, opts);
export const toJsonld = (schema, data, opts) => toHelper(schema, 'jsonld', data, opts);
export const fromNq = (schema, input, opts) => fromHelper(schema, 'nq', input, opts);
export const toNq = (schema, data, opts) => toHelper(schema, 'nq', data, opts);
export const fromPlantuml = (schema, input, opts) => fromHelper(schema, 'plantuml', input, opts);
export const toPlantuml = (schema, data, opts) => toHelper(schema, 'plantuml', data, opts);
export const fromRdfxml = (schema, input, opts) => fromHelper(schema, 'rdfxml', input, opts);
export const toRdfxml = (schema, data, opts) => toHelper(schema, 'rdfxml', data, opts);
export const fromTtl = (schema, input, opts) => fromHelper(schema, 'ttl', input, opts);
export const toTtl = (schema, data, opts) => toHelper(schema, 'ttl', data, opts);

// Media Adapters - Schema-validated from/to functions
export const fromExif = (schema, input, opts) => fromHelper(schema, 'exif', input, opts);
export const toExif = (schema, data, opts) => toHelper(schema, 'exif', data, opts);
export const fromId3 = (schema, input, opts) => fromHelper(schema, 'id3', input, opts);
export const toId3 = (schema, data, opts) => toHelper(schema, 'id3', data, opts);
export const fromPdfText = (schema, input, opts) => fromHelper(schema, 'pdf-text', input, opts);
export const toPdfText = (schema, data, opts) => toHelper(schema, 'pdf-text', data, opts);
export const fromTar = (schema, input, opts) => fromHelper(schema, 'tar', input, opts);
export const toTar = (schema, data, opts) => toHelper(schema, 'tar', data, opts);
export const fromZip = (schema, input, opts) => fromHelper(schema, 'zip', input, opts);
export const toZip = (schema, data, opts) => toHelper(schema, 'zip', data, opts);

// Office Adapters - Schema-validated from/to functions
export const fromOfficeCsv = (schema, input, opts) => fromHelper(schema, 'office-csv', input, opts);
export const toOfficeCsv = (schema, data, opts) => toHelper(schema, 'office-csv', data, opts);
export const fromDocxTable = (schema, input, opts) => fromHelper(schema, 'docx-table', input, opts);
export const toDocxTable = (schema, data, opts) => toHelper(schema, 'docx-table', data, opts);
export const fromHtml = (schema, input, opts) => fromHelper(schema, 'html', input, opts);
export const toHtml = (schema, data, opts) => toHelper(schema, 'html', data, opts);
export const fromMd = (schema, input, opts) => fromHelper(schema, 'md', input, opts);
export const toMd = (schema, data, opts) => toHelper(schema, 'md', data, opts);
export const fromPdfTable = (schema, input, opts) => fromHelper(schema, 'pdf-table', input, opts);
export const toPdfTable = (schema, data, opts) => toHelper(schema, 'pdf-table', data, opts);
export const fromPptxSlides = (schema, input, opts) =>
  fromHelper(schema, 'pptx-slides', input, opts);
export const toPptxSlides = (schema, data, opts) => toHelper(schema, 'pptx-slides', data, opts);
export const fromXlsx = (schema, input, opts) => fromHelper(schema, 'xlsx', input, opts);
export const toXlsx = (schema, data, opts) => toHelper(schema, 'xlsx', data, opts);

// Templating Adapters - Schema-validated from/to functions
export const fromFrontmatter = (schema, input, opts) =>
  fromHelper(schema, 'frontmatter', input, opts);
export const toFrontmatter = (schema, data, opts) => toHelper(schema, 'frontmatter', data, opts);
export const fromNunjucks = (schema, input, opts) => fromHelper(schema, 'nunjucks', input, opts);
export const toNunjucks = (schema, data, opts) => toHelper(schema, 'nunjucks', data, opts);
