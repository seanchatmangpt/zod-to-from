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
import { docxAiAdapter, pptxAiAdapter, xlsxAiAdapter } from './adapters/ai.mjs';

import {
  curlAdapter,
  emlAdapter,
  icsAdapter,
  msgpackAdapter,
  vcardAdapter,
} from './adapters/communications.mjs';

import {
  arrowAdapter,
  avroAdapter,
  csvAdapter,
  jsonAdapter,
  ndjsonAdapter,
  parquetAdapter,
  protobufAdapter,
  sqliteAdapter,
} from './adapters/data.mjs';

import {
  composeAdapter,
  dockerfileAdapter,
  envAdapter,
  iniAdapter,
  k8sAdapter,
  terraformHclAdapter,
  tomlAdapter,
  yamlAdapter,
} from './adapters/devops.mjs';

import { gpxAdapter, kmlAdapter, topojsonAdapter, wktAdapter } from './adapters/geo.mjs';

import {
  jsonldAdapter,
  nqAdapter,
  plantumlAdapter,
  rdfxmlAdapter,
  ttlAdapter,
} from './adapters/graph.mjs';

import {
  exifAdapter,
  id3Adapter,
  pdfTextAdapter,
  tarAdapter,
  zipAdapter,
} from './adapters/media.mjs';

import {
  docxTableAdapter,
  htmlAdapter,
  mdAdapter,
  csvAdapter as officeCsvAdapter,
  pdfTableAdapter,
  pptxSlidesAdapter,
  xlsxAdapter,
} from './adapters/office.mjs';

import { frontmatterAdapter, nunjucksAdapter } from './adapters/templating.mjs';

// Export core functionality
export * from './core/index.mjs';

// AI Adapters
export const fromDocxAi = docxAiAdapter.parse;
export const toDocxAi = docxAiAdapter.format;
export const fromPptxAi = pptxAiAdapter.parse;
export const toPptxAi = pptxAiAdapter.format;
export const fromXlsxAi = xlsxAiAdapter.parse;
export const toXlsxAi = xlsxAiAdapter.format;

// Communications Adapters
export const fromCurl = curlAdapter.parse;
export const toCurl = curlAdapter.format;
export const fromEml = emlAdapter.parse;
export const toEml = emlAdapter.format;
export const fromIcs = icsAdapter.parse;
export const toIcs = icsAdapter.format;
export const fromMsgpack = msgpackAdapter.parse;
export const toMsgpack = msgpackAdapter.format;
export const fromVcard = vcardAdapter.parse;
export const toVcard = vcardAdapter.format;

// Data Adapters
export const fromArrow = arrowAdapter.parse;
export const toArrow = arrowAdapter.format;
export const fromAvro = avroAdapter.parse;
export const toAvro = avroAdapter.format;
export const fromCsv = csvAdapter.parse;
export const toCsv = csvAdapter.format;
export const fromJson = jsonAdapter.parse;
export const toJson = jsonAdapter.format;
export const fromNdjson = ndjsonAdapter.parse;
export const toNdjson = ndjsonAdapter.format;
export const fromParquet = parquetAdapter.parse;
export const toParquet = parquetAdapter.format;
export const fromProtobuf = protobufAdapter.parse;
export const toProtobuf = protobufAdapter.format;
export const fromSqlite = sqliteAdapter.parse;
export const toSqlite = sqliteAdapter.format;

// DevOps Adapters
export const fromCompose = composeAdapter.parse;
export const toCompose = composeAdapter.format;
export const fromDockerfile = dockerfileAdapter.parse;
export const toDockerfile = dockerfileAdapter.format;
export const fromEnv = envAdapter.parse;
export const toEnv = envAdapter.format;
export const fromIni = iniAdapter.parse;
export const toIni = iniAdapter.format;
export const fromK8s = k8sAdapter.parse;
export const toK8s = k8sAdapter.format;
export const fromTerraformHcl = terraformHclAdapter.parse;
export const toTerraformHcl = terraformHclAdapter.format;
export const fromToml = tomlAdapter.parse;
export const toToml = tomlAdapter.format;
export const fromYaml = yamlAdapter.parse;
export const toYaml = yamlAdapter.format;

// Geo Adapters
export const fromGpx = gpxAdapter.parse;
export const toGpx = gpxAdapter.format;
export const fromKml = kmlAdapter.parse;
export const toKml = kmlAdapter.format;
export const fromTopojson = topojsonAdapter.parse;
export const toTopojson = topojsonAdapter.format;
export const fromWkt = wktAdapter.parse;
export const toWkt = wktAdapter.format;

// Graph Adapters
export const fromJsonld = jsonldAdapter.parse;
export const toJsonld = jsonldAdapter.format;
export const fromNq = nqAdapter.parse;
export const toNq = nqAdapter.format;
export const fromPlantuml = plantumlAdapter.parse;
export const toPlantuml = plantumlAdapter.format;
export const fromRdfxml = rdfxmlAdapter.parse;
export const toRdfxml = rdfxmlAdapter.format;
export const fromTtl = ttlAdapter.parse;
export const toTtl = ttlAdapter.format;

// Media Adapters
export const fromExif = exifAdapter.parse;
export const toExif = exifAdapter.format;
export const fromId3 = id3Adapter.parse;
export const toId3 = id3Adapter.format;
export const fromPdfText = pdfTextAdapter.parse;
export const toPdfText = pdfTextAdapter.format;
export const fromTar = tarAdapter.parse;
export const toTar = tarAdapter.format;
export const fromZip = zipAdapter.parse;
export const toZip = zipAdapter.format;

// Office Adapters
export const fromOfficeCsv = officeCsvAdapter.parse;
export const toOfficeCsv = officeCsvAdapter.format;
export const fromDocxTable = docxTableAdapter.parse;
export const toDocxTable = docxTableAdapter.format;
export const fromHtml = htmlAdapter.parse;
export const toHtml = htmlAdapter.format;
export const fromMd = mdAdapter.parse;
export const toMd = mdAdapter.format;
export const fromPdfTable = pdfTableAdapter.parse;
export const toPdfTable = pdfTableAdapter.format;
export const fromPptxSlides = pptxSlidesAdapter.parse;
export const toPptxSlides = pptxSlidesAdapter.format;
export const fromXlsx = xlsxAdapter.parse;
export const toXlsx = xlsxAdapter.format;

// Templating Adapters
export const fromFrontmatter = frontmatterAdapter.parse;
export const toFrontmatter = frontmatterAdapter.format;
export const fromNunjucks = nunjucksAdapter.parse;
export const toNunjucks = nunjucksAdapter.format;
