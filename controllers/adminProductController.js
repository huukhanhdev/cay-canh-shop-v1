const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');
const Category = require('../models/Category');

const PUBLIC_ROOT = path.join(__dirname, '..', 'public');
const UPLOAD_PREFIX = '/uploads/products/';
const TYPE_UPLOAD_DIR = {
  indoor: '/uploads/cay-trong-nha/',
  outdoor: '/uploads/cay-ngoai-troi/',
  pot: '/uploads/chau-cay/',
};

function slugify(str = '') {
  return str
    .toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') || 'san-pham';
}

function collectImagePaths(req) {
  const uploaded = (req.files || []).map((file) => `${UPLOAD_PREFIX}${file.filename}`);
  const manual = (req.body.imageUrls || '')
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean);
  return [...uploaded, ...manual];
}

const ALL_PREFIXES = [UPLOAD_PREFIX, ...Object.values(TYPE_UPLOAD_DIR)];

function removeImagesFromDisk(paths = []) {
  paths
    .filter((p) => ALL_PREFIXES.some((prefix) => p?.startsWith(prefix)))
    .forEach((url) => {
      const relative = url.replace(/^\//, '');
      const absolute = path.join(PUBLIC_ROOT, relative);
      fs.promises.unlink(absolute).catch(() => {});
    });
}

async function ensureDir(relativePath) {
  const absolute = path.join(PUBLIC_ROOT, relativePath.replace(/^\//, ''));
  await fs.promises.mkdir(path.dirname(absolute), { recursive: true });
}

async function relocateImagesForType(images = [], type = 'indoor') {
  const targetPrefix = TYPE_UPLOAD_DIR[type] || UPLOAD_PREFIX;
  const results = [];

  for (const img of images) {
    const prefixUsed = ALL_PREFIXES.find((prefix) => img.startsWith(prefix));
    if (!prefixUsed || prefixUsed === targetPrefix) {
      results.push(img);
      continue;
    }

    const filename = img.replace(prefixUsed, '');
    const from = path.join(PUBLIC_ROOT, img.replace(/^\//, ''));
    const destRel = `${targetPrefix}${filename}`;
    const to = path.join(PUBLIC_ROOT, destRel.replace(/^\//, ''));

    try {
      await ensureDir(destRel);
      await fs.promises.rename(from, to);
      results.push(destRel);
    } catch (err) {
      console.error('Relocate image error:', err);
      results.push(img);
    }
  }

  return results;
}

const ALLOWED_PRODUCT_TYPES = ['indoor', 'outdoor', 'pot'];

const CATEGORY_LABEL = {
  indoor: 'Cây trong nhà',
  outdoor: 'Cây ngoài trời',
  pot: 'Chậu cây',
};

function groupCategories(list = []) {
  const grouped = list.reduce((acc, cat) => {
    const type = cat.productType || 'indoor';
    if (!acc[type]) {
      acc[type] = { parents: [], childrenByParent: {} };
    }
    const bucket = acc[type];
    const id = cat._id.toString();
    const parentId = cat.parentCategoryID ? cat.parentCategoryID.toString() : null;

    if (!parentId) {
      bucket.parents.push({ id, name: cat.name });
      if (!bucket.childrenByParent[id]) bucket.childrenByParent[id] = [];
    } else {
      if (!bucket.childrenByParent[parentId]) bucket.childrenByParent[parentId] = [];
      bucket.childrenByParent[parentId].push({ id, name: cat.name });
    }

    return acc;
  }, {});

  Object.values(grouped).forEach((bucket) => {
    bucket.parents.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    Object.values(bucket.childrenByParent).forEach((children) => {
      children.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    });
  });

  return grouped;
}

function normalizeType(value) {
  if (ALLOWED_PRODUCT_TYPES.includes(value)) return value;
  if (value === 'plant') return 'indoor';
  return 'indoor';
}

exports.list = async (req, res) => {
  try {
    const products = await Product.find()
      .populate('categoryID')
      .sort({ createdAt: -1 });
    res.render('admin/products/index', {
      title: 'Quản lý sản phẩm',
      products,
      success: req.query.success || null,
      categoryLabels: CATEGORY_LABEL,
    });
  } catch (err) {
    console.error('List product error:', err);
    res.status(500).render('admin/products/index', {
      title: 'Quản lý sản phẩm',
      products: [],
      error: 'Không thể tải danh sách sản phẩm.',
    });
  }
};

exports.renderCreate = async (_req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 }).lean();
    res.render('admin/products/form', {
      title: 'Thêm sản phẩm',
      product: null,
      categoriesByType: groupCategories(categories),
      formAction: '/admin/products',
      method: 'POST',
      selectedType: 'indoor',
      selectedCategory: '',
    });
  } catch (err) {
    console.error('Render create product error:', err);
    res.redirect('/admin/products?success=false');
  }
};

exports.create = async (req, res) => {
  const {
    name = '',
    slug = '',
    type = 'indoor',
    price = 0,
    description = '',
    categoryID = '',
    inStock = 0,
  } = req.body;

  const images = collectImagePaths(req);
  const safeType = normalizeType(type);

  try {
    const product = new Product({
      name: name.trim(),
      slug: slug ? slugify(slug) : slugify(name),
      type: safeType,
      price: Number(price) || 0,
      description,
      categoryID,
      inStock: Number(inStock) || 0,
    });

    if (images.length > 0) {
      const finalImages = await relocateImagesForType(images, safeType);
      product.img = finalImages;
    }

    await product.save();
    res.redirect('/admin/products?success=created');
  } catch (err) {
    console.error('Create product error:', err);
    removeImagesFromDisk(images);

    const categories = await Category.find().sort({ name: 1 }).lean();
    res.status(400).render('admin/products/form', {
      title: 'Thêm sản phẩm',
      product: req.body,
      categoriesByType: groupCategories(categories),
      formAction: '/admin/products',
      method: 'POST',
      error: 'Không thể tạo sản phẩm. Vui lòng kiểm tra lại thông tin.',
      selectedType: safeType,
      selectedCategory: categoryID,
    });
  }
};

exports.renderEdit = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.redirect('/admin/products?success=not_found');
    product.type = normalizeType(product.type);
    const categories = await Category.find().sort({ name: 1 }).lean();
    res.render('admin/products/form', {
      title: 'Chỉnh sửa sản phẩm',
      product,
      categoriesByType: groupCategories(categories),
      formAction: `/admin/products/${product._id}`,
      method: 'POST',
      selectedType: product.type,
      selectedCategory: product.categoryID ? product.categoryID.toString() : '',
    });
  } catch (err) {
    console.error('Render edit product error:', err);
    res.redirect('/admin/products?success=false');
  }
};

exports.update = async (req, res) => {
  const {
    name = '',
    slug = '',
    type = 'indoor',
    price = 0,
    description = '',
    categoryID = '',
    inStock = 0,
  } = req.body;

  const newImagesRaw = collectImagePaths(req);
  const removeImages = Array.isArray(req.body.removeImages)
    ? req.body.removeImages
    : req.body.removeImages
    ? [req.body.removeImages]
    : [];
  const currentImages = Array.isArray(req.body.currentImages)
    ? req.body.currentImages
    : req.body.currentImages
    ? [req.body.currentImages]
    : [];
  const safeType = normalizeType(type);

  const newImages = await relocateImagesForType(newImagesRaw, safeType);

  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      removeImagesFromDisk(newImages);
      return res.redirect('/admin/products?success=not_found');
    }

    product.name = name.trim();
    product.slug = slug ? slugify(slug) : slugify(name);
    product.type = safeType;
    product.price = Number(price) || 0;
    product.description = description;
    product.categoryID = categoryID;
    product.inStock = Number(inStock) || 0;

    if (removeImages.length > 0) {
      product.img = (product.img || []).filter((img) => !removeImages.includes(img));
      removeImagesFromDisk(removeImages);
    }

    if (newImages.length > 0) {
      product.img = [...(product.img || []), ...newImages];
    }

    if (!product.img || product.img.length === 0) {
      product.img = ['/images/default-plant.jpg'];
    }

    await product.save();
    res.redirect('/admin/products?success=updated');
  } catch (err) {
    console.error('Update product error:', err);
    removeImagesFromDisk(newImages);

    const categories = await Category.find().sort({ name: 1 }).lean();
    res.status(400).render('admin/products/form', {
      title: 'Chỉnh sửa sản phẩm',
      product: {
        _id: req.params.id,
        name,
        slug,
        type: safeType,
        price,
        description,
        categoryID,
        inStock,
        img: currentImages.concat(newImages),
      },
      categoriesByType: groupCategories(categories),
      formAction: `/admin/products/${req.params.id}`,
      method: 'POST',
      error: 'Không thể cập nhật sản phẩm. Vui lòng thử lại.',
      selectedType: safeType,
      selectedCategory: categoryID,
    });
  }
};

exports.remove = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.redirect('/admin/products?success=not_found');
    removeImagesFromDisk(product.img || []);
    await product.deleteOne();
    res.redirect('/admin/products?success=deleted');
  } catch (err) {
    console.error('Delete product error:', err);
    res.redirect('/admin/products?success=false');
  }
};
