/**
 * admin.js — Fixed version with reliable login flow and correct wheel sync
 */

(function () {
  "use strict";

  /* ── State ── */
  let participants = [];
  let winners      = [];
  let authToken    = "";

  /* ── DOM refs ── */
  const loginGate    = document.getElementById("loginGate");
  const adminDash    = document.getElementById("adminDash");
  const loginBtn     = document.getElementById("loginBtn");
  const adminPassEl  = document.getElementById("adminPass");
  const loginError   = document.getElementById("loginError");
  const logoutBtn    = document.getElementById("logoutBtn");

  const statTotal    = document.getElementById("statTotal");
  const statUnique   = document.getElementById("statUnique");
  const statWinners  = document.getElementById("statWinners");
  const recentBody   = document.getElementById("recentBody");
  const participantsBody = document.getElementById("participantsBody");
  const participantCount = document.getElementById("participantCount");
  const winnersBody  = document.getElementById("winnersBody");
  const winnerCount  = document.getElementById("winnerCount");
  const searchInput  = document.getElementById("searchInput");
  const drawBtn      = document.getElementById("drawBtn");
  const useWheelChk  = document.getElementById("useWheelChk");
  const winnerAnnounce = document.getElementById("winnerAnnounce");
  const exportParticipantsBtn = document.getElementById("exportParticipantsBtn");
  const exportWinnersBtn      = document.getElementById("exportWinnersBtn");

  /* ── Force correct initial state ── */
  function showLoginGate() {
    loginGate.style.display = "flex";
    loginGate.hidden = false;
    adminDash.style.display = "none";
    adminDash.hidden = true;
  }

  function showDashboard() {
    loginGate.style.display = "none";
    loginGate.hidden = true;
    adminDash.style.display = "flex";
    adminDash.hidden = false;
  }

  /* Show login on load */
  showLoginGate();

  /* ── Helpers ── */
  function sanitize(str) {
    return String(str || "").replace(/<[^>]*>/g, "").replace(/[<>"'`]/g, "").trim().slice(0, 300);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(isoStr) {
    if (!isoStr) return "—";
    try {
      return new Date(isoStr).toLocaleString(undefined, {
        dateStyle: "medium", timeStyle: "short",
      });
    } catch (_) { return isoStr; }
  }

  function apiRequest(payload) {
    if (!CONFIG.SCRIPT_URL || CONFIG.SCRIPT_URL.includes("YOUR_GOOGLE")) {
      return Promise.reject(new Error("Script URL not configured."));
    }
    return fetch(CONFIG.SCRIPT_URL, {
      method: "POST",
      redirect: "follow",
      body: JSON.stringify({ ...payload, token: "admin-token-2026" }),
    }).then(r => r.json());
  }

  /* ── Login ── */
  function setLoginLoading(on) {
    loginBtn.disabled = on;
    loginBtn.querySelector(".btn-label").hidden = on;
    loginBtn.querySelector(".btn-spinner").hidden = !on;
  }

  loginBtn.addEventListener("click", async () => {
    const pass = sanitize(adminPassEl.value);
    if (!pass) {
      loginError.textContent = "Password is required.";
      return;
    }
    loginError.textContent = "";
    setLoginLoading(true);

    if (pass !== CONFIG.ADMIN_PASSWORD) {
      loginError.textContent = "Incorrect password. Please try again.";
      setLoginLoading(false);
      return;
    }

    showDashboard();

    try {
      const data = await apiRequest({ action: "adminLogin", password: pass });
      if (data.status === "success") authToken = data.token || "";
    } catch (_) {}

    await loadDashboard();
    setLoginLoading(false);
  });

  adminPassEl.addEventListener("keydown", e => {
    if (e.key === "Enter") loginBtn.click();
  });

  /* ── Logout ── */
  logoutBtn.addEventListener("click", () => {
    authToken = "";
    participants = [];
    winners = [];
    adminPassEl.value = "";
    showLoginGate();
  });

  /* ── Tabs ── */
  document.querySelectorAll(".side-link[data-tab]").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const tab = link.dataset.tab;
      document.querySelectorAll(".side-link").forEach(l => l.classList.remove("active"));
      link.classList.add("active");
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      const panel = document.getElementById("tab-" + tab);
      if (panel) panel.classList.add("active");
    });
  });

  /* ── Load dashboard ── */
  async function loadDashboard() {
    await Promise.all([loadParticipants(), loadWinners()]);
    refreshOverview();
  }

  async function loadParticipants() {
    try {
      const data = await apiRequest({ action: "getParticipants" });
      if (data.status === "success") {
        participants = data.entries || [];
        renderParticipantsTable(participants);
      }
    } catch (_) {
      participants = [];
      renderParticipantsTable([]);
    }
  }

  async function loadWinners() {
    try {
      const data = await apiRequest({ action: "getWinners" });
      if (data.status === "success") {
        winners = data.winners || [];
        renderWinnersTable(winners);
      }
    } catch (_) {
      winners = [];
      renderWinnersTable([]);
    }
  }

  /* ── Overview ── */
  function refreshOverview() {
    statTotal.textContent   = participants.length;
    statUnique.textContent  = new Set(participants.map(p => p.email)).size;
    statWinners.textContent = winners.length;

    const recent = [...participants].reverse().slice(0, 5);
    recentBody.innerHTML = recent.map(p => `
      <tr>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.email)}</td>
        <td>${formatDate(p.timestamp)}</td>
      </tr>
    `).join("") || `<tr><td colspan="3" style="color:var(--text-muted);text-align:center">No entries yet</td></tr>`;
  }

  /* ── Participants ── */
 function renderParticipantsTable(data) {
  participantsBody.innerHTML = data.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.email)}</td>
      <td>${escapeHtml(p.phone || "—")}</td>
      <td>${formatDate(p.timestamp)}</td>
    </tr>
    `).join("") || `<tr><td colspan="4" style="color:var(--text-muted);text-align:center">No participants yet</td></tr>`;
    participantCount.textContent = data.length
      ? `Showing ${data.length} participant${data.length !== 1 ? "s" : ""}`
      : "";
  }

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.toLowerCase().trim();
    if (!q) { renderParticipantsTable(participants); return; }
    const filtered = participants.filter(p =>
      p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
    );
    renderParticipantsTable(filtered);
  });

  /* ── Winners ── */
  function renderWinnersTable(data) {
    winnersBody.innerHTML = data.map((w, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(w.name)}</td>
        <td>${escapeHtml(w.email)}</td>
        <td>${formatDate(w.drawnAt)}</td>
      </tr>
    `).join("") || `<tr><td colspan="4" style="color:var(--text-muted);text-align:center">No winners yet</td></tr>`;
    winnerCount.textContent = data.length
      ? `${data.length} winner${data.length !== 1 ? "s" : ""} drawn`
      : "";
  }

  /* ── Lucky Draw ── */
  drawBtn.addEventListener("click", async () => {
    if (participants.length === 0) {
      alert("There are no participants to draw from.");
      return;
    }

    const wonEmails = new Set(winners.map(w => w.email.toLowerCase()));
    const eligible  = participants.filter(p => !wonEmails.has(p.email.toLowerCase()));

    if (eligible.length === 0) {
      alert("All participants have already been drawn as winners.");
      return;
    }

    drawBtn.disabled = true;
    winnerAnnounce.hidden = true;

    const winnerIdx = Math.floor(Math.random() * eligible.length);
    const winner    = eligible[winnerIdx];
    const useWheel  = useWheelChk && useWheelChk.checked;

    if (useWheel && typeof WheelSpin !== "undefined") {
      const maxSlice = Math.min(eligible.length, 20);
      const labels = eligible.slice(0, maxSlice).map(p => p.name);
      let wheelWinnerIdx = winnerIdx;
      if (winnerIdx >= maxSlice) {
        labels[0] = winner.name;
        wheelWinnerIdx = 0;
      }
      WheelSpin.show(labels);
      WheelSpin.spin(wheelWinnerIdx, async () => {
        WheelSpin.hide();
        await saveAndAnnounceWinner(winner);
      });
    } else {
      await saveAndAnnounceWinner(winner);
    }
  });

  async function saveAndAnnounceWinner(winner) {
    const drawnAt = new Date().toISOString();
    try {
      await apiRequest({ action: "saveWinner", name: winner.name, email: winner.email, drawnAt });
    } catch (_) {}

    const winnerRecord = { name: winner.name, email: winner.email, drawnAt };
    winners.unshift(winnerRecord);
    renderWinnersTable(winners);
    refreshOverview();

    winnerAnnounce.hidden = false;
    winnerAnnounce.innerHTML = `
      <div class="w-label">🏆 &nbsp; Winner Drawn</div>
      <div class="w-name">${escapeHtml(winner.name)}</div>
      <div class="w-email">${escapeHtml(winner.email)}</div>
      <div class="w-time">Drawn at ${formatDate(drawnAt)}</div>
    `;

    window.launchConfetti && window.launchConfetti(220);
    drawBtn.disabled = false;
  }

  /* ── CSV Export ── */
  function toCSV(rows, headers) {
    const escape = v => `"${String(v || "").replace(/"/g, '""')}"`;
    const lines  = [headers.map(escape).join(",")];
    rows.forEach(row => lines.push(row.map(escape).join(",")));
    return lines.join("\r\n");
  }

  function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  exportParticipantsBtn.addEventListener("click", () => {
    if (!participants.length) { alert("No participants to export."); return; }
    downloadCSV(toCSV(
      participants.map(p => [p.name, p.email, p.timestamp]),
      ["Full Name", "Email Address", "Submitted At"]
    ), "wmd-participants.csv");
  });

  exportWinnersBtn.addEventListener("click", () => {
    if (!winners.length) { alert("No winners to export."); return; }
    downloadCSV(toCSV(
      winners.map(w => [w.name, w.email, w.drawnAt]),
      ["Winner Name", "Email Address", "Drawn At"]
    ), "wmd-winners.csv");
  });

  /* ── Auto refresh every 60s ── */
  setInterval(async () => {
    if (adminDash.style.display === "none") return;
    await loadDashboard();
  }, 60_000);

})();
