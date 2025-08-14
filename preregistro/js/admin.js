import { API_BASE, ADMIN_KEY } from './js/config.js';

const $ = s => document.querySelector(s);
const out = $('#out');

function stripLeadingApostrophe(s) {
  return String(s || '').replace(/^'/, '');
}
function pad10(s) {
  return stripLeadingApostrophe(s).replace(/\D/g, '').padStart(10, '0');
}

function renderRows(list) {
  const tbody = $('#tbody');
  tbody.innerHTML = '';
  list.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.timestamp || ''}</td>
      <td>${r.konamiId || ''}</td>
      <td>${[r.firstName, r.lastName].filter(Boolean).join(' ')}</td>
      <td>${r.email || ''}</td>
      <td>${r.phone || ''}</td>
      <td>${r.paymentUrl ? `<a href="${r.paymentUrl}" target="_blank">Ver</a>` : ''}</td>
      <td>${r.status || ''}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function listAll() {
  out.textContent = '';
  $('#tbody').innerHTML = '';
  try {
    const url = `${API_BASE}?adminKey=${encodeURIComponent(ADMIN_KEY)}`;
    const r = await fetch(url, { method: 'GET' });
    const j = await r.json();
    if (!j.ok) throw new Error(j.message || 'Error en listado');
    renderRows(j.data || []);
  } catch (e) {
    out.textContent = 'Error: ' + e.message;
  }
}

async function searchOne() {
  out.textContent = '';
  $('#tbody').innerHTML = '';
  const raw = $('#searchKonami').value;
  const konamiId = pad10(raw);
  if (!/^\d{10}$/.test(konamiId)) {
    out.textContent = 'Ingresa un Konami ID válido (10 dígitos).';
    return;
  }
  try {
    const url = `${API_BASE}?konamiId=${encodeURIComponent(konamiId)}`;
    const r = await fetch(url, { method: 'GET' });
    const j = await r.json();
    if (!j.ok) throw new Error(j.message || 'No encontrado');
    renderRows([j.data]);
  } catch (e) {
    out.textContent = 'Error: ' + e.message;
  }
}

$('#btnListAll').addEventListener('click', listAll);
$('#btnSearch').addEventListener('click', searchOne);
