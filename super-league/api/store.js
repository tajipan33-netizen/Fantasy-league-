// GitHub-backed JSON store for the SUPER LEAGUE static app.
// Vercel environment variable required: GITHUB_TOKEN (repo Contents read/write).
// GitHub token remains server-side; never put it in browser code.
const OWNER = "tajipan33-netizen";
const REPO = "Fantasy-league-";
const BRANCH = "main";
const ALLOWED = new Set(["players","community-posts","community-comments","news","transfers","team-profiles","staff-youth","match-stats"]);
function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}
async function github(path, options = {}) {
  const r = await fetch("https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + path, {
    ...options,
    headers: {"Accept":"application/vnd.github+json","Authorization":"Bearer "+process.env.GITHUB_TOKEN,"X-GitHub-Api-Version":"2022-11-28",...(options.headers||{})}
  });
  const text = await r.text(); let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch {}
  if (!r.ok) { const e = new Error(data.message || "GitHub storage request failed"); e.status = r.status; throw e; }
  return data;
}
async function read(path) {
  try {
    const file = await github(path);
    return { rows: JSON.parse(Buffer.from(file.content || "", "base64").toString("utf8") || "[]"), sha:file.sha };
  } catch (e) { if (e.status === 404) return {rows:[],sha:null}; throw e; }
}
async function write(path, rows, sha, collection) {
  const encoded = Buffer.from(JSON.stringify(rows, null, 2) + "\n", "utf8").toString("base64");
  return github(path, {method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({
    message:"Update SUPER LEAGUE data: "+collection, content:encoded, branch:BRANCH, ...(sha?{sha}:{})
  })});
}
function matches(row, params) {
  for (const [key, raw] of params.entries()) {
    if (["collection","select","order","limit","offset","on_conflict","Prefer"].includes(key)) continue;
    const match = raw.match(/^(eq|neq|gt|gte|lt|lte|is|in)\.(.*)$/);
    if (!match) continue;
    const op=match[1], val=match[2], actual=row[key];
    if(op==="eq" && String(actual)!==val) return false;
    if(op==="neq" && String(actual)===val) return false;
    if(op==="is" && val==="null" && actual!=null) return false;
    if(op==="gt" && !(actual>val)) return false;
    if(op==="gte" && !(actual>=val)) return false;
    if(op==="lt" && !(actual<val)) return false;
    if(op==="lte" && !(actual<=val)) return false;
    if(op==="in") { const vals=val.replace(/^\(|\)$/g,"").split(",").map(x=>x.replace(/^"|"$/g,"")); if(!vals.includes(String(actual))) return false; }
  }
  return true;
}
module.exports = async function handler(req,res) {
  // Some existing static pages append filters with a second "?" to a URL
  // that already contains ?collection=... . Normalize those to "&" so all
  // filters (select/order/id/etc.) are parsed instead of corrupting collection.
  const rawUrl = String(req.url || "/");
  const firstQuery = rawUrl.indexOf("?");
  const normalizedUrl = firstQuery < 0
    ? rawUrl
    : rawUrl.slice(0, firstQuery + 1) + rawUrl.slice(firstQuery + 1).replace(/\?/g, "&");
  const url = new URL(normalizedUrl, "https://vercel.local");
  const params = url.searchParams;
  const collection = String(params.get("collection") || "");
  if (!ALLOWED.has(collection)) return send(res,400,{error:"Unknown collection"});
  if (!process.env.GITHUB_TOKEN) return send(res,503,{error:"GitHub storage is not configured. Add GITHUB_TOKEN in Vercel Environment Variables, then redeploy."});
  const path="super-league/data/"+collection+".json";
  try {
    const {rows:original,sha}=await read(path);
    if(!Array.isArray(original)) throw new Error("Stored collection is not an array");
    if(req.method==="GET") {
      let rows=original.filter(r=>matches(r,params));
      const order=params.get("order");
      if(order) for(const part of order.split(",").reverse()) {
        const [key,dir]=part.split(".");
        rows.sort((a,b)=>a[key]==null?1:b[key]==null?-1:(a[key]<b[key]?-1:a[key]>b[key]?1:0)*(dir==="desc"?-1:1));
      }
      const offset=Math.max(0,Number(params.get("offset"))||0);
      const limit=Math.min(1000,Math.max(0,Number(params.get("limit"))||1000));
      rows=rows.slice(offset,offset+limit);
      const select=params.get("select");
      if(select && select!=="*") { const fields=select.split(","); rows=rows.map(r=>Object.fromEntries(fields.filter(f=>Object.prototype.hasOwnProperty.call(r,f)).map(f=>[f,r[f]]))); }
      return send(res,200,rows);
    }
    let body=req.body;
    if(typeof body==="string"){try{body=JSON.parse(body)}catch{body=null}}
    if(req.method==="POST") {
      const incoming=Array.isArray(body)?body:[body];
      if(!body || !incoming.length || incoming.some(x=>!x||typeof x!=="object"||Array.isArray(x))) return send(res,400,{error:"Invalid JSON record"});
      if(original.length+incoming.length>5000) return send(res,413,{error:"Collection limit reached"});
      const now=new Date().toISOString();
      const records=incoming.map((x,i)=>({...x,id:x.id??(Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9)+"-"+i),created_at:x.created_at||now,updated_at:x.updated_at||now}));
      let next=original;
      const conflict=params.get("on_conflict");
      if(conflict) {
        next=[...original];
        for(const record of records) { const index=next.findIndex(r=>String(r[conflict])===String(record[conflict])); if(index>=0) next[index]={...next[index],...record}; else next.push(record); }
      } else next=[...original,...records];
      await write(path,next,sha,collection);
      return send(res,200,records);
    }
    if(req.method==="PATCH") {
      if(!body||typeof body!=="object"||Array.isArray(body)) return send(res,400,{error:"Invalid update"});
      const next=original.map(r=>matches(r,params)?{...r,...body,updated_at:new Date().toISOString()}:r);
      await write(path,next,sha,collection);
      return send(res,200,next.filter(r=>matches(r,params)));
    }
    if(req.method==="DELETE") {
      const removed=original.filter(r=>matches(r,params));
      const next=original.filter(r=>!matches(r,params));
      await write(path,next,sha,collection);
      return send(res,200,removed);
    }
    res.setHeader("Allow","GET, POST, PATCH, DELETE");
    return send(res,405,{error:"Method not allowed"});
  } catch(e) { return send(res,e.status||500,{error:e.message||"GitHub storage error"}); }
};