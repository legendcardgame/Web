(function(){
  // ---- helpers de DOM ----
  function $(s){ return document.querySelector(s); }
  const out     = $('#out');
  const tbody   = $('#tbody');
  const counter = $('#counter');

  // cache datos y login
  let DATA = [];
  let logged = false;

  // ---- utilidades ----
  function stripLeadingApostrophe(s){ return String(s||'').replace(/^'/,''); }
  function pad10(s){ return stripLeadingApostrophe(s).replace(/\D/g,'').padStart(10,'0'); }
  function fullName(r){ return [r.firstName, r.lastName].filter(Boolean).join(' ').trim(); }
  function safe(v){ return String(v ?? '').trim(); }
  function debounce(fn,ms){ var t; return function(){ clearTimeout(t); t=setTimeout(fn.bind(null, ...arguments), ms); }; }

  // ---- login front ----
  function showLogin(){
    try{
      const keyOk = localStorage.getItem('adminAuthKey') === (window.LCG && window.LCG.ADMIN_KEY);
      if (keyOk){ 
        logged = true; 
        $('#login').style.display = 'none'; 
        initAfterLogin(); 
        return; 
      }
    }catch(_){}
    $('#login').style.display = 'flex';
    $('#adminKeyInput').focus();
  }

  document.addEventListener('DOMContentLoaded', function(){
    // botones login
    $('#btnLogin').addEventListener('click', function(){
      const k = $('#adminKeyInput').value.trim();
      if (k === (window.LCG && window.LCG.ADMIN_KEY)){
        try{ localStorage.setItem('adminAuthKey', k); }catch(_){}
        logged = true;
        $('#login').style.display = 'none';
        initAfterLogin();
      } else {
        $('#loginMsg').textContent = 'Clave incorrecta.';
      }
    });
    $('#adminKeyInput').addEventListener('keydown', function(e){
      if (e.key === 'Enter') $('#btnLogin').click();
    });

    // búsqueda
    $('#search').addEventListener('input', debounce(applyFilter, 120));

    // arranca
    showLogin();
  });

  // ---- render de tabla ----
  function render(list){
    tbody.innerHTML = '';
    list.forEach(function(r){
      var tr = document.createElement('tr');

      // selector de estado
      var statusSelect = document.createElement('select');
      statusSelect.className = 'status';
      ['Pendiente','Aceptado','Rechazado'].forEach(function(opt){
        var o = document.createElement('option');
        o.value = opt; o.textContent = opt;
        if ((String(r.status||'')).toLowerCase() === opt.toLowerCase()) o.selected = true;
        statusSelect.appendChild(o);
      });
      statusSelect.addEventListener('change', function(){
        updateStatus(r.konamiId, statusSelect.value, tr);
      });

      tr.innerHTML =
        '<td class="hide-sm">'+ safe(r.timestamp) +'</td>'+
        '<td><span class="tag">'+ safe(r.konamiId) +'</span></td>'+
        '<td>'+ (fullName(r)||'') +'</td>'+
        '<td class="hide-sm">'+ safe(r.email) +'</td>'+
        '<td class="hide-sm">'+ safe(r.phone) +'</td>'+
        '<td>'+ (r.paymentUrl ? '<a href="'+ r.paymentUrl +'" target="_blank">Ver</a>' : '') +'</td>'+
        '<td></td>';

      tr.lastElementChild.appendChild(statusSelect);
      tbody.appendChild(tr);
    });
    counter.textContent = list.length + ' registro' + (list.length===1?'':'s');
  }

  // ---- filtro local ----
  function applyFilter(){
    var q = $('#search').value.toLowerCase().trim();
    if (!q){ render(DATA); return; }
    var filtered = DATA.filter(function(r){
      var blob = [
        safe(r.konamiId),
        fullName(r),
        safe(r.email),
        safe(r.phone),
        safe(r.status)
      ].join(' ').toLowerCase();
      return blob.indexOf(q) !== -1;
    });
    render(filtered);
  }

  // ---- carga desde backend ----
  async function loadAll(){
    out.textContent = '';
    try{
      var url = (window.LCG && window.LCG.API_BASE) + '?adminKey=' + encodeURIComponent(window.LCG.ADMIN_KEY);
      var r = await fetch(url);
      var j = await r.json();
      if (!j.ok) throw new Error(j.message || 'Error al listar');
      // normaliza konamiId
      DATA = (j.data || []).map(function(row){
        row.konamiId = pad10(row.konamiId);
        return row;
      });
      render(DATA);
    }catch(e){
      out.textContent = 'Error: ' + e.message;
    }
  }

  // ---- actualiza estatus ----
  async function updateStatus(konamiId, newStatus, rowEl){
    try{
      rowEl.classList.add('updating');
      var fd = new FormData();
      fd.append('konamiId', pad10(konamiId));
      fd.append('status', newStatus);

      var r = await fetch((window.LCG && window.LCG.API_BASE), { method:'POST', body: fd });
      var j = await r.json();
      if (!j.ok) throw new Error(j.message || 'No se pudo actualizar');

      // refleja en cache y re-filtra
      var k10 = pad10(konamiId);
      DATA = DATA.map(function(x){ return x.konamiId === k10 ? Object.assign({}, x, {status:newStatus}) : x; });
      applyFilter();

      flashRow(rowEl, newStatus);
    }catch(e){
      out.textContent = 'Error al cambiar estatus: ' + e.message;
    }finally{
      rowEl.classList.remove('updating');
    }
  }
  function flashRow(rowEl, status){
    var cls = (status === 'Aceptado') ? 'ok' : ((status === 'Rechazado') ? 'err' : 'warn');
    rowEl.style.transition = 'background 400ms';
    rowEl.style.background = 'rgba(255,255,255,.02)';
    var tag = document.createElement('span');
    tag.className = 'tag ' + cls;
    tag.textContent = 'Guardado: ' + status;
    rowEl.cells[rowEl.cells.length-1].appendChild(tag);
    setTimeout(function(){ if (tag && tag.parentNode) tag.parentNode.removeChild(tag); rowEl.style.background='transparent'; }, 1300);
  }

  // ---- post-login ----
  function initAfterLogin(){
    loadAll();
    // opcional: precargar filtro ?q=...
    try{
      var params = new URLSearchParams(location.search);
      var q = params.get('q');
      if (q){ $('#search').value = q; applyFilter(); }
    }catch(_){}
  }
})();
