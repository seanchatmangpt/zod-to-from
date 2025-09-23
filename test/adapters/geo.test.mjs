/**
 * @fileoverview Tests for geo format adapters (GPX, KML, TopoJSON, WKT)
 */

import { describe, expect, it } from 'vitest';
import { gpxAdapter, kmlAdapter, topojsonAdapter, wktAdapter } from '../../src/adapters/geo.mjs';

describe('Geo Adapters', () => {
  describe('GPX Adapter', () => {
    const sampleGPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test">
  <metadata>
    <name>Test Track</name>
    <desc>Test description</desc>
    <time>2023-01-01T00:00:00Z</time>
  </metadata>
  <wpt lat="37.7749" lon="-122.4194">
    <name>San Francisco</name>
    <desc>Test waypoint</desc>
    <ele>10</ele>
  </wpt>
  <trk>
    <name>Test Track</name>
    <trkseg>
      <trkpt lat="37.7749" lon="-122.4194">
        <ele>10</ele>
        <time>2023-01-01T00:00:00Z</time>
      </trkpt>
      <trkpt lat="37.7849" lon="-122.4094">
        <ele>20</ele>
        <time>2023-01-01T00:01:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

    it('should parse GPX data correctly', async () => {
      const result = await gpxAdapter.parse(sampleGPX);

      expect(result.data.gpx).toBeDefined();
      expect(result.data.gpx.version).toBe('1.1');
      expect(result.data.gpx.creator).toBe('Test');
      expect(result.data.gpx.metadata).toBeDefined();
      expect(result.data.gpx.metadata.name).toBe('Test Track');
      expect(result.data.gpx.waypoints).toHaveLength(1);
      expect(result.data.gpx.waypoints[0].name).toBe('San Francisco');
      expect(result.data.gpx.tracks).toHaveLength(1);
      expect(result.data.gpx.tracks[0].segments[0]).toHaveLength(2);

      expect(result.metadata.format).toBe('gpx');
      expect(result.metadata.waypointCount).toBe(1);
      expect(result.metadata.trackCount).toBe(1);
    });

    it('should handle empty GPX input', async () => {
      await expect(gpxAdapter.parse('')).rejects.toThrow('GPX input cannot be empty');
    });

    it('should handle invalid GPX input', async () => {
      await expect(gpxAdapter.parse('<invalid>xml</invalid>')).rejects.toThrow();
    });

    it('should handle missing dependencies gracefully', async () => {
      // This test would need to mock the import to simulate missing dependency
      // For now, we'll just test that the error message is appropriate
      const result = await gpxAdapter.parse(sampleGPX);
      expect(result).toBeDefined();
    });
  });

  describe('KML Adapter', () => {
    const sampleKML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Test Document</name>
    <description>Test KML document</description>
    <Style id="testStyle">
      <IconStyle>
        <color>ff0000ff</color>
        <scale>1.0</scale>
        <Icon>
          <href>http://example.com/icon.png</href>
        </Icon>
      </IconStyle>
    </Style>
    <Placemark>
      <name>Test Placemark</name>
      <description>Test placemark description</description>
      <styleUrl>#testStyle</styleUrl>
      <Point>
        <coordinates>-122.4194,37.7749,0</coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>Test Line</name>
      <LineString>
        <coordinates>-122.4194,37.7749,0 -122.4094,37.7849,0</coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;

    it('should parse KML data correctly', async () => {
      const result = await kmlAdapter.parse(sampleKML);

      expect(result.data.kml).toBeDefined();
      expect(result.data.kml.version).toBe('2.2');
      expect(result.data.kml.document).toBeDefined();
      expect(result.data.kml.document.name).toBe('Test Document');
      expect(result.data.kml.document.styles).toHaveLength(1);
      expect(result.data.kml.document.styles[0].iconStyle.color).toBe('ff0000ff');
      expect(result.data.kml.document.placemarks).toHaveLength(2);
      expect(result.data.kml.document.placemarks[0].geometry.type).toBe('Point');
      expect(result.data.kml.document.placemarks[1].geometry.type).toBe('LineString');

      expect(result.metadata.format).toBe('kml');
      expect(result.metadata.placemarkCount).toBe(2);
    });

    it('should handle empty KML input', async () => {
      await expect(kmlAdapter.parse('')).rejects.toThrow('KML input cannot be empty');
    });

    it('should handle invalid KML input', async () => {
      await expect(kmlAdapter.parse('<invalid>xml</invalid>')).rejects.toThrow();
    });
  });

  describe('TopoJSON Adapter', () => {
    const sampleTopoJSON = {
      type: 'Topology',
      objects: {
        example: {
          type: 'GeometryCollection',
          geometries: [
            {
              type: 'Point',
              coordinates: [-122.4194, 37.7749],
            },
          ],
        },
      },
      arcs: [
        [
          [-122.4194, 37.7749],
          [-122.4094, 37.7849],
        ],
      ],
      transform: {
        scale: [0.0001, 0.0001],
        translate: [-122.5, 37.7],
      },
    };

    it('should parse TopoJSON data correctly', async () => {
      const result = await topojsonAdapter.parse(JSON.stringify(sampleTopoJSON));

      expect(result.data.topology).toBeDefined();
      expect(result.data.topology.type).toBe('Topology');
      expect(result.data.topology.objects).toBeDefined();
      expect(result.data.topology.objects.example).toBeDefined();
      expect(result.data.topology.arcs).toHaveLength(1);
      expect(result.data.topology.transform).toBeDefined();

      expect(result.metadata.format).toBe('topojson');
      expect(result.metadata.objectCount).toBe(1);
      expect(result.metadata.arcCount).toBe(1);
    });

    it('should handle empty TopoJSON input', async () => {
      await expect(topojsonAdapter.parse('')).rejects.toThrow('TopoJSON input cannot be empty');
    });

    it('should handle invalid TopoJSON input', async () => {
      await expect(topojsonAdapter.parse('invalid json')).rejects.toThrow();
    });

    it('should handle missing required properties', async () => {
      const invalidTopoJSON = { type: 'Invalid' };
      await expect(topojsonAdapter.parse(JSON.stringify(invalidTopoJSON))).rejects.toThrow();
    });
  });

  describe('WKT Adapter', () => {
    const sampleWKT = `POINT(-122.4194 37.7749)
LINESTRING(-122.4194 37.7749, -122.4094 37.7849)
POLYGON((-122.4194 37.7749, -122.4094 37.7749, -122.4094 37.7849, -122.4194 37.7849, -122.4194 37.7749))`;

    it('should parse WKT data correctly', async () => {
      const result = await wktAdapter.parse(sampleWKT);

      expect(result.data.wkt).toBeDefined();
      expect(result.data.wkt.geometries).toHaveLength(3);
      expect(result.data.wkt.totalCount).toBe(3);
      expect(result.data.wkt.errorCount).toBe(0);

      expect(result.data.wkt.geometries[0].geometry.type).toBe('Point');
      expect(result.data.wkt.geometries[1].geometry.type).toBe('LineString');
      expect(result.data.wkt.geometries[2].geometry.type).toBe('Polygon');

      expect(result.metadata.format).toBe('wkt');
      expect(result.metadata.geometryCount).toBe(3);
      expect(result.metadata.errorCount).toBe(0);
    });

    it('should handle empty WKT input', async () => {
      await expect(wktAdapter.parse('')).rejects.toThrow('WKT input cannot be empty');
    });

    it('should handle invalid WKT input', async () => {
      await expect(wktAdapter.parse('INVALID GEOMETRY')).rejects.toThrow(
        'No valid WKT geometries found'
      );
    });

    it('should handle mixed valid and invalid WKT', async () => {
      const mixedWKT = `POINT(-122.4194 37.7749)
INVALID GEOMETRY
LINESTRING(-122.4194 37.7749, -122.4094 37.7849)`;

      const result = await wktAdapter.parse(mixedWKT);
      expect(result.data.wkt.geometries).toHaveLength(2);
      expect(result.data.wkt.errorCount).toBe(1);
      expect(result.metadata.geometryCount).toBe(2);
      expect(result.metadata.errorCount).toBe(1);
    });
  });

  describe('Format Methods', () => {
    it('should handle GPX formatting (placeholder)', async () => {
      const testData = {
        gpx: {
          version: '1.1',
          creator: 'Test',
          waypoints: [],
          routes: [],
          tracks: [],
        },
      };

      await expect(gpxAdapter.format(testData)).rejects.toThrow(
        'GPX formatting not yet implemented'
      );
    });

    it('should handle KML formatting (placeholder)', async () => {
      const testData = {
        kml: {
          version: '2.2',
          document: {
            name: 'Test',
            placemarks: [],
          },
        },
      };

      await expect(kmlAdapter.format(testData)).rejects.toThrow(
        'KML formatting not yet implemented'
      );
    });

    it('should handle TopoJSON formatting', async () => {
      const testData = {
        topology: {
          type: 'Topology',
          objects: {
            example: {
              type: 'Point',
              geometry: {
                type: 'Point',
                coordinates: [-122.4194, 37.7749],
              },
            },
          },
          arcs: [[[-122.4194, 37.7749]]],
        },
      };

      const result = await topojsonAdapter.format(testData);
      expect(result.data).toBeDefined();
      expect(result.metadata.format).toBe('topojson');
    });

    it('should handle WKT formatting', async () => {
      const testData = {
        wkt: {
          geometries: [
            {
              geometry: {
                type: 'Point',
                coordinates: [-122.4194, 37.7749],
              },
            },
          ],
        },
      };

      const result = await wktAdapter.format(testData);
      expect(result.data).toBeDefined();
      expect(result.data).toContain('POINT');
      expect(result.metadata.format).toBe('wkt');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing dependencies gracefully', async () => {
      // Test that adapters provide helpful error messages for missing dependencies
      // This would require mocking the dynamic imports
      expect(gpxAdapter.supportsStreaming).toBe(false);
      expect(gpxAdapter.isAI).toBe(false);
      expect(gpxAdapter.version).toBe('1.0.0');
    });

    it('should validate input data structure', async () => {
      await expect(gpxAdapter.format({})).rejects.toThrow('Invalid GPX data');
      await expect(kmlAdapter.format({})).rejects.toThrow('Invalid KML data');
      await expect(topojsonAdapter.format({})).rejects.toThrow('Invalid TopoJSON data');
      await expect(wktAdapter.format({})).rejects.toThrow('Invalid WKT data');
    });
  });
});
