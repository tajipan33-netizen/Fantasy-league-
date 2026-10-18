const crypto = require('crypto');

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  const expected = process.env.SL_ADMIN_PASSWORD;
  const supplied = req.body && typeof req.body.password === 'string' ? req.body.password : '';
  if (!expected) return res.status(503).json({ ok: false, error: 'admin_password_not_configured' });
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(supplied, 'utf8');
  const match = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!match) return res.status(401).json({ ok: false });
  return res.status(200).json({ ok: true });
};
