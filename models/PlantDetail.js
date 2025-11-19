const mongoose = require('mongoose');

const plantDetailSchema = new mongoose.Schema(
  {
    productID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      unique: true,
    },
    height: { type: String, trim: true },
    difficulty: { type: String, trim: true },
    lightRequirement: { type: String, trim: true },
    waterDemand: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlantDetail', plantDetailSchema);
