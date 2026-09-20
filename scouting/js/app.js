/* ===========================================================
   app.js — UI wiring for 勘景資料系統 (online, per-project URL)
=========================================================== */

const CAT_COLORS = ["--cat-0", "--cat-1", "--cat-2", "--cat-3", "--cat-4", "--cat-5"];

let state = {
  categories: [],
  entries: [],
  photos: [],
  currentEntryId: null,
};

const el = (id) => document.getElementById(id);

window.addEventListener("DOMContentLoaded", init);

function parseProjectToken() {
  const path = window.location.pathname.replace(/\/+$/, "");
  const match = path.match(/\/scouting\/p\/([^/]+)$/);
  if (match) return decodeURIComponent(match[1]);
  return new URLSearchParams(window.location.search).get("token") || "";
}

function showGate(title, message) {
  document.querySelector(".app").innerHTML = `
    <div style="grid-column:1/-1; padding:60px; max-width:640px; margin:0 auto; line-height:1.7;">
      <h2 style="color:#8C2F1E;">${escapeHtml(title)}</h2>
      <p>${message}</p>
    </div>
  `;
}

function showFatalError(err) {
  console.error(err);
  showGate(t("loadFailedTitle"), `${escapeHtml(String((err && err.message) || err))}`);
}

function setupLangSelect() {
  const sel = el("langSelect");
  if (!sel) return;
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
    renderSidebar();
    populateCategorySelect();
    populateStatusSelect(el("fieldStatus") && el("fieldStatus").value);
  });
}

async function init() {
  loadLang();
  setupLangSelect();
  applyI18n();
  populateStatusSelect("pending");
  el("projectName").textContent = t("loading");

  const token = parseProjectToken();
  if (!token) {
    showGate(t("needLinkTitle"), t("needLinkBody"));
    return;
  }

  DB.setToken(token);
  bindStaticEvents();
  try {
    const data = await DB.loadProject();
    applyProjectData(data);
  } catch (err) {
    showFatalError(err);
  }
}

function alertError(err, action) {
  console.error(err);
  alert(`${action}：${(err && err.message) || err}`);
}

function applyProjectData(data) {
  state.categories = data.categories || [];
  state.entries = data.entries || [];
  state.photos = data.photos || [];
  if (data.project) {
    DB.project = data.project;
    el("projectName").textContent = data.project.name;
  }
  if (state.currentEntryId && !state.entries.some((e) => e.id === state.currentEntryId)) {
    state.currentEntryId = null;
    el("entryForm").hidden = true;
    el("emptyState").hidden = false;
  }
  renderSidebar();
  populateCategorySelect();
  if (state.currentEntryId) selectEntry(state.currentEntryId);
}

function catColor(letter) {
  const idx = state.categories.findIndex((c) => c.letter === letter);
  const varName = CAT_COLORS[idx % CAT_COLORS.length] || "--cat-0";
  return `var(${varName})`;
}

function renderSidebar() {
  const container = el("categoryList");
  container.innerHTML = "";
  el("entryCount").textContent = t("entryCount", { n: state.entries.length });

  state.categories.forEach((cat, idx) => {
    const group = document.createElement("div");
    group.className = "category-group";

    const head = document.createElement("div");
    head.className = "category-group-head";
    head.title = t("addUnderType");
    head.innerHTML = `
      <span class="category-dot" style="background:${catColor(cat.letter)}"></span>
      <span class="category-letter">${escapeHtml(cat.letter)}</span>
      <span class="category-group-name">${escapeHtml(cat.name)}</span>
      <span class="category-actions">
        <button type="button" class="category-icon" data-act="up" ${idx === 0 ? "disabled" : ""} title="${escapeAttr(t("moveTypeUp"))}">↑</button>
        <button type="button" class="category-icon" data-act="down" ${idx === state.categories.length - 1 ? "disabled" : ""} title="${escapeAttr(t("moveTypeDown"))}">↓</button>
        <button type="button" class="category-icon" data-act="rename" title="${escapeAttr(t("renameType"))}">✎</button>
        <button type="button" class="category-icon" data-act="delete" title="${escapeAttr(t("deleteType"))}">×</button>
      </span>
      <button type="button" class="category-add" title="${escapeAttr(t("addUnderType"))}">+</button>
    `;
    head.addEventListener("click", (ev) => {
      if (ev.target.closest(".category-actions")) return;
      addEntryUnder(cat.letter);
    });
    head.querySelector(".category-actions").addEventListener("click", (ev) => {
      ev.stopPropagation();
      const btn = ev.target.closest("[data-act]");
      if (!btn || btn.disabled) return;
      const act = btn.getAttribute("data-act");
      if (act === "up") moveType(cat.letter, "up");
      else if (act === "down") moveType(cat.letter, "down");
      else if (act === "rename") renameType(cat);
      else if (act === "delete") deleteType(cat);
    });
    group.appendChild(head);

    const entries = state.entries
      .filter((e) => e.categoryLetter === cat.letter)
      .sort((a, b) => a.sequence - b.sequence);

    entries.forEach((entry) => {
      const item = document.createElement("div");
      item.className = "entry-item" + (entry.id === state.currentEntryId ? " active" : "");
      item.style.borderLeftColor = entry.id === state.currentEntryId ? catColor(cat.letter) : "transparent";
      item.innerHTML = `
        <span class="entry-item-tag">${cat.letter}${entry.sequence}</span>
        <span class="entry-item-name ${entry.name ? "" : "untitled"}">${escapeHtml(entry.name || t("untitled"))}</span>
        <span class="entry-item-status status-${escapeAttr(entry.status || "pending")}">${escapeHtml(statusLabel(entry.status))}</span>
      `;
      item.addEventListener("click", () => selectEntry(entry.id));
      group.appendChild(item);
    });

    container.appendChild(group);
  });
}

function populateCategorySelect() {
  const sel = el("fieldCategory");
  sel.innerHTML = "";
  state.categories.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat.letter;
    opt.textContent = `${cat.letter} · ${cat.name}`;
    sel.appendChild(opt);
  });
}

const STATUS_KEYS = [
  ["pending", "statusPending"],
  ["available", "statusAvailable"],
  ["conditional", "statusConditional"],
  ["unavailable", "statusUnavailable"],
];

function statusLabel(value) {
  const found = STATUS_KEYS.find(([v]) => v === value);
  return found ? t(found[1]) : t("statusPending");
}

function populateStatusSelect(current) {
  const sel = el("fieldStatus");
  if (!sel) return;
  const keep = current || sel.value || "pending";
  sel.innerHTML = "";
  STATUS_KEYS.forEach(([value, key]) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = t(key);
    sel.appendChild(opt);
  });
  sel.value = STATUS_KEYS.some(([v]) => v === keep) ? keep : "pending";
}

function currentEntry() {
  return state.entries.find((e) => e.id === state.currentEntryId) || null;
}

async function selectEntry(id) {
  state.currentEntryId = id;
  const entry = currentEntry();
  if (!entry) return;

  el("emptyState").hidden = true;
  el("entryForm").hidden = false;

  el("entryTag").textContent = `${entry.categoryLetter}${entry.sequence}`;
  el("entryTag").style.background = catColor(entry.categoryLetter);
  el("fieldName").value = entry.name || "";
  el("fieldCategory").value = entry.categoryLetter;
  populateStatusSelect(entry.status || "pending");
  el("fieldAddress").value = entry.address || "";
  el("fieldAccess").value = entry.access || "";
  el("fieldHours").value = entry.hours || "";
  el("fieldCondition").value = entry.condition || entry.background || "";
  el("fieldContact").value = entry.contact || "";
  el("fieldFee").value = entry.fee || "";
  el("fieldRules").value = entry.rules || "";
  el("fieldMapLink").value = entry.mapLink || "";
  el("fieldPhotoLink").value = entry.photoLink || "";
  el("saveStatus").textContent = "";
  el("saveStatus").className = "save-status";

  renderPhotoGrid(id);
  renderSidebar();
}

async function renameType(cat) {
  const next = window.prompt(t("renameType"), cat.name);
  if (next == null) return;
  const name = next.trim();
  if (!name || name === cat.name) return;
  try {
    const saved = await DB.updateCategory(cat.letter, name);
    const idx = state.categories.findIndex((c) => c.letter === cat.letter);
    if (idx >= 0) state.categories[idx] = saved;
    renderSidebar();
    populateCategorySelect();
    if (state.currentEntryId) selectEntry(state.currentEntryId);
  } catch (err) {
    alertError(err, t("failCategory"));
  }
}

async function moveType(letter, direction) {
  try {
    const data = await DB.moveCategory(letter, direction);
    applyProjectData(data);
  } catch (err) {
    alertError(err, t("failCategory"));
  }
}

async function deleteType(cat) {
  const n = state.entries.filter((e) => e.categoryLetter === cat.letter).length;
  if (!confirm(t("confirmDeleteType", { letter: cat.letter, name: cat.name, n }))) return;
  try {
    const data = await DB.deleteCategory(cat.letter);
    applyProjectData(data);
  } catch (err) {
    alertError(err, t("failCategory"));
  }
}

async function addEntryUnder(categoryLetter) {
  try {
    const entry = await DB.addEntry(categoryLetter);
    state.entries.push(entry);
    renderSidebar();
    await selectEntry(entry.id);
    el("fieldName").focus();
  } catch (err) {
    alertError(err, t("failAddEntry"));
  }
}

function populateEntryTypeSelect() {
  const sel = el("entryTypeSelect");
  sel.innerHTML = "";
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = t("pickType");
  sel.appendChild(blank);
  state.categories.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat.letter;
    opt.textContent = `${cat.letter} · ${cat.name}`;
    sel.appendChild(opt);
  });
  sel.hidden = state.categories.length === 0;
}

function openEntryModal() {
  populateEntryTypeSelect();
  el("entryTypeCustom").value = "";
  const hasTypes = state.categories.length > 0;
  el("entryTypeSelect").hidden = !hasTypes;
  const typeLabel = document.querySelector("label[for='entryTypeSelect']");
  if (typeLabel) typeLabel.hidden = !hasTypes;
  el("entryModal").hidden = false;
  if (hasTypes) el("entryTypeSelect").focus();
  else el("entryTypeCustom").focus();
}

function closeEntryModal() {
  el("entryModal").hidden = true;
}

async function createNewEntry() {
  openEntryModal();
}

function findCategoryByName(name) {
  const key = name.trim().toLowerCase();
  return state.categories.find((c) => c.name.trim().toLowerCase() === key) || null;
}

async function confirmNewEntry() {
  const custom = el("entryTypeCustom").value.trim();
  const picked = el("entryTypeSelect").value;
  try {
    let letter = picked;
    if (custom) {
      const existing = findCategoryByName(custom);
      if (existing) {
        letter = existing.letter;
      } else {
        const cat = await DB.addCategory(custom);
        state.categories.push(cat);
        letter = cat.letter;
      }
    }
    if (!letter) {
      alert(t("needType"));
      return;
    }
    closeEntryModal();
    populateCategorySelect();
    await addEntryUnder(letter);
  } catch (err) {
    alertError(err, t("failAddEntry"));
  }
}

let saveTimer = null;
function scheduleSave() {
  el("saveStatus").textContent = t("editing");
  el("saveStatus").className = "save-status";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveCurrentEntry, 500);
}

async function saveCurrentEntry() {
  if (!state.currentEntryId) return;
  try {
    const entry = currentEntry();
    if (!entry) return;

    entry.categoryLetter = el("fieldCategory").value;
    entry.name = el("fieldName").value.trim();
    entry.status = el("fieldStatus").value;
    entry.address = el("fieldAddress").value.trim();
    entry.access = el("fieldAccess").value;
    entry.hours = el("fieldHours").value.trim();
    entry.condition = el("fieldCondition").value;
    entry.contact = el("fieldContact").value.trim();
    entry.fee = el("fieldFee").value;
    entry.rules = el("fieldRules").value;
    entry.mapLink = el("fieldMapLink").value.trim();
    entry.photoLink = el("fieldPhotoLink").value.trim();

    const saved = await DB.updateEntry(entry);
    const idx = state.entries.findIndex((e) => e.id === saved.id);
    if (idx >= 0) state.entries[idx] = saved;

    el("entryTag").textContent = `${saved.categoryLetter}${saved.sequence}`;
    el("entryTag").style.background = catColor(saved.categoryLetter);
    el("saveStatus").textContent = t("saved");
    el("saveStatus").className = "save-status saved";
    renderSidebar();
  } catch (err) {
    el("saveStatus").textContent = t("saveFailed");
    el("saveStatus").className = "save-status";
    alertError(err, t("failSave"));
  }
}

async function deleteCurrentEntry() {
  if (!state.currentEntryId) return;
  const entry = currentEntry();
  const label = entry ? (entry.name || `${entry.categoryLetter}${entry.sequence}`) : t("thisEntry");
  if (!confirm(t("confirmDelete", { name: label }))) return;

  try {
    await DB.deleteEntry(state.currentEntryId);
    state.photos = state.photos.filter((p) => p.entryId !== state.currentEntryId);
    state.entries = state.entries.filter((e) => e.id !== state.currentEntryId);
    state.currentEntryId = null;
    renderSidebar();
    el("entryForm").hidden = true;
    el("emptyState").hidden = false;
  } catch (err) {
    alertError(err, t("failDelete"));
  }
}

function renderPhotoGrid(entryId) {
  const grid = el("photoGrid");
  grid.querySelectorAll(".photo-cell").forEach((n) => n.remove());
  const addTile = grid.querySelector(".photo-add");
  const photos = state.photos
    .filter((p) => p.entryId === entryId)
    .sort((a, b) => a.order - b.order);

  photos.forEach((photo) => {
    const cell = document.createElement("div");
    cell.className = "photo-cell";
    cell.innerHTML = `
      <img src="${escapeAttr(photo.url)}" alt="場景照片">
      <button type="button" class="photo-remove" title="${escapeAttr(t("deletePhoto"))}">×</button>
    `;
    cell.querySelector("img").addEventListener("click", () => openLightbox(photo.url));
    cell.querySelector(".photo-remove").addEventListener("click", async (ev) => {
      ev.stopPropagation();
      try {
        await DB.deletePhoto(photo.id);
        state.photos = state.photos.filter((p) => p.id !== photo.id);
        renderPhotoGrid(entryId);
      } catch (err) {
        alertError(err, t("failDeletePhoto"));
      }
    });
    grid.insertBefore(cell, addTile);
  });
}

async function handlePhotoFiles(files) {
  if (!state.currentEntryId) return;
  try {
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const blob = await downscaleImage(file, 1920, 0.85);
      const dataUrl = await blobToDataUrl(blob);
      const photo = await DB.addPhoto(state.currentEntryId, dataUrl);
      state.photos.push(photo);
    }
    renderPhotoGrid(state.currentEntryId);
  } catch (err) {
    alertError(err, t("failPhoto"));
  }
}

function downscaleImage(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => { img.src = reader.result; };
    reader.onerror = reject;
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function openLightbox(url) {
  el("lightboxImg").src = url;
  el("lightbox").hidden = false;
}

function openCategoryModal() {
  el("newCategoryName").value = "";
  el("categoryModal").hidden = false;
  el("newCategoryName").focus();
}

async function confirmNewCategory() {
  const name = el("newCategoryName").value.trim();
  if (!name) return;
  try {
    const cat = await DB.addCategory(name);
    state.categories.push(cat);
    renderSidebar();
    populateCategorySelect();
    el("categoryModal").hidden = true;
  } catch (err) {
    alertError(err, t("failCategory"));
  }
}

async function copyProjectLink() {
  const url = `${window.location.origin}/scouting/p/${DB.token}`;
  try {
    await navigator.clipboard.writeText(url);
    el("copyStatus").textContent = t("copied");
    setTimeout(() => { el("copyStatus").textContent = ""; }, 2000);
  } catch {
    prompt(t("copyLink"), url);
  }
}

function entryPhotos(entryId) {
  return state.photos
    .filter((p) => p.entryId === entryId)
    .sort((a, b) => a.order - b.order);
}

function printField(label, hint, value) {
  const text = (value || "").trim();
  return `
    <div class="print-field">
      <div class="print-label">${escapeHtml(label)}</div>
      ${hint ? `<div class="print-hint">${escapeHtml(hint)}</div>` : ""}
      <div class="print-value">${text ? escapeHtml(text).replaceAll("\n", "<br>") : "—"}</div>
    </div>
  `;
}

function printPhotoCells(photos, size) {
  const cells = photos.slice();
  while (cells.length && cells.length < size) cells.push(null);
  return cells.map((p) => (
    p
      ? `<div class="print-photo"><img src="${escapeAttr(p.url)}" alt=""></div>`
      : `<div class="print-photo print-photo-empty"></div>`
  )).join("");
}

function chunkPhotos(photos, size) {
  const chunks = [];
  for (let i = 0; i < photos.length; i += size) chunks.push(photos.slice(i, i + size));
  return chunks;
}

function buildPrintPages(entry) {
  const tag = `${entry.categoryLetter}${entry.sequence}`;
  const typeName = (state.categories.find((c) => c.letter === entry.categoryLetter) || {}).name || "";
  const placeName = entry.name || t("untitled");
  const name = typeName ? `${typeName}・${placeName}` : placeName;
  const project = (DB.project && DB.project.name) || "";
  const photos = entryPhotos(entry.id);
  const first = photos.slice(0, 2);
  const rest = photos.slice(2);

  const infoPage = `
    <section class="print-page print-page-info">
      <header class="print-head">
        <span class="print-tag">${escapeHtml(tag)}</span>
        <div>
          <h1>${escapeHtml(name)}</h1>
          <p>${escapeHtml(project)} · ${escapeHtml(statusLabel(entry.status))} · ${escapeHtml(t("printFooter"))}</p>
        </div>
      </header>
      ${printField(t("fieldAddress"), "", entry.address)}
      <div class="print-row">
        ${printField(t("fieldAccess"), t("fieldAccessHint"), entry.access)}
        ${printField(t("fieldHours"), t("fieldHoursHint"), entry.hours)}
      </div>
      <div class="print-row">
        ${printField(t("fieldCondition"), t("fieldConditionHint"), entry.condition || entry.background)}
        ${printField(t("fieldContact"), t("fieldContactHint"), entry.contact)}
      </div>
      <div class="print-row">
        ${printField(t("fieldFee"), t("fieldFeeHint"), entry.fee)}
        ${printField(t("fieldRules"), t("fieldRulesHint"), entry.rules)}
      </div>
      <div class="print-row">
        ${printField(t("fieldMap"), "", entry.mapLink)}
        ${printField(t("fieldPhotoLink"), "", entry.photoLink)}
      </div>
      ${first.length ? `<div class="print-photos-2">${printPhotoCells(first, 2)}</div>` : ""}
    </section>
  `;

  const photoPages = chunkPhotos(rest, 4).map((group) => `
    <section class="print-page print-page-photos">
      <header class="print-head print-head-slim">
        <span class="print-tag">${escapeHtml(tag)}</span>
        <h1>${escapeHtml(name)}</h1>
      </header>
      <div class="print-photos-4">${printPhotoCells(group, 4)}</div>
    </section>
  `).join("");

  return infoPage + photoPages;
}

async function waitPrintImages(root) {
  const imgs = [...root.querySelectorAll("img")];
  await Promise.all(imgs.map((img) => (
    img.complete ? Promise.resolve() : new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    })
  )));
}

async function printEntries(entries) {
  if (!entries.length) {
    alert(t("failPrint"));
    return;
  }
  const root = el("printRoot");
  const list = entries.slice().sort((a, b) => {
    if (a.categoryLetter !== b.categoryLetter) return a.categoryLetter.localeCompare(b.categoryLetter);
    return a.sequence - b.sequence;
  });
  root.innerHTML = list.map(buildPrintPages).join("");
  await waitPrintImages(root);
  const cleanup = () => {
    root.innerHTML = "";
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
}

async function exportBackup() {
  const data = await DB.exportAll(state.categories, state.entries, state.photos);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `勘景資料_${(DB.project && DB.project.name) || "backup"}_${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function bindStaticEvents() {
  el("btnNewEntry").addEventListener("click", createNewEntry);
  el("btnNewCategory").addEventListener("click", openCategoryModal);
  el("btnCancelCategory").addEventListener("click", () => { el("categoryModal").hidden = true; });
  el("btnConfirmCategory").addEventListener("click", confirmNewCategory);
  el("newCategoryName").addEventListener("keydown", (e) => { if (e.key === "Enter") confirmNewCategory(); });
  el("btnCancelEntry").addEventListener("click", closeEntryModal);
  el("btnConfirmEntry").addEventListener("click", confirmNewEntry);
  el("entryTypeCustom").addEventListener("keydown", (e) => { if (e.key === "Enter") confirmNewEntry(); });
  el("btnDeleteEntry").addEventListener("click", deleteCurrentEntry);
  el("btnCopyLink").addEventListener("click", copyProjectLink);
  el("btnPrint").addEventListener("click", () => printEntries([currentEntry()].filter(Boolean)));
  el("btnPrintAll").addEventListener("click", () => printEntries(state.entries.slice()));

  ["fieldName", "fieldCategory", "fieldStatus", "fieldAddress", "fieldAccess", "fieldHours", "fieldCondition", "fieldContact", "fieldFee", "fieldRules", "fieldMapLink", "fieldPhotoLink"]
    .forEach((id) => {
      el(id).addEventListener("input", scheduleSave);
      el(id).addEventListener("change", scheduleSave);
    });

  el("photoGrid").addEventListener("click", (e) => {
    if (e.target.closest(".photo-add")) el("photoInput").click();
  });
  el("photoInput").addEventListener("change", (e) => handlePhotoFiles(e.target.files));
  el("photoGrid").addEventListener("dragover", (e) => e.preventDefault());
  el("photoGrid").addEventListener("drop", (e) => {
    e.preventDefault();
    handlePhotoFiles(e.dataTransfer.files);
  });

  el("lightboxClose").addEventListener("click", () => { el("lightbox").hidden = true; });
  el("lightbox").addEventListener("click", (e) => { if (e.target === el("lightbox")) el("lightbox").hidden = true; });
  el("btnExportJson").addEventListener("click", exportBackup);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return String(str || "").replace(/"/g, "&quot;");
}
