// /preregistro/admin.js
import { API_BASE } from './js/config.js';

const els = {
  loginBox: document.getElementById('loginBox'),
  controlsBox: document.getElementById('controlsBox'),
  adminKey: document.getElementById('adminKey'),
  btnLogin: document.getElementById('btnLogin'),
  btnLogout: document.getElementById('btnLogout'),
  q: document.getElementById('q'),
  status: document.getElementById('statusFilter'),
  btnRefresh: document.getElementById('btnRefresh'),
  btnExport: document.getElementById('btnExport'),
  tbody: document.getElementById('tbody'),
  count: document.getElementById('count'),
};

let rows = [];       // datos crudos
let filtered = [];   // datos visibles
let adminKey = '';

// ------- helpers -------
function statusPill(s='') {
  const v = (s || '').toLowerCase();
  if (v === 'aprobado') return `<span class="pill ok">Aprobado</span>`;
  if (v === 'rechazado') return `<span class="pill reject">Rechazado</span>`;
  return `<span class="pill pending">${s || 'Pendiente'}</span>`;
}

function toCSV(arr) {
  if (!arr.length) return '';
  const headers = Object.keys(arr[0]);
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    headers.map(esc).join(','),
    ...arr.map(r => headers.map(h => esc(r[h])).join(','))
  ];
  return lines.join('\n');
}

function downloadFile(name, text) {
  const blob = new Blob([text], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ------- render -------
function render() {
  const q = (els.q.value || '').trim().toLowerCase();
  const st = els.status.value;

  filtered = rows.filter(r => {
    const hit =
      (r.konamiId || r.konamiID || r.konamiid || '').toString().toLowerCase().includes(q) ||
      (r.firstName || '').toLowerCase().includes(q) ||
      (r.lastName || '').toLowerCase().includes(q) ||
      (r.email || '').toLowerCase().includes(q);

    const s = (r.status || 'Pendiente');
    const statusOk = !st || s === st;

    return hit && statusOk;
  });

  els.tbody.innerHTML = filtered.map(r => {
    const ts = r.timestamp || r.date || '';
    const kid = r.konamiId || r.konamiID || r.konamiid || '';
    const name = `${r.firstName || ''} ${r.lastName || ''}`.trim();
    const comprobante = r.paymentUrl
      ? `<a class="link" href="${r.paymentUrl}" target="_blank" rel="noopener">Ver</a>`
      : `<span class="muted">–</span>`;
    const token = r.editToken ? `<span class="muted">${r.editToken}</span>` : '–';

    return `<tr>
      <td>${ts}</td>
      <td><strong>${kid}</strong></td>
      <td>${name || '–'}</td>
      <td>${r.email || '–'}</td>
      <td>${r.phone || '–'}</td>
      <td>${statusPill(r.status)}</td>
      <td>${comprobante}</td>
      <td class="muted">${token}</td>
    </tr>`;
  }).join('');

  els.count.textContent = `${filtered.length} registro${filtered.length!==1?'s':''}`;
}

// ------- fetch -------
async function loadData() {
  const url = `${API_BASE}?adminKey=${encodeURIComponent(adminKey)}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.ok) throw new Error(json.message || 'Error al cargar');
  rows = json.data || [];
  render();
}

// ------- login flow -------
function showApp() {
  els.loginBox.style.display = 'none';
  els.controlsBox.style.display = '';
}

async function tryLogin() {
  adminKey = (els.adminKey.value || '').trim();
  if (!adminKey) {
    alert('Escribe la admin key');
    return;
  }
  try {
    await loadData();
    localStorage.setItem('lcg_admin_key', adminKey);
    showApp();
  } catch (e) {
    alert('Clave inválida o error de carga.');
  }
}

// ------- events -------
els.btnLogin.addEventListener('click', tryLogin);
els.btnLogout.addEventListener('click', () => {
  localStorage.removeItem('lcg_admin_key');
  location.reload();
});
els.q.addEventListener('input', render);
els.status.addEventListener('change', render);
els.btnRefresh.addEventListener('click', () => loadData().catch(()=>alert('Error al actualizar')));
els.btnExport.addEventListener('click', () => {
  const csv = toCSV(filtered);
  downloadFile(`preregistros_${new Date().toISOString().slice(0,10)}.csv`, csv);
});

// Auto-login si hay clave guardada
const saved = localStorage.getItem('lcg_admin_key');
if (saved) {
  els.adminKey.value = saved;
  tryLogin();
}
