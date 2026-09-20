const crypto = require("crypto");

function supabaseUrl() {
  return process.env.SCOUTING_SUPABASE_URL || "https://knoudnzjnfkfhiizgcna.supabase.co";
}
function serviceKey() {
  return process.env.SCOUTING_SUPABASE_SERVICE_ROLE_KEY || "";
}
function adminKey() {
  return process.env.SCOUTING_ADMIN_KEY || "";
}

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  if (!left.length || left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function newToken() {
  return crypto.randomBytes(9).toString("base64url");
}

async function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

function requireEnv() {
  if (!serviceKey()) {
    const err = new Error("尚未設定 SCOUTING_SUPABASE_SERVICE_ROLE_KEY");
    err.status = 503;
    throw err;
  }
}

async function sb(path, { method = "GET", query = "", body, headers = {} } = {}) {
  requireEnv();
  const url = `${supabaseUrl()}/rest/v1/${path}${query ? `?${query}` : ""}`;
  const res = await fetch(url, {
    method,
    headers: {
      apikey: serviceKey(),
      Authorization: `Bearer ${serviceKey()}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...headers,
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    const message = (data && (data.message || data.error || data.hint)) || text || `Supabase ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function getProjectByToken(token) {
  if (!token) {
    const err = new Error("缺少專案連結");
    err.status = 400;
    throw err;
  }
  const rows = await sb("scouting_projects", {
    query: `token=eq.${encodeURIComponent(token)}&select=*`,
  });
  if (!rows || !rows[0]) {
    const err = new Error("找不到這個專案，請向製作人確認連結");
    err.status = 404;
    throw err;
  }
  return rows[0];
}

function mapCategory(row) {
  return {
    letter: row.letter,
    name: row.name,
    createdAt: row.created_at,
  };
}

function mapEntry(row) {
  return {
    id: row.id,
    categoryLetter: row.category_letter,
    sequence: row.sequence,
    name: row.name,
    address: row.address || "",
    access: row.access || "",
    condition: row.site_condition || "",
    hours: row.hours || "",
    contact: row.contact || "",
    status: row.status || "pending",
    background: row.background,
    fee: row.fee,
    rules: row.rules,
    mapLink: row.map_link,
    photoLink: row.photo_link,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPhoto(row) {
  return {
    id: row.id,
    entryId: row.entry_id,
    url: row.url,
    pcloudFileId: row.pcloud_file_id,
    pcloudPath: row.pcloud_path,
    order: row.sort_order,
    createdAt: row.created_at,
  };
}

function nextLetters(count) {
  return Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i));
}

async function rewriteCategoryLetters(projectId, ordered) {
  const list = (ordered || []).filter((c) => c && c.name);
  if (!list.length) return;
  const finals = nextLetters(list.length);
  const already = list.every((c, i) => c.letter === finals[i]);
  if (already) return;

  const temps = list.map((_, i) => `_${i}`);
  for (let i = 0; i < list.length; i += 1) {
    await sb("scouting_categories", {
      method: "POST",
      body: { project_id: projectId, letter: temps[i], name: list[i].name },
    });
  }
  for (let i = 0; i < list.length; i += 1) {
    await sb("scouting_entries", {
      method: "PATCH",
      query: `project_id=eq.${projectId}&category_letter=eq.${encodeURIComponent(list[i].letter)}`,
      body: { category_letter: temps[i] },
    });
  }
  for (const c of list) {
    await sb("scouting_categories", {
      method: "DELETE",
      query: `project_id=eq.${projectId}&letter=eq.${encodeURIComponent(c.letter)}`,
    });
  }
  for (let i = 0; i < list.length; i += 1) {
    await sb("scouting_categories", {
      method: "POST",
      body: { project_id: projectId, letter: finals[i], name: list[i].name },
    });
  }
  for (let i = 0; i < list.length; i += 1) {
    await sb("scouting_entries", {
      method: "PATCH",
      query: `project_id=eq.${projectId}&category_letter=eq.${encodeURIComponent(temps[i])}`,
      body: { category_letter: finals[i] },
    });
  }
  for (const temp of temps) {
    await sb("scouting_categories", {
      method: "DELETE",
      query: `project_id=eq.${projectId}&letter=eq.${encodeURIComponent(temp)}`,
    });
  }
}

async function loadProjectBundle(token) {
  const project = await getProjectByToken(token);
  const [categories, entries, photos] = await Promise.all([
    sb("scouting_categories", { query: `project_id=eq.${project.id}&select=*&order=letter.asc` }),
    sb("scouting_entries", { query: `project_id=eq.${project.id}&select=*&order=created_at.asc` }),
    sb("scouting_photos", { query: `project_id=eq.${project.id}&select=*&order=sort_order.asc` }),
  ]);
  return {
    project: { id: project.id, name: project.name, token: project.token },
    categories: (categories || []).map(mapCategory),
    entries: (entries || []).map(mapEntry),
    photos: (photos || []).map(mapPhoto),
  };
}

module.exports = {
  adminKey,
  json,
  safeEqual,
  newToken,
  readBody,
  getProjectByToken,
  loadProjectBundle,
  rewriteCategoryLetters,
  sb,
  mapCategory,
  mapEntry,
  mapPhoto,
};
