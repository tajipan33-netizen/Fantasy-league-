// SUPER LEAGUE Supabase REST adapter.
// Uses the project's public publishable key; RLS remains enabled in Supabase.
const SUPABASE_URL = "https://itytyqeemfbgfcaqqyoq.supabase.co";
const SUPABASE_KEY = "sb_publishable_du3C3wU4-pxfmMjymhfQ2g_wycjYBF3";
const TABLES = {
  players: "super_league_players",
  "community-posts": "super_league_community_posts",
  "community-comments": "super_league_community_comments",
  news: "super_league_news",
  transfers: "super_league_transfers",
  "team-profiles": "super_league_team_profiles",
  "staff-youth": "super_league_staff_youth",
  "match-stats": "super_league_match_stats"
};

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (status === 204 || body === undefined || body === null) return res.end();
  return res.end(JSON.stringify(body));
}

function normalizeRequestUrl(input) {
  const raw = String(input || "/");
  const first = raw.indexOf("?");
  return first < 0 ? raw : raw.slice(0, first + 1) + raw.slice(first + 1).replace(/\?/g, "&");
}

function toSupabaseRecord(record, collection) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return record;
  const row = { ...record };
  if (collection === "players" && Object.prototype.hasOwnProperty.call(row, "number")) {
    row.shirt_number = String(row.number ?? "");
    delete row.number;
  }
  if (collection === "news" && Object.prototype.hasOwnProperty.call(row, "imageUrl")) {
    row.image_url = row.imageUrl || "";
    delete row.imageUrl;
  }
  return row;
}

function fromSupabaseRecord(record, collection) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return record;
  const row = { ...record };
  if (collection === "players") row.number = row.shirt_number ?? "";
  if (collection === "news") row.imageUrl = row.imageUrl || row.image_url || "";
  return row;
}

const { verifySession } = require("./_admin-auth");

module.exports = async function handler(req, res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  const url = new URL(normalizeRequestUrl(req.url), "https://vercel.local");
  const params = url.searchParams;
  // Be tolerant of malformed/legacy query strings such as
  // collection=players?select=..., which otherwise becomes an unknown collection.
  const rawCollection = String(params.get("collection") || params.get("table") || "");
  const collection = rawCollection.split("?")[0].split("&")[0].trim();
  const table = TABLES[collection];
  if (!table) return send(res, 400, { error: "Unknown collection", collection: rawCollection });
  params.delete("collection");
  params.delete("table");

  const method = String(req.method || "GET").toUpperCase();
  if (![ "GET", "POST", "PATCH", "DELETE", "OPTIONS" ].includes(method)) {
    res.setHeader("Allow", "GET, POST, PATCH, DELETE, OPTIONS");
    return send(res, 405, { error: "Method not allowed" });
  }
  if (method === "OPTIONS") {
    res.setHeader("Allow", "GET, POST, PATCH, DELETE, OPTIONS");
    return send(res, 204);
  }

  let prefer = req.headers && req.headers.prefer ? String(req.headers.prefer) : "";
  if ((method === "POST" || method === "PATCH" || method === "DELETE") && !prefer.includes("return=")) {
    prefer = [prefer, "return=minimal"].filter(Boolean).join(",");
  }
  if (method === "POST" && params.has("on_conflict") && !prefer.includes("resolution=")) {
    prefer = [prefer, "resolution=merge-duplicates"].filter(Boolean).join(",");
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = body ? JSON.parse(body) : undefined; }
    catch { return send(res, 400, { error: "Invalid JSON body" }); }
  }
  if (method === "POST" && body !== undefined) {
    body = Array.isArray(body) ? body.map(row => toSupabaseRecord(row, collection)) : toSupabaseRecord(body, collection);
  } else if (method === "PATCH" && body !== undefined) {
    body = toSupabaseRecord(body, collection);
  }

  // Team-code protected mutations for squads, club profiles, and transfers.
  if (["POST", "PATCH", "DELETE"].includes(method) && !verifySession(req)) {
    const teamCollections = ["players", "team-profiles", "transfers"];
    if (!teamCollections.includes(collection)) return send(res, 401, { error: "관리자 로그인이 필요합니다.", login: "/admin-login.html" });
    const teamCodes = ["CEL1887","BAR26X","NOT417","INTN26","VIL926","FEN1907","BLUE711","JIN204","COM026","HAM1895","HUN628","XMC894","SKY619","RYM1902","MSG527","BLEU314","KLS2026","DEL189","CHEL905","ATM732","ARS1886"];
    const supplied = String(req.headers && req.headers["x-team-code"] || "").trim().toUpperCase();
    const idx = teamCodes.indexOf(supplied);
    if (idx < 0) return send(res, 403, { error: "팀 코드가 올바르지 않습니다." });
    const row = Array.isArray(body) ? body[0] : body;
    if (collection === "players" || collection === "team-profiles") {
      const idxRaw = method === "POST" ? (row && row.team_index) : params.get("team_index");
      if (Number(idxRaw) !== idx) return send(res, 403, { error: "다른 팀 데이터는 수정할 수 없습니다." });
      if (method === "POST" && Array.isArray(body) && body.some(x => Number(x.team_index) !== idx)) {
        return send(res, 403, { error: "다른 팀 데이터는 등록할 수 없습니다." });
      }
    }
    if (collection === "transfers") {
      if (method === "POST") {
        const rows = Array.isArray(body) ? body : [body];
        if (rows.some(x => Number(x.from_team_index) !== idx && Number(x.to_team_index) !== idx)) {
          return send(res, 403, { error: "본인 구단이 보내는 구단 또는 받는 구단에 포함된 거래만 등록할 수 있습니다." });
        }
      } else {
        const idFilter = params.get("id") || "";
        const id = idFilter.startsWith("eq.") ? idFilter.slice(3) : "";
        if (!id) return send(res, 400, { error: "거래 ID가 필요합니다." });
        const checkUrl = new URL(SUPABASE_URL + "/rest/v1/" + table);
        checkUrl.searchParams.set("select", "from_team_index,to_team_index");
        checkUrl.searchParams.set("id", "eq." + id);
        const check = await fetch(checkUrl.toString(), { headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY, Accept: "application/json" } });
        const checkRows = check.ok ? await check.json() : [];
        if (!Array.isArray(checkRows) || !checkRows.length || checkRows.some(x => Number(x.from_team_index) !== idx && Number(x.to_team_index) !== idx)) {
          return send(res, 403, { error: "본인 구단이 관련된 거래만 수정하거나 삭제할 수 있습니다." });
        }
      }
    }
  }

  const target = new URL(SUPABASE_URL + "/rest/v1/" + table);
  target.search = params.toString();
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0eXR5cWVlbWZiZ2ZjYXFxeW9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MjM0MzgsImV4cCI6MjEwNzA5OTQzOH0.PeEaIXT84fEsCg-MTMi1QmH3tYORlr7d4R-6Zmv31iY",
    Accept: "application/json"
  };
  if (method === "POST" || method === "PATCH") headers["Content-Type"] = "application/json";
  if (prefer) headers.Prefer = prefer;

  try {
    const upstream = await fetch(target.toString(), {
      method,
      headers,
      ...(body !== undefined && (method === "POST" || method === "PATCH") ? { body: JSON.stringify(body) } : {})
    });
    const raw = await upstream.text();
    let data = null;
    if (raw) {
      try { data = JSON.parse(raw); }
      catch { data = { error: raw.slice(0, 500) }; }
    }
    if (!upstream.ok) {
      return send(res, upstream.status, {
        error: data && (data.message || data.error || data.hint) || ("Supabase request failed (" + upstream.status + ")"),
        code: data && data.code,
        details: data && data.details,
        hint: data && data.hint,
        table: table,
        method: method
      });
    }
    if (upstream.status === 204) return send(res, 204);
    if (Array.isArray(data)) data = data.map(row => fromSupabaseRecord(row, collection));
    else if (data && typeof data === "object") data = fromSupabaseRecord(data, collection);
    return send(res, upstream.status, data === null ? [] : data);
  } catch (error) {
    return send(res, 502, { error: error && error.message ? error.message : "Supabase connection failed" });
  }
};
