// Cargar como módulo desde admin.html
import { API_BASE, ADMIN_KEY } from './config.js';

const $  = s => document.querySelector(s);
const out = $('#out');
const tbody = $('#tbody');
const counter = $('#counter');

let DATA = [];         // cache del listado completo
let logged = false;    // estado de login

/** Utilidades **/
const stripLeadingApostrophe = s => String(s||'').replace(/^'/,'');
const pad10 = s => stripLeadingApostrophe(s).replace(/\D/g,'').padStart(10,'0');
const fullName = r => [r.firstName, r.lastName].filter(Boolean).join(' ').trim();
const safe = v => String(v ?? '').trim();

/** Login simple (front) */
function showLogin(){
  const keyOk = localStorage.getItem('adminAuthKey') === ADMIN_KEY;
  if (keyOk){ logged = true; $('#login').style.display = 'none'; initAfterLogin(); return; }
  $('#login').style.display = 'flex';
  $('#adminKeyInput').focus();
}
$('#btnLogin').addEventListener('click', () => {
  const k = $('#adminKeyInput').value.trim();
  if (k === ADMIN_KEY){
    localStorage.setItem('adminAuthKey', k);
    logged = true;
    $('#login').style.display = 'none';
    initAfterLogin();
  } else {
    $('#loginMsg').textContent = 'Clave incorrecta.';
  }
});
$('#adminKeyInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('#btnLogin').click();
});

/** Render tabla */
function render(list){
  tbody.innerHTML = '';
  list.forEach(r => {
    const tr = document.createElement('tr');

    const statusSelect = document.createElement('select');
    statusSelect.className = 'status';
    ['Pendiente','Aceptado','Rechazado'].forEach(opt => {
      const o = document.createElement('option');
      o.value = opt; o.textContent = opt;
      if ((r.status||'').toLowerCase() === opt.toLowerCase()) o.selected = true;
      statusSelect.appendChild(o);
    });
    statusSelect.addEventListener('change', () => {
      updateStatus(r.konamiId, statusSelect.value, tr);
    });

    tr.innerHTML = `
      <td class="hide-sm">${safe(r.timestamp)}</td>
      <td><span class="tag">${safe(r.konamiId)}</span></td>
      <td>${fullName(r) || ''}</td>
      <td class="hide-sm">${safe(r.email)}</td>
      <td class="hide-sm">${safe(r.phone)}</td>
      <td>${r.paymentUrl ? `<a href="${r.paymentUrl}" target="_blank">Ver</a>` : ''}</td>
      <td></td>
    `;
    tr.lastElementChild.appendChild(statusSelect);
    tbody.appendChild(tr);
  });
  counter.textContent = `${list.length} registro${list.length===1?'':'s'}`;
}

/** Filtro local (cualquier campo) */
function applyFilter(){
  const q = $('#search').value.toLowerCase().trim();
  if (!q){ render(DATA); return; }
  const filtered = DATA.filter(r => {
    const blob = [
      safe(r.konamiId),
      fullName(r),
      safe(r.email),
      safe(r.phone),
      safe(r.status)
    ].join(' ').toLowerCase();
    return blob.includes(q);
  });
  render(filtered);
}
$('#search').addEventListener('input', debounce(applyFilter, 120));

function debounce(fn, ms){
  let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); };
}

/** Cargar todo desde el backend */
async function loadAll(){
  out.textContent = '';
  try{
    const url = `${API_BASE}?adminKey=${encodeURIComponent(ADMIN_KEY)}`;
    const r = await fetch(url);
    const j = await r.json();
    if (!j.ok) throw new Error(j.message || 'Error al listar');
    // normaliza konamiId por si el 0 inicial llegó con apóstrofe
    DATA = (j.data || []).map(row => ({...row, konamiId: pad10(row.konamiId)}));
    render(DATA);
  }catch(e){
    out.textContent = 'Error: ' + e.message;
  }
}

/** Actualiza estatus */
async function updateStatus(konamiId, newStatus, rowEl){
  try{
    rowEl.classList.add('updating');
    const fd = new FormData();
    fd.append('konamiId', pad10(konamiId));
    fd.append('status', newStatus);

    const r = await fetch(API_BASE, { method:'POST', body: fd });
    const j = await r.json();
    if (!j.ok) throw new Error(j.message || 'No se pudo actualizar');

    // refleja el cambio en cache y vuelve a aplicar filtro para mantener vista
    DATA = DATA.map(x => x.konamiId === pad10(konamiId) ? {...x, status:newStatus} : x);
    applyFilter();

    // feedback sutil
    flashRow(rowEl, newStatus);
  }catch(e){
    out.textContent = 'Error al cambiar estatus: ' + e.message;
  }finally{
    rowEl.classList.remove('updating');
  }
}
function flashRow(rowEl, status){
  const cls = status === 'Aceptado' ? 'ok' : (status === 'Rechazado' ? 'err' : 'warn');
  rowEl.style.transition = 'background 400ms';
  rowEl.style.background = 'rgba(255,255,255,.02)';
  const tag = document.createElement('span');
  tag.className = `tag ${cls}`;
  tag.textContent = `Guardado: ${status}`;
  rowEl.cells[rowEl.cells.length-1].appendChild(tag);
  setTimeout(()=>{ tag.remove(); rowEl.style.background='transparent'; }, 1300);
}

/** Inicio tras login */
function initAfterLogin(){
  loadAll();
  // si quieres, precargar filtro desde URL ?q=
  const params = new URLSearchParams(location.search);
  const q = params.get('q');
  if (q){ $('#search').value = q; applyFilter(); }
}

/** Boot */
showLogin();
