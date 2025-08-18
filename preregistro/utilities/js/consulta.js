// Lee de window.LCG definido por config.js
const API_BASE = (window.LCG && window.LCG.API_BASE) || '';
const $  = s => document.querySelector(s);

const form = $('#formConsulta');
const btn  = $('#btnBuscar');
const msg  = $('#msg');

const box = $('#resultado');
const rk  = $('#r-kid');
const rn  = $('#r-nombre');
const re  = $('#r-email');
const rp  = $('#r-phone');
const rc  = $('#r-comp');
const rs  = $('#r-status');

const pad10 = s => String(s || '').replace(/\D/g,'').padStart(10,'0');

function limpiar() {
  box.style.display = 'none';
  rk.textContent = rn.textContent = re.textContent = rp.textContent = rs.textContent = '';
  rc.innerHTML = '';
}

async function buscar(konamiId){
  limpiar();
  msg.textContent = 'Buscando…';
  btn.disabled = true;

  try {
    const url = `${API_BASE}?konamiId=${encodeURIComponent(konamiId)}&_t=${Date.now()}`;
    const r   = await fetch(url, { cache:'no-store' });
    const raw = await r.text();          // defensivo ante respuestas no JSON limpias
    let j;
    try { j = JSON.parse(raw); } catch(e) {
      throw new Error('Respuesta no válida del servidor');
    }
    if (!j.ok) throw new Error(j.message || 'No encontrado');

    const d = j.data || {};
    // normaliza posibles '0400...' con apóstrofe
    const kid = pad10(String(d.konamiId || ''));
    const nombre = [d.firstName, d.lastName].filter(Boolean).join(' ').trim();

    rk.textContent = kid;
    rn.textContent = nombre || '—';
    re.textContent = d.email || '—';
    rp.textContent = d.phone || '—';
    rs.textContent = d.status || 'Pendiente';
    rs.classList.remove('is-ok','is-err');
const st = (d.status || 'Pendiente').toLowerCase();
if (st.startsWith('acept')) rs.classList.add('is-ok');
if (st.startsWith('rechaz')) rs.classList.add('is-err');

    if (d.paymentUrl) {
      rc.innerHTML = `<a href="${d.paymentUrl}" target="_blank" rel="noopener">Ver comprobante</a>`;
    } else {
      rc.textContent = 'No cargado';
    }

    box.style.display = '';
    msg.textContent = 'Listo.';
    // guarda último consultado
    localStorage.setItem('konamiId', kid);
  } catch (err) {
    msg.textContent = 'Error: ' + err.message;
  } finally {
    btn.disabled = false;
  }
}

// autocompletar si había uno guardado
const last = localStorage.getItem('konamiId');
if (last) $('#konamiId').value = last;

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const kid = pad10($('#konamiId').value);
  if (!/^\d{10}$/.test(kid)) {
    msg.textContent = 'Konami ID debe tener 10 dígitos.';
    return;
  }
  buscar(kid);
});
