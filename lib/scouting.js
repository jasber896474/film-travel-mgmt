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
    deletedAt: row.deleted_at || null,
  };
}

const TRASH_DAYS = 30;

function notDeleted(row) {
  return row && !row.deleted_at;
}

function trashExpiry(deletedAt) {
  const start = new Date(deletedAt).getTime();
  return new Date(start + TRASH_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function daysLeft(deletedAt) {
  const left = Math.ceil((new Date(trashExpiry(deletedAt)).getTime() - Date.now()) / 86400000);
  return Math.max(0, left);
}

async function loadProjectRows(projectId) {
  const [categories, entries, photos] = await Promise.all([
    sb("scouting_categories", { query: `project_id=eq.${projectId}&select=*&order=letter.asc` }),
    sb("scouting_entries", { query: `project_id=eq.${projectId}&select=*&order=created_at.asc` }),
    sb("scouting_photos", { query: `project_id=eq.${projectId}&select=*&order=sort_order.asc` }),
  ]);
  return {
    categories: categories || [],
    entries: entries || [],
    photos: photos || [],
  };
}

function mapTrashItem(kind, row, extra) {
  return {
    kind,
    id: row.id || `${row.project_id}:${row.letter}`,
    letter: row.letter || extra.letter || "",
    name: extra.name || row.name || "",
    deletedAt: row.deleted_at,
    expiresAt: trashExpiry(row.deleted_at),
    daysLeft: daysLeft(row.deleted_at),
    ...extra,
  };
}

function buildTrashList(rows) {
  const deletedCats = rows.categories.filter((c) => c.deleted_at);
  const deletedCatLetters = new Set(deletedCats.map((c) => c.letter));
  const deletedEntries = rows.entries.filter((e) => e.deleted_at);
  const deletedEntryIds = new Set(deletedEntries.map((e) => e.id));
  const items = [];

  deletedCats.forEach((cat) => {
    const kids = rows.entries.filter((e) => e.category_letter === cat.letter);
    const photos = rows.photos.filter((p) => kids.some((e) => e.id === p.entry_id));
    items.push(mapTrashItem("category", cat, {
      name: cat.name,
      letter: cat.letter,
      entryCount: kids.length,
      photoCount: photos.length,
    }));
  });

  deletedEntries.forEach((entry) => {
    if (deletedCatLetters.has(entry.category_letter)) return;
    const photos = rows.photos.filter((p) => p.entry_id === entry.id);
    items.push(mapTrashItem("entry", entry, {
      name: entry.name || `${entry.category_letter}${entry.sequence}`,
      letter: `${entry.category_letter}${entry.sequence}`,
      photoCount: photos.length,
    }));
  });

  rows.photos.filter((p) => p.deleted_at).forEach((photo) => {
    if (deletedEntryIds.has(photo.entry_id)) return;
    const parent = rows.entries.find((e) => e.id === photo.entry_id);
    items.push(mapTrashItem("photo", photo, {
      name: parent ? (parent.name || `${parent.category_letter}${parent.sequence}`) : "photo",
      letter: parent ? `${parent.category_letter}${parent.sequence}` : "",
      photoId: photo.id,
    }));
  });

  items.sort((a, b) => String(b.deletedAt).localeCompare(String(a.deletedAt)));
  return items;
}

function nextLetters(count) {
  return Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i));
}

async function reservedLetters(projectId) {
  const rows = await sb("scouting_categories", {
    query: `project_id=eq.${projectId}&deleted_at=not.is.null&select=letter`,
  });
  return new Set((rows || []).map((r) => r.letter));
}

function nextFreeLetters(count, reserved) {
  const out = [];
  for (let i = 0; out.length < count && i < 26; i += 1) {
    const letter = String.fromCharCode(65 + i);
    if (!reserved.has(letter)) out.push(letter);
  }
  return out;
}

async function rewriteCategoryLetters(projectId, ordered) {
  const list = (ordered || []).filter((c) => c && c.name);
  if (!list.length) return;
  const reserved = await reservedLetters(projectId);
  list.forEach((c) => reserved.delete(c.letter));
  const finals = nextFreeLetters(list.length, reserved);
  if (finals.length < list.length) {
    const err = new Error("類型代號不足，請先清空回收桶");
    err.status = 400;
    throw err;
  }
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
  const rows = await loadProjectRows(project.id);
  const categories = rows.categories.filter(notDeleted);
  const entries = rows.entries.filter(notDeleted);
  const photos = rows.photos.filter(notDeleted);
  return {
    project: { id: project.id, name: project.name, token: project.token },
    categories: categories.map(mapCategory),
    entries: entries.map(mapEntry),
    photos: photos.map(mapPhoto),
    trashCount: buildTrashList(rows).length,
    usedLetters: rows.categories.map((c) => c.letter),
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
  loadProjectRows,
  buildTrashList,
  rewriteCategoryLetters,
  reservedLetters,
  TRASH_DAYS,
  sb,
  mapCategory,
  mapEntry,
  mapPhoto,
};
