// SUPER LEAGUE — isolated GitHub JSON storage API (v1)
// This file is intentionally separate from api/store.js. It does not read or write Supabase.
// Required Vercel environment variable: GITHUB_TOKEN (repository Contents: read/write).
// Data files live under super-league/data/collections/*.json.
// Existing data is NOT imported automatically; export/backup before switching the frontend.

const OWNER = "tajipan33-netizen";
const REPO = "Fantasy-league-";
const BRANCH = process.env.GITHUB_DATA_BRANCH || "main";
const ROOT = "super-league/data/collections";
const COLLECTIONS = new Set([
  "players", "community-posts", "community-comments", "news",
  "transfers", "team-profiles", "staff-youth", "match-stats"
]);

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.end(status === 204 ? "" : JSON.stringify(payload));
}

function decodeContent(file) {
  if (!file || !file.content) return [];
  try {
    const parsed = JSON.parse(Buffer.from(file.content, "base64").toString("utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    throw new Error("Stored JSON is invalid; refusing to overwrite it.");
  }
}

async function github(path, options = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    const error = new Error("Missing GITHUB_TOKEN environment variable in Vercel.");
    error.status = 503;
    throw error;
  }
  const response = await fetch("https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + path, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { message: text.slice(0, 300) }; }
  if (!response.ok && response.status !== 404) {
    const error = new Error(data && data.message ? data.message : "GitHub API request failed.");
    error.status = response.status;
    throw error;
  }
  return { status: response.status, data };
}

function filePath(collection) {
  return ROOT + "/" + collection + ".json";
}

async function readCollection(collection) {
  const path = filePath(collection);
  const result = await github(path + "?ref=" + encodeURIComponent(BRANCH));
  if (result.status === 404) return { rows: [], sha: null };
  return { rows: decodeContent(result.data), sha: result.data.sha || null };
}

async function writeCollection(collection, rows, sha, message) {
  const path = filePath(collection);
  const body = {
    message: message || ("SUPER LEAGUE data: update " + collection),
    branch: BRANCH,
    content: Buffer.from(JSON.stringify(rows, null, 2), "utf8").toString("base64"),
    ...(sha ? { sha } : {})
  };
  const result = await github(path, { method: "PUT", body: JSON.stringify(body) });
  if (result.status === 409 || result.status === 422) {
    const error = new Error("저장 충돌이 발생했습니다. 잠시 후 다시 시도해 주세요.");
    error.status = 409;
    throw error;
  }
  return result.data;
}

function matches(row, params) {
  for (const [key, value] of params.entries()) {
    if (["select", "order", "limit", "offset", "on_conflict"].includes(key)) continue;
    const match = key.match(/^([^.]*)\.(eq|neq|ilike|like|gt|gte|lt|lte|is|in)$/);
    if (!match) continue;
    const field = match[1], op = match[2], actual = row == null ? undefined : row[field];
    if (op === "eq" && String(actual) !== value) return false;
    if (op === "neq" && String(actual) === value) return false;
    if (op === "ilike" || op === "like") {
      const pattern = value.replace(/^\*|\*$/g, "").replace(/%/g, "").toLowerCase();
      if (!String(actual ?? "").toLowerCase().includes(pattern)) return false;
    }
    if (op === "gt" && !(actual > value)) return false;
    if (op === "gte" && !(actual >= value)) return false;
    if (op === "lt" && !(actual < value)) return false;
    if (op === "lte" && !(actual <= value)) return false;
    if (op === "is" && value === "null" && actual != null) return false;
    if (op === "in") {
      const values = value.replace(/^\(|\)$/g, "").split(",").map(v => v.replace(/^"|"$/g, ""));
      if (!values.includes(String(actual))) return false;
    }
  }
  return true;
}

const { verifySession } = require("./_admin-auth");

module.exports = async function handler(req, res) {
  const url = new URL(String(req.url || "/"), "https://vercel.local");
  const collection = String(url.searchParams.get("collection") || "").trim();
  if (!COLLECTIONS.has(collection)) return send(res, 400, { error: "Unknown collection", collection });
  const method = String(req.method || "GET").toUpperCase();
  if (method === "OPTIONS") {
    res.setHeader("Allow", "GET, POST, PATCH, DELETE, OPTIONS");
    return send(res, 204);
  }
  if (["POST", "PATCH", "DELETE"].includes(method) && !verifySession(req)) {
    return send(res, 401, { error: "관리자 로그인이 필요합니다.", login: "/admin-login.html" });
  }
  if (!["GET", "POST", "PATCH", "DELETE"].includes(method)) {
    res.setHeader("Allow", "GET, POST, PATCH, DELETE, OPTIONS");
    return send(res, 405, { error: "Method not allowed" });
  }

  try {
    const { rows: original, sha } = await readCollection(collection);
    const params = new URLSearchParams(url.search);
    params.delete("collection");

    if (method === "GET") {
      let rows = original.filter(row => matches(row, params));
      const order = params.get("order");
      if (order) {
        const [field, direction] = order.split(".");
        rows.sort((a, b) => {
          const av = a?.[field], bv = b?.[field];
          const cmp = av == null ? (bv == null ? 0 : -1) : bv == null ? 1 : String(av).localeCompare(String(bv), undefined, { numeric: true });
          return direction === "desc" ? -cmp : cmp;
        });
      }
      const offset = Math.max(0, Number(params.get("offset") || 0));
      const limit = Math.min(5000, Math.max(0, Number(params.get("limit") || 5000)));
      return send(res, 200, rows.slice(offset, offset + limit));
    }

    let body = req.body;
    if (typeof body === "string") {
      try { body = body ? JSON.parse(body) : undefined; }
      catch { return send(res, 400, { error: "Invalid JSON body" }); }
    }

    if (method === "POST") {
      const incoming = Array.isArray(body) ? body : [body];
      if (!body || incoming.some(item => !item || typeof item !== "object" || Array.isArray(item))) {
        return send(res, 400, { error: "Expected a JSON object or array." });
      }
      const updated = original.slice();
      for (const item of incoming) {
        const conflictFields = String(params.get("on_conflict") || "id").split(",").map(s => s.trim());
        const idx = updated.findIndex(existing => conflictFields.every(field => item[field] != null && String(existing[field]) === String(item[field])));
        if (idx >= 0 && String(req.headers?.prefer || "").includes("resolution=merge-duplicates")) updated[idx] = { ...updated[idx], ...item };
        else updated.push(item);
      }
      await writeCollection(collection, updated, sha);
      return send(res, 201, incoming);
    }

    const selected = original.filter(row => matches(row, params));
    if (method === "PATCH") {
      if (!body || typeof body !== "object" || Array.isArray(body)) return send(res, 400, { error: "Expected a JSON object." });
      const ids = new Set(selected.map(row => row.id));
      const updated = original.map(row => ids.has(row.id) ? { ...row, ...body } : row);
      await writeCollection(collection, updated, sha);
      return send(res, 200, updated.filter(row => ids.has(row.id)));
    }

    const ids = new Set(selected.map(row => row.id));
    const updated = original.filter(row => !ids.has(row.id));
    await writeCollection(collection, updated, sha);
    return send(res, 200, selected);
  } catch (error) {
    return send(res, error.status || 500, { error: error.message || "GitHub storage request failed." });
  }
};
