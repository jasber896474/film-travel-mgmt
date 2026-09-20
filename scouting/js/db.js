/* ===========================================================
   db.js — 線上版：依專案秘密連結呼叫 /api/scouting
=========================================================== */

const DB = {
  token: "",
  project: null,

  setToken(token) {
    this.token = token || "";
  },

  async request(action, extra = {}) {
    const res = await fetch("/api/scouting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, token: this.token, ...extra }),
    });
    let data = {};
    try { data = await res.json(); } catch { /* ignore */ }
    if (!res.ok) throw new Error(data.error || `請求失敗 (${res.status})`);
    return data;
  },

  async loadProject() {
    const data = await this.request("getProject");
    this.project = data.project;
    return data;
  },

  async addCategory(name) {
    const data = await this.request("addCategory", { name });
    return data.category;
  },

  async updateCategory(letter, name) {
    const data = await this.request("updateCategory", { letter, name });
    return data.category;
  },

  async moveCategory(letter, direction) {
    return this.request("moveCategory", { letter, direction });
  },

  async deleteCategory(letter) {
    return this.request("deleteCategory", { letter });
  },

  async addEntry(categoryLetter) {
    const data = await this.request("addEntry", { categoryLetter });
    return data.entry;
  },

  async updateEntry(entry) {
    const data = await this.request("updateEntry", {
      id: entry.id,
      name: entry.name,
      address: entry.address,
      access: entry.access,
      condition: entry.condition,
      hours: entry.hours,
      contact: entry.contact,
      status: entry.status,
      fee: entry.fee,
      rules: entry.rules,
      mapLink: entry.mapLink,
      photoLink: entry.photoLink,
      categoryLetter: entry.categoryLetter,
    });
    return data.entry;
  },

  async deleteEntry(id) {
    await this.request("deleteEntry", { id });
  },

  async addPhoto(entryId, dataUrl) {
    const data = await this.request("addPhoto", { entryId, dataUrl });
    return data.photo;
  },

  async deletePhoto(id) {
    await this.request("deletePhoto", { id });
  },

  async exportAll(categories, entries, photos) {
    return {
      exportedAt: new Date().toISOString(),
      project: this.project,
      categories,
      entries,
      photos: photos.map((p) => ({
        entryId: p.entryId,
        url: p.url,
        order: p.order,
      })),
    };
  },
};
