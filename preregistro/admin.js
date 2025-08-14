// Ajusta a tu deployment actual:
const API_BASE = 'PASTE_YOUR_APPS_SCRIPT_URL_HERE';

const $ = s => document.querySelector(s);
const msg = $('#msg');
const btnEntrar = $('#btnEntrar');
const btnPing = $('#btnPing');
const inputKey = $('#adminKey');
const tbl = $('#tbl');
const tbody = $('#tbody');
const barListado = $('#barListado');
const totalPill = $('#totalPill');
const pageInfo = $('#pageInfo');
const prevPage = $('#prevPage');
const nextPage = $('#nextPage');
const pageSizeSel = $('#pageSize');

let currentPage = 1;
let totalPages = 1;
let currentKey = '';

function setMsg(text, ok=true){
  msg.textContent = text || '';
  msg.style.color = ok ? '#9fdf9f' : '#ff9f9f';
}

// fetch con timeout y 1 reintento
async function fetchWithTimeout(url, opts={}, timeoutMs=12000) {
  const ctrl = new AbortController();
  const to = setTimeout(()=>ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {signal:ctrl.signal, cache:'no-store', ...opts});
  } finally {
    clearTimeout(to);
  }
}
async function safeGet(url, timeoutMs=12000){
  try {
    const r = await fetchWithTimeout(url, {}, timeoutMs);
    return await r.json();
  } catch (e) {
    // 1 reintento rápido
    try {
      const r2 = await fetchWithTimeout(url, {}, timeoutMs);
      return await r2.json();
    } catch (e2) {
      throw e2;
    }
  }
}

async function doPing(){
  setMsg('Haciendo ping…');
  try {
    const j = await safeGet(`${API_BASE}?action=ping&t=${Date.now()}`, 8000);
    if (!j.ok) throw new Error(j.message || 'Ping falló');
    setMsg(`Ping OK · ${j.time}`, true);
  } catch(err) {
    setMsg(`Ping falló: ${err.message}`, false);
  }
}

async function cargarPagina(p){
  const pageSize = parseInt(pageSizeSel.value,10) || 50;
  setMsg('Cargando listado…');
  try {
    const url = `${API_BASE}?adminKey=${encodeURIComponent(currentKey)}&page=${p}&pageSize=${pageSize}&t=${Date.now()}`;
    const j = await safeGet(url, 15000);
    if (!j.ok) {
      if (j.code === 403) {
        setMsg('Contraseña incorrecta.', false);
      } else {
        setMsg(j.message || 'Error al cargar', false);
      }
      return;
    }
    renderTabla(j.data || []);
    totalPages = j.pages || 1;
    currentPage = j.page || 1;
    totalPill.textContent = `Total: ${j.total || 0}`;
    pageInfo.textContent = `${currentPage} / ${totalPages}`;
    setMsg('Listado cargado.', true);
  } catch(err) {
    setMsg(`Error/red: ${err.message}`, false);
  }
}

function renderTabla(rows){
  if (!rows.length) {
    tbl.style.display = 'none';
    tbody.innerHTML = '';
    return;
  }
  const html = rows.map(r => {
    const ts = r.timestamp || '';
    const kid = r.konamiId || '';
    const name = `${r.firstName||''} ${r.lastName||''}`.trim();
    const mail = r.email || '';
    const phone = r.phone || '';
    const st = r.status || 'Pendiente';
    const link = r.paymentUrl ? `<a href="${r.paymentUrl}" target="_blank">Ver</a>` : '';
    return `<tr>
      <td>${ts}</td>
      <td>${kid}</td>
      <td>${name}</td>
      <td>${mail}</td>
      <td>${phone}</td>
      <td>${st}</td>
      <td>${link}</td>
    </tr>`;
  }).join('');
  tbody.innerHTML = html;
  tbl.style.display = '';
  barListado.style.display = '';
}

// Eventos
btnPing.addEventListener('click', doPing);

btnEntrar.addEventListener('click', async () => {
  const key = inputKey.value.trim();
  if (!key) { setMsg('Ingresa tu clave de admin.'); return; }
  currentKey = key;
  await cargarPagina(1);
});

prevPage.addEventListener('click', () => {
  if (currentPage > 1) cargarPagina(currentPage - 1);
});
nextPage.addEventListener('click', () => {
  if (currentPage < totalPages) cargarPagina(currentPage + 1);
});
pageSizeSel.addEventListener('change', () => cargarPagina(1));

// Warm-up automático al abrir
doPing();
