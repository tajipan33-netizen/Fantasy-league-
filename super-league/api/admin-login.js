const { createSession, cookieHeader, safeEqual } = require("./_admin-auth");

module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const expected = process.env.ADMIN_PASSWORD || process.env.SL_ADMIN_PASSWORD || "";
  const supplied = req.body && typeof req.body.password === "string" ? req.body.password : "";
  if (!expected || !process.env.ADMIN_SESSION_SECRET) {
    return res.status(503).json({ ok: false, error: "admin_auth_not_configured" });
  }
  if (!safeEqual(expected, supplied)) {
    return res.status(401).json({ ok: false, error: "invalid_credentials" });
  }

  res.setHeader("Set-Cookie", cookieHeader(createSession(), 8 * 60 * 60));
  return res.status(200).json({ ok: true });
};
