function pcloudHost() {
  return process.env.PCLOUD_HOST || "eapi.pcloud.com";
}
function accessToken() {
  return process.env.PCLOUD_ACCESS_TOKEN || "";
}
function publicFolderId() {
  return process.env.PCLOUD_PUBLIC_FOLDER_ID || "";
}
function filednBase() {
  return (process.env.PCLOUD_FILEDN_BASE || "").replace(/\/$/, "");
}

function pcloudConfigured() {
  return Boolean(accessToken() && publicFolderId() && filednBase());
}

function pcloudMissingMessage() {
  if (!accessToken()) return "尚未設定 PCLOUD_ACCESS_TOKEN";
  if (!publicFolderId()) return "尚未設定 PCLOUD_PUBLIC_FOLDER_ID";
  if (!filednBase()) return "尚未設定 PCLOUD_FILEDN_BASE（Public Folder 的 filedn.com 前綴）";
  return "pCloud 尚未設定完成";
}

async function pcloud(method, params = {}, { file } = {}) {
  const url = new URL(`https://${pcloudHost()}/${method}`);
  url.searchParams.set("access_token", accessToken());
  for (const [key, value] of Object.entries(params)) {
    if (value != null) url.searchParams.set(key, String(value));
  }

  let res;
  if (file) {
    const form = new FormData();
    form.append("filename", new Blob([file.buffer], { type: file.contentType || "image/jpeg" }), file.filename);
    res = await fetch(url, { method: "POST", body: form });
  } else {
    res = await fetch(url);
  }

  const data = await res.json();
  if (data.result !== 0) {
    const err = new Error(data.error || `pCloud ${method} 失敗 (${data.result})`);
    err.status = 502;
    throw err;
  }
  return data;
}

async function ensureFolder(parentId, name) {
  const data = await pcloud("createfolderifnotexists", { folderid: parentId, name });
  return data.metadata.folderid;
}

function safeSegment(value) {
  return String(value || "untitled").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80);
}

async function uploadScoutingPhoto({ token, categoryLetter, buffer, filename }) {
  if (!pcloudConfigured()) {
    const err = new Error(pcloudMissingMessage());
    err.status = 503;
    throw err;
  }

  const rootId = await ensureFolder(publicFolderId(), "scouting");
  const projectId = await ensureFolder(rootId, safeSegment(token));
  const categoryId = await ensureFolder(projectId, safeSegment(categoryLetter));
  const safeName = safeSegment(filename).replace(/\s+/g, "-");

  const uploaded = await pcloud("uploadfile", { folderid: categoryId, renameifexists: 1 }, {
    file: { buffer, filename: safeName, contentType: "image/jpeg" },
  });

  const meta = (uploaded.metadata && uploaded.metadata[0]) || uploaded.metadata;
  if (!meta || !meta.fileid) {
    const err = new Error("pCloud 上傳成功但沒有回傳檔案 id");
    err.status = 502;
    throw err;
  }

  const relative = `scouting/${safeSegment(token)}/${safeSegment(categoryLetter)}/${meta.name || safeName}`;
  const url = `${filednBase()}/${relative}`;

  return {
    url,
    pcloudFileId: String(meta.fileid),
    pcloudPath: meta.path || `/${relative}`,
  };
}

async function deleteScoutingPhoto(fileId) {
  if (!accessToken() || !fileId) return;
  try {
    await pcloud("deletefile", { fileid: fileId });
  } catch (err) {
    console.warn("pCloud deletefile failed", err.message);
  }
}

module.exports = {
  pcloudConfigured,
  pcloudMissingMessage,
  uploadScoutingPhoto,
  deleteScoutingPhoto,
};
