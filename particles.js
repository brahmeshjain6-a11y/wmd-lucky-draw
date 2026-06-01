/**
 * particles.js
 * ══════════════════════════════════════════════════════════════
 * Animated starfield / particle background on bgCanvas.
 * Uses vanilla Canvas 2D — zero dependencies.
 * ══════════════════════════════════════════════════════════════
 */

(function () {
  "use strict";

  const canvas = document.getElementById("bgCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  /* ── Settings ── */
  const NUM_STARS   = 130;
  const NUM_LINES   = 3;    // drifting art-deco diagonal lines
  const GOLD        = "rgba(201,168,76,";
  const WHITE       = "rgba(232,226,212,";

  let W, H, stars, lines, raf;

  /* ── Star data ── */
  function createStar() {
    return {
      x:    Math.random() * W,
      y:    Math.random() * H,
      r:    Math.random() * 1.2 + 0.3,
      dx:   (Math.random() - 0.5) * 0.15,
      dy:   (Math.random() - 0.5) * 0.15,
      a:    Math.random(),
      da:   (Math.random() - 0.5) * 0.004,
      gold: Math.random() < 0.15,   // 15% gold stars
    };
  }

  /* ── Diagonal art-deco line data ── */
  function createLine() {
    return {
      x:    Math.random() * W * 1.5 - W * 0.25,
      y:    -60,
      len:  Math.random() * 300 + 200,
      a:    Math.random() * 0.06 + 0.01,
      speed:Math.random() * 0.3 + 0.1,
    };
  }

  /* ── Init ── */
  function init() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    stars = Array.from({ length: NUM_STARS }, createStar);
    lines = Array.from({ length: NUM_LINES }, createLine);
  }

  /* ── Draw loop ── */
  function draw() {
    ctx.clearRect(0, 0, W, H);

    /* Deep gradient background */
    const grad = ctx.createLinearGradient(0, 0, W * 0.4, H);
    grad.addColorStop(0, "#080C18");
    grad.addColorStop(0.5, "#0A0F1E");
    grad.addColorStop(1, "#060A14");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    /* Faint radial glow (top-right) */
    const rg = ctx.createRadialGradient(W * 0.75, H * 0.1, 0, W * 0.75, H * 0.1, W * 0.5);
    rg.addColorStop(0, "rgba(201,168,76,0.055)");
    rg.addColorStop(1, "rgba(201,168,76,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);

    /* Diagonal lines */
    lines.forEach(ln => {
      ctx.save();
      ctx.strokeStyle = GOLD + ln.a + ")";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(ln.x, ln.y);
      ctx.lineTo(ln.x + ln.len * 0.6, ln.y + ln.len);
      ctx.stroke();
      ctx.restore();

      ln.y += ln.speed;
      if (ln.y > H + 100) { Object.assign(ln, createLine()); ln.y = -ln.len - 20; }
    });

    /* Stars */
    stars.forEach(s => {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      const color = s.gold ? GOLD : WHITE;
      ctx.fillStyle = color + Math.max(0, Math.min(1, s.a)) + ")";
      ctx.fill();

      s.x += s.dx; s.y += s.dy;
      s.a += s.da;
      if (s.a > 1 || s.a < 0) s.da *= -1;
      if (s.x < 0) s.x = W;
      if (s.x > W) s.x = 0;
      if (s.y < 0) s.y = H;
      if (s.y > H) s.y = 0;
    });

    raf = requestAnimationFrame(draw);
  }

  /* ── Resize ── */
  window.addEventListener("resize", () => {
    cancelAnimationFrame(raf);
    init();
    draw();
  });

  init();
  draw();
})();
