import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { fetchAndSaveLatestAQI } from './src/services/aqiIngestionService.js';
import routeRoutes from './src/routes/routeRoutes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/breatheroute';

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'BreatheRoute Server is Running' });
});

// Register Phase 2 Routing API
app.use('/api/routes', routeRoutes);

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(' Connected to MongoDB');

    fetchAndSaveLatestAQI();

    app.listen(PORT, () => {
      console.log(` Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => console.error('MongoDB connection error:', err));