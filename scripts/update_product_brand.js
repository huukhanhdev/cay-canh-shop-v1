require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');

const BRAND_BY_TYPE = {
  indoor: 'Leafy Corner',
  outdoor: 'Cây Cảnh Shop',
  pot: 'Terracotta Studio',
};

async function run() {
  const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/caycanhshop';
  await mongoose.connect(mongoUrl);
  console.log('✅ MongoDB connected for brand update');

  const categories = await Category.find({}).lean();
  const catMap = categories.reduce((acc, c) => {
    acc[c._id.toString()] = c;
    return acc;
  }, {});

  const products = await Product.find({}).exec();
  let updated = 0;

  for (const p of products) {
    const cat = catMap[p.categoryID?.toString()];
    const productType = cat?.productType || 'indoor';
    const newBrand = BRAND_BY_TYPE[productType] || 'Cây Cảnh Shop';
    if (p.brand !== newBrand) {
      p.brand = newBrand;
      await p.save();
      updated += 1;
    }
  }

  console.log(`✅ Cập nhật thương hiệu cho ${updated} sản phẩm.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Lỗi khi cập nhật brand:', err);
  process.exit(1);
});
