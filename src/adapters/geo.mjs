/**
 * @typedef {import('../core/index.mjs').Adapter} Adapter
 */

import { createPackManifest, registerPack } from '../core/index.mjs';

/**
 * GPX adapter placeholder
 * Note: Would require xmldom library
 */
const gpxAdapter = {
  async parse(input, opts = {}) {
    throw new Error('GPX support requires additional dependencies (xmldom)');
  },

  async format(data, opts = {}) {
    throw new Error('GPX support requires additional dependencies (xmldom)');
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * KML adapter placeholder
 * Note: Would require xmldom library
 */
const kmlAdapter = {
  async parse(input, opts = {}) {
    throw new Error('KML support requires additional dependencies (xmldom)');
  },

  async format(data, opts = {}) {
    throw new Error('KML support requires additional dependencies (xmldom)');
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * TopoJSON adapter placeholder
 * Note: Would require topojson-client library
 */
const topojsonAdapter = {
  async parse(input, opts = {}) {
    throw new Error('TopoJSON support requires additional dependencies (topojson-client)');
  },

  async format(data, opts = {}) {
    throw new Error('TopoJSON support requires additional dependencies (topojson-client)');
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * WKT adapter placeholder
 * Note: Would require wellknown library
 */
const wktAdapter = {
  async parse(input, opts = {}) {
    throw new Error('WKT support requires additional dependencies (wellknown)');
  },

  async format(data, opts = {}) {
    throw new Error('WKT support requires additional dependencies (wellknown)');
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

// Create pack manifest
const packManifest = createPackManifest(
  'ztf-pack-geo',
  ['gpx', 'kml', 'topojson', 'wkt'],
  {
    version: '1.0.0',
    description: 'Geo format adapters for ZTF',
    dependencies: [],
  }
);

// Register all adapters
const adapters = {
  gpx: gpxAdapter,
  kml: kmlAdapter,
  topojson: topojsonAdapter,
  wkt: wktAdapter,
};

registerPack(packManifest, adapters);

export {
  gpxAdapter,
  kmlAdapter,
  topojsonAdapter,
  wktAdapter,
};
