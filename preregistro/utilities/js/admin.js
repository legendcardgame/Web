// Admin panel sin módulos. Requiere window.LCG (API_BASE, ADMIN_KEY) desde js/config.js
(function () {
  'use strict';

  // --- DOM helpers ---
  const $ = s => document.querySelector(s);

  const loginScreen  = $('#loginScreen');
  const appSection   = $('#app');
  const keyInp       = $('#adminKeyInput');
  const btnLog       = $('#btnLogin');
  const loginMsg     = $('#loginMsg');

  const out          = $('#out');
  const tbody        = $('#tbody');
  const search       = $('#search');
  let   evtFilter    = $('#evtFilter');       // puede no existir aún
  const counter      = $('#counter');
  const centerLoader = $('#centerLoader');

  // --- Estado ---
  let DATA = [];

  // --- Utils ---
  function stripLeadingApostrophe(s){ return String(s || '').replace(/^'/,''); }
  function safe(v){ return String(v == null ? '' : v).trim(); }
  function pad10(s){ return stripLeadingApostrophe(s).replace(/\D/g,'').padStart(10,'0'); }
  function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }
  function fullName(r){ return [r.firstName, r.lastName].filter(Boolean).join(' ').trim(); }

  const EVENT_LABEL = {
    'principal'      : 'Evento Principal',
    'edison'         : 'Edison Format',
    'dragon-duel'    : 'Dragon Duel',
    'speed-duel'     : 'Speed Duel',
    'structure-deck' : 'Structure Deck',
    'master-duel'    : 'Master Duel',
    'win-a-mat'      : 'Win a Mat'
  };
  function prettyEvent(raw){
    const k = String(raw || '').toLowerCase().trim();
    return EVENT_LABEL[k] || (raw || '—');
  }

  // Crea <td>
  function td(html, cls){
    const el = document.createElement('td');
    if (cls) el.className = cls;
    if (html !== undefined) el.innerHTML = html;
    return el;
  }

  // --- Loader tabla ---
  function showLoader(){ centerLoader.style.display = 'flex'; }
  function hideLoader(){ centerLoader.style.display = 'none'; }

  // --- Login ---
  function showLogin(){
    loginScreen.style.display = 'flex';
    appSection.style.display  = 'none';
    loginMsg.textContent = '';
    keyInp.value = '';
    setTimeout(() => keyInp.focus(), 0);
  }
  function enterApp(){
    loginScreen.style.display = 'none';
    appSection.style.display  = 'block';
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
    }else{
      loginMsg.textContent = 'Clave incorrecta.';
    }
  }

  // --- Inyecta el select de eventos si no existe ---
  (function ensureEvtFilter(){
    if (evtFilter) return;
    const toolbar = document.querySelector('.toolbar');
    if (!toolbar) return;
    const sel = document.createElement('select');
    sel.id = 'evtFilter';
    sel.className = 'input';
    sel.style.maxWidth = '230px';
    sel.innerHTML = `
      <option value="">Todos los eventos</option>
      <option value="principal">Evento Principal</option>
      <option value="edison">Edison Format</option>
      <option value="win-a-mat">Win a Mat</option>
      <option value="master-duel">Master Duel</option>
      <option value="speed-duel">Speed Duel</option>
      <option value="structure-deck">Structure Deck</option>
      <option value="dragon-duel">Dragon Duel</option>
    `;
    toolbar.appendChild(sel);
    evtFilter = sel;
  })();

  // --- Render tabla ---
  function render(list){
    tbody.innerHTML = '';

    list.forEach(r => {
      const tr       = document.createElement('tr');
      const kon      = pad10(r.konamiId);
      const evtRaw   = safe(r.eventType || r.evento || '');
      const evtNice  = prettyEvent(evtRaw);

      // Select de estatus
      const sel = document.createElement('select');
      sel.className = 'status';
      ['Pendiente','Aceptado','Rechazado'].forEach(opt => {
        const o = document.createElement('option');
        o.value = opt; o.textContent = opt;
        if ((r.status || '').toLowerCase() === opt.toLowerCase()) o.selected = true;
        sel.appendChild(o);
      });
      sel.setAttribute('value', sel.value); // para revertir en error
      sel.addEventListener('change', () => updateStatus(kon, evtRaw, sel.value, tr));

      // Botón borrar SIEMPRE visible (también móvil)
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-del';
      delBtn.textContent = 'Borrar';
      delBtn.addEventListener('click', () => {
        const nice = `${kon} · ${evtNice}`;
        if (!confirm(`¿Seguro que deseas borrar el registro?\n\n${nice}`)) return;
        deleteRow(kon, evtRaw, tr);
      });

      // Celdas
      const tdFecha   = td(safe(r.timestamp), 'hide-sm');
      const tdKon     = td(`<span class="tag">${kon}</span>`);
      const tdNom     = td(safe(r.firstName));
      const tdApe     = td(safe(r.lastName));
      const tdMail    = td(safe(r.email), 'hide-sm');
      const tdPhone   = td(safe(r.phone), 'hide-sm');
      const tdComprob = td(r.paymentUrl ? `<a href="${r.paymentUrl}" target="_blank" rel="noopener">Ver</a>` : '');
      const tdEvento  = td(`<span class="evt-pill">${evtNice}</span>`);
      const tdStatus  = td();
      const tdAccion  = td(); tdAccion.className = 'actions-col';

      tdStatus.appendChild(sel);
      tdAccion.appendChild(delBtn);

      tr.append(tdFecha, tdKon, tdNom, tdApe, tdMail, tdPhone, tdComprob, tdEvento, tdStatus, tdAccion);
      tbody.appendChild(tr);
    });

    counter.textContent = String(list.length);
  }

  // --- Filtro (texto + evento) ---
  function applyFilter(){
    const q  = search ? search.value.toLowerCase().trim() : '';
    const ev = evtFilter ? String(evtFilter.value || '').toLowerCase().trim() : '';

    let list = DATA;

    if (ev){
      list = list.filter(r => String(r.eventType || r.evento || '').toLowerCase() === ev);
    }
    if (q){
      list = list.filter(r => {
        const blob = [
          pad10(r.konamiId),
          safe(r.firstName),
          safe(r.lastName),
          fullName(r),
          safe(r.email),
          safe(r.phone),
          safe(r.status),
          safe(r.timestamp),
          prettyEvent(r.eventType || r.evento || '')
        ].join(' ').toLowerCase();
        return blob.includes(q);
      });
    }

    render(list);
  }

  if (search)    search.addEventListener('input', debounce(applyFilter, 120));
  if (evtFilter) evtFilter.addEventListener('change', applyFilter);

  // --- Cargar todos ---
  async function loadAll(){
    out.textContent = '';
    showLoader();
    try{
      if (!window.LCG) throw new Error('Config no cargó (window.LCG).');
      const url = `${window.LCG.API_BASE}?adminKey=${encodeURIComponent(window.LCG.ADMIN_KEY)}&_t=${Date.now()}`;
      const r   = await fetch(url);
      const raw = await r.text();                 // tolerante a 204 o espacios
      const j   = JSON.parse(raw || '{"ok":false}');
      if (!j.ok) throw new Error(j.message || 'Error al listar');

      DATA = (j.data || []).map(row => ({ ...row, konamiId: pad10(row.konamiId) }));
      applyFilter();
    }catch(e){
      console.error(e);
      out.textContent = 'Error: ' + e.message;
      DATA = [];
      render(DATA);
    }finally{
      hideLoader();
    }
  }

  // --- Cambiar estatus (FormData → sin preflight/CORS) ---
  async function updateStatus(konamiId, eventType, newStatus, rowEl){
    const sel = rowEl.querySelector('select.status');
    try{
      if (!window.LCG) throw new Error('Config no cargó.');
      rowEl.classList.add('updating');
      if (sel){ sel.classList.add('loading'); sel.disabled = true; }

      const fd = new FormData();
      fd.append('konamiId',  konamiId);
      fd.append('eventType', eventType);
      fd.append('status',    newStatus);
      fd.append('adminKey',  window.LCG.ADMIN_KEY); // si tu doPost lo valida

      const r   = await fetch(window.LCG.API_BASE, { method:'POST', body: fd });
      const raw = await r.text();
      const j   = JSON.parse(raw || '{"ok":false}');
      if (!j.ok) throw new Error(j.message || 'No se pudo actualizar');

      const i = DATA.findIndex(x =>
        pad10(x.konamiId) === konamiId &&
        String(x.eventType || x.evento || '').toLowerCase() === String(eventType || '').toLowerCase()
      );
      if (i >= 0) DATA[i].status = newStatus;

      applyFilter();
      flashRow(rowEl, newStatus);
      out.textContent = `Actualizado: ${konamiId} (${prettyEvent(eventType)}) → ${newStatus}`;
    }catch(e){
      console.error(e);
      out.textContent = 'Error al cambiar estatus: ' + e.message;
      if (sel){ sel.value = sel.getAttribute('value') || sel.value; } // revert simple
    }finally{
      rowEl.classList.remove('updating');
      if (sel){ sel.classList.remove('loading'); sel.disabled = false; }
    }
  }

  // --- Borrar registro ---
  async function deleteRow(konamiId, eventType, rowEl){
    try{
      if (!window.LCG) throw new Error('Config no cargó.');
      rowEl.classList.add('updating');

      const fd = new FormData();
      fd.append('action',    'delete');
      fd.append('konamiId',  konamiId);
      fd.append('eventType', eventType);
      fd.append('adminKey',  window.LCG.ADMIN_KEY); // si lo validas

      const r   = await fetch(window.LCG.API_BASE, { method:'POST', body: fd });
      const raw = await r.text();
      const j   = JSON.parse(raw || '{"ok":false}');
      if (!j.ok) throw new Error(j.message || 'No se pudo borrar');

      DATA = DATA.filter(x =>
        !(pad10(x.konamiId) === konamiId &&
          String(x.eventType || x.evento || '').toLowerCase() === String(eventType || '').toLowerCase())
      );
      applyFilter();
      out.textContent = `Eliminado: ${konamiId} (${prettyEvent(eventType)})`;
    }catch(e){
      console.error(e);
      out.textContent = 'Error al borrar: ' + e.message;
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
    // penúltima = estatus; última = acciones
    rowEl.cells[rowEl.cells.length - 2].appendChild(tag);
    setTimeout(() => { tag.remove(); rowEl.style.background = 'transparent'; }, 1300);
  }

  // --- Boot ---
  window.addEventListener('DOMContentLoaded', () => {
    if (!window.LCG){
      showLogin();
      return;
    }
    const saved = localStorage.getItem('adminAuthKey');
    if (saved && saved === window.LCG.ADMIN_KEY){
      enterApp();
    }else{
      showLogin();
    }
  });

})();
