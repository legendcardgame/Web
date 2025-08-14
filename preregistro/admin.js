import { API_BASE, ADMIN_KEY as ADMIN_DEFAULT } from './js/config.js';

const $ = s => document.querySelector(s);

const elKey   = $('#adminKey');
const elPing  = $('#btnPing');
const elList  = $('#btnList');
const elExp   = $('#btnExport');
const elStat  = $('#status');
const tblHead = document.querySelector('#tbl thead');
const tblBody = document.querySelector('#tbl tbody');

function setStatus(msg, ok=true){
  elStat.textContent = msg || '';
  elStat.className = ok ? 'ok' : 'bad';
}

function getAdminKey(){
  return (elKey.value || ADMIN_DEFAULT || '').trim();
}

async function ping(){
  setStatus('Probando…', true);
  try{
    const url = `${API_BASE}?action=ping&t=${Date.now()}`;
    const r = await fetch(url, { cache:'no-store' });
    const j = await r.json();
    if (!j.ok) throw new Error(j.message || 'Ping falló');
    setStatus(`Ping OK · ${j.time}`, true);
  }catch(err){
    setStatus(`Error/red: ${err.message}`, false);
  }
}

function renderTable(rows){
  tblHead.innerHTML = '';
  tblBody.innerHTML = '';
  if (!rows || !rows.length){
    tblHead.innerHTML = '<tr><th>No hay datos</th></tr>';
    return;
  }
  const headers = Object.keys(rows[0]);
  tblHead.innerHTML = `<tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr>`;
  for(const r of rows){
    const tr = document.createElement('tr');
    tr.innerHTML = headers.map(h=>`<td>${r[h] ?? ''}</td>`).join('');
    tblBody.appendChild(tr);
  }
}

async function list(){
  const key = getAdminKey();
  if (!key){ setStatus('Ingresa la clave de admin.', false); return; }
  setStatus('Cargando lista…', true);
  try{
    const url = `${API_BASE}?adminKey=${encodeURIComponent(key)}&t=${Date.now()}`;
    const r = await fetch(url, { cache:'no-store' });
    // Si el endpoint devolviera HTML por error, r.json() lanzará:
    const j = await r.json();
    if (!j.ok) throw new Error(j.message || 'No autorizado');
    renderTable(j.data || []);
    setStatus(`OK · ${j.data?.length ?? 0} registros`, true);
  }catch(err){
    setStatus(`Contraseña incorrecta o error en la carga · ${err.message}`, false);
  }
}

function exportCSV(){
  // Exporta lo que esté en la tabla (lo simple)
  const rows = [...tblBody.querySelectorAll('tr')].map(tr =>
    [...tr.children].map(td => `"${String(td.textContent).replace(/"/g,'""')}"`).join(',')
  );
  if (!rows.length){ setStatus('No hay datos para exportar.', false); return; }

  // Encabezados
  const heads = [...tblHead.querySelectorAll('th')].map(th => `"${String(th.textContent).replace(/"/g,'""')}"`).join(',');
  const csv = [heads, ...rows].join('\n');
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `preregistro_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  setStatus('CSV generado.', true);
}

elPing.addEventListener('click', ping);
elList.addEventListener('click', list);
elExp.addEventListener('click', exportCSV);

// Mejorar UX: recuerda la clave en esta sesión (opcional)
elKey.value = sessionStorage.getItem('adminKey') || '';
elKey.addEventListener('input', ()=>sessionStorage.setItem('adminKey', elKey.value));
