import express from 'express';
import { getDualRoutes, getSensorNodes } from '../services/routeService.js';
import Trip from '../models/Trip.js';

const router = express.Router();

router.get('/sensors', async (req, res) => {
  try {
    res.json(await getSensorNodes());
  } catch (error) {
    console.error('[AQI Sensors API Error]:', error.message);
    res.status(500).json({ error: 'Failed to load AQI sensor readings.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const {
      startLng,
      startLat,
      endLng,
      endLat,
      originName,
      destinationName,
      vehicleProfile,
    } = req.query;

    if (!startLng || !startLat || !endLng || !endLat) {
      return res.status(400).json({ error: 'Missing coordinates' });
    }

    const result = await getDualRoutes(
      parseFloat(startLng),
      parseFloat(startLat),
      parseFloat(endLng),
      parseFloat(endLat),
      vehicleProfile
    );

    // Save evaluated trip to MongoDB database
    try {
      await Trip.create({
        originName: originName || 'Custom Location',
        originCoords: [parseFloat(startLng), parseFloat(startLat)],
        destinationName: destinationName || 'Custom Location',
        destinationCoords: [parseFloat(endLng), parseFloat(endLat)],
        fastestRoute: result.fastest,
        healthiestRoute: result.healthiest,
      });
    } catch (dbErr) {
      console.error('Trip log storage warning:', dbErr.message);
    }

    res.json(result);
  } catch (error) {
    console.error('[Route API Error]:', error.message);
    res.status(500).json({ error: error.message || 'Failed to calculate dual routes' });
  }
});

export default router;
