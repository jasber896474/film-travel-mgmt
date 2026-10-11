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
const {
  OWNER_ID,
  isSystemOwner,
  optionalUser,
  requireUser,
  canCreateProject,
  membershipRole,
  canEditRole,
  assertProjectRole,
  addMember,
  findUserIdByEmail,
  getUserProfile,
} = require("../lib/scouting-auth");
const { uploadScoutingPhoto, deleteScoutingPhoto } = require("../lib/scouting-pcloud");

const WRITE_ACTIONS = new Set([
  "addCategory", "updateCategory", "moveCategory", "deleteCategory",
  "addEntry", "updateEntry", "deleteEntry", "addPhoto", "deletePhoto",
]);

function mapMember(row, profile) {
  return {
    id: row.id,
    userId: row.user_id,
    role: row.role,
    email: (profile && profile.email) || "",
    name: (profile && profile.name) || "",
  };
}

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

    if (action === "session") {
      const user = await requireUser(req, body);
      json(res, 200, {
        user: { id: user.id, email: user.email || "" },
        isSystemOwner: isSystemOwner(user.id),
        canCreate: await canCreateProject(user),
      });
      return;
    }

    if (action === "listProjects") {
      const user = await requireUser(req, body);
      const owner = isSystemOwner(user.id);
      const projects = await sb("scouting_projects", { query: "select=id,name,token,created_at&order=created_at.desc" });
      const members = await sb("scouting_members", {
        query: owner
          ? "select=*"
          : `user_id=eq.${encodeURIComponent(user.id)}&select=*`,
      });
      const mine = new Map((members || []).filter((m) => m.user_id === user.id).map((m) => [m.project_id, m.role]));
      const list = (projects || [])
        .filter((p) => owner || mine.has(p.id))
        .map((p) => ({
          id: p.id,
          name: p.name,
          token: p.token,
          createdAt: p.created_at,
          role: owner ? (mine.get(p.id) || "owner") : mine.get(p.id),
          path: `/scouting/p/${p.token}`,
        }));
      json(res, 200, {
        user: { id: user.id, email: user.email || "" },
        isSystemOwner: owner,
        canCreate: await canCreateProject(user),
        projects: list,
      });
      return;
    }

    if (action === "createProject") {
      const name = String(body.name || "").trim();
      if (!name) {
        json(res, 400, { error: "請輸入劇名" });
        return;
      }
      let user = await optionalUser(req, body);
      if (!user && body.adminKey && adminKey() && safeEqual(body.adminKey, adminKey())) {
        user = { id: OWNER_ID, email: "" };
      }
      if (!user) {
        json(res, 401, { error: "請先登入" });
        return;
      }
      if (!await canCreateProject(user)) {
        json(res, 403, { error: "帳號尚未核准，無法開新劇" });
        return;
      }
      const token = newToken();
      const [project] = await sb("scouting_projects", {
        method: "POST",
        body: { name, token },
      });
      const creatorRole = isSystemOwner(user.id) ? "owner" : "admin";
      await addMember(project.id, user.id, creatorRole);
      if (!isSystemOwner(user.id) && OWNER_ID) {
        await addMember(project.id, OWNER_ID, "owner");
      }
      json(res, 200, {
        project: { id: project.id, name: project.name, token: project.token, role: creatorRole },
        path: `/scouting/p/${project.token}`,
      });
      return;
    }

    if (action === "listRequests") {
      const user = await requireUser(req, body);
      if (!isSystemOwner(user.id)) {
        json(res, 403, { error: "只有系統擁有者能審核申請" });
        return;
      }
      const requests = await sb("user_requests", {
        query: "status=eq.pending&select=*&order=created_at.desc",
      });
      json(res, 200, { requests: requests || [] });
      return;
    }

    if (action === "approveRequest") {
      const user = await requireUser(req, body);
      if (!isSystemOwner(user.id)) {
        json(res, 403, { error: "只有系統擁有者能審核申請" });
        return;
      }
      const reqId = Number(body.id);
      const projectId = String(body.projectId || "").trim();
      const role = String(body.role || "editor");
      const rows = await sb("user_requests", { query: `id=eq.${reqId}&select=*` });
      const request = rows && rows[0];
      if (!request) {
        json(res, 404, { error: "找不到這筆申請" });
        return;
      }
      await sb("user_requests", {
        method: "PATCH",
        query: `id=eq.${reqId}`,
        body: { status: "approved" },
      });
      let uid = request.user_id;
      if (!uid && request.email) uid = await findUserIdByEmail(request.email);
      if (uid && projectId) await addMember(projectId, uid, role);
      json(res, 200, { ok: true });
      return;
    }

    if (action === "rejectRequest") {
      const user = await requireUser(req, body);
      if (!isSystemOwner(user.id)) {
        json(res, 403, { error: "只有系統擁有者能審核申請" });
        return;
      }
      const reqId = Number(body.id);
      await sb("user_requests", {
        method: "PATCH",
        query: `id=eq.${reqId}`,
        body: { status: "rejected" },
      });
      json(res, 200, { ok: true });
      return;
    }

    if (action === "listMembers") {
      const user = await requireUser(req, body);
      const projectId = String(body.projectId || "").trim();
      await assertProjectRole(projectId, user, "view");
      const rows = await sb("scouting_members", {
        query: `project_id=eq.${projectId}&select=*&order=created_at.asc`,
      });
      const profiles = await Promise.all((rows || []).map((row) => getUserProfile(row.user_id)));
      json(res, 200, {
        members: (rows || []).map((row, i) => mapMember(row, profiles[i])),
      });
      return;
    }

    if (action === "addMember") {
      const user = await requireUser(req, body);
      const projectId = String(body.projectId || "").trim();
      await assertProjectRole(projectId, user, "manage");
      const email = String(body.email || "").trim();
      const uid = await findUserIdByEmail(email);
      if (!uid) {
        json(res, 404, { error: "找不到這個 email 的帳號，對方需先申請並完成驗證" });
        return;
      }
      const row = await addMember(projectId, uid, body.role || "editor");
      const profile = await getUserProfile(uid);
      json(res, 200, { member: mapMember(row, profile) });
      return;
    }

    if (action === "updateMember") {
      const user = await requireUser(req, body);
      const projectId = String(body.projectId || "").trim();
      await assertProjectRole(projectId, user, "manage");
      const id = Number(body.id);
      const rows = await sb("scouting_members", { query: `id=eq.${id}&project_id=eq.${projectId}&select=*` });
      const existing = rows && rows[0];
      if (!existing) {
        json(res, 404, { error: "找不到這位成員" });
        return;
      }
      if (existing.role === "owner") {
        json(res, 403, { error: "不能更改擁有者" });
        return;
      }
      if (existing.user_id === user.id) {
        json(res, 403, { error: "不能更改自己的角色" });
        return;
      }
      const [row] = await sb("scouting_members", {
        method: "PATCH",
        query: `id=eq.${id}`,
        body: { role: String(body.role || existing.role) },
      });
      json(res, 200, { member: mapMember(row) });
      return;
    }

    if (action === "removeMember") {
      const user = await requireUser(req, body);
      const projectId = String(body.projectId || "").trim();
      await assertProjectRole(projectId, user, "manage");
      const id = Number(body.id);
      const rows = await sb("scouting_members", { query: `id=eq.${id}&project_id=eq.${projectId}&select=*` });
      const existing = rows && rows[0];
      if (!existing) {
        json(res, 404, { error: "找不到這位成員" });
        return;
      }
      if (existing.role === "owner" || existing.user_id === user.id) {
        json(res, 403, { error: "不能移除擁有者或自己" });
        return;
      }
      await sb("scouting_members", { method: "DELETE", query: `id=eq.${id}` });
      json(res, 200, { ok: true });
      return;
    }

    const bundle = await loadProjectBundle(body.token);
    const projectId = bundle.project.id;
    const sessionUser = await optionalUser(req, body);
    if (sessionUser) {
      const role = await membershipRole(projectId, sessionUser);
      if (role) {
        bundle.role = role;
        if (WRITE_ACTIONS.has(action) && !canEditRole(role)) {
          json(res, 403, { error: "這個帳號是唯讀，不能修改" });
          return;
        }
      }
    }

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
