/**
 * admin.js
 * ══════════════════════════════════════════════════════════════
 * Organiser dashboard logic:
 *   • Password-protected login
 *   • Stats, participant table, winner history
 *   • Lucky draw (with optional wheel animation)
 *   • CSV export
 *   • Live search
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  "use strict";

  /* ════════════════════════════════
     STATE
  ════════════════════════════════ */
  let participants = [];   // All entries from sheet
  let winners      = [];   // Winner history from sheet
  let authToken    = "";   // Echoed from backend on login
  // Show login gate on load
document.getElementById('loginGate').hidden = false;
document.getElementById('adminDash').hidden = true;

  /* ════════════════════════════════
     DOM REFS
  ════════════════════════════════ */
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

  /* ════════════════════════════════
     HELPERS
  ════════════════════════════════ */

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
    body: JSON.stringify({ ...payload, token: authToken }),
  }).then(r => r.json());
}

  /* ════════════════════════════════
     LOGIN / LOGOUT
  ════════════════════════════════ */

  function setLoginLoading(on) {
    loginBtn.disabled = on;
    loginBtn.querySelector(".btn-label").hidden = on;
    loginBtn.querySelector(".btn-spinner").hidden = !on;
  }

  loginBtn.addEventListener("click", async () => {
    const pass = sanitize(adminPassEl.value);
    if (!pass) { loginError.textContent = "Password is required."; return; }
    loginError.textContent = "";

    setLoginLoading(true);
    try {
      const data = await apiRequest({ action: "adminLogin", password: pass });
      if (data.status === "success") {
        authToken = data.token || "";
        loginGate.hidden  = true;
        adminDash.hidden  = false;
        await loadDashboard();
      } else {
        loginError.textContent = "Incorrect password. Please try again.";
      }
    } catch (err) {
      // Fallback: allow local password check when script isn't set up yet
      if (pass === CONFIG.ADMIN_PASSWORD) {
        loginGate.hidden = true;
        adminDash.hidden = false;
        loginError.textContent = "";
        await loadDashboard();
      } else {
        loginError.textContent = err.message.includes("not configured")
          ? "⚙️ Script URL not configured — check js/config.js"
          : "Incorrect password.";
      }
    } finally {
      setLoginLoading(false);
    }
  });

  adminPassEl.addEventListener("keydown", e => {
    if (e.key === "Enter") loginBtn.click();
  });

  logoutBtn.addEventListener("click", () => {
    authToken = "";
    participants = [];
    winners = [];
    loginGate.hidden  = false;
    adminDash.hidden  = true;
    adminPassEl.value = "";
  });

  /* ════════════════════════════════
     SIDEBAR TABS
  ════════════════════════════════ */

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

  /* ════════════════════════════════
     LOAD DASHBOARD DATA
  ════════════════════════════════ */

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
    } catch (err) {
      // In demo/unconfigured mode, show placeholder rows
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

  /* ════════════════════════════════
     OVERVIEW TAB
  ════════════════════════════════ */

  function refreshOverview() {
    statTotal.textContent   = participants.length;
    statUnique.textContent  = new Set(participants.map(p => p.email)).size;
    statWinners.textContent = winners.length;

    // Show latest 5 in Recent table
    const recent = [...participants].reverse().slice(0, 5);
    recentBody.innerHTML = recent.map(p => `
      <tr>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.email)}</td>
        <td>${formatDate(p.timestamp)}</td>
      </tr>
    `).join("") || `<tr><td colspan="3" style="color:var(--text-muted);text-align:center">No entries yet</td></tr>`;
  }

  /* ════════════════════════════════
     PARTICIPANTS TAB
  ════════════════════════════════ */

  function renderParticipantsTable(data) {
    participantsBody.innerHTML = data.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.email)}</td>
        <td>${formatDate(p.timestamp)}</td>
      </tr>
    `).join("") || `<tr><td colspan="4" style="color:var(--text-muted);text-align:center">No participants yet</td></tr>`;
    participantCount.textContent = data.length
      ? `Showing ${data.length} participant${data.length !== 1 ? "s" : ""}`
      : "";
  }

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.toLowerCase().trim();
    if (!q) {
      renderParticipantsTable(participants);
      return;
    }
    const filtered = participants.filter(p =>
      p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
    );
    renderParticipantsTable(filtered);
  });

  /* ════════════════════════════════
     WINNERS TAB
  ════════════════════════════════ */

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

  /* ════════════════════════════════
     LUCKY DRAW
  ════════════════════════════════ */

  drawBtn.addEventListener("click", async () => {
    if (participants.length === 0) {
      alert("There are no participants to draw from.");
      return;
    }

    /* Identify already-won emails so we don't repeat */
    const wonEmails = new Set(winners.map(w => w.email.toLowerCase()));
    const eligible  = participants.filter(p => !wonEmails.has(p.email.toLowerCase()));

    if (eligible.length === 0) {
      alert("All registered participants have already been drawn as winners.");
      return;
    }

    drawBtn.disabled = true;
    winnerAnnounce.hidden = true;

    /* ── Select winner locally (fair random) ── */
    const winnerIdx = Math.floor(Math.random() * eligible.length);
    const winner    = eligible[winnerIdx];

    const useWheel = useWheelChk && useWheelChk.checked;

    if (useWheel && typeof WheelSpin !== "undefined") {
      /* Show wheel with participant names (cap at 20 for readability) */
      const labels = eligible.slice(0, 20).map(p => p.name);
      const wheelWinnerIdx = eligible.indexOf(winner) % labels.length;

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

    /* Save to backend */
    try {
      await apiRequest({
        action:  "saveWinner",
        name:    winner.name,
        email:   winner.email,
        drawnAt,
      });
    } catch (_) {
      /* If backend unavailable, at least display locally */
    }

    /* Add to local winners list */
    const winnerRecord = { name: winner.name, email: winner.email, drawnAt };
    winners.unshift(winnerRecord);
    renderWinnersTable(winners);
    refreshOverview();

    /* Announce */
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

  /* ════════════════════════════════
     CSV EXPORT
  ════════════════════════════════ */

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
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  exportParticipantsBtn.addEventListener("click", () => {
    if (!participants.length) { alert("No participants to export."); return; }
    const csv = toCSV(
      participants.map(p => [p.name, p.email, p.timestamp]),
      ["Full Name", "Email Address", "Submitted At"]
    );
    downloadCSV(csv, "wmd-participants.csv");
  });

  exportWinnersBtn.addEventListener("click", () => {
    if (!winners.length) { alert("No winners to export."); return; }
    const csv = toCSV(
      winners.map(w => [w.name, w.email, w.drawnAt]),
      ["Winner Name", "Email Address", "Drawn At"]
    );
    downloadCSV(csv, "wmd-winners.csv");
  });

  /* ════════════════════════════════
     AUTO-REFRESH (every 60 s)
  ════════════════════════════════ */

  setInterval(async () => {
    if (adminDash.hidden) return;
    await loadDashboard();
  }, 60_000);
})();
