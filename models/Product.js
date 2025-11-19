// models/Product.js
const mongoose = require("mongoose");

const { Schema } = mongoose;

const variantSchema = new Schema(
  {
    variantName: { type: String, required: true, trim: true },
    sku: { type: String, trim: true },
    color: { type: String, trim: true },
    size: { type: String, trim: true },
    material: { type: String, trim: true },
    price: { type: Number, min: 0 },
    stock: { type: Number, min: 0, default: 0 },
    variantImg: { type: String, trim: true },
  },
  { _id: true }
);

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true },
    img: {
      type: [String],
      default: ["/images/default-plant.jpg"],
    },
    type: { type: String, enum: ['indoor', 'outdoor', 'pot'], required: true },
    price: { type: Number, required: true, min: 0 },
    brand: { type: String, trim: true, default: 'Cay Canh Shop' },
    tags: { type: [String], default: [] },
    description: { type: String, trim: true },
    categoryID: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    avgRating: { type: Number, min: 0, max: 5, default: 0 },
    reviewCount: { type: Number, min: 0, default: 0 },
    soldCount: { type: Number, min: 0, default: 0 },
    inStock: { type: Number, min: 0, default: 0 },
    variants: { type: [variantSchema], default: [] },
  },
  { timestamps: true }
);

// Tính instock tự động dựa trên tổng stock của các variants nếu loại sản phẩm là "pot"
productSchema.pre("save", function (next) {
  if (this.variants?.length > 0) {
    const totalVariantStock = this.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
    if (totalVariantStock > 0) {
      this.inStock = totalVariantStock;
    }
    if (!this.price) {
      const variantWithPrice = this.variants.find((v) => typeof v.price === 'number');
      if (variantWithPrice) {
        this.price = variantWithPrice.price;
      }
    }
  }
  next();
});

productSchema.index({ name: "text", description: "text", slug: "text" });

module.exports = mongoose.model("Product", productSchema);
