/**
 * @typedef {import('../core/registry.mjs').Adapter} Adapter
 */

import { createPackManifest, registerPack } from '../core/index.mjs';

/**
 * Parse metadata from GPX element
 * @param {Element} gpxElement - The GPX root element
 * @returns {Object|null} Parsed metadata
 */
function parseGPXMetadata(gpxElement) {
  const metadataElement = gpxElement.getElementsByTagName('metadata')[0];
  if (!metadataElement) return undefined;

  const metadata = {};

  // Parse name
  const nameElement = metadataElement.getElementsByTagName('name')[0];
  if (nameElement) metadata.name = nameElement.textContent;

  // Parse description
  const descElement = metadataElement.getElementsByTagName('desc')[0];
  if (descElement) metadata.description = descElement.textContent;

  // Parse author
  const authorElement = metadataElement.getElementsByTagName('author')[0];
  if (authorElement) {
    metadata.author = {
      name: authorElement.getElementsByTagName('name')[0]?.textContent,
      email: authorElement.getElementsByTagName('email')[0]?.textContent,
      link: authorElement.getElementsByTagName('link')[0]?.getAttribute('href'),
    };
  }

  // Parse time
  const timeElement = metadataElement.getElementsByTagName('time')[0];
  if (timeElement) metadata.time = timeElement.textContent;

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

/**
 * Parse waypoints from GPX element
 * @param {Element} gpxElement - The GPX root element
 * @returns {Array} Array of waypoint objects
 */
function parseGPXWaypoints(gpxElement) {
  const waypoints = [];
  const wptElements = gpxElement.getElementsByTagName('wpt');

  for (let i = 0; i < wptElements.length; i++) {
    const wpt = wptElements[i];
    const waypoint = {
      lat: Number.parseFloat(wpt.getAttribute('lat')),
      lon: Number.parseFloat(wpt.getAttribute('lon')),
    };

    // Parse elevation
    const eleElement = wpt.getElementsByTagName('ele')[0];
    if (eleElement) waypoint.elevation = Number.parseFloat(eleElement.textContent);

    // Parse time
    const timeElement = wpt.getElementsByTagName('time')[0];
    if (timeElement) waypoint.time = timeElement.textContent;

    // Parse name
    const nameElement = wpt.getElementsByTagName('name')[0];
    if (nameElement) waypoint.name = nameElement.textContent;

    // Parse description
    const descElement = wpt.getElementsByTagName('desc')[0];
    if (descElement) waypoint.description = descElement.textContent;

    waypoints.push(waypoint);
  }

  return waypoints;
}

/**
 * Parse routes from GPX element
 * @param {Element} gpxElement - The GPX root element
 * @returns {Array} Array of route objects
 */
function parseGPXRoutes(gpxElement) {
  const routes = [];
  const rteElements = gpxElement.getElementsByTagName('rte');

  for (let i = 0; i < rteElements.length; i++) {
    const rte = rteElements[i];
    const route = {};

    // Parse name
    const nameElement = rte.getElementsByTagName('name')[0];
    if (nameElement) route.name = nameElement.textContent;

    // Parse description
    const descElement = rte.getElementsByTagName('desc')[0];
    if (descElement) route.description = descElement.textContent;

    // Parse route points
    const routePoints = [];
    const rteptElements = rte.getElementsByTagName('rtept');

    for (let j = 0; j < rteptElements.length; j++) {
      const rtept = rteptElements[j];
      const point = {
        lat: Number.parseFloat(rtept.getAttribute('lat')),
        lon: Number.parseFloat(rtept.getAttribute('lon')),
      };

      // Parse elevation
      const eleElement = rtept.getElementsByTagName('ele')[0];
      if (eleElement) point.elevation = Number.parseFloat(eleElement.textContent);

      routePoints.push(point);
    }

    if (routePoints.length > 0) route.points = routePoints;
    routes.push(route);
  }

  return routes;
}

/**
 * Parse tracks from GPX element
 * @param {Element} gpxElement - The GPX root element
 * @returns {Array} Array of track objects
 */
function parseGPXTracks(gpxElement) {
  const tracks = [];
  const trkElements = gpxElement.getElementsByTagName('trk');

  for (let i = 0; i < trkElements.length; i++) {
    const trk = trkElements[i];
    const track = {};

    // Parse name
    const nameElement = trk.getElementsByTagName('name')[0];
    if (nameElement) track.name = nameElement.textContent;

    // Parse description
    const descElement = trk.getElementsByTagName('desc')[0];
    if (descElement) track.description = descElement.textContent;

    // Parse track segments
    const segments = [];
    const trksegElements = trk.getElementsByTagName('trkseg');

    for (let j = 0; j < trksegElements.length; j++) {
      const trkseg = trksegElements[j];
      const segment = [];
      const trkptElements = trkseg.getElementsByTagName('trkpt');

      for (let k = 0; k < trkptElements.length; k++) {
        const trkpt = trkptElements[k];
        const point = {
          lat: Number.parseFloat(trkpt.getAttribute('lat')),
          lon: Number.parseFloat(trkpt.getAttribute('lon')),
        };

        // Parse elevation
        const eleElement = trkpt.getElementsByTagName('ele')[0];
        if (eleElement) point.elevation = Number.parseFloat(eleElement.textContent);

        // Parse time
        const timeElement = trkpt.getElementsByTagName('time')[0];
        if (timeElement) point.time = timeElement.textContent;

        segment.push(point);
      }

      if (segment.length > 0) segments.push(segment);
    }

    if (segments.length > 0) track.segments = segments;
    tracks.push(track);
  }

  return tracks;
}

/**
 * Create GPX document from data
 * @param {Object} gpx - GPX data object
 * @param {Object} opts - Options
 * @returns {Document} XML document
 */
function createGPXDocument(gpx, opts = {}) {
  // This would need to be implemented with proper XML document creation
  // For now, return a basic structure
  throw new Error('GPX formatting not yet implemented - requires XML document creation');
}

/**
 * GPX adapter for parsing and formatting GPX (GPS Exchange Format) files
 * @type {Adapter}
 */
const gpxAdapter = {
  async parse(input, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const { DOMParser } = await import('xmldom');

      if (!input || input.trim() === '') {
        throw new Error('GPX input cannot be empty');
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(input, 'text/xml');

      // Check for parsing errors
      const parseError = doc.getElementsByTagName('parsererror')[0];
      if (parseError) {
        throw new Error(`GPX parsing error: ${parseError.textContent}`);
      }

      const gpxElement = doc.getElementsByTagName('gpx')[0];
      if (!gpxElement) {
        throw new Error('Invalid GPX: root <gpx> element not found');
      }

      const result = {
        gpx: {
          version: gpxElement.getAttribute('version') || '1.1',
          creator: gpxElement.getAttribute('creator') || 'ZTF',
          metadata: parseGPXMetadata(gpxElement),
          waypoints: parseGPXWaypoints(gpxElement),
          routes: parseGPXRoutes(gpxElement),
          tracks: parseGPXTracks(gpxElement),
        },
      };

      return {
        data: result,
        metadata: {
          inputSize: input.length,
          format: 'gpx',
          version: result.gpx.version,
          waypointCount: result.gpx.waypoints.length,
          routeCount: result.gpx.routes.length,
          trackCount: result.gpx.tracks.length,
          ...opts,
        },
      };
    } catch (error) {
      if (error.message.includes('Cannot resolve module')) {
        throw new Error('GPX support requires xmldom dependency. Install with: pnpm add xmldom');
      }
      throw error;
    }
  },

  async format(data, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const { XMLSerializer } = await import('xmldom');

      if (!data || !(/** @type {any} */ (data).gpx)) {
        throw new Error('Invalid GPX data: missing gpx object');
      }

      const gpx = /** @type {any} */ (data).gpx;
      const serializer = new XMLSerializer();

      // Create GPX document
      const doc = createGPXDocument(gpx, opts);
      const xmlString = serializer.serializeToString(doc);

      // Add XML declaration
      const formatted = `<?xml version="1.0" encoding="UTF-8"?>\n${xmlString}`;

      return {
        data: formatted,
        metadata: {
          outputSize: formatted.length,
          format: 'gpx',
          version: gpx.version || '1.1',
          waypointCount: gpx.waypoints?.length || 0,
          routeCount: gpx.routes?.length || 0,
          trackCount: gpx.tracks?.length || 0,
          ...opts,
        },
      };
    } catch (error) {
      if (error.message.includes('Cannot resolve module')) {
        throw new Error('GPX support requires xmldom dependency. Install with: pnpm add xmldom');
      }
      throw error;
    }
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * Parse KML Document element
 * @param {Element} kmlElement - The KML root element
 * @returns {Object|null} Parsed document
 */
function parseKMLDocument(kmlElement) {
  const documentElement = kmlElement.getElementsByTagName('Document')[0];
  if (!documentElement) return undefined;

  const document = {};

  // Parse name
  const nameElement = documentElement.getElementsByTagName('name')[0];
  if (nameElement) document.name = nameElement.textContent;

  // Parse description
  const descElement = documentElement.getElementsByTagName('description')[0];
  if (descElement) document.description = descElement.textContent;

  // Parse styles
  const styles = parseKMLStyles(documentElement);
  if (styles.length > 0) document.styles = styles;

  // Parse placemarks
  const placemarks = parseKMLPlacemarks(documentElement);
  if (placemarks.length > 0) document.placemarks = placemarks;

  // Parse folders
  const folders = parseKMLFolders(documentElement);
  if (folders.length > 0) document.folders = folders;

  return Object.keys(document).length > 0 ? document : undefined;
}

/**
 * Parse KML styles
 * @param {Element} documentElement - The Document element
 * @returns {Array} Array of style objects
 */
function parseKMLStyles(documentElement) {
  const styles = [];
  const styleElements = documentElement.getElementsByTagName('Style');

  for (let i = 0; i < styleElements.length; i++) {
    const style = styleElements[i];
    const styleObj = {
      id: style.getAttribute('id'),
    };

    // Parse IconStyle
    const iconStyle = style.getElementsByTagName('IconStyle')[0];
    if (iconStyle) {
      styleObj.iconStyle = parseKMLIconStyle(iconStyle);
    }

    // Parse LineStyle
    const lineStyle = style.getElementsByTagName('LineStyle')[0];
    if (lineStyle) {
      styleObj.lineStyle = parseKMLLineStyle(lineStyle);
    }

    // Parse PolyStyle
    const polyStyle = style.getElementsByTagName('PolyStyle')[0];
    if (polyStyle) {
      styleObj.polyStyle = parseKMLPolyStyle(polyStyle);
    }

    styles.push(styleObj);
  }

  return styles;
}

/**
 * Parse IconStyle
 * @param {Element} iconStyleElement - The IconStyle element
 * @returns {Object} Parsed IconStyle
 */
function parseKMLIconStyle(iconStyleElement) {
  const iconStyle = {};

  // Parse color
  const colorElement = iconStyleElement.getElementsByTagName('color')[0];
  if (colorElement) iconStyle.color = colorElement.textContent;

  // Parse scale
  const scaleElement = iconStyleElement.getElementsByTagName('scale')[0];
  if (scaleElement) iconStyle.scale = Number.parseFloat(scaleElement.textContent);

  // Parse icon
  const iconElement = iconStyleElement.getElementsByTagName('Icon')[0];
  if (iconElement) {
    const hrefElement = iconElement.getElementsByTagName('href')[0];
    if (hrefElement) iconStyle.href = hrefElement.textContent;
  }

  return iconStyle;
}

/**
 * Parse LineStyle
 * @param {Element} lineStyleElement - The LineStyle element
 * @returns {Object} Parsed LineStyle
 */
function parseKMLLineStyle(lineStyleElement) {
  const lineStyle = {};

  // Parse color
  const colorElement = lineStyleElement.getElementsByTagName('color')[0];
  if (colorElement) lineStyle.color = colorElement.textContent;

  // Parse width
  const widthElement = lineStyleElement.getElementsByTagName('width')[0];
  if (widthElement) lineStyle.width = Number.parseFloat(widthElement.textContent);

  return lineStyle;
}

/**
 * Parse PolyStyle
 * @param {Element} polyStyleElement - The PolyStyle element
 * @returns {Object} Parsed PolyStyle
 */
function parseKMLPolyStyle(polyStyleElement) {
  const polyStyle = {};

  // Parse color
  const colorElement = polyStyleElement.getElementsByTagName('color')[0];
  if (colorElement) polyStyle.color = colorElement.textContent;

  // Parse fill
  const fillElement = polyStyleElement.getElementsByTagName('fill')[0];
  if (fillElement) polyStyle.fill = fillElement.textContent === '1';

  // Parse outline
  const outlineElement = polyStyleElement.getElementsByTagName('outline')[0];
  if (outlineElement) polyStyle.outline = outlineElement.textContent === '1';

  return polyStyle;
}

/**
 * Parse KML placemarks
 * @param {Element} documentElement - The Document element
 * @returns {Array} Array of placemark objects
 */
function parseKMLPlacemarks(documentElement) {
  const placemarks = [];
  const placemarkElements = documentElement.getElementsByTagName('Placemark');

  for (let i = 0; i < placemarkElements.length; i++) {
    const placemark = placemarkElements[i];
    const placemarkObj = {};

    // Parse name
    const nameElement = placemark.getElementsByTagName('name')[0];
    if (nameElement) placemarkObj.name = nameElement.textContent;

    // Parse description
    const descElement = placemark.getElementsByTagName('description')[0];
    if (descElement) placemarkObj.description = descElement.textContent;

    // Parse styleUrl
    const styleUrlElement = placemark.getElementsByTagName('styleUrl')[0];
    if (styleUrlElement) placemarkObj.styleUrl = styleUrlElement.textContent;

    // Parse geometry
    const geometry = parseKMLGeometry(placemark);
    if (geometry) placemarkObj.geometry = geometry;

    placemarks.push(placemarkObj);
  }

  return placemarks;
}

/**
 * Parse KML geometry
 * @param {Element} placemarkElement - The Placemark element
 * @returns {Object|null} Parsed geometry
 */
function parseKMLGeometry(placemarkElement) {
  // Parse Point
  const pointElement = placemarkElement.getElementsByTagName('Point')[0];
  if (pointElement) {
    const coordinatesElement = pointElement.getElementsByTagName('coordinates')[0];
    if (coordinatesElement) {
      const coords = coordinatesElement.textContent.trim().split(',');
      return {
        type: 'Point',
        coordinates: [
          Number.parseFloat(coords[0]),
          Number.parseFloat(coords[1]),
          coords[2] ? Number.parseFloat(coords[2]) : 0,
        ],
      };
    }
  }

  // Parse LineString
  const lineStringElement = placemarkElement.getElementsByTagName('LineString')[0];
  if (lineStringElement) {
    const coordinatesElement = lineStringElement.getElementsByTagName('coordinates')[0];
    if (coordinatesElement) {
      const coords = coordinatesElement.textContent.trim().split(/\s+/);
      const coordinates = coords.map(coord => {
        const parts = coord.split(',');
        return [
          Number.parseFloat(parts[0]),
          Number.parseFloat(parts[1]),
          parts[2] ? Number.parseFloat(parts[2]) : 0,
        ];
      });
      return {
        type: 'LineString',
        coordinates,
      };
    }
  }

  // Parse Polygon
  const polygonElement = placemarkElement.getElementsByTagName('Polygon')[0];
  if (polygonElement) {
    const outerBoundaryElement = polygonElement.getElementsByTagName('outerBoundaryIs')[0];
    if (outerBoundaryElement) {
      const coordinatesElement = outerBoundaryElement.getElementsByTagName('coordinates')[0];
      if (coordinatesElement) {
        const coords = coordinatesElement.textContent.trim().split(/\s+/);
        const coordinates = coords.map(coord => {
          const parts = coord.split(',');
          return [
            Number.parseFloat(parts[0]),
            Number.parseFloat(parts[1]),
            parts[2] ? Number.parseFloat(parts[2]) : 0,
          ];
        });
        return {
          type: 'Polygon',
          coordinates: [coordinates],
        };
      }
    }
  }

  return undefined;
}

/**
 * Parse KML folders
 * @param {Element} documentElement - The Document element
 * @returns {Array} Array of folder objects
 */
function parseKMLFolders(documentElement) {
  const folders = [];
  const folderElements = documentElement.getElementsByTagName('Folder');

  for (let i = 0; i < folderElements.length; i++) {
    const folder = folderElements[i];
    const folderObj = {};

    // Parse name
    const nameElement = folder.getElementsByTagName('name')[0];
    if (nameElement) folderObj.name = nameElement.textContent;

    // Parse description
    const descElement = folder.getElementsByTagName('description')[0];
    if (descElement) folderObj.description = descElement.textContent;

    // Parse placemarks within folder
    const placemarks = parseKMLPlacemarks(folder);
    if (placemarks.length > 0) folderObj.placemarks = placemarks;

    folders.push(folderObj);
  }

  return folders;
}

/**
 * Count placemarks in KML element
 * @param {Element} kmlElement - The KML element
 * @returns {number} Number of placemarks
 */
function countKMLPlacemarks(kmlElement) {
  return kmlElement.getElementsByTagName('Placemark').length;
}

/**
 * Create KML document from data
 * @param {Object} kml - KML data object
 * @param {Object} opts - Options
 * @returns {Document} XML document
 */
function createKMLDocument(kml, opts = {}) {
  // This would need to be implemented with proper XML document creation
  // For now, return a basic structure
  throw new Error('KML formatting not yet implemented - requires XML document creation');
}

/**
 * KML adapter for parsing and formatting KML (Keyhole Markup Language) files
 * @type {Adapter}
 */
const kmlAdapter = {
  async parse(input, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const { DOMParser } = await import('xmldom');

      if (!input || input.trim() === '') {
        throw new Error('KML input cannot be empty');
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(input, 'text/xml');

      // Check for parsing errors
      const parseError = doc.getElementsByTagName('parsererror')[0];
      if (parseError) {
        throw new Error(`KML parsing error: ${parseError.textContent}`);
      }

      // Handle both KML and KMZ (compressed KML)
      let kmlElement = doc.getElementsByTagName('kml')[0];
      if (!kmlElement) {
        // Try to find Document element directly
        const documentElement = doc.getElementsByTagName('Document')[0];
        if (documentElement) {
          kmlElement = documentElement.parentNode;
        }
      }

      if (!kmlElement) {
        throw new Error('Invalid KML: root <kml> element not found');
      }

      const result = {
        kml: {
          version: kmlElement.getAttribute('version') || '2.2',
          xmlns: kmlElement.getAttribute('xmlns') || 'http://www.opengis.net/kml/2.2',
          document: parseKMLDocument(kmlElement),
        },
      };

      return {
        data: result,
        metadata: {
          inputSize: input.length,
          format: 'kml',
          version: result.kml.version,
          placemarkCount: countKMLPlacemarks(kmlElement),
          ...opts,
        },
      };
    } catch (error) {
      if (error.message.includes('Cannot resolve module')) {
        throw new Error('KML support requires xmldom dependency. Install with: pnpm add xmldom');
      }
      throw error;
    }
  },

  async format(data, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const { XMLSerializer } = await import('xmldom');

      if (!data || !(/** @type {any} */ (data).kml)) {
        throw new Error('Invalid KML data: missing kml object');
      }

      const kml = /** @type {any} */ (data).kml;
      const serializer = new XMLSerializer();

      // Create KML document
      const doc = createKMLDocument(kml, opts);
      const xmlString = serializer.serializeToString(doc);

      // Add XML declaration
      const formatted = `<?xml version="1.0" encoding="UTF-8"?>\n${xmlString}`;

      return {
        data: formatted,
        metadata: {
          outputSize: formatted.length,
          format: 'kml',
          version: kml.version || '2.2',
          ...opts,
        },
      };
    } catch (error) {
      if (error.message.includes('Cannot resolve module')) {
        throw new Error('KML support requires xmldom dependency. Install with: pnpm add xmldom');
      }
      throw error;
    }
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * TopoJSON adapter for parsing and formatting TopoJSON files
 * @type {Adapter}
 */
const topojsonAdapter = {
  async parse(input, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const topojson = await import('topojson-client');

      if (!input || input.trim() === '') {
        throw new Error('TopoJSON input cannot be empty');
      }

      let topoData;
      try {
        topoData = JSON.parse(input);
      } catch (error) {
        throw new Error(`Invalid TopoJSON: ${error.message}`);
      }

      // Validate TopoJSON structure
      if (!topoData.type || topoData.type !== 'Topology') {
        throw new Error('Invalid TopoJSON: missing or invalid type property');
      }

      if (!topoData.objects) {
        throw new Error('Invalid TopoJSON: missing objects property');
      }

      if (!topoData.arcs) {
        throw new Error('Invalid TopoJSON: missing arcs property');
      }

      const result = {
        topology: {
          type: topoData.type,
          transform: topoData.transform || undefined,
          objects: {},
          arcs: topoData.arcs,
          bbox: topoData.bbox || undefined,
        },
      };

      // Convert TopoJSON objects to GeoJSON
      const objectNames = Object.keys(topoData.objects);
      for (const objectName of objectNames) {
        const object = topoData.objects[objectName];

        // Convert to GeoJSON using topojson-client
        const geoJson = topojson.feature(topoData, object);
        result.topology.objects[objectName] = {
          type: object.type,
          properties: object.properties || {},
          geometry: geoJson,
        };
      }

      return {
        data: result,
        metadata: {
          inputSize: input.length,
          format: 'topojson',
          objectCount: objectNames.length,
          arcCount: topoData.arcs.length,
          hasTransform: !!topoData.transform,
          hasBbox: !!topoData.bbox,
          ...opts,
        },
      };
    } catch (error) {
      if (error.message.includes('Cannot resolve module')) {
        throw new Error(
          'TopoJSON support requires topojson-client dependency. Install with: pnpm add topojson-client'
        );
      }
      throw error;
    }
  },

  async format(data, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const topojson = await import('topojson-client');

      if (!data || !(/** @type {any} */ (data).topology)) {
        throw new Error('Invalid TopoJSON data: missing topology object');
      }

      const topology = /** @type {any} */ (data).topology;

      // Validate required properties
      if (!topology.type || topology.type !== 'Topology') {
        throw new Error('Invalid TopoJSON data: missing or invalid type property');
      }

      if (!topology.objects) {
        throw new Error('Invalid TopoJSON data: missing objects property');
      }

      if (!topology.arcs) {
        throw new Error('Invalid TopoJSON data: missing arcs property');
      }

      // Reconstruct TopoJSON from GeoJSON objects
      const topoData = {
        type: 'Topology',
        objects: {},
        arcs: topology.arcs,
      };

      // Add optional properties
      topoData.transform = topology.transform || undefined;
      topoData.bbox = topology.bbox || undefined;

      // Convert GeoJSON objects back to TopoJSON format
      const objectNames = Object.keys(topology.objects);
      for (const objectName of objectNames) {
        const object = topology.objects[objectName];

        // Extract TopoJSON object properties from GeoJSON
        topoData.objects[objectName] = {
          type: object.type,
          properties: object.properties || {},
          // Note: This is a simplified conversion - full TopoJSON reconstruction
          // would require more complex arc generation
          geometries:
            object.geometry?.type === 'GeometryCollection'
              ? object.geometry.geometries
              : object.geometry
                ? [object.geometry]
                : undefined,
        };
      }

      const formatted = JSON.stringify(topoData, undefined, opts.pretty ? 2 : 0);

      return {
        data: formatted,
        metadata: {
          outputSize: formatted.length,
          format: 'topojson',
          objectCount: objectNames.length,
          arcCount: topology.arcs.length,
          hasTransform: !!topology.transform,
          hasBbox: !!topology.bbox,
          ...opts,
        },
      };
    } catch (error) {
      if (error.message.includes('Cannot resolve module')) {
        throw new Error(
          'TopoJSON support requires topojson-client dependency. Install with: pnpm add topojson-client'
        );
      }
      throw error;
    }
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * WKT adapter for parsing and formatting WKT (Well-Known Text) geometries
 * @type {Adapter}
 */
const wktAdapter = {
  async parse(input, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const wellknown = await import('wellknown');

      if (!input || input.trim() === '') {
        throw new Error('WKT input cannot be empty');
      }

      // Handle multiple geometries (one per line)
      const lines = input
        .trim()
        .split('\n')
        .filter(line => line.trim());
      const geometries = [];
      const errors = [];

      for (const [i, line_] of lines.entries()) {
        const line = line_.trim();
        if (!line) continue;

        try {
          const geometry = wellknown.parse(line);
          if (geometry) {
            geometries.push({
              wkt: line,
              geometry: geometry,
              lineNumber: i + 1,
            });
          } else {
            errors.push(`Line ${i + 1}: Unable to parse WKT geometry`);
          }
        } catch (error) {
          errors.push(`Line ${i + 1}: ${error.message}`);
        }
      }

      if (geometries.length === 0) {
        throw new Error(`No valid WKT geometries found. Errors: ${errors.join('; ')}`);
      }

      const result = {
        wkt: {
          geometries: geometries,
          totalCount: geometries.length,
          errorCount: errors.length,
          errors: errors.length > 0 ? errors : undefined,
        },
      };

      return {
        data: result,
        metadata: {
          inputSize: input.length,
          format: 'wkt',
          geometryCount: geometries.length,
          errorCount: errors.length,
          hasErrors: errors.length > 0,
          ...opts,
        },
      };
    } catch (error) {
      if (error.message.includes('Cannot resolve module')) {
        throw new Error(
          'WKT support requires wellknown dependency. Install with: pnpm add wellknown'
        );
      }
      throw error;
    }
  },

  async format(data, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const wellknown = await import('wellknown');

      if (!data || !(/** @type {any} */ (data).wkt)) {
        throw new Error('Invalid WKT data: missing wkt object');
      }

      const wkt = /** @type {any} */ (data).wkt;
      const wktStrings = [];

      if (wkt.geometries && Array.isArray(wkt.geometries)) {
        // Format from parsed geometries
        for (const item of wkt.geometries) {
          if (item.geometry) {
            const wktString = wellknown.stringify(item.geometry);
            if (wktString) {
              wktStrings.push(wktString);
            }
          } else if (item.wkt) {
            // Use original WKT if available
            wktStrings.push(item.wkt);
          }
        }
      } else if (wkt.geometry) {
        // Single geometry
        const wktString = wellknown.stringify(wkt.geometry);
        if (wktString) {
          wktStrings.push(wktString);
        }
      } else if (typeof wkt === 'string') {
        // Direct WKT string
        wktStrings.push(wkt);
      } else {
        throw new TypeError('Invalid WKT data: no geometries found to format');
      }

      if (wktStrings.length === 0) {
        throw new Error('No valid geometries found to convert to WKT');
      }

      // Join with newlines if multiple geometries
      const formatted = wktStrings.join('\n');

      return {
        data: formatted,
        metadata: {
          outputSize: formatted.length,
          format: 'wkt',
          geometryCount: wktStrings.length,
          ...opts,
        },
      };
    } catch (error) {
      if (error.message.includes('Cannot resolve module')) {
        throw new Error(
          'WKT support requires wellknown dependency. Install with: pnpm add wellknown'
        );
      }
      throw error;
    }
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

// Create pack manifest
const packManifest = createPackManifest('ztf-pack-geo', ['gpx', 'kml', 'topojson', 'wkt'], {
  version: '1.0.0',
  description: 'Geo format adapters for ZTF',
  dependencies: [],
});

// Register all adapters
const adapters = {
  gpx: gpxAdapter,
  kml: kmlAdapter,
  topojson: topojsonAdapter,
  wkt: wktAdapter,
};

registerPack(packManifest, adapters);

export { gpxAdapter, kmlAdapter, topojsonAdapter, wktAdapter };
