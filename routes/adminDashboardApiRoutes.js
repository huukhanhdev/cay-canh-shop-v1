const express = require('express');
const { requireLogin, requireAdmin } = require('../middleware/auth');
const {
  resolveDateRange,
  getSummaryKPIs,
  getTrendSeries,
  getStatusBreakdown,
  getProductMix,
  getCouponTable,
  getCustomerCohorts,
} = require('../services/dashboardMetrics');

const router = express.Router();

// All routes protected – mount with requireLogin + requireAdmin in app.js for redundancy.
router.use(requireLogin, requireAdmin);

function buildRangeCtx(req) {
  const { range = 'year', start, end, quarter, month, week } = req.query;
  return resolveDateRange(range, { start, end, quarter, month, week });
}

router.get('/kpis', async (req, res) => {
  try {
    const ctx = buildRangeCtx(req);
    const data = await getSummaryKPIs(ctx);
    res.json(data);
  } catch (err) {
    console.error('KPIs error:', err);
    res.status(500).json({ error: 'Unable to load KPIs' });
  }
});

router.get('/trends', async (req, res) => {
  try {
    const ctx = buildRangeCtx(req);
    const data = await getTrendSeries(ctx);
    res.json(data);
  } catch (err) {
    console.error('Trends error:', err);
    res.status(500).json({ error: 'Unable to load trend series' });
  }
});

router.get('/status-breakdown', async (req, res) => {
  try {
    const ctx = buildRangeCtx(req);
    const data = await getStatusBreakdown(ctx);
    res.json(data);
  } catch (err) {
    console.error('Status breakdown error:', err);
    res.status(500).json({ error: 'Unable to load status breakdown' });
  }
});

router.get('/product-mix', async (req, res) => {
  try {
    const ctx = buildRangeCtx(req);
    const data = await getProductMix(ctx);
    res.json(data);
  } catch (err) {
    console.error('Product mix error:', err);
    res.status(500).json({ error: 'Unable to load product mix' });
  }
});

router.get('/coupons', async (req, res) => {
  try {
    const ctx = buildRangeCtx(req);
    const data = await getCouponTable(ctx);
    res.json(data);
  } catch (err) {
    console.error('Coupon table error:', err);
    res.status(500).json({ error: 'Unable to load coupon data' });
  }
});

router.get('/cohorts', async (req, res) => {
  try {
    const ctx = buildRangeCtx(req);
    const data = await getCustomerCohorts(ctx);
    res.json(data);
  } catch (err) {
    console.error('Customer cohorts error:', err);
    res.status(500).json({ error: 'Unable to load cohort data' });
  }
});

module.exports = router;
