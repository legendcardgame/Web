// Admin panel sin módulos. Requiere window.LCG (API_BASE, ADMIN_KEY) desde js/config.js
(function () {
  'use strict';

  // DOM
  const $ = s => document.querySelector(s);
  const loginScreen = $('#loginScreen');
  const appSection  = $('#app');
  const keyInp      = $('#adminKeyInput');
  const btnLog      = $('#btnLogin');
  const loginMsg    = $('#loginMsg');

  const out     = $('#out');
  const tbody   = $('#tbody');
  const search  = $('#search');
  const counter = $('#counter');
  const centerLoader = $('#centerLoader');

  // Estado
  let DATA = [];

  // Utils
  const stripLeadingApostrophe = s => String(s||'').replace(/^'/,'');
  const safe   = v => String(v ?? '').trim();
  const pad10  = s => stripLeadingApostrophe(s).replace(/\D/g,'').padStart(10,'0');
  const debounce = (fn, ms) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };
  const fullName = r => [r.firstName, r.lastName].filter(Boolean).join(' ').trim();

  // Loader helpers
  function showLoader(){ centerLoader.style.display = 'flex'; }
  function hideLoader(){ centerLoader.style.display = 'none'; }

  // Login
  function showLogin(){
    loginScreen.style.display = 'flex';
    appSection.style.display = 'none';
    loginMsg.textContent = '';
    keyInp.value = '';
    setTimeout(()=> keyInp.focus(), 0);
  }
  function enterApp(){
    loginScreen.style.display = 'none';
    appSection.style.display = 'block';
    loadAll();
  }
  btnLog.addEventListener('click', doLogin);
  keyInp.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

  function doLogin(){
    if (!window.LCG){ loginMsg.textContent = 'Config no cargó (js/config.js).'; return; }
    const val = keyInp.value.trim();
    if (val === window.LCG.ADMIN_KEY){
      localStorage.setItem('adminAuthKey', val);
      enterApp();
    } else {
      loginMsg.textContent = 'Clave incorrecta.';
    }
  }

  // Tabla
  function render(list){
    tbody.innerHTML = '';
    list.forEach(r => {
      const tr = document.createElement('tr');

      // Select de estatus
      const statusSelect = document.createElement('select');
      statusSelect.className = 'status';
      ['Pendiente','Aceptado','Rechazado'].forEach(opt => {
        const o = document.createElement('option');
        o.value = opt; o.textContent = opt;
        if ((r.status||'').toLowerCase() === opt.toLowerCase()) o.selected = true;
        statusSelect.appendChild(o);
      });
      statusSelect.addEventListener('change', () => {
        updateStatus(pad10(r.konamiId), statusSelect.value, tr);
      });

      // Fila
      tr.innerHTML = `
        <td class="hide-sm">${safe(r.timestamp)}</td>
        <td><span class="tag">${safe(pad10(r.konamiId))}</span></td>
        <td>${safe(r.firstName)}</td>
        <td>${safe(r.lastName)}</td>
        <td class="hide-sm">${safe(r.email)}</td>
        <td class="hide-sm">${safe(r.phone)}</td>
        <td>${r.paymentUrl ? `<a href="${r.paymentUrl}" target="_blank" rel="noopener">Ver</a>` : ''}</td>
        <td></td>
      `;
      tr.lastElementChild.appendChild(statusSelect);
      tbody.appendChild(tr);
    });
    counter.textContent = String(list.length);
  }

  // Filtro
  function applyFilter(){
    const q = search.value.toLowerCase().trim();
    if (!q){ render(DATA); return; }
    const filtered = DATA.filter(r => {
      const blob = [
        pad10(r.konamiId),
        safe(r.firstName),
        safe(r.lastName),
        fullName(r),
        safe(r.email),
        safe(r.phone),
        safe(r.status),
        safe(r.timestamp)
      ].join(' ').toLowerCase();
      return blob.includes(q);
    });
    render(filtered);
  }
  search.addEventListener('input', debounce(applyFilter, 120));

  // Cargar todos
  async function loadAll(){
    out.textContent = '';
    showLoader();
    try{
      if (!window.LCG) throw new Error('Config no cargó (window.LCG).');
      const url = `${window.LCG.API_BASE}?adminKey=${encodeURIComponent(window.LCG.ADMIN_KEY)}&_t=${Date.now()}`;
      const r   = await fetch(url);
      const raw = await r.text();           // tolerante a respuestas no-JSON limpias
      // console.log('[ADMIN] RAW:', raw);
      const j   = JSON.parse(raw);
      if (!j.ok) throw new Error(j.message || 'Error al listar');

      DATA = (j.data || []).map(row => ({ ...row, konamiId: pad10(row.konamiId) }));
      render(DATA);
    }catch(e){
      console.error(e);
      out.textContent = 'Error: ' + e.message;
      DATA = [];
      render(DATA);
    }finally{
      hideLoader();
    }
  }

  // Cambiar estatus
  async function updateStatus(konamiId, newStatus, rowEl){
    try{
      if (!window.LCG) throw new Error('Config no cargó.');
      rowEl.classList.add('updating');

      const fd = new FormData();
      fd.append('konamiId', konamiId);
      fd.append('status', newStatus);

      const r = await fetch(window.LCG.API_BASE, { method:'POST', body: fd });
      const raw = await r.text();
      const j = JSON.parse(raw);
      if (!j.ok) throw new Error(j.message || 'No se pudo actualizar');

      DATA = DATA.map(x => pad10(x.konamiId) === konamiId ? {...x, status:newStatus} : x);
      applyFilter();
      flashRow(rowEl, newStatus);
    }catch(e){
      console.error(e);
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

  // Boot
  window.addEventListener('DOMContentLoaded', () => {
    if (!window.LCG){ 
      // Si no existe config, mostramos login igual para no dejar pantalla en blanco
      showLogin();
      return;
    }
    // Autologin si la clave ya está guardada
    const saved = localStorage.getItem('adminAuthKey');
    if (saved && saved === window.LCG.ADMIN_KEY){
      enterApp();
    } else {
      showLogin();
    }
  });

})();
