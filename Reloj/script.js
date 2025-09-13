const timerText = document.getElementById('timerText');
const alarm = document.getElementById('alarmSound');
const rondaText = document.getElementById('rondaText') || document.querySelector('.ronda-bar span');
const bg = document.getElementById('bg');

let totalMs = 50 * 60 * 1000;
let currentMs = totalMs;
let running = false;
let iv = null;
let lastTick = 0;

function fmt(ms) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return m + ":" + s.toString().padStart(2, '0');
}

function updateText() {
  timerText.textContent = fmt(currentMs);
}

function setTime(min) {
  const x = Number(min);
  if (!Number.isFinite(x) || x < 0) return;
  totalMs = x * 60000;
  currentMs = totalMs;
  updateText();
}

function tick(ts) {
  const delta = ts - lastTick;
  lastTick = ts;
  currentMs -= delta;
  if (currentMs <= 0) {
    currentMs = 0;
    updateText();
    stop();
    if (alarm) alarm.play();
  } else {
    updateText();
    iv = requestAnimationFrame(tick);
  }
}

function start() {
  if (running) return;
  running = true;
  lastTick = performance.now();
  iv = requestAnimationFrame(tick);
}

function stop() {
  running = false;
  if (iv) cancelAnimationFrame(iv);
}

function reset() {
  stop();
  currentMs = totalMs;
  updateText();
}

// ================== SOCKET.IO ==================
const socket = io();

socket.on("command", (cmd) => {
  if (!cmd || !cmd.type) return;
  switch (cmd.type) {
    case "start": start(); break;
    case "pause": stop(); break;
    case "reset": reset(); break;
    case "setTime": setTime(cmd.minutes); break;
    case "setRonda": if (rondaText) rondaText.textContent = cmd.text; break;
    case "setBackground":
      if (bg && cmd.dataUrl) bg.src = cmd.dataUrl;
      break;
  }
});

// Inicializar
updateText();