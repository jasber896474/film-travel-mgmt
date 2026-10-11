const { sb } = require("./scouting");

const OWNER_ID = "006bf3d7-934c-4a86-a14c-17757334b618";
const ROLES = ["owner", "admin", "editor", "viewer"];

function supabaseUrl() {
  return process.env.SCOUTING_SUPABASE_URL || "https://knoudnzjnfkfhiizgcna.supabase.co";
}
function serviceKey() {
  return process.env.SCOUTING_SUPABASE_SERVICE_ROLE_KEY || "";
}

function isSystemOwner(userId) {
  return !!(OWNER_ID && userId === OWNER_ID);
}

function bearerToken(req, body) {
  const header = req.headers.authorization || req.headers.Authorization || "";
  const fromHeader = String(header).replace(/^Bearer\s+/i, "").trim();
  if (fromHeader) return fromHeader;
  return String((body && body.accessToken) || "").trim();
}

async function getAuthUser(accessToken) {
  if (!accessToken) return null;
  const res = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: {
      apikey: serviceKey(),
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const user = data?.id ? data : (data?.user?.id ? data.user : null);
  return user && user.id ? user : null;
}

async function optionalUser(req, body) {
  const token = bearerToken(req, body);
  if (!token) return null;
  return getAuthUser(token);
}

async function requireUser(req, body) {
  const user = await optionalUser(req, body);
  if (!user) {
    const err = new Error("請先登入");
    err.status = 401;
    throw err;
  }
  return user;
}

async function isApprovedUser(user) {
  if (!user) return false;
  if (isSystemOwner(user.id)) return true;
  const byId = await sb("user_requests", {
    query: `user_id=eq.${encodeURIComponent(user.id)}&status=eq.approved&select=id&limit=1`,
  }).catch(() => []);
  if (byId && byId.length) return true;
  if (!user.email) return false;
  const byEmail = await sb("user_requests", {
    query: `email=eq.${encodeURIComponent(user.email)}&status=eq.approved&select=id&limit=1`,
  }).catch(() => []);
  return !!(byEmail && byEmail.length);
}

async function hasAnyMembership(userId) {
  const rows = await sb("scouting_members", {
    query: `user_id=eq.${encodeURIComponent(userId)}&select=id&limit=1`,
  });
  return !!(rows && rows[0]);
}

async function canCreateProject(user) {
  if (!user) return false;
  if (isSystemOwner(user.id)) return true;
  if (await isApprovedUser(user)) return true;
  return hasAnyMembership(user.id);
}

async function memberRow(projectId, userId) {
  const rows = await sb("scouting_members", {
    query: `project_id=eq.${projectId}&user_id=eq.${encodeURIComponent(userId)}&select=*`,
  });
  return (rows && rows[0]) || null;
}

async function membershipRole(projectId, user) {
  if (!user) return "";
  if (isSystemOwner(user.id)) return "owner";
  const row = await memberRow(projectId, user.id);
  return row ? row.role : "";
}

function canEditRole(role) {
  return ["owner", "admin", "editor"].includes(role);
}

function canManageRole(role) {
  return ["owner", "admin"].includes(role);
}

async function assertProjectRole(projectId, user, need) {
  const role = await membershipRole(projectId, user);
  if (!role) {
    const err = new Error("沒有這個專案的權限");
    err.status = 403;
    throw err;
  }
  if (need === "edit" && !canEditRole(role)) {
    const err = new Error("這個帳號是唯讀，不能修改");
    err.status = 403;
    throw err;
  }
  if (need === "manage" && !canManageRole(role)) {
    const err = new Error("只有管理員能設定成員");
    err.status = 403;
    throw err;
  }
  return role;
}

async function addMember(projectId, userId, role) {
  const safeRole = ROLES.includes(role) ? role : "editor";
  const existing = await memberRow(projectId, userId);
  if (existing) {
    if (existing.role === safeRole) return existing;
    const [row] = await sb("scouting_members", {
      method: "PATCH",
      query: `id=eq.${existing.id}`,
      body: { role: safeRole },
    });
    return row;
  }
  const [row] = await sb("scouting_members", {
    method: "POST",
    body: { project_id: projectId, user_id: userId, role: safeRole },
  });
  return row;
}

async function findUserIdByEmail(email) {
  const found = await sb("rpc/find_user_id_by_email", {
    method: "POST",
    body: { p_email: String(email || "").trim() },
  });
  if (typeof found === "string") return found;
  if (Array.isArray(found)) return found[0] || null;
  return found?.id || found?.user_id || null;
}

async function getUserProfile(userId) {
  if (!userId) return { id: "", email: "", name: "" };
  const res = await fetch(`${supabaseUrl()}/auth/v1/admin/users/${userId}`, {
    headers: {
      apikey: serviceKey(),
      Authorization: `Bearer ${serviceKey()}`,
    },
  });
  if (!res.ok) return { id: userId, email: "", name: "" };
  const data = await res.json();
  const user = data?.user || data;
  return {
    id: userId,
    email: user.email || "",
    name: user.user_metadata?.display_name || user.user_metadata?.name || "",
  };
}

module.exports = {
  OWNER_ID,
  ROLES,
  isSystemOwner,
  bearerToken,
  getAuthUser,
  optionalUser,
  requireUser,
  isApprovedUser,
  canCreateProject,
  memberRow,
  membershipRole,
  canEditRole,
  canManageRole,
  assertProjectRole,
  addMember,
  findUserIdByEmail,
  getUserProfile,
};
