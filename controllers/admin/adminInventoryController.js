const Product = require('../../models/Product');
const InventoryLog = require('../../models/InventoryLog');

// Helper: Log inventory change
async function logInventoryChange({ productID, variantId, type, quantity, previousStock, newStock, reason, note, adminID, orderID }) {
  const log = new InventoryLog({
    productID,
    variantId: variantId || null,
    type,
    quantity,
    previousStock,
    newStock,
    reason: reason || '',
    note: note || '',
    adminID: adminID || null,
    orderID: orderID || null
  });
  await log.save();
  return log;
}

// GET /admin/inventory - List all products with stock info
exports.getInventoryList = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 20;
    const skip = (page - 1) * limit;
    
    const searchQuery = req.query.search?.trim() || '';
    const stockFilter = req.query.stock || 'all'; // all, low, out
    const typeFilter = req.query.type || 'all'; // all, plant, pot
    
    let filter = {};
    
    // Search filter
    if (searchQuery) {
      filter.$or = [
        { name: { $regex: searchQuery, $options: 'i' } },
        { slug: { $regex: searchQuery, $options: 'i' } },
        { sku: { $regex: searchQuery, $options: 'i' } }
      ];
    }
    
    // Type filter
    if (typeFilter !== 'all') {
      filter.type = typeFilter;
    }
    
    // Stock filter
    if (stockFilter === 'out') {
      filter.inStock = 0;
    } else if (stockFilter === 'low') {
      filter.inStock = { $gt: 0, $lte: 10 };
    }
    
    const totalProducts = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .select('name slug type sku inStock variants img')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const totalPages = Math.ceil(totalProducts / limit);
    
    res.render('admin/inventory/index', {
      title: 'Quản lý kho',
      products,
      page,
      totalPages,
      searchQuery,
      stockFilter,
      typeFilter,
      user: req.session.user
    });
  } catch (err) {
    console.error('Get inventory list error:', err);
    res.redirect('/admin?msg=error');
  }
};

// GET /admin/inventory/:id - View product inventory detail
exports.getInventoryDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).lean();
    
    if (!product) {
      return res.redirect('/admin/inventory?msg=not_found');
    }
    
    // Get recent inventory logs for this product
    const logs = await InventoryLog.find({ productID: id })
      .populate('adminID', 'fullName email')
      .populate('orderID', 'orderNumber')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    
    res.render('admin/inventory/detail', {
      title: `Kho: ${product.name}`,
      product,
      logs,
      user: req.session.user
    });
  } catch (err) {
    console.error('Get inventory detail error:', err);
    res.redirect('/admin/inventory?msg=error');
  }
};

// POST /admin/inventory/:id/import - Import stock
exports.importStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, variantId, reason, note } = req.body;
    
    const qty = Math.max(0, Number(quantity) || 0);
    if (qty === 0) {
      return res.redirect(`/admin/inventory/${id}?msg=invalid_quantity`);
    }
    
    const product = await Product.findById(id);
    if (!product) {
      return res.redirect('/admin/inventory?msg=not_found');
    }
    
    let previousStock, newStock;
    
    if (variantId) {
      const variant = product.variants?.find(v => v._id.toString() === variantId);
      if (!variant) {
        return res.redirect(`/admin/inventory/${id}?msg=variant_not_found`);
      }
      previousStock = variant.stock || 0;
      newStock = previousStock + qty;
      variant.stock = newStock;
    } else {
      previousStock = product.inStock || 0;
      newStock = previousStock + qty;
      product.inStock = newStock;
    }
    
    await product.save();
    
    // Log the change
    await logInventoryChange({
      productID: id,
      variantId: variantId || null,
      type: 'import',
      quantity: qty,
      previousStock,
      newStock,
      reason: reason || 'Nhập kho',
      note: note || '',
      adminID: req.session.user.id
    });
    
    res.redirect(`/admin/inventory/${id}?msg=imported`);
  } catch (err) {
    console.error('Import stock error:', err);
    res.redirect(`/admin/inventory/${req.params.id}?msg=error`);
  }
};

// POST /admin/inventory/:id/export - Export stock
exports.exportStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, variantId, reason, note } = req.body;
    
    const qty = Math.max(0, Number(quantity) || 0);
    if (qty === 0) {
      return res.redirect(`/admin/inventory/${id}?msg=invalid_quantity`);
    }
    
    const product = await Product.findById(id);
    if (!product) {
      return res.redirect('/admin/inventory?msg=not_found');
    }
    
    let previousStock, newStock;
    
    if (variantId) {
      const variant = product.variants?.find(v => v._id.toString() === variantId);
      if (!variant) {
        return res.redirect(`/admin/inventory/${id}?msg=variant_not_found`);
      }
      previousStock = variant.stock || 0;
      newStock = Math.max(0, previousStock - qty);
      variant.stock = newStock;
    } else {
      previousStock = product.inStock || 0;
      newStock = Math.max(0, previousStock - qty);
      product.inStock = newStock;
    }
    
    await product.save();
    
    // Log the change
    await logInventoryChange({
      productID: id,
      variantId: variantId || null,
      type: 'export',
      quantity: qty,
      previousStock,
      newStock,
      reason: reason || 'Xuất kho',
      note: note || '',
      adminID: req.session.user.id
    });
    
    res.redirect(`/admin/inventory/${id}?msg=exported`);
  } catch (err) {
    console.error('Export stock error:', err);
    res.redirect(`/admin/inventory/${req.params.id}?msg=error`);
  }
};

// POST /admin/inventory/:id/adjust - Adjust stock
exports.adjustStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { newQuantity, variantId, reason, note } = req.body;
    
    const qty = Math.max(0, Number(newQuantity) || 0);
    
    const product = await Product.findById(id);
    if (!product) {
      return res.redirect('/admin/inventory?msg=not_found');
    }
    
    let previousStock, newStock;
    
    if (variantId) {
      const variant = product.variants?.find(v => v._id.toString() === variantId);
      if (!variant) {
        return res.redirect(`/admin/inventory/${id}?msg=variant_not_found`);
      }
      previousStock = variant.stock || 0;
      newStock = qty;
      variant.stock = newStock;
    } else {
      previousStock = product.inStock || 0;
      newStock = qty;
      product.inStock = newStock;
    }
    
    await product.save();
    
    // Log the change
    const quantityChange = newStock - previousStock;
    await logInventoryChange({
      productID: id,
      variantId: variantId || null,
      type: 'adjustment',
      quantity: Math.abs(quantityChange),
      previousStock,
      newStock,
      reason: reason || 'Điều chỉnh tồn kho',
      note: note || '',
      adminID: req.session.user.id
    });
    
    res.redirect(`/admin/inventory/${id}?msg=adjusted`);
  } catch (err) {
    console.error('Adjust stock error:', err);
    res.redirect(`/admin/inventory/${req.params.id}?msg=error`);
  }
};

// GET /admin/inventory/logs - View all inventory logs
exports.getInventoryLogs = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 50;
    const skip = (page - 1) * limit;
    
    const typeFilter = req.query.type || 'all'; // all, import, export, adjustment, sale
    
    let filter = {};
    if (typeFilter !== 'all') {
      filter.type = typeFilter;
    }
    
    const totalLogs = await InventoryLog.countDocuments(filter);
    const logs = await InventoryLog.find(filter)
      .populate('productID', 'name slug type')
      .populate('adminID', 'fullName email')
      .populate('orderID', 'orderNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const totalPages = Math.ceil(totalLogs / limit);
    
    res.render('admin/inventory/logs', {
      title: 'Lịch sử xuất nhập kho',
      logs,
      page,
      totalPages,
      typeFilter,
      user: req.session.user
    });
  } catch (err) {
    console.error('Get inventory logs error:', err);
    res.redirect('/admin?msg=error');
  }
};

// Export helper for use in payment controller
exports.logInventoryChange = logInventoryChange;
