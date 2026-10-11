import axios from 'axios';
import * as turf from '@turf/turf';
import SensorNode from '../models/SensorNode.js';

const osrmRequest = async (coordinates) => {
  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&alternatives=true`;

  const response = await axios.get(osrmUrl, {
    headers: {
      'User-Agent': 'BreatheRouteApp/1.0 (MERN Student Project)'
    },
    timeout: 8000
  });

  return response.data.routes || [];
};

const calculateRouteExposure = async (geometryCoordinates) => {
  const lineString = turf.lineString(geometryCoordinates);
  const sampledPoints = turf.lineChunk(lineString, 1, { units: 'kilometers' });

  let totalPm25Exposure = 0;
  let sampleCount = 0;

  for (const feature of sampledPoints.features) {
    const [lng, lat] = feature.geometry.coordinates[0];

    try {
      const nearestSensor = await SensorNode.findOne({
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },$maxDistance: 25000
          }
        }
      });

      const nodePm25 = nearestSensor ? nearestSensor.pm25 : 85;
      totalPm25Exposure += nodePm25;
    } catch (err) {
      totalPm25Exposure += 85;
    }
    sampleCount++;
  }

  const averagePm25 = sampleCount > 0 ? totalPm25Exposure / sampleCount : 85;
  return Math.round(averagePm25);
};

const hasDistinctGeometry = (firstGeometry, secondGeometry) => {
  const firstLine = turf.lineString(firstGeometry.coordinates);
  const secondLine = turf.lineString(secondGeometry.coordinates);
  const firstLength = turf.length(firstLine);
  const secondLength = turf.length(secondLine);

  return [0.25, 0.5, 0.75].some((fraction) => {
    const firstPoint = turf.along(firstLine, firstLength * fraction);
    const secondPoint = turf.along(secondLine, secondLength * fraction);
    return turf.distance(firstPoint, secondPoint) > 0.1;
  });
};

const createAlternativeRoute = async (primaryRoute, startLng, startLat, endLng, endLat) => {
  const routeGeometry = primaryRoute.geometry;
  const primaryLine = turf.lineString(routeGeometry.coordinates);
  const routeLength = turf.length(primaryLine);
  const midpoint = turf.along(primaryLine, routeLength / 2);
  const beforeMidpoint = turf.along(primaryLine, routeLength * 0.45);
  const afterMidpoint = turf.along(primaryLine, routeLength * 0.55);
  const routeBearing = turf.bearing(beforeMidpoint, afterMidpoint);

  for (const offsetKm of [1.5, 3]) {
    const candidates = await Promise.allSettled([-90, 90].map(async (direction) => {
      const viaPoint = turf.destination(midpoint, offsetKm, routeBearing + direction);
      const [viaLng, viaLat] = viaPoint.geometry.coordinates;
      const coordinates = `${startLng},${startLat};${viaLng},${viaLat};${endLng},${endLat}`;
      const [candidate] = await osrmRequest(coordinates);
      return candidate;
    }));

    for (const candidate of candidates) {
      if (candidate.status === 'fulfilled' &&
          candidate.value &&
          hasDistinctGeometry(routeGeometry, candidate.value.geometry)) {
        return { route: candidate.value, isGeneratedAlternative: false };
      }
      if (candidate.status === 'rejected') {
        console.warn('OSRM via-point alternative request failed:', candidate.reason.message);
      }
    }
  }

  const offsetLine = turf.lineOffset(primaryLine, 1.5, { units: 'kilometers' });
  const offsetCoordinates = offsetLine.geometry.coordinates.map((coordinate) => [...coordinate]);
  offsetCoordinates[0] = [startLng, startLat];
  offsetCoordinates[offsetCoordinates.length - 1] = [endLng, endLat];
  const offsetMidpoint = turf.destination(midpoint, 1.5, routeBearing + 90);
  offsetCoordinates.splice(
    Math.floor(offsetCoordinates.length / 2),
    0,
    offsetMidpoint.geometry.coordinates
  );
  const alternativeGeometry = turf.lineString(offsetCoordinates).geometry;
  const alternativeDistanceKm = turf.length(turf.lineString(offsetCoordinates));

  return {
    route: {
      geometry: alternativeGeometry,
      distance: alternativeDistanceKm * 1000,
      duration: primaryRoute.duration * (alternativeDistanceKm / (primaryRoute.distance / 1000)),
    },
    isGeneratedAlternative: true
  };
};

const evaluateRoute = async (route, index) => {
  const exposureScore = await calculateRouteExposure(route.geometry.coordinates);
  return {
    id: `route_${index + 1}_${Date.now()}`,
    durationMinutes: Math.round(route.duration / 60),
    distanceKm: (route.distance / 1000).toFixed(2),
    avgPm25: exposureScore,
    geometry: route.geometry,
    isGeneratedAlternative: Boolean(route.isGeneratedAlternative),
  };
};

export const getDualRoutes = async (startLng, startLat, endLng, endLat) => {
  const routes = await osrmRequest(`${startLng},${startLat};${endLng},${endLat}`);

  if (!routes || routes.length === 0) {
    throw new Error('No routes found between selected points.');
  }

  const distinctRoutes = routes.reduce((uniqueRoutes, route) => {
    if (uniqueRoutes.every((uniqueRoute) => hasDistinctGeometry(uniqueRoute.geometry, route.geometry))) {
      uniqueRoutes.push(route);
    }
    return uniqueRoutes;
  }, [routes[0]]);

  if (distinctRoutes.length === 1) {
    const alternative = await createAlternativeRoute(
      distinctRoutes[0],
      startLng,
      startLat,
      endLng,
      endLat
    );
    distinctRoutes.push({
      ...alternative.route,
      isGeneratedAlternative: alternative.isGeneratedAlternative,
    });
  }

  const evaluatedRoutes = await Promise.all(distinctRoutes.map(evaluateRoute));
  const fastestRoute = [...evaluatedRoutes].sort((a, b) => a.durationMinutes - b.durationMinutes)[0];
  const healthiestRoute = [...evaluatedRoutes]
    .filter((route) => route.id !== fastestRoute.id)
    .sort((a, b) => a.avgPm25 - b.avgPm25)[0];

  if (!healthiestRoute || !hasDistinctGeometry(fastestRoute.geometry, healthiestRoute.geometry)) {
    throw new Error('Unable to generate two distinct routes for the selected locations.');
  }

  return {
    fastest: fastestRoute,
    healthiest: healthiestRoute,
    allRoutes: evaluatedRoutes
  };
};
