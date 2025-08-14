// admin.js
// Cargar como módulo desde admin.html
import { API_BASE, ADMIN_KEY } from './config.js';

const $       = s => document.querySelector(s);
const out     = $('#out');
const tbody   = $('#tbody');
const counter = $('#counter');

let DATA   = [];   // cache del listado completo
let logged = false;

/* ------------------ Utils ------------------ */
const stripLeadingApostrophe = s => String(s || '').replace(/^'/, '');
const safe   = v => String(v ?? '').trim();
const pad10  = s => stripLeadingApostrophe(s).replace(/\D/g, '').padStart(10,'0');
const fname  = r => [r.firstName, r.lastName].filter(Boolean).join(' ').trim();

function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }
function setMsg(m){ out.textContent = m || ''; }

/* ------------------ Login ------------------ */
function showLogin(){
  const keyOk = localStorage.getItem('adminAuthKey') === ADMIN_KEY;
  if (keyOk){ 
    logged = true; 
    $('#login').style.display = 'none'; 
    initAfterLogin(); 
    return; 
  }
  $('#login').style.display = 'flex';
  $('#adminKeyInput').focus();
}
$('#btnLogin').addEventListener('click', () => {
  const k = $('#adminKeyInput').value.trim();
  if (k === ADMIN_KEY){
    localStorage.setItem('adminAuthKey', k);
    logged = true;
    $('#loginMsg').textContent = '';
    $('#login').style.display = 'none';
    initAfterLogin();
  } else {
    $('#loginMsg').textContent = 'Clave incorrecta.';
  }
});
$('#adminKeyInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('#btnLogin').click();
});

/* ------------------ Render ------------------ */
function render(list){
  tbody.innerHTML = '';
  list.forEach(r => {
    const tr = document.createElement('tr');

    // selector de estado
    const sel = document.createElement('select');
    sel.className = 'status';
    ['Pendiente','Aceptado','Rechazado'].forEach(opt => {
      const o = document.createElement('option');
      o.value = opt; o.textContent = opt;
      if ((r.status||'').toLowerCase() === opt.toLowerCase()) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', () => updateStatus(r.konamiId, sel.value, tr));

    tr.innerHTML = `
      <td class="hide-sm">${safe(r.timestamp)}</td>
      <td><span class="tag">${safe(pad10(r.konamiId))}</span></td>
      <td>${fname(r)}</td>
      <td class="hide-sm">${safe(r.email)}</td>
      <td class="hide-sm">${safe(r.phone)}</td>
      <td>${r.paymentUrl ? `<a href="${r.paymentUrl}" target="_blank" rel="noopener">Ver</a>` : ''}</td>
      <td></td>
    `;
    tr.lastElementChild.appendChild(sel);
    tbody.appendChild(tr);
  });
  counter.textContent = `${list.length} registro${list.length===1?'':'s'}`;
}

/* ------------------ Filtro local ------------------ */
function applyFilter(){
  const q = $('#search').value.toLowerCase().trim();
  if (!q){ render(DATA); return; }
  const filtered = DATA.filter(r => {
    const blob = [
      pad10(r.konamiId),
      fname(r),
      safe(r.email),
      safe(r.phone),
      safe(r.status)
    ].join(' ').toLowerCase();
    return blob.includes(q);
  });
  render(filtered);
}
$('#search').addEventListener('input', debounce(applyFilter, 120));

/* ------------------ Cargar todo ------------------ */
async function loadAll(){
  setMsg('');
  try{
    // admite backends que priorizan adminKey y/o action=list
    const url = `${API_BASE}?action=list&adminKey=${encodeURIComponent(ADMIN_KEY)}`;
    const r   = await fetch(url, { cache: 'no-store' });
    const j   = await r.json();
    if (!j.ok) throw new Error(j.message || 'Error al listar');

    DATA = (j.data || []).map(row => ({ ...row, konamiId: pad10(row.konamiId) }));
    render(DATA);
  }catch(e){
    setMsg('Error: ' + e.message);
  }
}

/* ------------------ Actualizar estado ------------------ */
async function updateStatus(konamiId, newStatus, rowEl){
  try{
    rowEl?.classList.add('updating');

    const fd = new FormData();
    fd.append('konamiId', pad10(konamiId));
    fd.append('status', newStatus);

    const r = await fetch(API_BASE, { method: 'POST', body: fd });
    const j = await r.json();
    if (!j.ok) throw new Error(j.message || 'No se pudo actualizar');

    // refleja cambio en cache y mantiene el filtro aplicado
    DATA = DATA.map(x => x.konamiId === pad10(konamiId) ? { ...x, status: newStatus } : x);
    applyFilter();

    flashRow(rowEl, newStatus);
  }catch(e){
    setMsg('Error al cambiar estatus: ' + e.message);
  }finally{
    rowEl?.classList.remove('updating');
  }
}
function flashRow(rowEl, status){
  if (!rowEl) return;
  const cls = status === 'Aceptado' ? 'ok' : (status === 'Rechazado' ? 'err' : 'warn');
  rowEl.style.transition = 'background 400ms';
  rowEl.style.background = 'rgba(255,255,255,.04)';
  const tag = document.createElement('span');
  tag.className = `tag ${cls}`;
  tag.textContent = `Guardado: ${status}`;
  rowEl.cells[rowEl.cells.length-1].appendChild(tag);
  setTimeout(()=>{ tag.remove(); rowEl.style.background='transparent'; }, 1300);
}

/* ------------------ Init después de login ------------------ */
function initAfterLogin(){
  loadAll();
  // Carga filtro inicial si viene ?q= en la URL
  const q = new URLSearchParams(location.search).get('q');
  if (q){ $('#search').value = q; applyFilter(); }
}

/* ------------------ Boot ------------------ */
showLogin();
```0// admin.js
// Cargar como módulo desde admin.html
import { API_BASE, ADMIN_KEY } from './config.js';

const $       = s => document.querySelector(s);
const out     = $('#out');
const tbody   = $('#tbody');
const counter = $('#counter');

let DATA   = [];   // cache del listado completo
let logged = false;

/* ------------------ Utils ------------------ */
const stripLeadingApostrophe = s => String(s || '').replace(/^'/, '');
const safe   = v => String(v ?? '').trim();
const pad10  = s => stripLeadingApostrophe(s).replace(/\D/g, '').padStart(10,'0');
const fname  = r => [r.firstName, r.lastName].filter(Boolean).join(' ').trim();

function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }
function setMsg(m){ out.textContent = m || ''; }

/* ------------------ Login ------------------ */
function showLogin(){
  const keyOk = localStorage.getItem('adminAuthKey') === ADMIN_KEY;
  if (keyOk){ 
    logged = true; 
    $('#login').style.display = 'none'; 
    initAfterLogin(); 
    return; 
  }
  $('#login').style.display = 'flex';
  $('#adminKeyInput').focus();
}
$('#btnLogin').addEventListener('click', () => {
  const k = $('#adminKeyInput').value.trim();
  if (k === ADMIN_KEY){
    localStorage.setItem('adminAuthKey', k);
    logged = true;
    $('#loginMsg').textContent = '';
    $('#login').style.display = 'none';
    initAfterLogin();
  } else {
    $('#loginMsg').textContent = 'Clave incorrecta.';
  }
});
$('#adminKeyInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('#btnLogin').click();
});

/* ------------------ Render ------------------ */
function render(list){
  tbody.innerHTML = '';
  list.forEach(r => {
    const tr = document.createElement('tr');

    // selector de estado
    const sel = document.createElement('select');
    sel.className = 'status';
    ['Pendiente','Aceptado','Rechazado'].forEach(opt => {
      const o = document.createElement('option');
      o.value = opt; o.textContent = opt;
      if ((r.status||'').toLowerCase() === opt.toLowerCase()) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', () => updateStatus(r.konamiId, sel.value, tr));

    tr.innerHTML = `
      <td class="hide-sm">${safe(r.timestamp)}</td>
      <td><span class="tag">${safe(pad10(r.konamiId))}</span></td>
      <td>${fname(r)}</td>
      <td class="hide-sm">${safe(r.email)}</td>
      <td class="hide-sm">${safe(r.phone)}</td>
      <td>${r.paymentUrl ? `<a href="${r.paymentUrl}" target="_blank" rel="noopener">Ver</a>` : ''}</td>
      <td></td>
    `;
    tr.lastElementChild.appendChild(sel);
    tbody.appendChild(tr);
  });
  counter.textContent = `${list.length} registro${list.length===1?'':'s'}`;
}

/* ------------------ Filtro local ------------------ */
function applyFilter(){
  const q = $('#search').value.toLowerCase().trim();
  if (!q){ render(DATA); return; }
  const filtered = DATA.filter(r => {
    const blob = [
      pad10(r.konamiId),
      fname(r),
      safe(r.email),
      safe(r.phone),
      safe(r.status)
    ].join(' ').toLowerCase();
    return blob.includes(q);
  });
  render(filtered);
}
$('#search').addEventListener('input', debounce(applyFilter, 120));

/* ------------------ Cargar todo ------------------ */
async function loadAll(){
  setMsg('');
  try{
    // admite backends que priorizan adminKey y/o action=list
    const url = `${API_BASE}?action=list&adminKey=${encodeURIComponent(ADMIN_KEY)}`;
    const r   = await fetch(url, { cache: 'no-store' });
    const j   = await r.json();
    if (!j.ok) throw new Error(j.message || 'Error al listar');

    DATA = (j.data || []).map(row => ({ ...row, konamiId: pad10(row.konamiId) }));
    render(DATA);
  }catch(e){
    setMsg('Error: ' + e.message);
  }
}

/* ------------------ Actualizar estado ------------------ */
async function updateStatus(konamiId, newStatus, rowEl){
  try{
    rowEl?.classList.add('updating');

    const fd = new FormData();
    fd.append('konamiId', pad10(konamiId));
    fd.append('status', newStatus);

    const r = await fetch(API_BASE, { method: 'POST', body: fd });
    const j = await r.json();
    if (!j.ok) throw new Error(j.message || 'No se pudo actualizar');

    // refleja cambio en cache y mantiene el filtro aplicado
    DATA = DATA.map(x => x.konamiId === pad10(konamiId) ? { ...x, status: newStatus } : x);
    applyFilter();

    flashRow(rowEl, newStatus);
  }catch(e){
    setMsg('Error al cambiar estatus: ' + e.message);
  }finally{
    rowEl?.classList.remove('updating');
  }
}
function flashRow(rowEl, status){
  if (!rowEl) return;
  const cls = status === 'Aceptado' ? 'ok' : (status === 'Rechazado' ? 'err' : 'warn');
  rowEl.style.transition = 'background 400ms';
  rowEl.style.background = 'rgba(255,255,255,.04)';
  const tag = document.createElement('span');
  tag.className = `tag ${cls}`;
  tag.textContent = `Guardado: ${status}`;
  rowEl.cells[rowEl.cells.length-1].appendChild(tag);
  setTimeout(()=>{ tag.remove(); rowEl.style.background='transparent'; }, 1300);
}

/* ------------------ Init después de login ------------------ */
function initAfterLogin(){
  loadAll();
  // Carga filtro inicial si viene ?q= en la URL
  const q = new URLSearchParams(location.search).get('q');
  if (q){ $('#search').value = q; applyFilter(); }
}

/* ------------------ Boot ------------------ */
showLogin();
```0
