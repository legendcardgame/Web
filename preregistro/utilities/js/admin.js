// Admin panel sin módulos. Requiere window.LCG (API_BASE, ADMIN_KEY) desde js/config.js
(function () {
  'use strict';

  // --- DOM ---
  const $ = s => document.querySelector(s);
  const loginScreen   = $('#loginScreen');
  const appSection    = $('#app');
  const keyInp        = $('#adminKeyInput');
  const btnLog        = $('#btnLogin');
  const loginMsg      = $('#loginMsg');

  const out           = $('#out');
  const tbody         = $('#tbody');
  const search        = $('#search');
  const evtFilter     = $('#evtFilter');
  const counter       = $('#counter');
  const centerLoader  = $('#centerLoader');

  // --- Estado ---
  let DATA = [];

  // --- Utils ---
  const stripLeadingApostrophe = s => String(s||'').replace(/^'/,'');
  const safe   = v => String(v ?? '').trim();
  const pad10  = s => stripLeadingApostrophe(s).replace(/\D/g,'').padStart(10,'0');
  const debounce = (fn, ms) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };
  const fullName = r => [r.firstName, r.lastName].filter(Boolean).join(' ').trim();

  const EVENT_LABEL = {
    'principal'      : 'Evento Principal',
    'edison'         : 'Edison Format',
    'dragon-duel'    : 'Dragon Duel',
    'speed-duel'     : 'Speed Duel',
    'structure-deck' : 'Structure Deck',
    'master-duel'    : 'Master Duel',
    'win-a-mat'      : 'Win a Mat'
  };
  const prettyEvent = raw => {
    const k = String(raw||'').toLowerCase().trim();
    return EVENT_LABEL[k] || (raw || '—');
  };

  // Helpers de creación de celdas
  function td(text, cls){
    const el = document.createElement('td');
    if (cls) el.className = cls;
    if (text !== undefined) el.innerHTML = text;
    return el;
  }

  // --- Loader tabla ---
  function showLoader(){ centerLoader.style.display = 'flex'; }
  function hideLoader(){ centerLoader.style.display = 'none'; }

  // --- Login ---
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

  // --- Render tabla ---
  function render(list){
    tbody.innerHTML = '';

    list.forEach(r => {
      const tr = document.createElement('tr');
      const kon = pad10(r.konamiId);
      const evtRaw = safe(r.eventType || r.evento || '');
      const evtPretty = prettyEvent(evtRaw);

      // Select de estatus
      const statusSelect = document.createElement('select');
      statusSelect.className = 'status';
      ['Pendiente','Aceptado','Rechazado'].forEach(opt => {
        const o = document.createElement('option');
        o.value = opt; o.textContent = opt;
        if ((r.status||'').toLowerCase() === opt.toLowerCase()) o.selected = true;
        statusSelect.appendChild(o);
      });
      // Guarda valor inicial por si hay que revertir
      statusSelect.setAttribute('value', statusSelect.value);

      statusSelect.addEventListener('change', () => {
        updateStatus(kon, evtRaw, statusSelect.value, tr);
      });

      // Botón borrar (visible también en móvil)
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-del';
      delBtn.textContent = 'Borrar';
      delBtn.addEventListener('click', () => {
        const nice = `${kon} · ${evtPretty}`;
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
      const tdEvento  = td(`<span class="evt-pill">${evtPretty}</span>`);
      const tdStatus  = td();               // aquí va el select
      const tdAccion  = td();               // columna acciones SIEMPRE visible
      tdAccion.className = 'actions-col';

      tdStatus.appendChild(statusSelect);
      // Contenedor opcional para acomodar mejor en móvil
      const wrap = document.createElement('span');
      wrap.className = 'row-actions';
      wrap.appendChild(delBtn);
      tdAccion.appendChild(wrap);

      tr.append(tdFecha, tdKon, tdNom, tdApe, tdMail, tdPhone, tdComprob, tdEvento, tdStatus, tdAccion);
      tbody.appendChild(tr);
    });

    counter.textContent = String(list.length);
  }

  // --- Filtro (texto + evento) ---
  function applyFilter(){
    const q = search.value.toLowerCase().trim();
    const ev = String(evtFilter.value || '').toLowerCase().trim();

    let list = DATA;

    if (ev){
      list = list.filter(r => String(r.eventType||r.evento||'').toLowerCase() === ev);
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
  search.addEventListener('input', debounce(applyFilter, 120));
  evtFilter.addEventListener('change', applyFilter);

  // --- Cargar todos ---
  async function loadAll(){
    out.textContent = '';
    showLoader();
    try{
      if (!window.LCG) throw new Error('Config no cargó (window.LCG).');
      const url = `${window.LCG.API_BASE}?adminKey=${encodeURIComponent(window.LCG.ADMIN_KEY)}&_t=${Date.now()}`;
      const r   = await fetch(url);
      const raw = await r.text();
      const j   = JSON.parse(raw);
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
      fd.append('konamiId', konamiId);
      fd.append('eventType', eventType);
      fd.append('status', newStatus);
      fd.append('adminKey', window.LCG.ADMIN_KEY); // opcional

      const r = await fetch(window.LCG.API_BASE, { method:'POST', body: fd });
      const raw = await r.text();
      const j   = JSON.parse(raw);
      if (!j.ok) throw new Error(j.message || 'No se pudo actualizar');

      // Actualiza cache
      const i = DATA.findIndex(x =>
        pad10(x.konamiId) === konamiId &&
        String(x.eventType||x.evento||'').toLowerCase() === String(eventType||'').toLowerCase()
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
      fd.append('action', 'delete');
      fd.append('konamiId', konamiId);
      fd.append('eventType', eventType);
      fd.append('adminKey', window.LCG.ADMIN_KEY); // opcional

      const r = await fetch(window.LCG.API_BASE, { method:'POST', body: fd });
      const raw = await r.text();
      const j   = JSON.parse(raw);
      if (!j.ok) throw new Error(j.message || 'No se pudo borrar');

      // Quitar de cache y re-render
      DATA = DATA.filter(x =>
        !(pad10(x.konamiId) === konamiId &&
          String(x.eventType||x.evento||'').toLowerCase() === String(eventType||'').toLowerCase())
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
    // penúltima columna es estatus; última es acciones
    rowEl.cells[rowEl.cells.length-2].appendChild(tag);
    setTimeout(()=>{ tag.remove(); rowEl.style.background='transparent'; }, 1300);
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
    } else {
      showLogin();
    }
  });

})();
```0
