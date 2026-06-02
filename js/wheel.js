/**
 * wheel.js
 * ══════════════════════════════════════════════════════════════
 * Spinning lucky-draw wheel drawn on #wheelCanvas.
 * 
 * Usage:
 *   WheelSpin.show(segments)        // array of label strings
 *   WheelSpin.spin(winnerIndex)     // index in segments to land on
 *   WheelSpin.hide()
 * ══════════════════════════════════════════════════════════════
 */

const WheelSpin = (function () {
  "use strict";

  const MODAL    = () => document.getElementById("wheelModal");
  const STATUS   = () => document.getElementById("wheelStatus");
  const CANVAS   = () => document.getElementById("wheelCanvas");

  const COLORS = [
    "#C9A84C", "#1A2640", "#8A6E2F", "#0D1426",
    "#E8C96C", "#243050", "#705826", "#101828",
    "#F0DFA0", "#2A3860",
  ];

  let segments  = [];
  let currentAngle = 0;
  let rafId = null;

  /* ── Draw wheel at given rotation angle ── */
  function drawWheel(angle) {
    const cv = CANVAS();
    if (!cv) return;
    const ctx   = cv.getContext("2d");
    const cx    = cv.width / 2;
    const cy    = cv.height / 2;
    const r     = cx - 10;
    const count = segments.length;
    const arc   = (Math.PI * 2) / count;

    ctx.clearRect(0, 0, cv.width, cv.height);

    /* Shadow */
    ctx.save();
    ctx.shadowColor = "rgba(201,168,76,0.4)";
    ctx.shadowBlur  = 24;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#0D1426";
    ctx.fill();
    ctx.restore();

    /* Segments */
    segments.forEach((seg, i) => {
      const start = angle + i * arc;
      const end   = start + arc;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = "rgba(201,168,76,0.3)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      /* Label */
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + arc / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#E8E2D4";
      ctx.font = `bold ${Math.min(13, 140 / count)}px 'DM Sans', sans-serif`;
      const maxLen = 12;
      const label  = seg.length > maxLen ? seg.slice(0, maxLen) + "…" : seg;
      ctx.fillText(label, r - 10, 5);
      ctx.restore();
    });

    /* Center cap */
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fillStyle = "#080C18";
    ctx.fill();
    ctx.strokeStyle = "#C9A84C";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    /* Center star */
    ctx.fillStyle = "#C9A84C";
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✦", cx, cy);
  }

  /* ── Animate spin, decelerate to land on winner ── */
  function spin(winnerIndex, onDone) {
    const count = segments.length;
    const arc   = (Math.PI * 2) / count;

    // Total spin: several full rotations + offset to land on winner
    const extraTurns = 5 + Math.floor(Math.random() * 4);
    const targetOffset = Math.PI * 2 - (winnerIndex * arc + arc / 2);
    const totalAngle   = extraTurns * Math.PI * 2 + targetOffset;
    const duration     = 4000 + Math.random() * 1500; // ms

    let startTime = null;

    function easeOut(t) {
      // Cubic ease-out
      return 1 - Math.pow(1 - t, 3);
    }

    function frame(ts) {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      const progress = Math.min(elapsed / duration, 1);
      currentAngle = easeOut(progress) * totalAngle;

      drawWheel(currentAngle);

      if (progress < 1) {
        rafId = requestAnimationFrame(frame);
        if (STATUS()) STATUS().textContent = "Spinning…";
      } else {
        if (STATUS()) STATUS().textContent = "🎉 Winner found!";
        if (typeof onDone === "function") setTimeout(onDone, 900);
      }
    }

    rafId = requestAnimationFrame(frame);
  }

  /* ── Public API ── */
  return {
    show(segs) {
      segments = segs.length > 0 ? segs : ["?"];
      currentAngle = 0;
      const modal = MODAL();
      if (modal) {
        modal.hidden = false;
        modal.classList.add("active");
        modal.style.display = "flex";
      }
      setTimeout(() => drawWheel(0), 100);
    },
    spin(winnerIndex, onDone) {
      spin(winnerIndex, onDone);
    },
    hide() {
      if (rafId) cancelAnimationFrame(rafId);
      const modal = MODAL();
      if (modal) {
        modal.hidden = true;
        modal.classList.remove("active");
        modal.style.display = "none";
      }
    },
  };
})();
