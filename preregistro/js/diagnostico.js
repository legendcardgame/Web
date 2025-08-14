// preregistro/js/diagnostico.js
import { API_BASE, ADMIN_KEY } from './config.js';

const $ = s => document.querySelector(s);
const out = $('#output');
const stat = $('#status');

function setStatus(msg, ok=true) {
  stat.textContent = msg;
  stat.className = 'status ' + (ok ? 'ok' : 'bad');
  console.log('[DIAG]', msg);
}

async function safeJson(resp) {
  const txt = await resp.text();
  try { return JSON.parse(txt); }
  catch {
    // Cuando Apps Script devuelve HTML por error veremos el HTML aquí
    out.textContent = txt;
    throw new Error('Respuesta no-JSON (probable error de implementación/URL)');
  }
}

async function ping() {
  setStatus('Probando conexión...', true);
  out.textContent = '';
  try {
    const url = `${API_BASE}?action=ping&t=${Date.now()}`;
    const r = await fetch(url, { cache:'no-store' });
    const j = await safeJson(r);
    if (!j.ok) throw new Error(j.message || 'Ping falló');
    setStatus(`Ping OK · ${j.time}`, true);
    out.textContent = JSON.stringify(j, null, 2);
  } catch (e) {
    setStatus(`Error: ${e.message}`, false);
    console.error(e);
  }
}

async function listAdmin() {
  setStatus('Cargando lista...', true);
  out.textContent = '';
  try {
    const url = `${API_BASE}?adminKey=${encodeURIComponent(ADMIN_KEY)}&t=${Date.now()}`;
    const r = await fetch(url, { cache:'no-store' });
    const j = await safeJson(r);
    if (!j.ok) throw new Error(j.message || 'No autorizado');
    setStatus(`OK · ${j.data.length} registros`, true);
    out.textContent = JSON.stringify(j.data, null, 2);
  } catch (e) {
    setStatus(`Error: ${e.message}`, false);
    console.error(e);
  }
}

$('#btnPing').addEventListener('click', ping);
$('#btnList').addEventListener('click', listAdmin);

// Log inicial para confirmar que cargó el módulo
console.log('diagnostico.js cargado. API_BASE=', API_BASE);
