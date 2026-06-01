/**
 * Code.gs  —  Google Apps Script Backend
 * ══════════════════════════════════════════════════════════════
 * World Marketing Day Lucky Draw
 *
 * SETUP INSTRUCTIONS (see README.md for full guide):
 *  1. Open Google Sheets → Extensions → Apps Script
 *  2. Replace the default code with this file
 *  3. Set ADMIN_PASSWORD and SHEET_ID constants below
 *  4. Deploy as Web App (Execute as: Me, Access: Anyone)
 *  5. Copy the deployment URL into js/config.js → SCRIPT_URL
 * ══════════════════════════════════════════════════════════════
 */

/* ════════════════════════════════
   CONSTANTS — EDIT THESE
════════════════════════════════ */

/** The ID of your Google Spreadsheet (from the URL). */
const SHEET_ID = "YOUR_GOOGLE_SHEET_ID_HERE";

/** Admin password. Must match CONFIG.ADMIN_PASSWORD in js/config.js */
const ADMIN_PASSWORD = "MarketingDay2026!";

/** Sheet tab names */
const TAB_ENTRIES  = "Entries";
const TAB_WINNERS  = "Winners";

/* ════════════════════════════════
   SESSION TOKENS (in-memory, per deployment)
   For a full-production app use PropertiesService + expiry.
   These are good enough for a one-day event.
════════════════════════════════ */
const VALID_TOKENS = new Set();

function generateToken() {
  return Utilities.getUuid();
}

/* ════════════════════════════════
   HTTP ENTRYPOINTS
════════════════════════════════ */

/**
 * Handle GET requests (used for live count, etc.)
 */
function doGet(e) {
  const action = (e.parameter && e.parameter.action) || "";
  let result;

  try {
    switch (action) {
      case "getCount":
        result = handleGetCount();
        break;
      default:
        result = { status: "ok", message: "World Marketing Day Lucky Draw API" };
    }
  } catch (err) {
    result = { status: "error", message: err.message };
  }

  return buildResponse(result);
}

/**
 * Handle POST requests (form submissions, admin actions).
 */
function doPost(e) {
  let payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (_) {
    return buildResponse({ status: "error", message: "Invalid JSON payload." });
  }

  const action = payload.action || "";
  let result;

  try {
    switch (action) {

      /* ── Public ── */
      case "register":
        result = handleRegister(payload);
        break;

      /* ── Admin auth ── */
      case "adminLogin":
        result = handleAdminLogin(payload);
        break;

      /* ── Admin actions (require token) ── */
      case "getParticipants":
        requireToken(payload.token);
        result = handleGetParticipants();
        break;

      case "getWinners":
        requireToken(payload.token);
        result = handleGetWinners();
        break;

      case "saveWinner":
        requireToken(payload.token);
        result = handleSaveWinner(payload);
        break;

      default:
        result = { status: "error", message: "Unknown action: " + action };
    }
  } catch (err) {
    result = { status: "error", message: err.message };
  }

  return buildResponse(result);
}

/* ════════════════════════════════
   HELPER: Build CORS-enabled JSON response
════════════════════════════════ */
function buildResponse(data) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

/* ════════════════════════════════
   HELPER: Require valid auth token
════════════════════════════════ */
function requireToken(token) {
  if (!token || !VALID_TOKENS.has(token)) {
    throw new Error("Unauthorised. Please log in again.");
  }
}

/* ════════════════════════════════
   HELPER: Get or initialise spreadsheet tabs
════════════════════════════════ */
function getSheet(tabName) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  let sheet   = ss.getSheetByName(tabName);

  /* Create tab with headers if it doesn't exist */
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
    if (tabName === TAB_ENTRIES) {
      sheet.appendRow(["Name", "Email", "Timestamp"]);
      sheet.getRange(1, 1, 1, 3).setFontWeight("bold");
    } else if (tabName === TAB_WINNERS) {
      sheet.appendRow(["Name", "Email", "Drawn At"]);
      sheet.getRange(1, 1, 1, 3).setFontWeight("bold");
    }
  }
  return sheet;
}

/* ════════════════════════════════
   HANDLER: Registration
════════════════════════════════ */
function handleRegister(payload) {
  const name  = sanitizeInput(payload.name  || "");
  const email = sanitizeInput((payload.email || "").toLowerCase());

  /* Validation */
  if (!name || name.length < 2)   throw new Error("Invalid name.");
  if (!isValidEmail(email))       throw new Error("Invalid email address.");

  const sheet = getSheet(TAB_ENTRIES);
  const data  = sheet.getDataRange().getValues();

  /* Check for duplicate email (skip header row) */
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase() === email) {
      return { status: "duplicate", message: "Email already registered." };
    }
  }

  /* Append row */
  const ts = new Date().toISOString();
  sheet.appendRow([name, email, ts]);

  return { status: "success", message: "Entry recorded." };
}

/* ════════════════════════════════
   HANDLER: Live Count
════════════════════════════════ */
function handleGetCount() {
  const sheet = getSheet(TAB_ENTRIES);
  const count = Math.max(0, sheet.getLastRow() - 1); // subtract header
  return { status: "success", count };
}

/* ════════════════════════════════
   HANDLER: Admin Login
════════════════════════════════ */
function handleAdminLogin(payload) {
  const pass = payload.password || "";
  if (pass !== ADMIN_PASSWORD) {
    return { status: "error", message: "Invalid password." };
  }
  const token = generateToken();
  VALID_TOKENS.add(token);
  return { status: "success", token };
}

/* ════════════════════════════════
   HANDLER: Get All Participants
════════════════════════════════ */
function handleGetParticipants() {
  const sheet = getSheet(TAB_ENTRIES);
  const rows  = sheet.getDataRange().getValues();

  const entries = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] && !row[1]) continue; // skip blank rows
    entries.push({
      name:      String(row[0] || ""),
      email:     String(row[1] || ""),
      timestamp: String(row[2] || ""),
    });
  }

  return { status: "success", entries };
}

/* ════════════════════════════════
   HANDLER: Get Winners
════════════════════════════════ */
function handleGetWinners() {
  const sheet = getSheet(TAB_WINNERS);
  const rows  = sheet.getDataRange().getValues();

  const winners = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] && !row[1]) continue;
    winners.push({
      name:    String(row[0] || ""),
      email:   String(row[1] || ""),
      drawnAt: String(row[2] || ""),
    });
  }

  return { status: "success", winners };
}

/* ════════════════════════════════
   HANDLER: Save Winner
════════════════════════════════ */
function handleSaveWinner(payload) {
  const name    = sanitizeInput(payload.name    || "");
  const email   = sanitizeInput((payload.email  || "").toLowerCase());
  const drawnAt = payload.drawnAt || new Date().toISOString();

  if (!name || !email) throw new Error("Winner name and email are required.");

  /* Prevent duplicate winner entries for same email */
  const sheet  = getSheet(TAB_WINNERS);
  const rows   = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).toLowerCase() === email) {
      return { status: "duplicate", message: "This person has already been drawn as a winner." };
    }
  }

  sheet.appendRow([name, email, drawnAt]);
  return { status: "success", message: "Winner saved." };
}

/* ════════════════════════════════
   UTILITIES
════════════════════════════════ */

function sanitizeInput(str) {
  return String(str)
    .replace(/<[^>]*>/g, "")        // strip HTML
    .replace(/[\r\n\t]/g, " ")      // strip control chars
    .trim()
    .slice(0, 300);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}
