const crypto = require('crypto');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const expected = process.env.SL_ADMIN_PASSWORD;
  const supplied = req.body && typeof req.body.password === 'string' ? req.body.password : '';
  const confirmation = req.body && req.body.confirm;
  if (!expected) return res.status(503).json({ ok: false, error: 'admin_password_not_configured' });
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(supplied, 'utf8');
  const match = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!match) return res.status(401).json({ ok: false, error: 'wrong_admin_password' });
  if (confirmation !== 'CLEAR') return res.status(400).json({ ok: false, error: 'confirmation_required' });

  const supabaseUrl = process.env.SUPABASE_URL || 'https://wqzgclafdorzrkawgvnx.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!serviceKey) return res.status(503).json({ ok: false, error: 'supabase_service_key_not_configured' });

  try {
    const upstream = await fetch(supabaseUrl + '/rest/v1/super_league_community_posts?id=not.is.null', {
      method: 'DELETE',
      headers: {
        apikey: serviceKey,
        Authorization: 'Bearer ' + serviceKey,
        Prefer: 'return=representation'
      }
    });
    const raw = await upstream.text();
    if (!upstream.ok) {
      return res.status(502).json({ ok: false, error: 'supabase_delete_failed', details: raw.slice(0, 300) });
    }
    let deleted = [];
    if (raw.trim()) {
      try { deleted = JSON.parse(raw); } catch (_) {}
    }
    return res.status(200).json({ ok: true, deleted: Array.isArray(deleted) ? deleted.length : 0 });
  } catch (_) {
    return res.status(502).json({ ok: false, error: 'supabase_unreachable' });
  }
};