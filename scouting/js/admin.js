const el = (id) => document.getElementById(id);

function showResult(path) {
  const url = `${window.location.origin}${path}`;
  el("resultBox").hidden = false;
  el("resultUrl").value = url;
  el("resultHint").textContent = "把這條連結丟給該組即可。知道連結的人能編輯這個劇，看不到其他劇。";
  el("openLink").href = path;
}

async function createProject(ev) {
  ev.preventDefault();
  const adminKey = el("adminKey").value;
  const name = el("projectName").value.trim();
  el("formError").textContent = "";
  el("btnCreate").disabled = true;
  try {
    const res = await fetch("/api/scouting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "createProject", adminKey, name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "建立失敗");
    showResult(data.path);
  } catch (err) {
    el("formError").textContent = err.message || "建立失敗";
  } finally {
    el("btnCreate").disabled = false;
  }
}

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(el("resultUrl").value);
    el("copyBtn").textContent = "已複製";
    setTimeout(() => { el("copyBtn").textContent = "複製連結"; }, 1600);
  } catch {
    el("resultUrl").select();
  }
}

window.addEventListener("DOMContentLoaded", () => {
  el("createForm").addEventListener("submit", createProject);
  el("copyBtn").addEventListener("click", copyUrl);
});
