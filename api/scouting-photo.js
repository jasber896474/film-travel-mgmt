const { json, loadProjectBundle } = require("../lib/scouting");
const { fetchScoutingPhoto } = require("../lib/scouting-pcloud");

function getQuery(req) {
  if (req.query && typeof req.query === "object" && (req.query.token || req.query.id)) {
    return req.query;
  }
  try {
    const url = new URL(req.url || "", "http://localhost");
    return {
      token: url.searchParams.get("token") || "",
      id: url.searchParams.get("id") || "",
    };
  } catch {
    return { token: "", id: "" };
  }
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "GET") {
    json(res, 405, { error: "請使用 GET" });
    return;
  }

  try {
    const query = getQuery(req);
    const id = Number(query.id);
    if (!query.token || !id) {
      json(res, 400, { error: "缺少照片參數" });
      return;
    }
    const bundle = await loadProjectBundle(query.token);
    const photo = bundle.photos.find((p) => p.id === id);
    if (!photo || !photo.pcloudFileId) {
      json(res, 404, { error: "找不到這張照片" });
      return;
    }
    const file = await fetchScoutingPhoto(photo.pcloudFileId);
    res.statusCode = 200;
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.end(file.buffer);
  } catch (err) {
    json(res, err.status || 500, { error: err.message || "讀取照片失敗" });
  }
};
