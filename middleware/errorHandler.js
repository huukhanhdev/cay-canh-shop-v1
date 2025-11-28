module.exports = function errorHandler(err, req, res, _next) {
  console.error('Unhandled error:', err);
  const status = err.status || 500;
  if (req.originalUrl.startsWith('/admin/api')) {
    return res.status(status).json({ error: err.message || 'Internal Server Error' });
  }
  res.status(status).send('Đã xảy ra lỗi. Vui lòng thử lại sau.');
};
