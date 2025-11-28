const Order = require('../../models/Order');
const Product = require('../../models/Product');
const User = require('../../models/User');

const STATUS_LABELS = {
  pending: 'Chờ xử lý',
  preparing: 'Đang chuẩn bị',
  shipping: 'Đang giao',
  done: 'Hoàn tất',
  canceled: 'Đã hủy',
};

const PENDING_ORDER_STATUSES = ['pending', 'preparing', 'shipping'];

function getStartOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getDateDaysAgo(days = 1) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

async function getTopProducts(rangeStart) {
  const pipeline = [
    { $match: { createdAt: { $gte: rangeStart }, status: { $ne: 'canceled' } } },
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
  ];

  const agg = await Order.aggregate(pipeline);
  const productIds = agg.map((item) => item._id).filter(Boolean);
  const docs = await Product.find({ _id: { $in: productIds } })
    .select('name slug img')
    .lean();

  return agg.map((item) => {
    const doc = docs.find((product) => product._id.toString() === item._id?.toString());
    return {
      id: item._id?.toString() || '',
      name: doc?.name || 'Sản phẩm không xác định',
      slug: doc?.slug,
      img: Array.isArray(doc?.img) ? doc.img[0] : doc?.img,
      quantity: item.quantity,
      revenue: item.revenue,
    };
  });
}

async function getSimpleDashboardData() {
  const now = new Date();
  const startOfMonth = getStartOfMonth(now);
  const startOfPrevMonth = getStartOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const sevenDaysAgo = getDateDaysAgo(7);
  const thirtyDaysAgo = getDateDaysAgo(30);

  const [
    monthlyRevenueAgg,
    prevMonthRevenueAgg,
    totalUsers,
    newUsers,
    totalOrders30d,
    pendingOrders,
    topProducts,
    recentOrders,
    latestCustomers,
    lowStockProducts,
  ] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          status: 'done',
          createdAt: { $gte: startOfMonth },
        },
      },
      { $group: { _id: null, revenue: { $sum: '$totalPrice' } } },
    ]),
    Order.aggregate([
      {
        $match: {
          status: 'done',
          createdAt: { $gte: startOfPrevMonth, $lt: startOfMonth },
        },
      },
      { $group: { _id: null, revenue: { $sum: '$totalPrice' } } },
    ]),
    User.countDocuments({ role: 'customer' }),
    User.countDocuments({ role: 'customer', createdAt: { $gte: sevenDaysAgo } }),
    Order.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    Order.countDocuments({ status: { $in: PENDING_ORDER_STATUSES } }),
    getTopProducts(thirtyDaysAgo),
    Order.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('userID')
      .lean(),
    User.find({ role: 'customer' }).sort({ createdAt: -1 }).limit(5).lean(),
    Product.find({ inStock: { $lte: 5 } })
      .sort({ inStock: 1 })
      .limit(5)
      .select('name slug inStock type img')
      .lean(),
  ]);

  const monthlyRevenue = monthlyRevenueAgg[0]?.revenue || 0;
  const prevMonthRevenue = prevMonthRevenueAgg[0]?.revenue || 0;
  const revenueTrend =
    prevMonthRevenue > 0
      ? Number((((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100).toFixed(1))
      : null;

  return {
    hero: {
      monthlyRevenue,
      revenueTrend,
    },
    stats: {
      totalUsers,
      newUsers,
      totalOrders30d,
      pendingOrders,
    },
    topProducts,
    recentOrders,
    latestCustomers,
    lowStockProducts,
  };
}

exports.overview = async (req, res) => {
  const viewMode = req.query.view === 'advanced' ? 'advanced' : 'simple';

  try {
    const simpleData = await getSimpleDashboardData();

    res.render('admin/dashboard', {
      title: 'Bảng điều khiển',
      viewMode,
      hero: simpleData.hero,
      stats: simpleData.stats,
      topProducts: simpleData.topProducts,
      recentOrders: simpleData.recentOrders,
      latestCustomers: simpleData.latestCustomers,
      lowStockProducts: simpleData.lowStockProducts,
      statusLabels: STATUS_LABELS,
      advancedDisabled: viewMode === 'advanced',
      error: null,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).render('admin/dashboard', {
      title: 'Bảng điều khiển',
      viewMode: 'simple',
      hero: { monthlyRevenue: 0, revenueTrend: null },
      stats: { totalUsers: 0, newUsers: 0, totalOrders30d: 0, pendingOrders: 0 },
      topProducts: [],
      recentOrders: [],
      latestCustomers: [],
      lowStockProducts: [],
      statusLabels: STATUS_LABELS,
      advancedDisabled: false,
      error: 'Không thể tải dữ liệu dashboard. Vui lòng thử lại sau.',
    });
  }
};
