const Comment = require('../models/Comment');
const Product = require('../models/Product');

exports.list = async (req, res) => {
  try {
    const comments = await Comment.find().sort({ createdAt: -1 }).lean();
    // populate product names
    const productIds = Array.from(new Set(comments.map((c) => String(c.productID)))).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds } }).select('name slug').lean();
    const productMap = products.reduce((acc, p) => { acc[String(p._id)] = p; return acc; }, {});

    const list = comments.map((c) => ({
      ...c,
      product: productMap[String(c.productID)] || null,
    }));

    res.render('admin/comments/index', {
      title: 'Quản lý bình luận',
      comments: list,
      success: req.query.success || null,
      error: null,
    });
  } catch (err) {
    console.error('Admin comments list error:', err);
    res.status(500).render('admin/comments/index', { title: 'Quản lý bình luận', comments: [], error: 'Không thể load bình luận.' });
  }
};

exports.remove = async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await Comment.findById(id).lean();
    if (!existing) return res.redirect('/admin/comments?success=not_found');

    await Comment.deleteOne({ _id: id });
    console.log('[admin] deleted comment', id);
    return res.redirect('/admin/comments?success=deleted');
  } catch (err) {
    console.error('Admin delete comment error:', err);
    return res.redirect('/admin/comments?success=error');
  }
};
