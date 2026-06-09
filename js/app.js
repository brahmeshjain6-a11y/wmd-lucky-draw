/**
 * app.js
 * ══════════════════════════════════════════════════════════════
 * Registration page logic:
 *   • Input validation & sanitisation
 *   • Submit form to Google Apps Script
 *   • Live entry counter polling
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  "use strict";

  /* ── DOM refs ── */
  const form       = document.getElementById("regForm");
  const nameInput  = document.getElementById("fullName");
  const emailInput = document.getElementById("emailAddr");
  const nameGroup  = document.getElementById("nameGroup");
  const emailGroup = document.getElementById("emailGroup");
  const nameErr    = document.getElementById("nameError");
  const emailErr   = document.getElementById("emailError");
  const phoneInput = document.getElementById("phoneAddr");
  const phoneGroup = document.getElementById("phoneGroup");
  const phoneErr   = document.getElementById("phoneError");
  const submitBtn  = document.getElementById("submitBtn");
  const btnLabel   = submitBtn.querySelector(".btn-label");
  const btnSpinner = submitBtn.querySelector(".btn-spinner");
  const successMsg = document.getElementById("successMsg");
  const errorMsg   = document.getElementById("errorMsg");
  const errorText  = document.getElementById("errorText");
  const liveCount  = document.getElementById("liveCount");

  /* ════════════════════════════════
     SANITISATION HELPERS
  ════════════════════════════════ */

  /**
   * Strip HTML tags and trim whitespace.
   * Prevents XSS if output is ever reflected into the DOM.
   */
  function sanitize(str) {
    return String(str)
      .replace(/<[^>]*>/g, "")  // strip tags
      .replace(/[<>"'`]/g, "")  // strip dangerous chars
      .trim()
      .slice(0, 200);           // enforce length cap
  }

  /* ════════════════════════════════
     VALIDATION
  ════════════════════════════════ */

  function validateName(val) {
    if (!val) return "Full name is required.";
    if (val.length < 2) return "Name must be at least 2 characters.";
    if (val.length > 100) return "Name is too long.";
    if (!/^[\p{L}\p{M} .'\-]+$/u.test(val)) return "Name contains invalid characters.";
    return "";
  }

  function validateEmail(val) {
    if (!val) return "Email address is required.";
    // RFC 5322-inspired simple pattern
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) return "Enter a valid email address.";
    if (val.length > 200) return "Email address is too long.";
    return "";
  }
function validatePhone(val) {
  if (!val) return "Phone number is required.";
  // Simple validation: at least 10 digits
  const digitsOnly = val.replace(/\D/g, "");
  if (digitsOnly.length < 10) return "Phone number must have at least 10 digits.";
  if (val.length > 11) return "Phone number is too long.";
  return "";
}
  
  function setFieldState(group, errEl, errMsg) {
    if (errMsg) {
      group.classList.add("invalid");
      errEl.textContent = errMsg;
    } else {
      group.classList.remove("invalid");
      errEl.textContent = "";
    }
  }

  /* Validate on blur for inline feedback */
  nameInput.addEventListener("blur", () => {
    setFieldState(nameGroup, nameErr, validateName(sanitize(nameInput.value)));
  });
  emailInput.addEventListener("blur", () => {
    setFieldState(emailGroup, emailErr, validateEmail(sanitize(emailInput.value)));
  });
phoneInput.addEventListener("blur", () => {
  setFieldState(phoneGroup, phoneErr, validatePhone(sanitize(phoneInput.value)));
});
  /* Clear errors on input */
  nameInput.addEventListener("input", () => {
    if (nameGroup.classList.contains("invalid"))
      setFieldState(nameGroup, nameErr, validateName(sanitize(nameInput.value)));
  });
  emailInput.addEventListener("input", () => {
    if (emailGroup.classList.contains("invalid"))
      setFieldState(emailGroup, emailErr, validateEmail(sanitize(emailInput.value)));
  });

  /* ════════════════════════════════
     UI HELPERS
  ════════════════════════════════ */

  function setLoading(on) {
    submitBtn.disabled = on;
    btnLabel.hidden    = on;
    btnSpinner.hidden  = !on;
  }

  function hideMessages() {
    successMsg.hidden = true;
    errorMsg.hidden   = true;
  }

  function showSuccess() {
    hideMessages();
    successMsg.hidden = false;
    form.hidden = true;
    window.launchConfetti && window.launchConfetti(120);
  }

  function showError(msg) {
    hideMessages();
    errorText.textContent = msg || "An unexpected error occurred. Please try again.";
    errorMsg.hidden = false;
  }

  /* ════════════════════════════════
     FORM SUBMIT
  ════════════════════════════════ */

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    hideMessages();

    const rawName  = sanitize(nameInput.value);
const rawEmail = sanitize(emailInput.value).toLowerCase();
const rawPhone = sanitize(phoneInput.value);

const nameErrMsg  = validateName(rawName);
const emailErrMsg = validateEmail(rawEmail);
const phoneErrMsg = validatePhone(rawPhone);
setFieldState(nameGroup,  nameErr,  nameErrMsg);
setFieldState(emailGroup, emailErr, emailErrMsg);
setFieldState(phoneGroup, phoneErr, phoneErrMsg);
if (nameErrMsg || emailErrMsg || phoneErrMsg) return;

    /* Check config */
    if (!CONFIG.SCRIPT_URL || CONFIG.SCRIPT_URL.includes("YOUR_GOOGLE")) {
      showError("⚙️ The event registration is not yet configured. Please contact the organiser.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        action:    "register",
        name:      rawName,
        email:     rawEmail,
        phone:     rawPhone,
        timestamp: new Date().toISOString(),
      };

      const res = await fetch(CONFIG.SCRIPT_URL, {
  method: "POST",
  redirect: "follow",
  body: JSON.stringify(payload),
});

      const data = await res.json();

      if (data.status === "success") {
        showSuccess();
        refreshLiveCount();
      } else if (data.status === "duplicate") {
        showError("This email is already registered. Each person may enter once.");
      } else {
        showError(data.message || "Registration failed. Please try again.");
      }
    } catch (err) {
      console.error("Submit error:", err);
      showError("Network error — please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  });

  /* ════════════════════════════════
     LIVE ENTRY COUNT
  ════════════════════════════════ */

  async function refreshLiveCount() {
    if (!CONFIG.SCRIPT_URL || CONFIG.SCRIPT_URL.includes("YOUR_GOOGLE")) return;

    try {
      const url = CONFIG.SCRIPT_URL + "?action=getCount";
      const res  = await fetch(url);
      const data = await res.json();

      if (typeof data.count === "number") {
        liveCount.textContent = data.count.toLocaleString();
      }
    } catch (_) {
      /* Silent fail — counter is cosmetic */
    }
  }

  /* Poll every 30 s */
  refreshLiveCount();
  setInterval(refreshLiveCount, 30_000);
})();
