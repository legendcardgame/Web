import { API_BASE, ADMIN_KEY } from './config.js';

const $ = s => document.querySelector(s);

const elOut  = $('#output');
const elPing = $('#btnPing');
const elList = $('#btnList');
const elStat = $('#status');

function setStatus(msg, ok = true) {
  elStat.textContent = msg;
  elStat.className = ok ? 'ok' : 'bad';
}

async function ping() {
  setStatus('Probando conexión...', true);
  try {
    const url = `${API_BASE}?action=ping&t=${Date.now()}`;
    const r = await fetch(url, { cache: 'no-store' });
    const j = await r.json();
    if (!j.ok) throw new Error(j.message || 'Ping falló');
    setStatus(`Ping OK · ${j.time}`, true);
    elOut.textContent = JSON.stringify(j, null, 2);
  } catch (err) {
    setStatus(`Error/red: ${err.message}`, false);
    elOut.textContent = err.stack || String(err);
  }
}

async function listAdmin() {
  setStatus('Cargando lista...', true);
  try {
    const url = `${API_BASE}?adminKey=${encodeURIComponent(ADMIN_KEY)}&t=${Date.now()}`;
    const r = await fetch(url, { cache: 'no-store' });
    const j = await r.json();
    if (!j.ok) throw new Error(j.message || 'No autorizado');
    setStatus(`OK · ${j.data.length} registros`, true);
    elOut.textContent = JSON.stringify(j.data, null, 2);
  } catch (err) {
    setStatus(`Error en la carga: ${err.message}`, false);
    elOut.textContent = err.stack || String(err);
  }
}

elPing.addEventListener('click', ping);
elList.addEventListener('click', listAdmin);
