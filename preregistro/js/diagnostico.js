// /preregistro/js/diagnostico.js
import { API_BASE } from './config.js';

const $ = s => document.querySelector(s);
const log = $('#log');
const summary = $('#summary');
const checksGrid = $('#checks');

function renderSummary(ok, extraText='') {
  summary.style.display = 'block';
  summary.className = 'summary ' + (ok ? 'ok' : 'bad');
  summary.textContent = (ok ? '✅ Todo correcto' : '❌ Se detectaron problemas') + (extraText ? ' · ' + extraText : '');
}

function renderChecks(checks=[]) {
  checksGrid.innerHTML = '';
  checks.forEach(ch => {
    const card = document.createElement('div');
    card.className = 'check ' + (ch.ok ? 'ok' : 'bad');

    const h4 = document.createElement('h4');
    h4.textContent = ch.name || 'Chequeo';
    const st = document.createElement('div');
    st.className = 'status';
    st.textContent = ch.ok ? 'OK' : 'FALLÓ';

    const dt = document.createElement('div');
    dt.className = 'details';
    dt.textContent = ch.details || '';

    card.appendChild(h4);
    card.appendChild(st);
    card.appendChild(dt);
    checksGrid.appendChild(card);
  });
}

$('#btnPing').addEventListener('click', async ()=>{
  summary.style.display = 'none';
  checksGrid.innerHTML = '';
  log.textContent = 'Ejecutando ping…';
  try{
    const t0 = performance.now();
    const r = await fetch(`${API_BASE}?action=ping`);
    const j = await r.json();
    const ms = Math.round(performance.now() - t0);
    log.textContent = JSON.stringify(j, null, 2);

    // Mostrar tarjeta “virtual”
    renderSummary(true, `latencia ~${ms} ms`);
    renderChecks([{
      name:'Ping a Web App',
      ok: j.ok === true,
      details: `mensaje: ${j.message || ''}\nfecha: ${j.time || ''}`
    }]);
  }catch(e){
    log.textContent = 'Error: '+e.message;
    renderSummary(false, 'ping falló');
    renderChecks([{
      name:'Ping a Web App',
      ok:false,
      details:String(e)
    }]);
  }
});

$('#btnSelf').addEventListener('click', async ()=>{
  const key = $('#adminKey').value.trim();
  if (!key) { 
    log.textContent='Ingresa Admin Key'; 
    renderSummary(false, 'Falta Admin Key');
    renderChecks([{name:'Validación', ok:false, details:'Debes ingresar la Admin Key.'}]);
    return; 
  }
  summary.style.display = 'none';
  checksGrid.innerHTML = '';
  log.textContent = 'Ejecutando selfTest…';
  try{
    const t0 = performance.now();
    const url = `${API_BASE}?action=selfTest&adminKey=${encodeURIComponent(key)}`;
    const r = await fetch(url);
    const j = await r.json();
    const ms = Math.round(performance.now() - t0);
    log.textContent = JSON.stringify(j, null, 2);

    renderSummary(j.ok === true, `latencia ~${ms} ms`);
    renderChecks(Array.isArray(j.checks) ? j.checks : []);
  }catch(e){
    log.textContent = 'Error: '+e.message;
    renderSummary(false, 'selfTest falló');
    renderChecks([{
      name:'SelfTest',
      ok:false,
      details:String(e)
    }]);
  }
});
