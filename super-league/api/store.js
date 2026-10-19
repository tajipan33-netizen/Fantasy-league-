// Vercel Serverless Function: GitHub-backed JSON storage.
// Required Vercel env vars: GITHUB_TOKEN (repo Contents read/write), SL_DATA_KEY (private write key).
// GET /api/store?collection=players reads super-league/data/<collection>.json
// POST /api/store?collection=players replaces the collection; send { "key": "...", "data": [...] }.
// Keep GITHUB_TOKEN server-side only. Never expose it to browser code.
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
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": "Bearer " + process.env.GITHUB_TOKEN,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {})
    }
  });
  const text = await r.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch {}
  if (!r.ok) {
    const error = new Error(data.message || "GitHub storage request failed");
    error.status = r.status;
    throw error;
  }
  return data;
}
module.exports = async function handler(req, res) {
  const collection = String(req.query.collection || "");
  if (!ALLOWED.has(collection)) return send(res, 400, { error: "Unknown collection" });
  if (!process.env.GITHUB_TOKEN) return send(res, 503, { error: "GitHub storage is not configured. Add GITHUB_TOKEN in Vercel." });
  const path = "super-league/data/" + collection + ".json";
  try {
    if (req.method === "GET") {
      try {
        const file = await github(path);
        const decoded = Buffer.from(file.content || "", "base64").toString("utf8");
        return send(res, 200, JSON.parse(decoded || "[]"));
      } catch (e) {
        if (e.status === 404) return send(res, 200, []);
        throw e;
      }
    }
    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return send(res, 405, { error: "Method not allowed" });
    }
    if (!process.env.SL_DATA_KEY || req.headers["x-sl-data-key"] !== process.env.SL_DATA_KEY) {
      return send(res, 401, { error: "Unauthorized" });
    }
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
    if (!body || !Array.isArray(body.data)) return send(res, 400, { error: "Body must contain a data array" });
    let sha;
    try { sha = (await github(path)).sha; } catch (e) { if (e.status !== 404) throw e; }
    const encoded = Buffer.from(JSON.stringify(body.data, null, 2) + "\n", "utf8").toString("base64");
    const saved = await github(path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Update SUPER LEAGUE data: " + collection,
        content: encoded,
        branch: BRANCH,
        ...(sha ? { sha } : {})
      })
    });
    return send(res, 200, { ok: true, collection, commit: saved.commit && saved.commit.sha });
  } catch (e) {
    return send(res, e.status || 500, { error: e.message || "Storage error" });
  }
};