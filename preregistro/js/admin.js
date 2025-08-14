// preregistro/js/admin.js
import { API_BASE, ADMIN_KEY } from './config.js';

const $ = s => document.querySelector(s);
const stat = $('#status');
const tbody = $('#tbl tbody');
const raw = $('#raw');

function setStatus(msg, ok=true){ 
  stat.textContent = msg; 
  stat.className = 'status ' + (ok ? 'ok' : 'bad'); 
  console.log('[ADMIN]', msg);
}

function render(rows){
  tbody.innerHTML = '';
  for (const r of rows){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="wrap">${r.timestamp || ''}</td>
      <td>${r.konamiId || ''}</td>
      <td class="wrap">${(r.firstName||'') + ' ' + (r.lastName||'')}</td>
      <td class="wrap">${r.email || ''}</td>
      <td>${r.phone || ''}</td>
      <td>${r.paymentUrl ? `<a href="${r.paymentUrl}" target="_blank">Ver</a>` : ''}</td>
      <td>${r.status || ''}</td>
    `;
    tbody.appendChild(tr);
  }
}

async function safeJson(resp){
  const txt = await resp.text();
  try { return JSON.parse(txt); }
  catch {
    raw.textContent = txt; // si Apps Script devolvió HTML, lo vemos aquí
    throw new Error('Respuesta no-JSON (revisa URL/implementación)');
  }
}

async function listAll(){
  setStatus('Cargando...', true);
  raw.textContent = '';
  try {
    const url = `${API_BASE}?adminKey=${encodeURIComponent(ADMIN_KEY)}&t=${Date.now()}`;
    const r = await fetch(url, { cache:'no-store' });
    const j = await safeJson(r);
    if (!j.ok) throw new Error(j.message || 'No autorizado');
    render(j.data || []);
    raw.textContent = JSON.stringify(j, null, 2);
    setStatus(`OK · ${j.data.length} registros`, true);
  } catch(e){
    setStatus(`Error: ${e.message}`, false);
    console.error(e);
  }
}

async function findOne(){
  const val = $('#kId').value.trim();
  if (!val) { setStatus('ID vacío', false); return; }
  setStatus('Buscando...', true);
  raw.textContent = '';
  try {
    // normaliza a 10 dígitos
    const k = String(val).replace(/\D/g,'').padStart(10,'0');
    const url = `${API_BASE}?konamiId=${encodeURIComponent(k)}&t=${Date.now()}`;
    const r = await fetch(url, { cache:'no-store' });
    const j = await safeJson(r);
    if (!j.ok) throw new Error(j.message || 'No encontrado');
    render([j.data]);
    raw.textContent = JSON.stringify(j, null, 2);
    setStatus('OK', true);
  } catch(e){
    setStatus(`Error: ${e.message}`, false);
    console.error(e);
  }
}

$('#btnList').addEventListener('click', listAll);
$('#btnFind').addEventListener('click', findOne);

// Log para confirmar carga del módulo
console.log('admin.js cargado. API_BASE=', API_BASE);// preregistro/js/admin.js
import { API_BASE, ADMIN_KEY } from './config.js';

const $ = s => document.querySelector(s);
const stat = $('#status');
const tbody = $('#tbl tbody');
const raw = $('#raw');

function setStatus(msg, ok=true){ 
  stat.textContent = msg; 
  stat.className = 'status ' + (ok ? 'ok' : 'bad'); 
  console.log('[ADMIN]', msg);
}

function render(rows){
  tbody.innerHTML = '';
  for (const r of rows){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="wrap">${r.timestamp || ''}</td>
      <td>${r.konamiId || ''}</td>
      <td class="wrap">${(r.firstName||'') + ' ' + (r.lastName||'')}</td>
      <td class="wrap">${r.email || ''}</td>
      <td>${r.phone || ''}</td>
      <td>${r.paymentUrl ? `<a href="${r.paymentUrl}" target="_blank">Ver</a>` : ''}</td>
      <td>${r.status || ''}</td>
    `;
    tbody.appendChild(tr);
  }
}

async function safeJson(resp){
  const txt = await resp.text();
  try { return JSON.parse(txt); }
  catch {
    raw.textContent = txt; // si Apps Script devolvió HTML, lo vemos aquí
    throw new Error('Respuesta no-JSON (revisa URL/implementación)');
  }
}

async function listAll(){
  setStatus('Cargando...', true);
  raw.textContent = '';
  try {
    const url = `${API_BASE}?adminKey=${encodeURIComponent(ADMIN_KEY)}&t=${Date.now()}`;
    const r = await fetch(url, { cache:'no-store' });
    const j = await safeJson(r);
    if (!j.ok) throw new Error(j.message || 'No autorizado');
    render(j.data || []);
    raw.textContent = JSON.stringify(j, null, 2);
    setStatus(`OK · ${j.data.length} registros`, true);
  } catch(e){
    setStatus(`Error: ${e.message}`, false);
    console.error(e);
  }
}

async function findOne(){
  const val = $('#kId').value.trim();
  if (!val) { setStatus('ID vacío', false); return; }
  setStatus('Buscando...', true);
  raw.textContent = '';
  try {
    // normaliza a 10 dígitos
    const k = String(val).replace(/\D/g,'').padStart(10,'0');
    const url = `${API_BASE}?konamiId=${encodeURIComponent(k)}&t=${Date.now()}`;
    const r = await fetch(url, { cache:'no-store' });
    const j = await safeJson(r);
    if (!j.ok) throw new Error(j.message || 'No encontrado');
    render([j.data]);
    raw.textContent = JSON.stringify(j, null, 2);
    setStatus('OK', true);
  } catch(e){
    setStatus(`Error: ${e.message}`, false);
    console.error(e);
  }
}

$('#btnList').addEventListener('click', listAll);
$('#btnFind').addEventListener('click', findOne);

// Log para confirmar carga del módulo
console.log('admin.js cargado. API_BASE=', API_BASE);
