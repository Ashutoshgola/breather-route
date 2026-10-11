import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { fetchAndSaveLatestAQI } from './src/services/aqiIngestionService.js';
import routeRoutes from './src/routes/routeRoutes.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json());

// Switch port from 5000 to 5001 to avoid macOS ControlCenter conflict
const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/breatheroute';

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'BreatheRoute API Root Endpoint' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'BreatheRoute Server is Running' });
});

app.use('/api/routes', routeRoutes);

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(' Connected to MongoDB');
    const refreshSensorData = () => {
      fetchAndSaveLatestAQI().catch((err) => {
        console.error('[AQI Ingest Error]:', err.message);
      });
    };

    refreshSensorData();
    const aqiRefreshInterval = setInterval(refreshSensorData, 5 * 60 * 1000);
    aqiRefreshInterval.unref();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(` Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => console.error('MongoDB connection error:', err));
