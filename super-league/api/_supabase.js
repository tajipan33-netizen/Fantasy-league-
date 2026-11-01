const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://fdszmpirncjkznjciikz.supabase.co";
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "";
async function db(table, query="", options={}) {
  if (!KEY) throw new Error("Supabase publishable key is not configured");
  const url = new URL(URL + "/rest/v1/" + table);
  if (query) url.search = query.startsWith("?") ? query.slice(1) : query;
  const headers = { apikey: KEY, Authorization: "Bearer " + KEY, Accept: "application/json", ...(options.headers || {}) };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(url.toString(), { method: options.method || "GET", headers, ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}) });
  const raw = await response.text();
  let data = null;
  if (raw) { try { data = JSON.parse(raw); } catch { data = { message: raw.slice(0, 300) }; } }
  if (!response.ok) { const e = new Error((data && (data.message || data.error || data.hint)) || ("Database request failed (" + response.status + ")")); e.status=response.status; e.details=data; throw e; }
  return data;
}
function send(res, status, payload) {
  res.statusCode=status; res.setHeader("Content-Type","application/json; charset=utf-8"); res.setHeader("Cache-Control","no-store"); res.setHeader("X-Content-Type-Options","nosniff");
  if(status===204)return res.end(); return res.end(JSON.stringify(payload));
}
function jsonBody(req){ if(req.body && typeof req.body==="object")return req.body; if(typeof req.body==="string"){try{return JSON.parse(req.body)}catch{}} return {}; }
const TEAM_CODES=["CEL1887","BAR26X","NOT417","INTN26","VIL926","FEN1907","BLUE711","JIN204","COM026","HAM1895","HUN628","XMC894","SKY619","RYM1902","MSG527","BLEU314","KLS2026","DEL189","CHEL905","ATM732","ARS1886"];
function teamIndexFromCode(req){
  const configured=process.env.TEAM_CODES_JSON;
  if(!configured)return -1;
  try {
    const codes=JSON.parse(configured);
    if(!Array.isArray(codes))return -1;
    const normalized=codes.map(x=>String(x||"").trim().toUpperCase());
    const supplied=String(req.headers["x-team-code"]||"").trim().toUpperCase();
    return normalized.indexOf(supplied);
  } catch { return -1; }
}
function isAdmin(req){const {verifySession}=require("./_admin-auth");return verifySession(req);}
function authTeam(req,res,club){
  if(isAdmin(req))return {admin:true,index:null};
  const idx=teamIndexFromCode(req);
  if(idx<0){send(res,403,{error:"팀 코드 인증이 설정되지 않았거나 올바르지 않습니다."});return null;}
  if(club && Number(club.team_index)!==idx){send(res,403,{error:"본인 구단 데이터만 수정할 수 있습니다."});return null;}
  return {admin:false,index:idx};
}
module.exports={URL,KEY,db,send,jsonBody,teamIndexFromCode,isAdmin,authTeam};