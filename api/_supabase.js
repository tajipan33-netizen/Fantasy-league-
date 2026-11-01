const URL = process.env.SUPABASE_URL || "https://fdszmpirncjkznjciikz.supabase.co";
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "";
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
const TEAMS = [
"셀틱FC","FC BARCELONA","노팅엄 실험실","마레스카나치오날레(인테르+뉴캐슬)","알 빌라 AL VILLA",
"알네르바체","ASK로마사라이","진석축구단","코모쿠젠","해머스","헌라페FC","xmc_1894",
"SKY CITY","Royal York Madrid","MSG","Les Bleus","FC Der Klassiker","본덜랜드","Chelsea","Atletico Milan","아스날FC"
];
const CODE_ENV = "TEAM_CODES_JSON";
function getTeamCodes(){
  const raw=process.env[CODE_ENV] || "";
  if(!raw) return [];
  try { const parsed=JSON.parse(raw); return Array.isArray(parsed)?parsed.map(x=>String(x||"").trim().toUpperCase()):[]; } catch { return []; }
}
function teamIndexFromCode(req){
  const supplied=String(req.headers["x-team-code"]||"").trim().toUpperCase();
  const codes=getTeamCodes(); const idx=codes.indexOf(supplied);
  return idx>=0 && idx<TEAMS.length ? idx : -1;
}
function isAdmin(req){
  const { verifySession }=require("./_admin-auth");
  return verifySession(req);
}
function requireTeamOrAdmin(req,res,body,clubId){
  if(isAdmin(req)) return { admin:true, teamIndex:null };
  const idx=teamIndexFromCode(req);
  if(idx<0){send(res,403,{error:"올바른 팀 코드가 필요합니다. Vercel TEAM_CODES_JSON 설정을 확인하세요."});return null;}
  if(body && body.club_id && clubId && body.club_id!==clubId){send(res,403,{error:"요청 구단이 일치하지 않습니다."});return null;}
  return {admin:false,teamIndex:idx};
}
module.exports={URL,KEY,db,send,jsonBody,TEAMS,teamIndexFromCode,isAdmin,requireTeamOrAdmin};