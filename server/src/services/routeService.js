import axios from 'axios';
import * as turf from '@turf/turf';
import SensorNode from '../models/SensorNode.js';

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
            $geometry: { type: 'Point', coordinates: [lng, lat] },$maxDistance: 25000 // 25 km radius
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

export const getDualRoutes = async (startLng, startLat, endLng, endLat) => {
  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&alternatives=true`;
  
  // Custom User-Agent prevents OSRM from returning 403 Forbidden
  const response = await axios.get(osrmUrl, {
    headers: {
      'User-Agent': 'BreatheRouteApp/1.0 (MERN Student Project)'
    },
    timeout: 8000
  });

  const routes = response.data.routes;

  if (!routes || routes.length === 0) {
    throw new Error('No routes found between selected points.');
  }

  const evaluatedRoutes = await Promise.all(
    routes.map(async (route, index) => {
      const exposureScore = await calculateRouteExposure(route.geometry.coordinates);
      return {
        id: `route_${index + 1}`,
        durationMinutes: Math.round(route.duration / 60),
        distanceKm: (route.distance / 1000).toFixed(2),
        avgPm25: exposureScore,
        geometry: route.geometry,
      };
    })
  );

  const fastestRoute = [...evaluatedRoutes].sort((a, b) => a.durationMinutes - b.durationMinutes)[0];
  const healthiestRoute = [...evaluatedRoutes].sort((a, b) => a.avgPm25 - b.avgPm25)[0];

  return {
    fastest: fastestRoute,
    healthiest: healthiestRoute,
    allRoutes: evaluatedRoutes
  };
};
