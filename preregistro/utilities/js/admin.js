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

  // Mapa “bonito” para mostrar el evento
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

      // Select de estatus (con valor actual)
      const statusSelect = document.createElement('select');
      statusSelect.className = 'status';
      ['Pendiente','Aceptado','Rechazado'].forEach(opt => {
        const o = document.createElement('option');
        o.value = opt; o.textContent = opt;
        if ((r.status||'').toLowerCase() === opt.toLowerCase()) o.selected = true;
        statusSelect.appendChild(o);
      });
      statusSelect.addEventListener('change', () => {
        updateStatus(kon, evtRaw, statusSelect.value, tr); // 👈 incluye eventType
      });

      // Fila (incluye nueva columna “Evento” ANTES de Estatus)
      tr.setAttribute('data-konami', kon);
      tr.setAttribute('data-event', evtRaw);

      tr.innerHTML = `
        <td class="hide-sm">${safe(r.timestamp)}</td>
        <td><span class="tag">${kon}</span></td>
        <td>${safe(r.firstName)}</td>
        <td>${safe(r.lastName)}</td>
        <td class="hide-sm">${safe(r.email)}</td>
        <td class="hide-sm">${safe(r.phone)}</td>
        <td>${r.paymentUrl ? `<a href="${r.paymentUrl}" target="_blank" rel="noopener">Ver</a>` : ''}</td>
        <td><span class="evt-pill">${evtPretty}</span></td> <!-- 👈 NUEVA COLUMNA -->
        <td></td>
      `;
      tr.lastElementChild.appendChild(statusSelect);
      tbody.appendChild(tr);
    });
    counter.textContent = String(list.length);
  }

  // --- Filtro ---
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
        safe(r.timestamp),
        prettyEvent(r.eventType || r.evento || '')
      ].join(' ').toLowerCase();
      return blob.includes(q);
    });
    render(filtered);
  }
  search.addEventListener('input', debounce(applyFilter, 120));

  // --- Cargar todos ---
  async function loadAll(){
    out.textContent = '';
    showLoader();
    try{
      if (!window.LCG) throw new Error('Config no cargó (window.LCG).');
      const url = `${window.LCG.API_BASE}?adminKey=${encodeURIComponent(window.LCG.ADMIN_KEY)}&_t=${Date.now()}`;
      const r   = await fetch(url);
      const raw = await r.text();           // tolerante a respuestas no-JSON limpias
      const j   = JSON.parse(raw);
      if (!j.ok) throw new Error(j.message || 'Error al listar');

      // normaliza konamiId a 10 dígitos y conserva eventType
      DATA = (j.data || []).map(row => ({
        ...row,
        konamiId: pad10(row.konamiId)
      }));
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

  // --- Cambiar estatus (por Konami + eventType) ---
  async function updateStatus(konamiId, eventType, newStatus, rowEl){
    const sel = rowEl.querySelector('select.status');
    try{
      if (!window.LCG) throw new Error('Config no cargó.');
      rowEl.classList.add('updating');

      // Efecto de “iluminado”
      if (sel){
        sel.classList.add('loading');
        sel.disabled = true;
      }

      // Usamos JSON (Apps Script ya soporta konamiId + eventType)
      const body = { konamiId, eventType, status: newStatus };
      const r = await fetch(window.LCG.API_BASE, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(body)
      });
      const raw = await r.text();
      const j   = JSON.parse(raw);
      if (!j.ok) throw new Error(j.message || 'No se pudo actualizar');

      // Actualiza cache local
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

      // Revertir visual
      const current = DATA.find(x =>
        pad10(x.konamiId) === konamiId &&
        String(x.eventType||x.evento||'').toLowerCase() === String(eventType||'').toLowerCase()
      );
      if (current && sel) sel.value = current.status || 'Pendiente';
    }finally{
      rowEl.classList.remove('updating');
      if (sel){
        sel.classList.remove('loading');
        sel.disabled = false;
      }
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
