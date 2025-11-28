// services/dashboardMetrics.js
// Advanced dashboard metrics implementation with basic in-memory caching.

const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');

// Simple TTL cache (in-memory). In production consider Redis.
const cache = new Map();
const DEFAULT_TTL_MS = 60 * 1000; // 60s

function setCache(key, value, ttl = DEFAULT_TTL_MS) {
  cache.set(key, { value, expires: Date.now() + ttl });
}

function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

// Resolve date range & granularity based on requested range type.
function resolveDateRange(range = 'year', params = {}) {
  const now = new Date();
  let startDate; let endDate; let granularity = 'month';

  if (range === 'year') {
    startDate = new Date(now.getFullYear(), 0, 1);
    endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    granularity = 'month';
  } else if (range === 'quarter') {
    const q = Math.min(Math.max(Number(params.quarter) || Math.floor(now.getMonth() / 3) + 1, 1), 4);
    const startMonth = (q - 1) * 3;
    startDate = new Date(now.getFullYear(), startMonth, 1);
    endDate = new Date(now.getFullYear(), startMonth + 3, 0, 23, 59, 59, 999);
    granularity = 'week';
  } else if (range === 'month') {
    const month = Math.min(Math.max(Number(params.month) || now.getMonth(), 0), 11);
    startDate = new Date(now.getFullYear(), month, 1);
    endDate = new Date(now.getFullYear(), month + 1, 0, 23, 59, 59, 999);
    granularity = 'day';
  } else if (range === 'week') {
    const target = params.week ? new Date(params.week) : now;
    const day = target.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(target.getFullYear(), target.getMonth(), target.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    startDate = monday;
    endDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
    granularity = 'day';
  } else if (range === 'custom') {
    const start = params.start ? new Date(params.start) : new Date(now.getFullYear(), 0, 1);
    const end = params.end ? new Date(params.end) : now;
    startDate = start;
    endDate = end;
    const spanDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    granularity = spanDays <= 31 ? 'day' : spanDays <= 180 ? 'week' : 'month';
  } else {
    startDate = new Date(now.getFullYear(), 0, 1);
    endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    granularity = 'month';
  }
  return { range, startDate, endDate, granularity };
}

function buildMatch(rangeCtx) {
  return { createdAt: { $gte: rangeCtx.startDate, $lte: rangeCtx.endDate } };
}

// KPI summary: revenue & orders (status != canceled), avg order value, conversion rate.
async function getSummaryKPIs(rangeCtx) {
  const key = `kpis:${JSON.stringify(rangeCtx)}`;
  const cached = getCache(key);
  if (cached) return cached;

  const match = buildMatch(rangeCtx);
  match.status = { $ne: 'canceled' };

  const [agg, distinctCustomers] = await Promise.all([
    Order.aggregate([
      { $match: match },
      { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' }, totalOrders: { $sum: 1 } } },
    ]),
    Order.distinct('userID', match),
  ]);

  const k = agg[0] || { totalRevenue: 0, totalOrders: 0 };
  const avgOrderValue = k.totalOrders > 0 ? Number((k.totalRevenue / k.totalOrders).toFixed(2)) : 0;
  const conversionRate = distinctCustomers.length > 0 ? Number((k.totalOrders / distinctCustomers.length).toFixed(2)) : 0;

  const result = {
    context: rangeCtx,
    totalRevenue: k.totalRevenue || 0,
    totalOrders: k.totalOrders || 0,
    avgOrderValue,
    conversionRate,
  };
  setCache(key, result);
  return result;
}

// Trend series grouped by granularity.
async function getTrendSeries(rangeCtx) {
  const key = `trends:${JSON.stringify(rangeCtx)}`;
  const cached = getCache(key);
  if (cached) return cached;

  const match = buildMatch(rangeCtx);
  match.status = { $ne: 'canceled' };

  // Determine date format for buckets if $dateTrunc not available.
  let dateFormat = '%Y-%m';
  if (rangeCtx.granularity === 'week') dateFormat = '%Y-%m-%d'; // We'll convert week start days
  if (rangeCtx.granularity === 'day') dateFormat = '%Y-%m-%d';

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
        orders: { $sum: 1 },
        revenue: { $sum: '$totalPrice' },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const raw = await Order.aggregate(pipeline);
  const points = raw.map((r) => ({ bucket: r._id, orders: r.orders, revenue: r.revenue, profit: null }));
  const result = { context: rangeCtx, granularity: rangeCtx.granularity, points };
  setCache(key, result);
  return result;
}

async function getStatusBreakdown(rangeCtx) {
  const key = `status:${JSON.stringify(rangeCtx)}`;
  const cached = getCache(key);
  if (cached) return cached;
  const match = buildMatch(rangeCtx);
  const pipeline = [
    { $match: match },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ];
  const rows = await Order.aggregate(pipeline);
  const statuses = rows.map((r) => ({ status: r._id, count: r.count }));
  const result = { context: rangeCtx, statuses };
  setCache(key, result);
  return result;
}

async function getProductMix(rangeCtx) {
  const key = `mix:${JSON.stringify(rangeCtx)}`;
  const cached = getCache(key);
  if (cached) return cached;
  const match = buildMatch(rangeCtx);
  match.status = { $ne: 'canceled' };
  const pipeline = [
    { $match: match },
    { $unwind: '$items' },
    { $group: { _id: '$items.productID', quantity: { $sum: '$items.quantity' } } },
    { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    { $group: { _id: '$product.type', quantity: { $sum: '$quantity' } } },
    { $sort: { quantity: -1 } },
  ];
  const raw = await Order.aggregate(pipeline);
  const items = raw.map((r) => ({ label: r._id || 'unknown', quantity: r.quantity }));
  const result = { context: rangeCtx, items };
  setCache(key, result);
  return result;
}

async function getCouponTable(rangeCtx) {
  const key = `coupons:${JSON.stringify(rangeCtx)}`;
  const cached = getCache(key);
  if (cached) return cached;
  const match = buildMatch(rangeCtx);
  match.couponID = { $ne: null };
  const pipeline = [
    { $match: match },
    { $group: { _id: '$couponID', usage: { $sum: 1 }, totalDiscount: { $sum: '$discount' }, revenueImpact: { $sum: '$totalPrice' } } },
    { $lookup: { from: 'coupons', localField: '_id', foreignField: '_id', as: 'coupon' } },
    { $unwind: { path: '$coupon', preserveNullAndEmptyArrays: true } },
    { $sort: { usage: -1 } },
  ];
  const rowsAgg = await Order.aggregate(pipeline);
  const rows = rowsAgg.map((r) => ({
    code: r.coupon?.code || 'N/A',
    usage: r.usage,
    maxUsage: r.coupon?.maxUsage || null,
    totalDiscount: r.totalDiscount || 0,
    revenueImpact: r.revenueImpact || 0,
  }));
  const result = { context: rangeCtx, rows };
  setCache(key, result);
  return result;
}

async function getCustomerCohorts(rangeCtx) {
  const key = `cohorts:${JSON.stringify(rangeCtx)}`;
  const cached = getCache(key);
  if (cached) return cached;
  const match = buildMatch(rangeCtx);
  const allUserOrders = await Order.aggregate([
    { $match: { status: { $ne: 'canceled' } } },
    { $group: { _id: '$userID', firstOrderDate: { $min: '$createdAt' } } },
  ]);
  const inRangeOrders = await Order.aggregate([
    { $match: { status: { $ne: 'canceled' }, createdAt: { $gte: rangeCtx.startDate, $lte: rangeCtx.endDate } } },
    { $group: { _id: '$userID', orders: { $sum: 1 }, firstOrderDateInRange: { $min: '$createdAt' } } },
  ]);

  const firstOrderMap = allUserOrders.reduce((acc, u) => { acc[u._id?.toString()] = u.firstOrderDate; return acc; }, {});
  let newCustomers = 0; let returningCustomers = 0;
  inRangeOrders.forEach((row) => {
    const id = row._id?.toString();
    const firstEver = firstOrderMap[id];
    if (firstEver && firstEver >= rangeCtx.startDate && firstEver <= rangeCtx.endDate) newCustomers += 1; else returningCustomers += 1;
  });
  const result = { context: rangeCtx, newCustomers, returningCustomers };
  setCache(key, result);
  return result;
}

module.exports = {
  resolveDateRange,
  getSummaryKPIs,
  getTrendSeries,
  getStatusBreakdown,
  getProductMix,
  getCouponTable,
  getCustomerCohorts,
};
