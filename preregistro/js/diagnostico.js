import { API_BASE, ADMIN_KEY } from './config.js';

const $ = s => document.querySelector(s);
const log = msg => {
  const el = $('#log');
  el.textContent += (msg + '\n');
  el.scrollTop = el.scrollHeight;
};

$('#btnPing').addEventListener('click', async () => {
  try {
    const r = await fetch(`${API_BASE}?action=ping`);
    const j = await r.json();
    log('[PING] ' + JSON.stringify(j));
  } catch (e) {
    log('[PING] Error: ' + e.message);
  }
});

$('#btnListAdmin').addEventListener('click', async () => {
  log('[DIAG] Cargando lista...');
  try {
    const url = `${API_BASE}?adminKey=${encodeURIComponent(ADMIN_KEY)}`;
    const r = await fetch(url);
    const j = await r.json();
    if (!j.ok) throw new Error(j.message || 'Error en listado');
    log('[DIAG] OK. Registros: ' + (j.data?.length ?? 0));
  } catch (e) {
    log('[DIAG] Error: ' + e.message);
  }
});
