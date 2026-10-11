const el = (id) => document.getElementById(id);

function roleLabel(role) {
  const map = { owner: "roleOwner", admin: "roleAdmin", editor: "roleEditor", viewer: "roleViewer" };
  return map[role] ? t(map[role]) : role;
}

function setupHomeLang() {
  loadLang();
  document.querySelectorAll(".home-lang-select").forEach((sel) => {
    sel.innerHTML = "";
    Object.keys(LANGS).forEach((code) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = LANGS[code];
      sel.appendChild(opt);
    });
    sel.value = currentLang;
    sel.addEventListener("change", () => {
      setLang(sel.value);
      document.querySelectorAll(".home-lang-select").forEach((other) => { other.value = sel.value; });
      if (session.user) loadList().catch(() => {});
    });
  });
  applyI18n();
}

let session = { user: null, isSystemOwner: false, canCreate: false, projects: [] };
let memberProjectId = "";
let approveRequest = null;

function show(id, on) {
  const node = el(id);
  if (node) node.hidden = !on;
}

function setAuthMode(mode) {
  ["loginForm", "registerForm", "forgotForm", "resetForm", "verifyBox"].forEach((id) => show(id, false));
  show("authTabs", mode === "login" || mode === "register");
  document.querySelectorAll(".home-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
  if (mode === "login") show("loginForm", true);
  if (mode === "register") show("registerForm", true);
  if (mode === "forgot") show("forgotForm", true);
  if (mode === "reset") show("resetForm", true);
  if (mode === "verify") show("verifyBox", true);
  el("authError").textContent = "";
}

function authError(err) {
  el("authError").textContent = (err && err.message) || String(err || "");
}

async function loadList() {
  const data = await Auth.api("listProjects");
  session = data;
  el("userLine").textContent = `${data.user.email || ""}${data.isSystemOwner ? t("ownerSuffix") : ""}`;
  el("btnNewProject").hidden = !data.canCreate;
  renderProjects(data.projects || []);
  if (data.isSystemOwner) await loadRequests();
  else show("requestSection", false);
}

function renderProjects(projects) {
  const grid = el("projectGrid");
  grid.innerHTML = "";
  el("listEmpty").hidden = projects.length > 0;
  projects.forEach((p) => {
    const card = document.createElement("div");
    card.className = "home-card-proj";
    card.innerHTML = `
      <div class="home-card-band role-${p.role || "viewer"}"></div>
      <div class="home-card-body">
        <h3>${escapeHtml(p.name)}</h3>
        <span class="home-role">${roleLabel(p.role)}</span>
        <div class="home-card-actions">
          <a class="btn btn-primary" href="${p.path}">${t("openProject")}</a>
          ${["owner", "admin"].includes(p.role) ? `<button type="button" class="btn btn-ghost" data-members="${p.id}" data-name="${escapeAttr(p.name)}">${t("members")}</button>` : ""}
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

async function loadRequests() {
  const data = await Auth.api("listRequests");
  const list = data.requests || [];
  show("requestSection", true);
  const box = el("requestList");
  if (!list.length) {
    box.innerHTML = `<p class="admin-lead">${t("noRequests")}</p>`;
    return;
  }
  box.innerHTML = list.map((req) => `
    <div class="home-request">
      <div>
        <strong>${escapeHtml(req.display_name || "（未填姓名）")}</strong>
        <span>${escapeHtml(req.email || "")}</span>
        ${req.message ? `<p>${escapeHtml(req.message)}</p>` : ""}
      </div>
      <div class="home-request-actions">
        <button type="button" class="btn btn-primary" data-approve="${req.id}">批准</button>
        <button type="button" class="btn btn-ghost" data-reject="${req.id}">拒絕</button>
      </div>
    </div>
  `).join("");
}

async function openMembers(projectId, name) {
  memberProjectId = projectId;
  el("memberTitle").textContent = `${t("membersTitle")} — ${name}`;
  el("memberError").textContent = "";
  show("memberModal", true);
  await refreshMembers();
}

async function refreshMembers() {
  const data = await Auth.api("listMembers", { projectId: memberProjectId });
  el("memberList").innerHTML = (data.members || []).map((m) => `
    <div class="home-member">
      <div>
        <strong>${escapeHtml(m.email || m.name || m.userId)}</strong>
        <span>${roleLabel(m.role)}</span>
      </div>
      ${m.role !== "owner" && m.userId !== session.user.id ? `
        <div class="home-member-actions">
          <select data-role-id="${m.id}">
            <option value="admin" ${m.role === "admin" ? "selected" : ""}>${t("roleAdmin")}</option>
            <option value="editor" ${m.role === "editor" ? "selected" : ""}>${t("roleEditor")}</option>
            <option value="viewer" ${m.role === "viewer" ? "selected" : ""}>${t("roleViewer")}</option>
          </select>
          <button type="button" class="btn btn-ghost" data-remove="${m.id}">${t("removeMember")}</button>
        </div>
      ` : ""}
    </div>
  `).join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}
function escapeAttr(str) {
  return String(str || "").replace(/"/g, "&quot;");
}

function bootAuth() {
  show("authView", true);
  show("listView", false);
  const recovery = Auth.recoveryTokenFromHash();
  if (recovery) {
    setAuthMode("reset");
    el("resetForm").dataset.token = recovery;
    return;
  }
  setAuthMode("login");
}

async function bootList() {
  show("authView", false);
  show("listView", true);
  await loadList();
}

window.addEventListener("DOMContentLoaded", async () => {
  setupHomeLang();
  document.querySelectorAll(".home-tab").forEach((btn) => {
    btn.addEventListener("click", () => setAuthMode(btn.dataset.mode));
  });

  el("loginForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    try {
      await Auth.login(el("loginEmail").value.trim(), el("loginPassword").value);
      await bootList();
    } catch (err) {
      authError(err);
    }
  });

  el("registerForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const email = el("regEmail").value.trim();
    const pw = el("regPassword").value;
    const pw2 = el("regPassword2").value;
    if (pw !== pw2) { authError(new Error("兩次密碼不一致")); return; }
    if (pw.length < 6) { authError(new Error("密碼至少 6 個字")); return; }
    try {
      const res = await Auth.signup(email, pw);
      if (res.error || (res.code && res.code >= 400)) {
        throw new Error(res.error?.message || res.msg || res.message || "申請失敗");
      }
      await Auth.submitRequest(
        email,
        el("regName").value.trim(),
        el("regMessage").value.trim(),
        res.access_token,
        res.id || (res.user && res.user.id)
      );
      setAuthMode("verify");
    } catch (err) {
      authError(err);
    }
  });

  el("btnForgot").addEventListener("click", () => setAuthMode("forgot"));
  el("btnBackLogin").addEventListener("click", () => setAuthMode("login"));
  el("btnVerifyLogin").addEventListener("click", () => setAuthMode("login"));

  el("forgotForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    try {
      await Auth.recover(el("forgotEmail").value.trim());
      el("authError").textContent = "重設郵件已送出，請查看信箱。";
    } catch (err) {
      authError(err);
    }
  });

  el("resetForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const pw = el("resetPassword").value;
    const pw2 = el("resetPassword2").value;
    if (pw !== pw2) { authError(new Error("兩次密碼不一致")); return; }
    try {
      const data = await Auth.updatePassword(el("resetForm").dataset.token, pw);
      if (data.error) throw new Error(data.error_description || data.msg || "更新失敗");
      window.location.hash = "";
      el("authError").textContent = "密碼已更新，請重新登入。";
      setAuthMode("login");
    } catch (err) {
      authError(err);
    }
  });

  el("btnLogout").addEventListener("click", () => {
    Auth.clearSession();
    bootAuth();
  });

  el("btnNewProject").addEventListener("click", () => {
    el("newProjectName").value = "";
    el("createError").textContent = "";
    show("createModal", true);
  });
  el("btnCancelCreate").addEventListener("click", () => show("createModal", false));
  el("btnConfirmCreate").addEventListener("click", async () => {
    try {
      const data = await Auth.api("createProject", { name: el("newProjectName").value.trim() });
      window.location.href = data.path;
    } catch (err) {
      el("createError").textContent = err.message;
    }
  });

  el("projectGrid").addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-members]");
    if (!btn) return;
    openMembers(btn.dataset.members, btn.dataset.name).catch((err) => alert(err.message));
  });

  el("btnCloseMembers").addEventListener("click", () => show("memberModal", false));
  el("btnAddMember").addEventListener("click", async () => {
    try {
      await Auth.api("addMember", {
        projectId: memberProjectId,
        email: el("memberEmail").value.trim(),
        role: el("memberRole").value,
      });
      el("memberEmail").value = "";
      el("memberError").textContent = "";
      await refreshMembers();
    } catch (err) {
      el("memberError").textContent = err.message;
    }
  });
  el("memberList").addEventListener("change", async (ev) => {
    const sel = ev.target.closest("[data-role-id]");
    if (!sel) return;
    try {
      await Auth.api("updateMember", { projectId: memberProjectId, id: Number(sel.dataset.roleId), role: sel.value });
      await refreshMembers();
    } catch (err) {
      el("memberError").textContent = err.message;
    }
  });
  el("memberList").addEventListener("click", async (ev) => {
    const btn = ev.target.closest("[data-remove]");
    if (!btn) return;
    if (!confirm("確定移除此成員？")) return;
    try {
      await Auth.api("removeMember", { projectId: memberProjectId, id: Number(btn.dataset.remove) });
      await refreshMembers();
    } catch (err) {
      el("memberError").textContent = err.message;
    }
  });

  el("requestList").addEventListener("click", async (ev) => {
    const approveBtn = ev.target.closest("[data-approve]");
    const rejectBtn = ev.target.closest("[data-reject]");
    if (rejectBtn) {
      if (!confirm("確定拒絕這筆申請？")) return;
      await Auth.api("rejectRequest", { id: Number(rejectBtn.dataset.reject) });
      await loadRequests();
      return;
    }
    if (!approveBtn) return;
    const id = Number(approveBtn.dataset.approve);
    const req = (await Auth.api("listRequests")).requests.find((r) => r.id === id);
    approveRequest = req;
    el("approveHint").textContent = `${req.display_name || ""} ${req.email || ""}`.trim();
    el("approveProject").innerHTML = `<option value="">${t("laterAssign")}</option>` + (session.projects || []).map((p) => (
      `<option value="${p.id}">${escapeHtml(p.name)}</option>`
    )).join("");
    show("approveModal", true);
  });
  el("btnCancelApprove").addEventListener("click", () => show("approveModal", false));
  el("btnConfirmApprove").addEventListener("click", async () => {
    if (!approveRequest) return;
    await Auth.api("approveRequest", {
      id: approveRequest.id,
      projectId: el("approveProject").value,
      role: el("approveRole").value,
    });
    show("approveModal", false);
    await loadList();
  });

  if (Auth.getAccessToken()) {
    try {
      await bootList();
    } catch {
      Auth.clearSession();
      bootAuth();
    }
  } else {
    bootAuth();
  }
});
