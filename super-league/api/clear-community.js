const crypto = require('crypto');
const SUPABASE_URL = "https://itytyqeemfbgfcaqqyoq.supabase.co";
const SUPABASE_KEY = "sb_publishable_du3C3wU4-pxfmMjymhfQ2g_wycjYBF3";

module.exports = async (req, res) => {
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
  if (!match) return res.status(401).json({ ok: false, error: 'wrong_admin_password' });
  if (!req.body || req.body.confirm !== 'CLEAR') return res.status(400).json({ ok: false, error: 'confirmation_required' });

  async function removeAll(table) {
    const response = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?id=gte.0', {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: 'Bearer ' + SUPABASE_KEY,
        Prefer: 'return=representation'
      }
    });
    const raw = await response.text();
    let data = [];
    try { data = raw ? JSON.parse(raw) : []; } catch {}
    if (!response.ok) throw new Error((data && (data.message || data.error)) || ('Supabase request failed (' + response.status + ')'));
    return Array.isArray(data) ? data.length : 0;
  }

  try {
    const deletedComments = await removeAll('super_league_community_comments');
    const deletedPosts = await removeAll('super_league_community_posts');
    return res.status(200).json({ ok: true, deleted: deletedComments + deletedPosts });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: 'supabase_storage_clear_failed',
      details: error && error.message ? error.message : 'Unknown Supabase error'
    });
  }
};
