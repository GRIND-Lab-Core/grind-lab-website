import { makeFrame, paint, view } from "../research/direction-scenes.js";

const motion = matchMedia("(prefers-reduced-motion: reduce)");
const control = document.querySelector("#research-motion");
const scenes = new Map();
const visible = new Set();
const interval = 1000 / 24;
let paused = motion.matches;
let request = 0;
let previous = 0;

function render(scene) {
  const canvas = scene.canvas;
  const width = Math.round(canvas.clientWidth * Math.min(devicePixelRatio || 1, 2));
  const height = Math.round(width * view.height / view.width);
  if (!width) return;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = scene.context;
  ctx.setTransform(width / view.width, 0, 0, height / view.height, 0, 0);
  ctx.clearRect(0, 0, view.width, view.height);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  paint(ctx, makeFrame(scene.name, scene.time));
  canvas.parentElement.classList.add("is-drawn");
}

function tick(now) {
  request = 0;
  if (paused || document.hidden || !visible.size) return;
  const elapsed = now - previous;
  if (!previous || elapsed >= interval) {
    const step = previous ? Math.min(elapsed / 1000, .1) : 0;
    previous = now;
    for (const scene of visible) {
      scene.time += step;
      render(scene);
    }
  }
  request = requestAnimationFrame(tick);
}

function schedule() {
  if (paused || document.hidden || !visible.size) {
    cancelAnimationFrame(request);
    request = 0;
    previous = 0;
  } else if (!request) {
    request = requestAnimationFrame(tick);
  }
}

function updateMotionButton() {
  control.textContent = paused ? "Play animation" : "Pause animation";
  control.dataset.paused = paused;
}

for (const canvas of document.querySelectorAll(".direction-art canvas")) {
  const context = canvas.getContext("2d");
  if (context) scenes.set(canvas, { canvas, context, name: canvas.dataset.scene, time: 1 });
}

// The transparent illustrations are already in the HTML, including for print and reduced motion.
if (scenes.size && "IntersectionObserver" in globalThis && "ResizeObserver" in globalThis) {
  const visibility = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const scene = scenes.get(entry.target);
      if (entry.isIntersecting) {
        visible.add(scene);
        render(scene);
      } else {
        visible.delete(scene);
      }
    }
    schedule();
  });
  const resize = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const scene = scenes.get(entry.target);
      if (visible.has(scene)) render(scene);
    }
  });
  for (const canvas of scenes.keys()) {
    visibility.observe(canvas);
    resize.observe(canvas);
  }
  control.hidden = false;
  updateMotionButton();
  control.addEventListener("click", () => {
    paused = !paused;
    updateMotionButton();
    schedule();
  });
  motion.addEventListener("change", () => {
    paused = motion.matches;
    updateMotionButton();
    schedule();
  });
  document.addEventListener("visibilitychange", schedule);
}
