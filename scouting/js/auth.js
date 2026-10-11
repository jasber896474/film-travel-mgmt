/* Shared travel-app session (same Supabase Auth, same sb_session key). */

const Auth = {
  SUPABASE_URL: "https://knoudnzjnfkfhiizgcna.supabase.co",
  SUPABASE_KEY: "sb_publishable_OdfFFai3Ac1NgbelUPlYXQ_8R8IDAhA",
  SESSION_KEY: "sb_session",

  getStoredSession() {
    try {
      const raw = localStorage.getItem(this.SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  saveSession(res, prev) {
    if (!res || !res.access_token) return;
    const prevSess = prev || this.getStoredSession();
    const expiresAt = res.expires_at
      ? (String(res.expires_at).length < 13 ? Number(res.expires_at) * 1000 : Number(res.expires_at))
      : Date.now() + (Number(res.expires_in) || 3600) * 1000;
    localStorage.setItem(this.SESSION_KEY, JSON.stringify({
      access_token: res.access_token,
      refresh_token: res.refresh_token || (prevSess && prevSess.refresh_token) || null,
      expires_at: expiresAt,
    }));
  },

  clearSession() {
    localStorage.removeItem(this.SESSION_KEY);
  },

  getAccessToken() {
    const sess = this.getStoredSession();
    if (!sess || !sess.access_token) return "";
    if (sess.expires_at && Date.now() > sess.expires_at) return sess.access_token;
    return sess.access_token;
  },

  async authFetch(path, body) {
    const res = await fetch(`${this.SUPABASE_URL}/auth/v1/${path}`, {
      method: "POST",
      headers: {
        apikey: this.SUPABASE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error_description || data.msg || data.error || `登入失敗 (${res.status})`);
      err.data = data;
      throw err;
    }
    return data;
  },

  async login(email, password) {
    const res = await this.authFetch("token?grant_type=password", { email, password });
    this.saveSession(res);
    return res;
  },

  async signup(email, password) {
    try {
      return await this.authFetch("signup", { email, password });
    } catch (e) {
      return e.data || { error: e.message };
    }
  },

  async recover(email) {
    const res = await fetch(`${this.SUPABASE_URL}/auth/v1/recover`, {
      method: "POST",
      headers: { apikey: this.SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return res.json();
  },

  async updatePassword(accessToken, password) {
    const res = await fetch(`${this.SUPABASE_URL}/auth/v1/user`, {
      method: "PUT",
      headers: {
        apikey: this.SUPABASE_KEY,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });
    return res.json();
  },

  async submitRequest(email, displayName, message, accessToken, userId) {
    const body = {
      email,
      display_name: displayName || null,
      message: message || null,
      status: "pending",
    };
    if (accessToken && userId) body.user_id = userId;
    const res = await fetch(`${this.SUPABASE_URL}/rest/v1/user_requests`, {
      method: "POST",
      headers: {
        apikey: this.SUPABASE_KEY,
        Authorization: `Bearer ${accessToken || this.SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "申請送出失敗");
    }
    return res.json();
  },

  async api(action, extra) {
    const headers = { "Content-Type": "application/json" };
    const token = this.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch("/api/scouting", {
      method: "POST",
      headers,
      body: JSON.stringify({ action, ...(extra || {}) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `請求失敗 (${res.status})`);
    return data;
  },

  recoveryTokenFromHash() {
    const hash = window.location.hash.replace(/^#/, "");
    const params = new URLSearchParams(hash);
    if (params.get("type") === "recovery") return params.get("access_token") || "";
    return "";
  },
};
