const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    productID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    userID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

reviewSchema.index({ productID: 1, userID: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
