require('dotenv').config();

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { passport, isGoogleEnabled } = require('./config/passport');
const { requireLogin, requireAdmin, exposeUser } = require('./middleware/auth');
const authRoutes = require('./routes/authRoutes');
const shopRoutes = require('./routes/shopRoutes');
const cartRoutes = require('./routes/cartRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');
const orderRoutes = require('./routes/orderRoutes');
const accountRoutes = require('./routes/accountRoutes');
const adminProductRoutes = require('./routes/adminProductRoutes');
const adminOrderRoutes = require('./routes/adminOrderRoutes');
const adminCustomerRoutes = require('./routes/adminCustomerRoutes');
const adminCommentRoutes = require('./routes/adminCommentRoutes');
const adminDashboardController = require('./controllers/adminDashboardController');
const Product = require('./models/Product');
const Category = require('./models/Category');
const runAllSeeds = require('./helpers/seedData');

const FEATURE_SECTIONS = {
  customer: [
    {
      title: 'Giỏ hàng thông minh',
      desc: 'Giữ sản phẩm yêu thích trong giỏ, chỉnh sửa số lượng nhanh chóng trước khi thanh toán.',
    },
    {
      title: 'Thanh toán an toàn',
      desc: 'Xác thực OTP, theo dõi trạng thái đơn hàng theo từng bước giao hàng.',
    },
    {
      title: 'Đánh giá & tích điểm',
      desc: 'Chia sẻ cảm nhận, nhận điểm thưởng và đổi ưu đãi dành riêng cho thành viên.',
    },
  ],
  admin: [
    {
      title: 'Quản trị sản phẩm',
      desc: 'Tạo, chỉnh sửa, phân loại sản phẩm chỉ với vài cú click ngay trên dashboard.',
    },
    {
      title: 'Theo dõi đơn hàng',
      desc: 'Cập nhật trạng thái đơn hàng theo thời gian thực và chủ động xử lý giao vận.',
    },
    {
      title: 'Phân tích doanh thu',
      desc: 'Nắm bắt doanh thu, số lượng đơn, sản phẩm bán chạy để đưa ra quyết định kịp thời.',
    },
  ],
};

const FEATURED_CATEGORY_SLUGS = [
  { slug: 'cay-canh-mini', title: 'Cây cảnh mini' },
  { slug: 'cay-nhiet-doi', title: 'Cây nhiệt đới' },
  { slug: 'chau-dat-nung', title: 'Chậu đất nung' },
];

const http = require('http');
const { Server } = require('socket.io');
const { setIO } = require('./helpers/socket');

const app = express();
const PORT = process.env.PORT || 4000;

// view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// parser & static
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// session
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/caycanhshop',
    collectionName: 'sessions',
  }),
  cookie: { maxAge: 24 * 60 * 60 * 1000 },
}));

app.use((req, res, next) => {
  res.locals.msg = req.query.msg || null;
  res.locals.error = null;
  res.locals.info = null;
  res.locals.googleAuthEnabled = isGoogleEnabled;
  next();
});

app.use(passport.initialize());

// gắn biến cho header (phải đặt trước các route render view)
app.use(exposeUser);

app.use('/auth', authRoutes);
app.use('/shop', shopRoutes);
app.use('/cart', cartRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/orders', requireLogin, orderRoutes);
app.use('/account', requireLogin, accountRoutes);

app.get('/admin/dashboard', requireLogin, requireAdmin, adminDashboardController.overview);
app.use('/admin/products', requireLogin, requireAdmin, adminProductRoutes);
app.use('/admin/orders', requireLogin, requireAdmin, adminOrderRoutes);
app.use('/admin/customers', requireLogin, requireAdmin, adminCustomerRoutes);
app.use('/admin/comments', requireLogin, requireAdmin, adminCommentRoutes);

// landing page
app.get('/', async (_req, res) => {
  try {
    const [bestSellers, latestProducts] = await Promise.all([
      Product.find().sort({ soldCount: -1, createdAt: -1 }).limit(8).lean(),
      Product.find().sort({ createdAt: -1 }).limit(8).lean(),
    ]);

    const categories = await Category.find({
      slug: { $in: FEATURED_CATEGORY_SLUGS.map((c) => c.slug) },
    }).lean();

    const categorySections = [];
    for (const cfg of FEATURED_CATEGORY_SLUGS) {
      const category = categories.find((cat) => cat.slug === cfg.slug);
      if (!category) continue;
      const products = await Product.find({ categoryID: category._id })
        .sort({ createdAt: -1 })
        .limit(6)
        .lean();
      categorySections.push({
        title: cfg.title || category.name,
        slug: cfg.slug,
        products,
      });
    }

    res.render('landing', {
      title: 'Cây Cảnh Shop',
      customerFeatures: FEATURE_SECTIONS.customer,
      latestProducts,
      bestSellers,
      categorySections,
    });
  } catch (err) {
    console.error('Landing page error:', err);
    res.render('landing', {
      title: 'Cây Cảnh Shop',
      customerFeatures: FEATURE_SECTIONS.customer,
      latestProducts: [],
      bestSellers: [],
      categorySections: [],
    });
  }
});

// routes auth không prefix (giữ tương thích /login,...)
app.use('/', authRoutes);

// connect DB & start
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/caycanhshop')
  .then(async () => {
    console.log('✅ MongoDB connected');
    await runAllSeeds();
    await normalizeProductTypes();

    const server = http.createServer(app);
    const io = new Server(server, { cors: { origin: '*' } });
    setIO(io);

    io.on('connection', (socket) => {
      // optional: handle room joins in future
      // console.log('Socket connected:', socket.id);
    });

    server.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
  })
  .catch((err) => console.error('Mongo error:', err.message));

async function normalizeProductTypes() {
  try {
    const invalidProducts = await Product.find({
      type: { $nin: ['indoor', 'outdoor', 'pot'] },
    }).populate('categoryID');

    if (!invalidProducts.length) return;

    for (const product of invalidProducts) {
      const normalizedType = product.categoryID?.productType || 'indoor';
      product.type = normalizedType;
      await product.save();
    }

    console.log(`🌿 Đã chuẩn hóa ${invalidProducts.length} sản phẩm về loại hợp lệ.`);
  } catch (err) {
    console.error('Normalize product type error:', err);
  }
}
