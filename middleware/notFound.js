module.exports = function notFound(req, res, _next) {
  if (req.originalUrl.startsWith('/admin/api')) {
    return res.status(404).json({ error: 'Not Found' });
  }
  res.status(404).send('404 - Not Found');
};
