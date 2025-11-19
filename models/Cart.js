const mongoose = require("mongoose");

const { Schema } = mongoose;

const cartVariantSchema = new Schema(
  {
    variantName: { type: String, trim: true },
    sku: { type: String, trim: true },
    color: { type: String, trim: true },
    size: { type: String, trim: true },
    material: { type: String, trim: true },
    price: { type: Number, min: 0 },
    variantImg: { type: String, trim: true },
  },
  { _id: false }
);

const cartItemSchema = new Schema(
  {
    productID: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true, trim: true },
    productImg: { type: String, trim: true },
    type: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subTotal: { type: Number, required: true, min: 0 },
    variantId: { type: String, trim: true },
    variant: { type: cartVariantSchema, default: {} },
  },
  { _id: false }
);

const cartSchema = new Schema(
  {
    userID: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [cartItemSchema], default: [] },
    totalPrice: { type: Number, required: true, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

cartSchema.index({ userID: 1, isActive: 1 }, { unique: true });

module.exports = mongoose.model("Cart", cartSchema);
