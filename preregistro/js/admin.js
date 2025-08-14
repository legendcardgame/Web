// Usa window.LCG definido en js/config.js
(function(){
  'use strict';

  // --- Helpers DOM y estado ---
  const $      = s => document.querySelector(s);
  const out    = $('#out');
  const tbody  = $('#tbody');
  const search = $('#search');
  const counter= $('#counter');
  const login  = $('#login');
  const keyInp = $('#adminKeyInput');
  const btnLog = $('#btnLogin');
  const loginMsg = $('#loginMsg');

  let DATA   = [];      // cache de registros
  let LOGGED = false;   // estado de sesión simple

  // --- Utilidades ---
  const stripLeadingApostrophe = s => String(s||'').replace(/^'/,'');
  const safe   = v => String(v ?? '').trim();
  const pad10  = s => stripLeadingApostrophe(s).replace(/\D/g,'').padStart(10,'0');
  const fullName = r => [r.firstName, r.lastName].filter(Boolean).join(' ').trim();

  function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }

  // --- Login simple en front (clave fija en config) ---
  function showLogin(){
    const k = localStorage.getItem('adminAuthKey');
    if (k && window.LCG && k === window.LCG.ADMIN_KEY){
      LOGGED = true;
      login.style.display = 'none';
      initAfterLogin();
      return;
    }
    login.style.display = 'flex';
    login.setAttribute('aria-hidden','false');
    keyInp.value = '';
    loginMsg.textContent = '';
    setTimeout(()=> keyInp.focus(), 0);
  }

  async function doLogin(){
    const val = keyInp.value.trim();
    if (!window.LCG){
      loginMsg.textContent = 'Config no cargó (window.LCG).';
      return;
    }
    if (val === window.LCG.ADMIN_KEY){
      localStorage.setItem('adminAuthKey', val);
      LOGGED = true;
      login.style.display = 'none';
      login.setAttribute('aria-hidden','true');
      initAfterLogin();
    }else{
      loginMsg.textContent = 'Clave incorrecta.';
    }
  }

  btnLog.addEventListener('click', doLogin);
  keyInp.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

  // --- Render tabla ---
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
        updateStatus(r.konamiId, statusSelect.value, tr);
      });

      tr.innerHTML = `
        <td class="hide-sm">${safe(r.timestamp)}</td>
        <td><span class="tag">${safe(pad10(r.konamiId))}</span></td>
        <td>${fullName(r) || ''}</td>
        <td class="hide-sm">${safe(r.email)}</td>
        <td class="hide-sm">${safe(r.phone)}</td>
        <td>${r.paymentUrl ? `<a href="${r.paymentUrl}" target="_blank" rel="noopener">Ver</a>` : ''}</td>
        <td></td>
      `;
      tr.lastElementChild.appendChild(statusSelect);
      tbody.appendChild(tr);
    });
    counter.textContent = `${list.length} registro${list.length===1?'':'s'}`;
  }

  // --- Filtro local ---
  function applyFilter(){
    const q = search.value.toLowerCase().trim();
    if (!q){ render(DATA); return; }
    const filtered = DATA.filter(r => {
      const blob = [
        pad10(r.konamiId),
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

  // --- Cargar listado completo del backend ---
  async function loadAll(){
    out.textContent = '';
    try{
      if (!window.LCG) throw new Error('Config no cargó (window.LCG).');
      const url = `${window.LCG.API_BASE}?adminKey=${encodeURIComponent(window.LCG.ADMIN_KEY)}&_t=${Date.now()}`;
      const r   = await fetch(url);
      const raw = await r.text();         // evita errores si la respuesta no es JSON válido
      // console.log('[ADMIN] RAW RESPONSE:', raw);
      const j   = JSON.parse(raw);
      if (!j.ok) throw new Error(j.message || 'Error al listar');

      // normalizamos konamiId con cero inicial si hace falta
      DATA = (j.data || []).map(row => ({ ...row, konamiId: pad10(row.konamiId) }));
      render(DATA);
    }catch(e){
      console.error(e);
      out.textContent = 'Error: ' + e.message;
      DATA = [];
      render(DATA);
    }
  }

  // --- Cambiar estatus (POST al Apps Script) ---
  async function updateStatus(konamiId, newStatus, rowEl){
    try{
      if (!window.LCG) throw new Error('Config no cargó.');
      rowEl.classList.add('updating');
      const fd = new FormData();
      fd.append('konamiId', pad10(konamiId));
      fd.append('status', newStatus);

      const r = await fetch(window.LCG.API_BASE, { method:'POST', body: fd });
      const raw = await r.text();
      const j = JSON.parse(raw);
      if (!j.ok) throw new Error(j.message || 'No se pudo actualizar');

      // Actualiza cache y mantiene filtro aplicado
      DATA = DATA.map(x => pad10(x.konamiId) === pad10(konamiId) ? {...x, status:newStatus} : x);
      applyFilter();

      // Feedback visual
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

  // --- Inicio tras login ---
  function initAfterLogin(){
    loadAll();
    // si llega ?q=foo en la URL, aplicar filtro inicial
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    if (q){
      search.value = q;
      applyFilter();
    }
  }

  // --- Boot ---
  window.addEventListener('DOMContentLoaded', () => {
    // seguridad básica: exige que exista window.LCG
    if (!window.LCG){ out.textContent = 'No se encontró configuración (js/config.js).'; return; }
    showLogin();
  });
})();
