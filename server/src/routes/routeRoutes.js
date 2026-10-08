import express from 'express';
import { getDualRoutes } from '../services/routeService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { startLng, startLat, endLng, endLat } = req.query;

    if (!startLng || !startLat || !endLng || !endLat) {
      return res.status(400).json({ error: 'Missing origin or destination coordinates' });
    }

    const result = await getDualRoutes(
      parseFloat(startLng),
      parseFloat(startLat),
      parseFloat(endLng),
      parseFloat(endLat)
    );

    res.json(result);
  } catch (error) {
    console.error('[Route API Error]:', error.message);
    res.status(500).json({ error: error.message || 'Failed to calculate dual routes' });
  }
});

export default router;