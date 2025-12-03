function responseFormatter(req, res, next) {
  res.success = (data = null, message = 'OK', code = 'SUCCESS') => {
    return res.json({ success: true, code, message, data });
  };
  res.error = (status = 400, code = 'ERROR', message = 'Request failed', details = null) => {
    const payload = { success: false, code, message };
    if (details) payload.details = details;
    return res.status(status).json(payload);
  };
  next();
}

module.exports = { responseFormatter };
