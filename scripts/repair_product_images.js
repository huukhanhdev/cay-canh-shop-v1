const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Product = require('../models/Product');

const PUBLIC_ROOT = path.join(__dirname, '..', 'public');
const TYPE_DIR = {
  indoor: '/uploads/cay-trong-nha/',
  outdoor: '/uploads/cay-ngoai-troi/',
  pot: '/uploads/chau-cay/',
};
const LEGACY_PREFIX = '/uploads/products/';

async function ensureDir(filepath) {
  await fs.promises.mkdir(path.dirname(filepath), { recursive: true });
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/caycanhshop');
  const products = await Product.find({}).lean();
  for (const product of products) {
    const typeDir = TYPE_DIR[product.type] || LEGACY_PREFIX;
    const updates = [];
    for (const img of product.img || []) {
      const targetAbs = path.join(PUBLIC_ROOT, img.replace(/^\//, ''));
      if (fs.existsSync(targetAbs)) continue;

      const legacyAbs = path.join(PUBLIC_ROOT, (LEGACY_PREFIX + path.basename(img)).replace(/^\//, ''));
      if (!fs.existsSync(legacyAbs)) continue;

      const destRel = `${typeDir}${path.basename(img)}`;
      const destAbs = path.join(PUBLIC_ROOT, destRel.replace(/^\//, ''));
      await ensureDir(destAbs);
      await fs.promises.rename(legacyAbs, destAbs);
      updates.push({ old: img, neu: destRel });
    }

    if (updates.length) {
      const newImgs = product.img.map((img) => {
        const found = updates.find((u) => u.old === img);
        return found ? found.neu : img;
      });
      await Product.updateOne({ _id: product._id }, { $set: { img: newImgs } });
      console.log('Updated', product.name, updates);
    }
  }

  await mongoose.disconnect();
})();
