const mongoose = require('mongoose');

const potDetailSchema = new mongoose.Schema(
  {
    productID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      unique: true,
    },
    material: { type: String, trim: true },
    pattern: { type: String, trim: true },
    dimension: { type: String, trim: true },
    color: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PotDetail', potDetailSchema);
