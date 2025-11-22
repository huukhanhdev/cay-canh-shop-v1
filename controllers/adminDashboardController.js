const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

const STATUS_LABELS = {
  pending: 'Chờ xử lý',
  preparing: 'Đang chuẩn bị',
  shipping: 'Đang giao',
  done: 'Hoàn tất',
  canceled: 'Đã hủy',
};

function getStartOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

exports.overview = async (_req, res) => {
  const now = new Date();
  const startOfMonth = getStartOfMonth(now);
  const startOfPrevMonth = getStartOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  try {
    const [
      totalsAgg,
      monthlyRevenueAgg,
      prevMonthRevenueAgg,
      statusAgg,
      recentOrders,
      topProductsAgg,
      latestCustomers,
      lowStockProducts,
      customerCount,
    ] = await Promise.all([
      Order.aggregate([
        { $match: { status: { $ne: 'canceled' } } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalPrice' },
            totalOrders: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            status: { $ne: 'canceled' },
            createdAt: { $gte: startOfMonth },
          },
        },
        { $group: { _id: null, revenue: { $sum: '$totalPrice' } } },
      ]),
      Order.aggregate([
        {
          $match: {
            status: { $ne: 'canceled' },
            createdAt: { $gte: startOfPrevMonth, $lt: startOfMonth },
          },
        },
        { $group: { _id: null, revenue: { $sum: '$totalPrice' } } },
      ]),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .populate('userID')
        .lean(),
      Order.aggregate([
        { $match: { status: { $ne: 'canceled' } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productID',
            quantity: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.subTotal' },
          },
        },
        { $sort: { quantity: -1 } },
        { $limit: 5 },
      ]),
      User.find({ role: 'customer' }).sort({ createdAt: -1 }).limit(5).lean(),
      Product.find({ inStock: { $gte: 0, $lte: 10 } })
        .sort({ inStock: 1 })
        .limit(5)
        .select('name slug inStock type img')
        .lean(),
      User.countDocuments({ role: 'customer' }),
    ]);

    const totals = totalsAgg[0] || { totalRevenue: 0, totalOrders: 0 };
    const monthlyRevenue = monthlyRevenueAgg[0]?.revenue || 0;
    const prevMonthRevenue = prevMonthRevenueAgg[0]?.revenue || 0;
    const avgOrderValue =
      totals.totalOrders > 0 ? Math.round((totals.totalRevenue / totals.totalOrders) * 100) / 100 : 0;

    const statusMap = statusAgg.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const pendingOrders =
      (statusMap.pending || 0) + (statusMap.preparing || 0) + (statusMap.shipping || 0);

    const statusBreakdown = Object.keys(STATUS_LABELS).map((key) => ({
      key,
      label: STATUS_LABELS[key],
      count: statusMap[key] || 0,
    }));

    const revenueTrend =
      prevMonthRevenue > 0
        ? (((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100).toFixed(1)
        : null;

    const topProductIds = topProductsAgg.map((item) => item._id).filter(Boolean);
    const topProductDocs = await Product.find({ _id: { $in: topProductIds } })
      .select('name slug img')
      .lean();
    const topProducts = topProductsAgg.map((item) => {
      const doc = topProductDocs.find((p) => p._id.toString() === item._id.toString());
      return {
        id: item._id?.toString() || '',
        name: doc?.name || 'Sản phẩm không xác định',
        slug: doc?.slug,
        img: Array.isArray(doc?.img) ? doc.img[0] : doc?.img,
        quantity: item.quantity,
        revenue: item.revenue,
      };
    });

    res.render('admin/dashboard', {
      title: 'Bảng điều khiển',
      stats: {
        totalRevenue: totals.totalRevenue || 0,
        totalOrders: totals.totalOrders || 0,
        avgOrderValue,
        customerCount,
        monthlyRevenue,
        revenueTrend,
        pendingOrders,
      },
      statusBreakdown,
      recentOrders,
      topProducts,
      latestCustomers,
      lowStockProducts,
      error: null,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).render('admin/dashboard', {
      title: 'Bảng điều khiển',
      stats: {
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        customerCount: 0,
        monthlyRevenue: 0,
        revenueTrend: null,
        pendingOrders: 0,
      },
      statusBreakdown: [],
      recentOrders: [],
      topProducts: [],
      latestCustomers: [],
      lowStockProducts: [],
      error: 'Không thể tải dữ liệu dashboard. Vui lòng thử lại sau.',
    });
  }
};

