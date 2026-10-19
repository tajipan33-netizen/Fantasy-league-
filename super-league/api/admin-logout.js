const { COOKIE, cookieHeader } = require("./_admin-auth");
module.exports = function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.statusCode = 405; res.setHeader("Allow", "POST"); return res.end(JSON.stringify({error:"Method not allowed"})); }
  res.setHeader("Set-Cookie", cookieHeader("", 0));
  res.statusCode = 200;
  return res.end(JSON.stringify({ok:true}));
};
