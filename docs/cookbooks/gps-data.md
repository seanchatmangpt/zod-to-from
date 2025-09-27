# GPS Data Cookbook

> **The 80/20 Pattern: GPS Track Processing and Analysis**

This cookbook covers the most common GPS data processing patterns - parsing GPS
tracks, analyzing movement data, converting between formats, and generating
insights. This pattern handles 80% of GPS data processing use cases.

## 🎯 Use Case

**Problem**: You have GPS data in various formats (GPX, KML, TopoJSON, WKT) and
need to process, analyze, and convert between formats for different
applications.

**Solution**: Use ZTF to create robust GPS data processing pipelines with schema
validation, track analysis, and format conversion.

## 📋 Prerequisites

- Understanding of GPS data formats
- ZTF installed and configured
- Zod schemas for GPS data validation
- Basic knowledge of geospatial concepts

## 🍳 Recipe

### Step 1: Define GPS Data Schemas

```javascript
import { z } from 'zod';

// GPS point schema
const GPSPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  elevation: z.number().optional(),
  time: z.string().optional(),
  accuracy: z.number().optional(),
  speed: z.number().optional(),
  bearing: z.number().optional(),
});

// GPS track schema
const GPSTrackSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  points: z.array(GPSPointSchema),
  metadata: z
    .object({
      totalDistance: z.number().optional(),
      totalTime: z.number().optional(),
      averageSpeed: z.number().optional(),
      maxSpeed: z.number().optional(),
      elevationGain: z.number().optional(),
      elevationLoss: z.number().optional(),
    })
    .optional(),
});

// GPS route schema
const GPSRouteSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  points: z.array(GPSPointSchema),
  waypoints: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        point: GPSPointSchema,
      })
    )
    .optional(),
});

// GPX file schema
const GPXSchema = z.object({
  tracks: z.array(GPSTrackSchema),
  routes: z.array(GPSRouteSchema).optional(),
  waypoints: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        point: GPSPointSchema,
      })
    )
    .optional(),
  metadata: z
    .object({
      name: z.string().optional(),
      description: z.string().optional(),
      author: z.string().optional(),
      created: z.string().optional(),
      bounds: z
        .object({
          minLat: z.number(),
          maxLat: z.number(),
          minLon: z.number(),
          maxLon: z.number(),
        })
        .optional(),
    })
    .optional(),
});

// KML file schema
const KMLSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  tracks: z.array(GPSTrackSchema),
  waypoints: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        point: GPSPointSchema,
      })
    )
    .optional(),
  metadata: z
    .object({
      author: z.string().optional(),
      created: z.string().optional(),
      bounds: z
        .object({
          minLat: z.number(),
          maxLat: z.number(),
          minLon: z.number(),
          maxLon: z.number(),
        })
        .optional(),
    })
    .optional(),
});

// TopoJSON schema
const TopoJSONSchema = z.object({
  type: z.literal('Topology'),
  objects: z.record(
    z.object({
      type: z.string(),
      geometries: z.array(z.any()),
    })
  ),
  arcs: z.array(z.array(z.array(z.number()))),
  bbox: z.array(z.number()).optional(),
  transform: z
    .object({
      scale: z.array(z.number()),
      translate: z.array(z.number()),
    })
    .optional(),
});

// WKT (Well-Known Text) schema
const WKTSchema = z.object({
  type: z.enum([
    'Point',
    'LineString',
    'Polygon',
    'MultiPoint',
    'MultiLineString',
    'MultiPolygon',
  ]),
  coordinates: z.any(),
  srid: z.number().optional(),
});
```

### Step 2: Basic GPS Data Processing

```javascript
import { parseFrom, formatTo } from 'zod-to-from';
import fs from 'fs';

async function processGPSData(gpsFile, inputFormat, outputFormat) {
  try {
    // Read GPS file
    const gpsData = fs.readFileSync(gpsFile, 'utf8');

    // Parse GPS data
    const schema =
      inputFormat === 'gpx'
        ? GPXSchema
        : inputFormat === 'kml'
          ? KMLSchema
          : inputFormat === 'topojson'
            ? TopoJSONSchema
            : WKTSchema;

    const parsedData = await parseFrom(schema, inputFormat, gpsData);

    // Process GPS data
    const processedData = await processGPSContent(parsedData, inputFormat);

    // Convert to desired format
    const outputData = await formatTo(schema, outputFormat, processedData);

    // Save output
    const outputFile = `processed-${gpsFile.replace(/\.[^/.]+$/, '')}.${outputFormat}`;
    fs.writeFileSync(outputFile, outputData);

    return {
      success: true,
      data: processedData,
      outputFile,
      format: outputFormat,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function processGPSContent(gpsData, format) {
  if (format === 'gpx') {
    return await processGPXData(gpsData);
  } else if (format === 'kml') {
    return await processKMLData(gpsData);
  } else if (format === 'topojson') {
    return await processTopoJSONData(gpsData);
  } else if (format === 'wkt') {
    return await processWKTData(gpsData);
  }

  return gpsData;
}

async function processGPXData(gpxData) {
  const processed = { ...gpxData };

  // Process each track
  if (processed.tracks) {
    processed.tracks = processed.tracks.map(track => ({
      ...track,
      metadata: calculateTrackMetadata(track.points),
      processedAt: new Date().toISOString(),
    }));
  }

  // Process each route
  if (processed.routes) {
    processed.routes = processed.routes.map(route => ({
      ...route,
      metadata: calculateRouteMetadata(route.points),
      processedAt: new Date().toISOString(),
    }));
  }

  return processed;
}

async function processKMLData(kmlData) {
  const processed = { ...kmlData };

  // Process tracks
  if (processed.tracks) {
    processed.tracks = processed.tracks.map(track => ({
      ...track,
      metadata: calculateTrackMetadata(track.points),
      processedAt: new Date().toISOString(),
    }));
  }

  return processed;
}

async function processTopoJSONData(topojsonData) {
  const processed = { ...topojsonData };

  // Add processing metadata
  processed.processedAt = new Date().toISOString();
  processed.processingVersion = '1.0.0';

  return processed;
}

async function processWKTData(wktData) {
  const processed = { ...wktData };

  // Add processing metadata
  processed.processedAt = new Date().toISOString();
  processed.processingVersion = '1.0.0';

  return processed;
}
```

### Step 3: GPS Track Analysis

```javascript
async function analyzeGPSTrack(gpsFile, format) {
  try {
    // Read and parse GPS data
    const gpsData = fs.readFileSync(gpsFile, 'utf8');
    const schema = format === 'gpx' ? GPXSchema : KMLSchema;
    const parsedData = await parseFrom(schema, format, gpsData);

    const analysis = {
      file: gpsFile,
      format,
      summary: {
        totalTracks: 0,
        totalPoints: 0,
        totalDistance: 0,
        totalTime: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        elevationGain: 0,
        elevationLoss: 0,
      },
      tracks: [],
      statistics: {
        speedDistribution: {},
        elevationDistribution: {},
        timeDistribution: {},
      },
    };

    // Analyze tracks
    if (parsedData.tracks) {
      analysis.summary.totalTracks = parsedData.tracks.length;

      for (const track of parsedData.tracks) {
        const trackAnalysis = await analyzeTrack(track);
        analysis.tracks.push(trackAnalysis);

        // Aggregate summary data
        analysis.summary.totalPoints += track.points.length;
        analysis.summary.totalDistance +=
          trackAnalysis.metadata.totalDistance || 0;
        analysis.summary.totalTime += trackAnalysis.metadata.totalTime || 0;
        analysis.summary.elevationGain +=
          trackAnalysis.metadata.elevationGain || 0;
        analysis.summary.elevationLoss +=
          trackAnalysis.metadata.elevationLoss || 0;

        // Update max speed
        if (trackAnalysis.metadata.maxSpeed > analysis.summary.maxSpeed) {
          analysis.summary.maxSpeed = trackAnalysis.metadata.maxSpeed;
        }
      }

      // Calculate average speed
      if (analysis.summary.totalTime > 0) {
        analysis.summary.averageSpeed =
          analysis.summary.totalDistance / analysis.summary.totalTime;
      }
    }

    // Calculate statistics
    analysis.statistics = await calculateStatistics(parsedData);

    return {
      success: true,
      analysis,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      file: gpsFile,
    };
  }
}

async function analyzeTrack(track) {
  const points = track.points;

  if (points.length === 0) {
    return {
      name: track.name,
      metadata: {
        totalDistance: 0,
        totalTime: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        elevationGain: 0,
        elevationLoss: 0,
      },
    };
  }

  let totalDistance = 0;
  let totalTime = 0;
  let elevationGain = 0;
  let elevationLoss = 0;
  let maxSpeed = 0;
  let speedSum = 0;
  let speedCount = 0;

  // Analyze each point
  for (let i = 1; i < points.length; i++) {
    const prevPoint = points[i - 1];
    const currentPoint = points[i];

    // Calculate distance
    const distance = calculateDistance(prevPoint, currentPoint);
    totalDistance += distance;

    // Calculate time
    if (prevPoint.time && currentPoint.time) {
      const timeDiff =
        new Date(currentPoint.time).getTime() -
        new Date(prevPoint.time).getTime();
      totalTime += timeDiff / 1000; // Convert to seconds
    }

    // Calculate elevation change
    if (prevPoint.elevation && currentPoint.elevation) {
      const elevationDiff = currentPoint.elevation - prevPoint.elevation;
      if (elevationDiff > 0) {
        elevationGain += elevationDiff;
      } else {
        elevationLoss += Math.abs(elevationDiff);
      }
    }

    // Calculate speed
    if (prevPoint.time && currentPoint.time) {
      const timeDiff =
        new Date(currentPoint.time).getTime() -
        new Date(prevPoint.time).getTime();
      if (timeDiff > 0) {
        const speed = (distance / timeDiff) * 1000; // m/s
        speedSum += speed;
        speedCount++;

        if (speed > maxSpeed) {
          maxSpeed = speed;
        }
      }
    }
  }

  const averageSpeed = speedCount > 0 ? speedSum / speedCount : 0;

  return {
    name: track.name,
    metadata: {
      totalDistance,
      totalTime,
      averageSpeed,
      maxSpeed,
      elevationGain,
      elevationLoss,
    },
  };
}

function calculateDistance(point1, point2) {
  const R = 6371000; // Earth's radius in meters
  const lat1 = (point1.lat * Math.PI) / 180;
  const lat2 = (point2.lat * Math.PI) / 180;
  const deltaLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const deltaLon = ((point2.lon - point1.lon) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

async function calculateStatistics(gpsData) {
  const statistics = {
    speedDistribution: {},
    elevationDistribution: {},
    timeDistribution: {},
  };

  // Collect all points
  const allPoints = [];
  if (gpsData.tracks) {
    for (const track of gpsData.tracks) {
      allPoints.push(...track.points);
    }
  }

  // Analyze speed distribution
  const speeds = allPoints.filter(p => p.speed).map(p => p.speed);
  if (speeds.length > 0) {
    const speedRanges = {
      '0-5': 0,
      '5-10': 0,
      '10-20': 0,
      '20-30': 0,
      '30+': 0,
    };

    speeds.forEach(speed => {
      if (speed < 5) speedRanges['0-5']++;
      else if (speed < 10) speedRanges['5-10']++;
      else if (speed < 20) speedRanges['10-20']++;
      else if (speed < 30) speedRanges['20-30']++;
      else speedRanges['30+']++;
    });

    statistics.speedDistribution = speedRanges;
  }

  // Analyze elevation distribution
  const elevations = allPoints.filter(p => p.elevation).map(p => p.elevation);
  if (elevations.length > 0) {
    const elevationRanges = {
      '0-100': 0,
      '100-500': 0,
      '500-1000': 0,
      '1000-2000': 0,
      '2000+': 0,
    };

    elevations.forEach(elevation => {
      if (elevation < 100) elevationRanges['0-100']++;
      else if (elevation < 500) elevationRanges['100-500']++;
      else if (elevation < 1000) elevationRanges['500-1000']++;
      else if (elevation < 2000) elevationRanges['1000-2000']++;
      else elevationRanges['2000+']++;
    });

    statistics.elevationDistribution = elevationRanges;
  }

  // Analyze time distribution
  const times = allPoints
    .filter(p => p.time)
    .map(p => new Date(p.time).getHours());
  if (times.length > 0) {
    const timeRanges = {};
    for (let hour = 0; hour < 24; hour++) {
      timeRanges[hour] = times.filter(t => t === hour).length;
    }
    statistics.timeDistribution = timeRanges;
  }

  return statistics;
}
```

### Step 4: GPS Data Format Conversion

```javascript
async function convertGPSFormat(inputFile, inputFormat, outputFormat) {
  try {
    // Read input file
    const inputData = fs.readFileSync(inputFile, 'utf8');

    // Parse input format
    const inputSchema =
      inputFormat === 'gpx'
        ? GPXSchema
        : inputFormat === 'kml'
          ? KMLSchema
          : inputFormat === 'topojson'
            ? TopoJSONSchema
            : WKTSchema;

    const parsedData = await parseFrom(inputSchema, inputFormat, inputData);

    // Convert to output format
    const outputSchema =
      outputFormat === 'gpx'
        ? GPXSchema
        : outputFormat === 'kml'
          ? KMLSchema
          : outputFormat === 'topojson'
            ? TopoJSONSchema
            : WKTSchema;

    const outputData = await formatTo(outputSchema, outputFormat, parsedData);

    // Save output
    const outputFile = inputFile.replace(/\.[^/.]+$/, '') + `.${outputFormat}`;
    fs.writeFileSync(outputFile, outputData);

    return {
      success: true,
      inputFile,
      outputFile,
      inputFormat,
      outputFormat,
      fileSize: outputData.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      inputFile,
      inputFormat,
      outputFormat,
    };
  }
}
```

## 🔧 Variations

### Variation 1: GPS Track Filtering and Cleaning

```javascript
async function filterGPSTrack(gpsFile, filters) {
  try {
    const gpsData = fs.readFileSync(gpsFile, 'utf8');
    const parsedData = await parseFrom(GPXSchema, 'gpx', gpsData);

    const filteredData = { ...parsedData };

    if (filteredData.tracks) {
      filteredData.tracks = filteredData.tracks.map(track => ({
        ...track,
        points: filterTrackPoints(track.points, filters),
      }));
    }

    // Remove empty tracks
    filteredData.tracks = filteredData.tracks.filter(
      track => track.points.length > 0
    );

    return {
      success: true,
      data: filteredData,
      originalPoints: parsedData.tracks.reduce(
        (sum, track) => sum + track.points.length,
        0
      ),
      filteredPoints: filteredData.tracks.reduce(
        (sum, track) => sum + track.points.length,
        0
      ),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

function filterTrackPoints(points, filters) {
  let filteredPoints = [...points];

  // Filter by time range
  if (filters.startTime || filters.endTime) {
    filteredPoints = filteredPoints.filter(point => {
      if (!point.time) return true;

      const pointTime = new Date(point.time);
      if (filters.startTime && pointTime < new Date(filters.startTime))
        return false;
      if (filters.endTime && pointTime > new Date(filters.endTime))
        return false;

      return true;
    });
  }

  // Filter by elevation range
  if (filters.minElevation || filters.maxElevation) {
    filteredPoints = filteredPoints.filter(point => {
      if (!point.elevation) return true;

      if (filters.minElevation && point.elevation < filters.minElevation)
        return false;
      if (filters.maxElevation && point.elevation > filters.maxElevation)
        return false;

      return true;
    });
  }

  // Filter by speed range
  if (filters.minSpeed || filters.maxSpeed) {
    filteredPoints = filteredPoints.filter(point => {
      if (!point.speed) return true;

      if (filters.minSpeed && point.speed < filters.minSpeed) return false;
      if (filters.maxSpeed && point.speed > filters.maxSpeed) return false;

      return true;
    });
  }

  // Filter by accuracy
  if (filters.maxAccuracy) {
    filteredPoints = filteredPoints.filter(point => {
      if (!point.accuracy) return true;
      return point.accuracy <= filters.maxAccuracy;
    });
  }

  // Remove duplicate points
  if (filters.removeDuplicates) {
    filteredPoints = removeDuplicatePoints(filteredPoints);
  }

  // Smooth track
  if (filters.smooth) {
    filteredPoints = smoothTrack(filteredPoints, filters.smoothFactor || 0.1);
  }

  return filteredPoints;
}

function removeDuplicatePoints(points) {
  const uniquePoints = [];
  const tolerance = 0.00001; // ~1 meter

  for (const point of points) {
    const isDuplicate = uniquePoints.some(
      existing =>
        Math.abs(existing.lat - point.lat) < tolerance &&
        Math.abs(existing.lon - point.lon) < tolerance
    );

    if (!isDuplicate) {
      uniquePoints.push(point);
    }
  }

  return uniquePoints;
}

function smoothTrack(points, factor) {
  if (points.length < 3) return points;

  const smoothed = [points[0]]; // Keep first point

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const current = points[i];
    const next = points[i + 1];

    const smoothedPoint = {
      ...current,
      lat: current.lat + factor * (prev.lat + next.lat - 2 * current.lat),
      lon: current.lon + factor * (prev.lon + next.lon - 2 * current.lon),
    };

    smoothed.push(smoothedPoint);
  }

  smoothed.push(points[points.length - 1]); // Keep last point

  return smoothed;
}
```

### Variation 2: GPS Track Segmentation

```javascript
async function segmentGPSTrack(gpsFile, segmentationType, options = {}) {
  try {
    const gpsData = fs.readFileSync(gpsFile, 'utf8');
    const parsedData = await parseFrom(GPXSchema, 'gpx', gpsData);

    const segmentedData = { ...parsedData };

    if (segmentedData.tracks) {
      segmentedData.tracks = segmentedData.tracks.map(track => ({
        ...track,
        segments: segmentTrack(track.points, segmentationType, options),
      }));
    }

    return {
      success: true,
      data: segmentedData,
      totalSegments: segmentedData.tracks.reduce(
        (sum, track) => sum + track.segments.length,
        0
      ),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

function segmentTrack(points, type, options) {
  switch (type) {
    case 'distance':
      return segmentByDistance(points, options.distance || 1000);
    case 'time':
      return segmentByTime(points, options.time || 3600);
    case 'elevation':
      return segmentByElevation(points, options.elevationChange || 100);
    case 'speed':
      return segmentBySpeed(points, options.speedThreshold || 5);
    default:
      return [{ points }];
  }
}

function segmentByDistance(points, maxDistance) {
  const segments = [];
  let currentSegment = [points[0]];
  let currentDistance = 0;

  for (let i = 1; i < points.length; i++) {
    const distance = calculateDistance(points[i - 1], points[i]);
    currentDistance += distance;

    if (currentDistance >= maxDistance) {
      segments.push({ points: currentSegment });
      currentSegment = [points[i]];
      currentDistance = 0;
    } else {
      currentSegment.push(points[i]);
    }
  }

  if (currentSegment.length > 0) {
    segments.push({ points: currentSegment });
  }

  return segments;
}

function segmentByTime(points, maxTime) {
  const segments = [];
  let currentSegment = [points[0]];
  let currentTime = 0;

  for (let i = 1; i < points.length; i++) {
    if (points[i - 1].time && points[i].time) {
      const timeDiff =
        new Date(points[i].time).getTime() -
        new Date(points[i - 1].time).getTime();
      currentTime += timeDiff / 1000; // Convert to seconds

      if (currentTime >= maxTime) {
        segments.push({ points: currentSegment });
        currentSegment = [points[i]];
        currentTime = 0;
      } else {
        currentSegment.push(points[i]);
      }
    } else {
      currentSegment.push(points[i]);
    }
  }

  if (currentSegment.length > 0) {
    segments.push({ points: currentSegment });
  }

  return segments;
}

function segmentByElevation(points, elevationChange) {
  const segments = [];
  let currentSegment = [points[0]];
  let currentElevationChange = 0;

  for (let i = 1; i < points.length; i++) {
    if (points[i - 1].elevation && points[i].elevation) {
      const elevationDiff = Math.abs(
        points[i].elevation - points[i - 1].elevation
      );
      currentElevationChange += elevationDiff;

      if (currentElevationChange >= elevationChange) {
        segments.push({ points: currentSegment });
        currentSegment = [points[i]];
        currentElevationChange = 0;
      } else {
        currentSegment.push(points[i]);
      }
    } else {
      currentSegment.push(points[i]);
    }
  }

  if (currentSegment.length > 0) {
    segments.push({ points: currentSegment });
  }

  return segments;
}

function segmentBySpeed(points, speedThreshold) {
  const segments = [];
  let currentSegment = [points[0]];
  let currentSpeed = 0;

  for (let i = 1; i < points.length; i++) {
    if (points[i].speed) {
      currentSpeed = points[i].speed;

      if (currentSpeed >= speedThreshold) {
        segments.push({ points: currentSegment });
        currentSegment = [points[i]];
      } else {
        currentSegment.push(points[i]);
      }
    } else {
      currentSegment.push(points[i]);
    }
  }

  if (currentSegment.length > 0) {
    segments.push({ points: currentSegment });
  }

  return segments;
}
```

### Variation 3: GPS Track Comparison

```javascript
async function compareGPSTracks(file1, file2) {
  try {
    const gpsData1 = fs.readFileSync(file1, 'utf8');
    const gpsData2 = fs.readFileSync(file2, 'utf8');

    const parsedData1 = await parseFrom(GPXSchema, 'gpx', gpsData1);
    const parsedData2 = await parseFrom(GPXSchema, 'gpx', gpsData2);

    const comparison = {
      files: { file1, file2 },
      comparison: {
        basic: {
          tracks1: parsedData1.tracks.length,
          tracks2: parsedData2.tracks.length,
          points1: parsedData1.tracks.reduce(
            (sum, track) => sum + track.points.length,
            0
          ),
          points2: parsedData2.tracks.reduce(
            (sum, track) => sum + track.points.length,
            0
          ),
        },
        similarity: {
          trackSimilarity: 0,
          pointSimilarity: 0,
          distanceSimilarity: 0,
        },
        differences: [],
      },
    };

    // Compare tracks
    if (parsedData1.tracks.length > 0 && parsedData2.tracks.length > 0) {
      const track1 = parsedData1.tracks[0];
      const track2 = parsedData2.tracks[0];

      // Calculate track similarity
      comparison.comparison.similarity.trackSimilarity =
        calculateTrackSimilarity(track1, track2);

      // Calculate point similarity
      comparison.comparison.similarity.pointSimilarity =
        calculatePointSimilarity(track1.points, track2.points);

      // Calculate distance similarity
      comparison.comparison.similarity.distanceSimilarity =
        calculateDistanceSimilarity(track1, track2);

      // Find differences
      comparison.comparison.differences = findTrackDifferences(track1, track2);
    }

    return {
      success: true,
      comparison,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      files: { file1, file2 },
    };
  }
}

function calculateTrackSimilarity(track1, track2) {
  const points1 = track1.points;
  const points2 = track2.points;

  if (points1.length === 0 || points2.length === 0) return 0;

  // Calculate average distance between tracks
  let totalDistance = 0;
  let count = 0;

  for (const point1 of points1) {
    let minDistance = Infinity;

    for (const point2 of points2) {
      const distance = calculateDistance(point1, point2);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }

    totalDistance += minDistance;
    count++;
  }

  const averageDistance = totalDistance / count;

  // Convert distance to similarity score (0-100)
  const similarity = Math.max(0, 100 - (averageDistance / 1000) * 10);

  return similarity;
}

function calculatePointSimilarity(points1, points2) {
  if (points1.length === 0 || points2.length === 0) return 0;

  const minLength = Math.min(points1.length, points2.length);
  let matches = 0;

  for (let i = 0; i < minLength; i++) {
    const distance = calculateDistance(points1[i], points2[i]);
    if (distance < 10) {
      // Within 10 meters
      matches++;
    }
  }

  return (matches / minLength) * 100;
}

function calculateDistanceSimilarity(track1, track2) {
  const distance1 = calculateTrackDistance(track1.points);
  const distance2 = calculateTrackDistance(track2.points);

  if (distance1 === 0 && distance2 === 0) return 100;

  const maxDistance = Math.max(distance1, distance2);
  const minDistance = Math.min(distance1, distance2);

  return (minDistance / maxDistance) * 100;
}

function calculateTrackDistance(points) {
  let totalDistance = 0;

  for (let i = 1; i < points.length; i++) {
    totalDistance += calculateDistance(points[i - 1], points[i]);
  }

  return totalDistance;
}

function findTrackDifferences(track1, track2) {
  const differences = [];

  // Compare track names
  if (track1.name !== track2.name) {
    differences.push({
      type: 'name',
      track1: track1.name,
      track2: track2.name,
    });
  }

  // Compare point counts
  if (track1.points.length !== track2.points.length) {
    differences.push({
      type: 'point_count',
      track1: track1.points.length,
      track2: track2.points.length,
      difference: track2.points.length - track1.points.length,
    });
  }

  // Compare distances
  const distance1 = calculateTrackDistance(track1.points);
  const distance2 = calculateTrackDistance(track2.points);

  if (Math.abs(distance1 - distance2) > 100) {
    // More than 100 meters difference
    differences.push({
      type: 'distance',
      track1: distance1,
      track2: distance2,
      difference: distance2 - distance1,
    });
  }

  return differences;
}
```

## ⚠️ Common Pitfalls

### 1. Missing GPS Data Validation

```javascript
// ❌ Wrong - no validation
const gpsData = JSON.parse(gpsFile);

// ✅ Correct - validate GPS data structure
const gpsData = await parseFrom(GPXSchema, 'gpx', gpsFile);
```

### 2. Incorrect Distance Calculations

```javascript
// ❌ Wrong - simple Euclidean distance
const distance = Math.sqrt((lat2 - lat1) ** 2 + (lon2 - lon1) ** 2);

// ✅ Correct - Haversine formula for Earth's surface
const distance = calculateDistance(point1, point2);
```

### 3. Memory Issues with Large Tracks

```javascript
// ❌ Wrong - loading entire track into memory
const track = await parseFrom(GPXSchema, 'gpx', largeGPXFile);

// ✅ Correct - using streaming for large tracks
const trackStream = fs.createReadStream(largeGPXFile);
const result = await parseFrom(GPXSchema, 'gpx', trackStream, {
  streaming: true,
});
```

## 🚀 Advanced Techniques

### 1. GPS Track Clustering

```javascript
async function clusterGPSTracks(gpsFiles, clusterOptions = {}) {
  try {
    const tracks = [];

    // Load all tracks
    for (const file of gpsFiles) {
      const gpsData = fs.readFileSync(file, 'utf8');
      const parsedData = await parseFrom(GPXSchema, 'gpx', gpsData);

      if (parsedData.tracks) {
        tracks.push(
          ...parsedData.tracks.map(track => ({ ...track, source: file }))
        );
      }
    }

    // Cluster tracks
    const clusters = clusterTracks(tracks, clusterOptions);

    return {
      success: true,
      clusters,
      totalTracks: tracks.length,
      totalClusters: clusters.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

function clusterTracks(tracks, options) {
  const { maxDistance = 1000, minTracks = 2 } = options;
  const clusters = [];
  const processed = new Set();

  for (let i = 0; i < tracks.length; i++) {
    if (processed.has(i)) continue;

    const cluster = [tracks[i]];
    processed.add(i);

    for (let j = i + 1; j < tracks.length; j++) {
      if (processed.has(j)) continue;

      const similarity = calculateTrackSimilarity(tracks[i], tracks[j]);
      if (similarity > 70) {
        // 70% similarity threshold
        cluster.push(tracks[j]);
        processed.add(j);
      }
    }

    if (cluster.length >= minTracks) {
      clusters.push({
        id: clusters.length,
        tracks: cluster,
        center: calculateClusterCenter(cluster),
        size: cluster.length,
      });
    }
  }

  return clusters;
}

function calculateClusterCenter(tracks) {
  if (tracks.length === 0) return null;

  let totalLat = 0;
  let totalLon = 0;
  let totalPoints = 0;

  for (const track of tracks) {
    for (const point of track.points) {
      totalLat += point.lat;
      totalLon += point.lon;
      totalPoints++;
    }
  }

  return {
    lat: totalLat / totalPoints,
    lon: totalLon / totalPoints,
  };
}
```

### 2. GPS Track Visualization Data

```javascript
async function generateTrackVisualization(gpsFile) {
  try {
    const gpsData = fs.readFileSync(gpsFile, 'utf8');
    const parsedData = await parseFrom(GPXSchema, 'gpx', gpsData);

    const visualization = {
      tracks: [],
      summary: {
        totalTracks: parsedData.tracks.length,
        totalPoints: 0,
        totalDistance: 0,
        timeRange: { start: null, end: null },
      },
    };

    for (const track of parsedData.tracks) {
      const trackViz = {
        name: track.name,
        points: track.points.map(point => ({
          lat: point.lat,
          lon: point.lon,
          elevation: point.elevation,
          time: point.time,
          speed: point.speed,
        })),
        metadata: calculateTrackMetadata(track.points),
        bounds: calculateTrackBounds(track.points),
      };

      visualization.tracks.push(trackViz);

      // Update summary
      visualization.summary.totalPoints += track.points.length;
      visualization.summary.totalDistance +=
        trackViz.metadata.totalDistance || 0;

      // Update time range
      if (track.points.length > 0) {
        const times = track.points
          .filter(p => p.time)
          .map(p => new Date(p.time));
        if (times.length > 0) {
          const startTime = Math.min(...times);
          const endTime = Math.max(...times);

          if (
            !visualization.summary.timeRange.start ||
            startTime < visualization.summary.timeRange.start
          ) {
            visualization.summary.timeRange.start = startTime;
          }
          if (
            !visualization.summary.timeRange.end ||
            endTime > visualization.summary.timeRange.end
          ) {
            visualization.summary.timeRange.end = endTime;
          }
        }
      }
    }

    return {
      success: true,
      visualization,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

function calculateTrackBounds(points) {
  if (points.length === 0) return null;

  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLon = points[0].lon;
  let maxLon = points[0].lon;

  for (const point of points) {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLon = Math.min(minLon, point.lon);
    maxLon = Math.max(maxLon, point.lon);
  }

  return {
    minLat,
    maxLat,
    minLon,
    maxLon,
    center: {
      lat: (minLat + maxLat) / 2,
      lon: (minLon + maxLon) / 2,
    },
  };
}
```

## 📊 Performance Tips

### 1. Parallel GPS Processing

```javascript
async function processMultipleGPSTracks(gpsFiles) {
  const results = await Promise.allSettled(
    gpsFiles.map(async file => {
      try {
        const result = await analyzeGPSTrack(file, 'gpx');
        return { file, success: true, result };
      } catch (error) {
        return { file, success: false, error: error.message };
      }
    })
  );

  return results.map((result, index) => ({
    file: gpsFiles[index],
    ...result.value,
  }));
}
```

### 2. GPS Data Caching

```javascript
const gpsCache = new Map();

async function getCachedGPSTrack(gpsFile) {
  const cacheKey = gpsFile;
  const cached = gpsCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < 3600000) {
    // 1 hour TTL
    return cached.data;
  }

  const gpsData = fs.readFileSync(gpsFile, 'utf8');
  const parsedData = await parseFrom(GPXSchema, 'gpx', gpsData);

  gpsCache.set(cacheKey, {
    data: parsedData,
    timestamp: Date.now(),
  });

  return parsedData;
}
```

## 🧪 Testing

### Unit Tests

```javascript
import { describe, it, expect } from 'vitest';

describe('GPS Data Processing', () => {
  it('should process GPS track correctly', async () => {
    const result = await processGPSData('test.gpx', 'gpx', 'json');

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.outputFile).toBeDefined();
  });

  it('should analyze GPS track correctly', async () => {
    const result = await analyzeGPSTrack('test.gpx', 'gpx');

    expect(result.success).toBe(true);
    expect(result.analysis).toBeDefined();
    expect(result.analysis.summary).toBeDefined();
  });

  it('should convert GPS format correctly', async () => {
    const result = await convertGPSFormat('test.gpx', 'gpx', 'kml');

    expect(result.success).toBe(true);
    expect(result.outputFile).toBeDefined();
    expect(result.outputFormat).toBe('kml');
  });

  it('should filter GPS track correctly', async () => {
    const result = await filterGPSTrack('test.gpx', {
      minElevation: 100,
      maxElevation: 1000,
    });

    expect(result.success).toBe(true);
    expect(result.filteredPoints).toBeLessThanOrEqual(result.originalPoints);
  });
});
```

---

**Next: [Infrastructure Cookbook](infrastructure.md)**


