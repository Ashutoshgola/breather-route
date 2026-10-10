import mongoose from 'mongoose';

const tripSchema = new mongoose.Schema({
  originName: { type: String, required: true },
  originCoords: { type: [Number], required: true }, // [lng, lat]
  destinationName: { type: String, required: true },
  destinationCoords: { type: [Number], required: true }, // [lng, lat]
  fastestRoute: {
    durationMinutes: Number,
    distanceKm: String,
    avgPm25: Number,
  },
  healthiestRoute: {
    durationMinutes: Number,
    distanceKm: String,
    avgPm25: Number,
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Trip', tripSchema);
