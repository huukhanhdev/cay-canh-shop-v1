// Simple pricing utility to compute taxes, shipping and totals

const TAX_RATE = 0.1; // 10% VAT
const SHIPPING_FLAT = 30000; // 30,000 VND flat shipping
const SHIPPING_FREE_THRESHOLD = 500000; // Free shipping over 500,000 VND

function computeSummary(subtotal = 0, discount = 0) {
  const safeSubtotal = Math.max(0, Math.floor(subtotal));
  const safeDiscount = Math.max(0, Math.floor(Math.min(discount, safeSubtotal)));
  const taxableAmount = safeSubtotal - safeDiscount;
  const tax = Math.floor(taxableAmount * TAX_RATE);
  const shipping = taxableAmount >= SHIPPING_FREE_THRESHOLD ? 0 : SHIPPING_FLAT;
  const total = taxableAmount + tax + shipping;

  return {
    subtotal: safeSubtotal,
    discount: safeDiscount,
    tax,
    shipping,
    total,
  };
}

module.exports = {
  TAX_RATE,
  SHIPPING_FLAT,
  SHIPPING_FREE_THRESHOLD,
  computeSummary,
};
