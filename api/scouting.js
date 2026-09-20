const {
  adminKey,
  json,
  safeEqual,
  newToken,
  readBody,
  loadProjectBundle,
  rewriteCategoryLetters,
  sb,
  mapEntry,
  mapPhoto,
} = require("../lib/scouting");
const { uploadScoutingPhoto, deleteScoutingPhoto } = require("../lib/scouting-pcloud");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "POST") {
    json(res, 405, { error: "請使用 POST" });
    return;
  }

  try {
    const body = await readBody(req);
    const action = body.action;
    if (!action) {
      json(res, 400, { error: "缺少 action" });
      return;
    }

    if (action === "createProject") {
      if (!adminKey()) {
        json(res, 503, { error: "尚未設定 SCOUTING_ADMIN_KEY" });
        return;
      }
      if (!safeEqual(body.adminKey, adminKey())) {
        json(res, 403, { error: "開專案密鑰不正確" });
        return;
      }
      const name = String(body.name || "").trim();
      if (!name) {
        json(res, 400, { error: "請輸入劇名" });
        return;
      }
      const token = newToken();
      const [project] = await sb("scouting_projects", {
        method: "POST",
        body: { name, token },
      });
      json(res, 200, {
        project: { id: project.id, name: project.name, token: project.token },
        path: `/scouting/p/${project.token}`,
      });
      return;
    }

    const bundle = await loadProjectBundle(body.token);
    const projectId = bundle.project.id;

    if (action === "getProject") {
      json(res, 200, bundle);
      return;
    }

    if (action === "addCategory") {
      const name = String(body.name || "").trim();
      if (!name) {
        json(res, 400, { error: "請輸入類型名稱" });
        return;
      }
      const used = new Set(bundle.categories.map((c) => c.letter));
      let nextLetter = "";
      for (let i = 0; i < 26; i += 1) {
        const letter = String.fromCharCode(65 + i);
        if (!used.has(letter)) {
          nextLetter = letter;
          break;
        }
      }
      if (!nextLetter) {
        json(res, 400, { error: "類型已達上限" });
        return;
      }
      const [row] = await sb("scouting_categories", {
        method: "POST",
        body: { project_id: projectId, letter: nextLetter, name },
      });
      json(res, 200, { category: { letter: row.letter, name: row.name, createdAt: row.created_at } });
      return;
    }

    if (action === "updateCategory") {
      const letter = String(body.letter || "").trim().toUpperCase();
      const name = String(body.name || "").trim();
      if (!letter || !bundle.categories.some((c) => c.letter === letter)) {
        json(res, 404, { error: "找不到這個類型" });
        return;
      }
      if (!name) {
        json(res, 400, { error: "請輸入類型名稱" });
        return;
      }
      const [row] = await sb("scouting_categories", {
        method: "PATCH",
        query: `project_id=eq.${projectId}&letter=eq.${encodeURIComponent(letter)}`,
        body: { name },
      });
      json(res, 200, { category: { letter: row.letter, name: row.name, createdAt: row.created_at } });
      return;
    }

    if (action === "moveCategory") {
      const letter = String(body.letter || "").trim().toUpperCase();
      const direction = body.direction === "down" ? "down" : "up";
      const list = bundle.categories.slice();
      const idx = list.findIndex((c) => c.letter === letter);
      const swap = direction === "up" ? idx - 1 : idx + 1;
      if (idx < 0 || swap < 0 || swap >= list.length) {
        json(res, 200, bundle);
        return;
      }
      const next = list.slice();
      const hold = next[idx];
      next[idx] = next[swap];
      next[swap] = hold;
      await rewriteCategoryLetters(projectId, next);
      json(res, 200, await loadProjectBundle(body.token));
      return;
    }

    if (action === "deleteCategory") {
      const letter = String(body.letter || "").trim().toUpperCase();
      const cat = bundle.categories.find((c) => c.letter === letter);
      if (!cat) {
        json(res, 404, { error: "找不到這個類型" });
        return;
      }
      const doomed = bundle.entries.filter((e) => e.categoryLetter === letter);
      const doomedIds = new Set(doomed.map((e) => e.id));
      const photos = bundle.photos.filter((p) => doomedIds.has(p.entryId));
      await Promise.all(photos.map((p) => deleteScoutingPhoto(p.pcloudFileId)));
      if (doomed.length) {
        await sb("scouting_entries", {
          method: "DELETE",
          query: `project_id=eq.${projectId}&category_letter=eq.${encodeURIComponent(letter)}`,
        });
      }
      await sb("scouting_categories", {
        method: "DELETE",
        query: `project_id=eq.${projectId}&letter=eq.${encodeURIComponent(letter)}`,
      });
      const remaining = bundle.categories.filter((c) => c.letter !== letter);
      await rewriteCategoryLetters(projectId, remaining);
      json(res, 200, await loadProjectBundle(body.token));
      return;
    }

    if (action === "addEntry") {
      const categoryLetter = String(body.categoryLetter || "").trim().toUpperCase();
      const exists = bundle.categories.some((c) => c.letter === categoryLetter);
      if (!exists) {
        json(res, 400, { error: "請先選擇或填寫場景類型" });
        return;
      }
      const inCat = bundle.entries.filter((e) => e.categoryLetter === categoryLetter);
      const sequence = inCat.length + 1;
      const [row] = await sb("scouting_entries", {
        method: "POST",
        body: {
          project_id: projectId,
          category_letter: categoryLetter,
          sequence,
          name: "",
          background: "",
          address: "",
          access: "",
          site_condition: "",
          hours: "",
          contact: "",
          status: "pending",
          fee: "",
          rules: "",
          map_link: "",
          photo_link: "",
        },
      });
      json(res, 200, { entry: mapEntry(row) });
      return;
    }

    if (action === "updateEntry") {
      const id = Number(body.id);
      const existing = bundle.entries.find((e) => e.id === id);
      if (!existing) {
        json(res, 404, { error: "找不到這個場景" });
        return;
      }
      const patch = {
        name: body.name == null ? existing.name : String(body.name),
        address: body.address == null ? existing.address : String(body.address),
        access: body.access == null ? existing.access : String(body.access),
        site_condition: body.condition == null ? existing.condition : String(body.condition),
        hours: body.hours == null ? existing.hours : String(body.hours),
        contact: body.contact == null ? existing.contact : String(body.contact),
        status: body.status == null ? existing.status : String(body.status),
        fee: body.fee == null ? existing.fee : String(body.fee),
        rules: body.rules == null ? existing.rules : String(body.rules),
        map_link: body.mapLink == null ? existing.mapLink : String(body.mapLink),
        photo_link: body.photoLink == null ? existing.photoLink : String(body.photoLink),
        updated_at: new Date().toISOString(),
      };
      let categoryLetter = existing.categoryLetter;
      let sequence = existing.sequence;
      if (body.categoryLetter && body.categoryLetter !== existing.categoryLetter) {
        categoryLetter = body.categoryLetter;
        sequence = bundle.entries.filter((e) => e.categoryLetter === categoryLetter).length + 1;
        patch.category_letter = categoryLetter;
        patch.sequence = sequence;
      }
      const [row] = await sb("scouting_entries", {
        method: "PATCH",
        query: `id=eq.${id}&project_id=eq.${projectId}`,
        body: patch,
      });
      json(res, 200, { entry: mapEntry(row) });
      return;
    }

    if (action === "deleteEntry") {
      const id = Number(body.id);
      const existing = bundle.entries.find((e) => e.id === id);
      if (!existing) {
        json(res, 404, { error: "找不到這個場景" });
        return;
      }
      const photos = bundle.photos.filter((p) => p.entryId === id);
      await Promise.all(photos.map((p) => deleteScoutingPhoto(p.pcloudFileId)));
      await sb("scouting_entries", {
        method: "DELETE",
        query: `id=eq.${id}&project_id=eq.${projectId}`,
      });
      json(res, 200, { ok: true });
      return;
    }

    if (action === "addPhoto") {
      const entryId = Number(body.entryId);
      const existing = bundle.entries.find((e) => e.id === entryId);
      if (!existing) {
        json(res, 404, { error: "找不到這個場景" });
        return;
      }
      const dataUrl = String(body.dataUrl || "");
      const match = dataUrl.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
      if (!match) {
        json(res, 400, { error: "照片格式不正確" });
        return;
      }
      const buffer = Buffer.from(match[1], "base64");
      if (buffer.length > 4.5 * 1024 * 1024) {
        json(res, 413, { error: "照片太大，請再壓縮後上傳" });
        return;
      }
      const filename = `${entryId}-${Date.now()}.jpg`;
      const uploaded = await uploadScoutingPhoto({
        token: bundle.project.token,
        categoryLetter: existing.categoryLetter,
        buffer,
        filename,
      });
      const sortOrder = bundle.photos.filter((p) => p.entryId === entryId).length;
      const [row] = await sb("scouting_photos", {
        method: "POST",
        body: {
          project_id: projectId,
          entry_id: entryId,
          url: uploaded.url,
          pcloud_file_id: uploaded.pcloudFileId,
          pcloud_path: uploaded.pcloudPath,
          sort_order: sortOrder,
        },
      });
      json(res, 200, { photo: mapPhoto(row) });
      return;
    }

    if (action === "deletePhoto") {
      const id = Number(body.id);
      const existing = bundle.photos.find((p) => p.id === id);
      if (!existing) {
        json(res, 404, { error: "找不到這張照片" });
        return;
      }
      await deleteScoutingPhoto(existing.pcloudFileId);
      await sb("scouting_photos", {
        method: "DELETE",
        query: `id=eq.${id}&project_id=eq.${projectId}`,
      });
      json(res, 200, { ok: true });
      return;
    }

    json(res, 400, { error: `未知的 action：${action}` });
  } catch (err) {
    console.error("scouting api", err);
    json(res, err.status || 500, { error: err.message || "伺服器錯誤" });
  }
};
