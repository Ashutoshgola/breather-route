import mongoose from 'mongoose';

const sensorNodeSchema = new mongoose.Schema({
  stationId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  pm25: {
    type: Number,
    required: true,
  },
  pm10: Number,
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

sensorNodeSchema.index({ location: '2dsphere' });

export default mongoose.model('SensorNode', sensorNodeSchema);