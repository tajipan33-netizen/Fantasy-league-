const crypto = require('crypto');
const OWNER = "tajipan33-netizen";
const REPO = "Fantasy-league-";
const BRANCH = "main";
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok:false, error:'method_not_allowed' }); }
  const expected = process.env.SL_ADMIN_PASSWORD;
  const supplied = req.body && typeof req.body.password === 'string' ? req.body.password : '';
  if (!expected) return res.status(503).json({ ok:false, error:'admin_password_not_configured' });
  const a=Buffer.from(expected,'utf8'), b=Buffer.from(supplied,'utf8');
  if (!(a.length===b.length && crypto.timingSafeEqual(a,b))) return res.status(401).json({ok:false,error:'wrong_admin_password'});
  if (!req.body || req.body.confirm !== 'CLEAR') return res.status(400).json({ok:false,error:'confirmation_required'});
  if (!process.env.GITHUB_TOKEN) return res.status(503).json({ok:false,error:'github_token_not_configured'});
  async function github(path, options={}) {
    const r=await fetch('https://api.github.com/repos/'+OWNER+'/'+REPO+'/contents/'+path,{...options,headers:{'Accept':'application/vnd.github+json','Authorization':'Bearer '+process.env.GITHUB_TOKEN,'X-GitHub-Api-Version':'2022-11-28',...(options.headers||{})}});
    const raw=await r.text();let data={};try{data=raw?JSON.parse(raw):{}}catch{}
    if(!r.ok) throw new Error(data.message||('GitHub API error '+r.status));
    return data;
  }
  try {
    let deleted=0;
    for (const collection of ['community-posts','community-comments']) {
      const path='super-league/data/'+collection+'.json';
      const file=await github(path);
      const rows=JSON.parse(Buffer.from(file.content||'','base64').toString('utf8')||'[]');
      deleted+=Array.isArray(rows)?rows.length:0;
      await github(path,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Clear SUPER LEAGUE community data',content:Buffer.from('[]\n','utf8').toString('base64'),sha:file.sha,branch:BRANCH})});
    }
    return res.status(200).json({ok:true,deleted});
  } catch(e) { return res.status(502).json({ok:false,error:'github_storage_clear_failed',details:e.message}); }
};