/**
 * confetti.js
 * ══════════════════════════════════════════════════════════════
 * Gold & white confetti burst on winner announcement.
 * Call: window.launchConfetti()
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  "use strict";

  const canvas = document.getElementById("confettiCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  window.addEventListener("resize", () => {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  const COLORS = [
    "#C9A84C", "#E8C96C", "#F0DFA0",
    "#FFFFFF", "#E8E2D4", "#8A6E2F",
    "#FFD700", "#FFC200",
  ];

  let pieces = [];
  let animId = null;

  /* ── One confetti piece ── */
  function createPiece() {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 3;
    return {
      x:    canvas.width * (0.3 + Math.random() * 0.4),
      y:    canvas.height * 0.45,
      vx:   Math.cos(angle) * speed,
      vy:   Math.sin(angle) * speed - 8,
      w:    Math.random() * 10 + 5,
      h:    Math.random() * 6 + 3,
      rot:  Math.random() * 360,
      rSpeed: (Math.random() - 0.5) * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 1,
      shape: Math.random() < 0.5 ? "rect" : "circle",
    };
  }

  /* ── Render loop ── */
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    pieces = pieces.filter(p => p.alpha > 0.02);

    pieces.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;

      if (p.shape === "rect") {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      /* Physics */
      p.vy += 0.25;       // gravity
      p.vx *= 0.99;       // air drag
      p.x  += p.vx;
      p.y  += p.vy;
      p.rot += p.rSpeed;
      if (p.y > canvas.height * 1.1) p.alpha -= 0.04;
    });

    if (pieces.length > 0) {
      animId = requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  /* ── Public API ── */
  window.launchConfetti = function (count = 180) {
    if (animId) cancelAnimationFrame(animId);
    pieces = Array.from({ length: count }, createPiece);
    tick();
  };
})();
