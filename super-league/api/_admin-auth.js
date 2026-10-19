// Server-side SUPER LEAGUE admin session helper. Never put these secrets in browser code.
const crypto = require("crypto");
const COOKIE = "sl_admin_session";
const MAX_AGE_SECONDS = 8 * 60 * 60;

function secret() {
  return process.env.ADMIN_SESSION_SECRET || "";
}
function sign(value) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}
function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
function parseCookies(header) {
  return Object.fromEntries(String(header || "").split(";").map(part => {
    const i = part.indexOf("=");
    return i < 0 ? [part.trim(), ""] : [part.slice(0, i).trim(), decodeURIComponent(part.slice(i + 1).trim())];
  }));
}
function createSession() {
  const value = String(Date.now());
  return value + "." + sign(value);
}
function verifySession(req) {
  if (!secret()) return false;
  const token = parseCookies(req.headers && req.headers.cookie)[COOKIE] || "";
  const parts = token.split(".");
  if (parts.length !== 2 || !/^\d{13}$/.test(parts[0])) return false;
  const issued = Number(parts[0]);
  if (!Number.isFinite(issued) || Date.now() - issued > MAX_AGE_SECONDS * 1000 || issued > Date.now() + 60_000) return false;
  return safeEqual(parts[1], sign(parts[0]));
}
function cookieHeader(value, maxAge) {
  return COOKIE + "=" + encodeURIComponent(value || "") + "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=" + maxAge;
}
module.exports = { COOKIE, MAX_AGE_SECONDS, createSession, verifySession, cookieHeader, safeEqual };
