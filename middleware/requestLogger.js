module.exports = function requestLogger(req, res, next) {
  const start = Date.now();
  const { method, originalUrl } = req;
  res.on('finish', () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    console.log(`${method} ${originalUrl} -> ${status} ${ms}ms`);
  });
  next();
};
