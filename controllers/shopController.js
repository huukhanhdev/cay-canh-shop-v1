const Product = require('../models/Product');
const Category = require('../models/Category');
const Comment = require('../models/Comment');
const Review = require('../models/Review');

const PAGE_SIZE = 6;
const SORT_OPTIONS = {
  newest: { createdAt: -1 },
  best_selling: { soldCount: -1 },
  name_asc: { name: 1 },
  name_desc: { name: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
};

const SORT_LABELS = [
  { key: 'newest', label: 'Mới nhất' },
  { key: 'best_selling', label: 'Bán chạy' },
  { key: 'name_asc', label: 'Tên A-Z' },
  { key: 'name_desc', label: 'Tên Z-A' },
  { key: 'price_asc', label: 'Giá tăng dần' },
  { key: 'price_desc', label: 'Giá giảm dần' },
];

function buildFiltersState(query = {}) {
  const tags = [];
  if (Array.isArray(query.tags)) {
    query.tags.forEach((tag) => {
      if (tag && typeof tag === 'string') tags.push(tag);
    });
  } else if (query.tags) {
    tags.push(query.tags);
  }

  return {
    type: ['indoor', 'outdoor', 'pot'].includes(query.type) ? query.type : '',
    category: query.category || '',
    brand: query.brand || '',
    priceMin: query.priceMin || '',
    priceMax: query.priceMax || '',
    rating: query.rating || '',
    tags,
    q: query.q || '',
  };
}

function buildFilters(query = {}) {
  const state = buildFiltersState(query);
  const filters = {};

  if (state.type) filters.type = state.type;
  if (state.brand) filters.brand = state.brand;
  if (state.tags.length) filters.tags = { $all: state.tags };
  if (state.q) filters.$text = { $search: state.q };

  if (state.priceMin || state.priceMax) {
    filters.price = {};
    if (state.priceMin) filters.price.$gte = Number(state.priceMin);
    if (state.priceMax) filters.price.$lte = Number(state.priceMax);
  }

  if (state.rating) {
    const ratingValue = Number(state.rating);
    if (!Number.isNaN(ratingValue)) {
      filters.avgRating = { $gte: ratingValue };
    }
  }

  return { filters, state };
}

function buildSort(sortKey = 'newest') {
  if (SORT_OPTIONS[sortKey]) return SORT_OPTIONS[sortKey];
  return SORT_OPTIONS.newest;
}

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
      bucket.parents.push({ id, name: cat.name, slug: cat.slug });
      if (!bucket.childrenByParent[id]) bucket.childrenByParent[id] = [];
    } else {
      if (!bucket.childrenByParent[parentId]) bucket.childrenByParent[parentId] = [];
      bucket.childrenByParent[parentId].push({ id, name: cat.name, slug: cat.slug });
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

exports.list = async (req, res) => {
  try {
    const { filters, state: filtersState } = buildFilters(req.query);
    let categoryFilter = {};

    if (filtersState.category) {
      const category = await Category.findOne({ slug: filtersState.category }).lean();
      if (category) {
        filters.categoryID = category._id;
        categoryFilter = { slug: category.slug, name: category.name };
        if (!filters.type) filters.type = category.productType;
      }
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const sortKey = req.query.sort || 'newest';
    const sort = buildSort(sortKey);
    const skip = (page - 1) * PAGE_SIZE;

    const [products, total, categories, brands, tags] = await Promise.all([
      Product.find(filters).sort(sort).skip(skip).limit(PAGE_SIZE).lean(),
      Product.countDocuments(filters),
      Category.find().lean(),
      Product.distinct('brand', { brand: { $exists: true, $ne: '' } }),
      Product.distinct('tags'),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const groupedCategories = groupCategories(categories);

    const baseQuery = new URLSearchParams();
    Object.entries(req.query).forEach(([key, value]) => {
      if (key === 'page') return;
      if (Array.isArray(value)) {
        value.forEach((val) => {
          if (typeof val !== 'undefined' && val !== null) baseQuery.append(key, val);
        });
      } else if (typeof value !== 'undefined' && value !== null) {
        baseQuery.append(key, value);
      }
    });
    const baseQueryString = baseQuery.toString();

    res.render('shop/index', {
      title: 'Cửa hàng',
      products,
      groupedCategories,
      activeType: filters.type || 'all',
      activeCategory: categoryFilter,
      brands: brands.filter(Boolean).sort(),
      availableTags: tags.filter(Boolean).sort(),
      pagination: { page, totalPages, hasPrev: page > 1, hasNext: page < totalPages },
      sortKey,
      sortOptions: SORT_LABELS,
      filtersState,
      baseQueryString,
      query: req.query,
      error: null,
    });
  } catch (err) {
    console.error('Shop list error:', err);
    res.status(500).render('shop/index', {
      title: 'Cửa hàng',
      products: [],
      groupedCategories: {},
      activeType: 'all',
      activeCategory: null,
      error: 'Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.',
      brands: [],
      availableTags: [],
      pagination: { page: 1, totalPages: 1, hasPrev: false, hasNext: false },
      sortKey: 'newest',
      sortOptions: SORT_LABELS,
      filtersState: buildFiltersState(req.query),
      baseQueryString: '',
      query: req.query,
    });
  }
};

exports.detail = async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug }).populate('categoryID').lean();
    if (!product) {
      return res.redirect('/shop');
    }

    const [related, comments, reviews] = await Promise.all([
      Product.find({
        type: product.type,
        _id: { $ne: product._id },
      })
        .limit(6)
        .lean(),
      Comment.find({ productID: product._id }).sort({ createdAt: -1 }).lean(),
      Review.find({ productID: product._id }).lean(),
    ]);

    const ratingCount = reviews.length;
    const avgRating = ratingCount
      ? Number((reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / ratingCount).toFixed(1))
      : 0;
    const ratingBreakdown = [5, 4, 3, 2, 1].map((score) => ({
      score,
      count: reviews.filter((r) => r.rating === score).length,
    }));

    let userRating = null;
    if (req.session?.user) {
      const found = reviews.find(
        (r) => r.userID && r.userID.toString() === req.session.user.id
      );
      if (found) userRating = found.rating;
    }

    res.render('shop/detail', {
      title: product.name,
      product,
      related,
      comments,
      avgRating,
      ratingCount,
      ratingBreakdown,
      userRating,
      reviews,
    });
  } catch (err) {
    console.error('Shop detail error:', err);
    res.redirect('/shop');
  }
};

exports.addComment = async (req, res) => {
  try {
    const { name = '', email = '', content = '' } = req.body;
    if (!name.trim() || !content.trim()) {
      return res.redirect(`/shop/${req.params.slug}?msg=comment_invalid#comments`);
    }
    const product = await Product.findOne({ slug: req.params.slug }).select('_id slug').lean();
    if (!product) return res.redirect('/shop');

    await Comment.create({
      productID: product._id,
      name: name.trim(),
      email: email.trim(),
      content: content.trim(),
    });
    return res.redirect(`/shop/${product.slug}#comments`);
  } catch (err) {
    console.error('Add comment error:', err);
    return res.redirect(`/shop/${req.params.slug}?msg=comment_error#comments`);
  }
};

exports.addRating = async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug }).select('_id slug').lean();
    if (!product) return res.redirect('/shop');

    const score = Math.max(1, Math.min(5, Number(req.body.rating || 0)));
    if (!score) {
      return res.redirect(`/shop/${product.slug}?msg=rating_invalid#ratings`);
    }

    const userId = req.session.user.id;
    let review = await Review.findOne({ productID: product._id, userID: userId });
    if (!review) {
      review = new Review({
        productID: product._id,
        userID: userId,
        rating: score,
        comment: (req.body.ratingNote || '').trim(),
      });
    } else {
      review.rating = score;
      review.comment = (req.body.ratingNote || '').trim();
    }
    await review.save();

    const stats = await Review.aggregate([
      { $match: { productID: product._id } },
      {
        $group: {
          _id: '$productID',
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    if (stats.length) {
      await Product.updateOne(
        { _id: product._id },
        { $set: { avgRating: Number(stats[0].avgRating.toFixed(1)), reviewCount: stats[0].count } }
      );
    }

    return res.redirect(`/shop/${product.slug}#ratings`);
  } catch (err) {
    console.error('Add rating error:', err);
    return res.redirect(`/shop/${req.params.slug}?msg=rating_error#ratings`);
  }
};
