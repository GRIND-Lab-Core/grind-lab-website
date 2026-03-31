/* ============================================================
   GRIND Lab — Hero Canvas Particle Network
   Represents geospatial data points connected across a map
   ============================================================ */

(function() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, particles, animFrame;
  const PARTICLE_COUNT = 60;
  const CONNECTION_DIST = 160;
  const COLORS = {
    particle: 'rgba(78, 205, 196, ',
    line:     'rgba(0, 150, 183, ',
    accent:   'rgba(224, 123, 84, ',
  };

  class Particle {
    constructor() { this.reset(true); }
    reset(init = false) {
      this.x  = Math.random() * W;
      this.y  = init ? Math.random() * H : H + 10;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = (Math.random() - 0.5) * 0.4;
      this.r  = Math.random() * 2.5 + 1;
      this.alpha = Math.random() * 0.6 + 0.2;
      // Some particles are "data points" (larger)
      this.isDataPoint = Math.random() < 0.15;
      if (this.isDataPoint) { this.r = Math.random() * 3 + 2.5; this.alpha = 0.9; }
      this.pulse = Math.random() * Math.PI * 2;
      this.pulseSpeed = Math.random() * 0.02 + 0.01;
    }
    update() {
      this.x  += this.vx;
      this.y  += this.vy;
      this.pulse += this.pulseSpeed;
      // Wrap around edges
      if (this.x < -20) this.x = W + 20;
      if (this.x > W + 20) this.x = -20;
      if (this.y < -20) this.y = H + 20;
      if (this.y > H + 20) this.y = -20;
    }
    draw() {
      const a = this.alpha * (0.7 + 0.3 * Math.sin(this.pulse));
      if (this.isDataPoint) {
        // Pulsing ring for data points
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r * 2.5, 0, Math.PI * 2);
        ctx.strokeStyle = COLORS.accent + (a * 0.3) + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.accent + a + ')';
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.particle + a + ')';
        ctx.fill();
      }
    }
  }

  function init() {
    resize();
    particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());
  }

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECTION_DIST) {
          const alpha = (1 - dist / CONNECTION_DIST) * 0.18;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = COLORS.line + alpha + ')';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
  }

  function drawGridOverlay() {
    // Subtle geographic grid lines
    ctx.strokeStyle = 'rgba(78, 205, 196, 0.04)';
    ctx.lineWidth = 1;
    const gridSize = 80;
    for (let x = 0; x < W; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    drawGridOverlay();
    drawConnections();
    particles.forEach(p => { p.update(); p.draw(); });
    animFrame = requestAnimationFrame(loop);
  }

  // Responsive resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      particles.forEach(p => {
        if (p.x > W) p.x = Math.random() * W;
        if (p.y > H) p.y = Math.random() * H;
      });
    }, 200);
  });

  // Pause when tab not visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(animFrame); }
    else { loop(); }
  });

  // Mouse interaction — particles move toward cursor
  let mouseX = -999, mouseY = -999;
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });
  canvas.addEventListener('mouseleave', () => { mouseX = -999; mouseY = -999; });

  init();
  loop();
})();
