const mongoose = require("mongoose");

const { Schema } = mongoose;

const orderVariantSchema = new Schema(
  {
    variantName: { type: String, trim: true },
    sku: { type: String, trim: true },
    color: { type: String, trim: true },
    size: { type: String, trim: true },
    material: { type: String, trim: true },
    price: { type: Number, min: 0 },
  },
  { _id: false }
);

const orderItemSchema = new Schema(
  {
    productID: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subTotal: { type: Number, required: true, min: 0 },
    variantId: { type: String, trim: true },
    variant: { type: orderVariantSchema, default: {} },
  },
  { _id: false }
);

const orderAddressSchema = new Schema(
  {
    number: { type: String, trim: true },
    street: { type: String, trim: true },
    district: { type: String, trim: true },
    city: { type: String, trim: true },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    userID: { type: Schema.Types.ObjectId, ref: "User", required: true },
    address: { type: orderAddressSchema, required: true },
    orderDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["pending", "preparing", "shipping", "done", "canceled"],
      default: "pending",
    },
    // Phương thức thanh toán: cod (mặc định) hoặc momo
    paymentMethod: { type: String, enum: ["cod", "momo"], default: "cod" },
    // Trạng thái thanh toán riêng (khi dùng cổng online)
    paymentStatus: { type: String, enum: ["unpaid", "pending", "paid", "failed", "canceled"], default: "unpaid" },
    // Mã giao dịch từ Momo (nếu có)
    momoTransId: { type: String, trim: true },
    // Lịch sử trạng thái: mỗi lần đổi trạng thái sẽ append một bản ghi
    statusHistory: [
      new Schema(
        {
          status: {
            type: String,
            enum: ["pending", "preparing", "shipping", "done", "canceled"],
            required: true,
          },
          updatedAt: { type: Date, default: Date.now },
          note: { type: String, trim: true },
        },
        { _id: false }
      ),
    ],
    items: { type: [orderItemSchema], required: true, default: [] },
    shippingFee: { type: Number, default: 0 },
    couponID: { type: Schema.Types.ObjectId, ref: "Coupon", default: null },
    discount: { type: Number, default: 0 },
    pointUsed: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    pointEarned: { type: Number, default: 0 },
    note: { type: String, trim: true },
    pointRewarded: { type: Boolean, default: false },
    cancelReason: { type: String, trim: true },
    canceledAt: { type: Date, default: null },
    stockDeducted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes for dashboard & filtering performance
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ couponID: 1, createdAt: -1 });
orderSchema.index({ userID: 1, createdAt: -1 });

orderSchema.pre("save", function updateTimestamp(next) {
  this.updateAt = new Date();
  next();
});

module.exports = mongoose.model("Order", orderSchema);
