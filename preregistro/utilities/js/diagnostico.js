(function(){
  'use strict';

  // ------- Helpers DOM -------
  const $ = s => document.querySelector(s);
  const apiBaseText = $('#apiBaseText');

  // ------- Config -------
  const API_BASE   = (window.LCG && window.LCG.API_BASE) || '';
  const ADMIN_KEY  = (window.LCG && window.LCG.ADMIN_KEY) || '';
  const PAREOS_URL = (window.LCG && window.LCG.PAREOS_URL) || 'https://legendcardgame.github.io/Web/OTS/index.html';

  if (apiBaseText) apiBaseText.textContent = API_BASE || '(no definido)';

  // ------- Ping -------
  const btnPing    = $('#btnPing');
  const pingStatus = $('#pingStatus');
  const pingTime   = $('#pingTime');
  const pingResp   = $('#pingResp');

  btnPing.addEventListener('click', async () => {
    pingStatus.textContent = 'Probando…';
    pingStatus.className = 'pill';
    pingTime.textContent = '—';
    pingResp.textContent = '—';
    const t0 = performance.now();
    try{
      const r = await fetch(`${API_BASE}?action=ping&_t=${Date.now()}`, { cache: 'no-store' });
      const j = await r.json();
      const t1 = performance.now();
      pingTime.textContent = `${Math.round(t1 - t0)} ms`;
      pingResp.textContent = JSON.stringify(j);
      pingStatus.textContent = 'OK';
      pingStatus.className = 'pill ok';
    }catch(e){
      const t1 = performance.now();
      pingTime.textContent = `${Math.round(t1 - t0)} ms`;
      pingResp.textContent = 'Error: ' + e.message;
      pingStatus.textContent = 'Error';
      pingStatus.className = 'pill bad';
    }
  });

  // ------- Listar (admin) -------
  const btnList    = $('#btnList');
  const listStatus = $('#listStatus');
  const listCount  = $('#listCount');
  const listLog    = $('#listLog');

  const logList = msg => { listLog.textContent += msg + '\n'; listLog.scrollTop = listLog.scrollHeight; };

  btnList.addEventListener('click', async () => {
    listStatus.textContent = 'Cargando…';
    listStatus.className = 'pill';
    listCount.textContent = '—';
    listLog.textContent = '';
    try{
      const url = `${API_BASE}?adminKey=${encodeURIComponent(ADMIN_KEY)}&_t=${Date.now()}`;
      const r   = await fetch(url, { cache:'no-store' });
      const raw = await r.text();
      const j   = JSON.parse(raw);
      if (!j.ok) throw new Error(j.message || 'Error al listar');

      const data = Array.isArray(j.data) ? j.data : [];
      listCount.textContent = String(data.length);
      listStatus.textContent = 'OK';
      listStatus.className = 'pill ok';

      const preview = data.slice(0, 5).map((row, i) => {
        const id  = String(row.konamiId || '').replace(/^'/,'');
        const evt = String(row.eventType || row.evento || '');
        const st  = String(row.status || '');
        return `${i+1}. ${id} · ${evt} · ${st}`;
      }).join('\n');
      logList(preview || '(sin datos)');
    }catch(e){
      listStatus.textContent = 'Error';
      listStatus.className = 'pill bad';
      logList('Error: ' + e.message);
    }
  });

  // ------- Stress test (Pareos) -------
  const stressUrl     = $('#stressUrl');
  const stressTotal   = $('#stressTotal');
  const stressConc    = $('#stressConc');
  const stressTimeout = $('#stressTimeout');
  const btnStress     = $('#btnStress');
  const stressStatus  = $('#stressStatus');
  const stressLoader  = $('#stressLoader');

  const okCountEl   = $('#okCount');
  const failCountEl = $('#failCount');
  const duracionEl  = $('#duracionMs');
  const latPromEl   = $('#latProm');
  const latP95El    = $('#latP95');
  const stressLog   = $('#stressLog');

  const logStress = msg => { stressLog.textContent += msg + '\n'; stressLog.scrollTop = stressLog.scrollHeight; };

  // Valores por defecto visibles
  if (stressUrl) stressUrl.value = PAREOS_URL;

  async function stressTest({ target, total=400, concurrencia=25, timeoutMs=5000 }){
    const results = [];
    let ok = 0, fail = 0;

    function oneFetch(i){
      const start = performance.now();
      const ctl = new AbortController();
      const to  = setTimeout(() => ctl.abort('timeout'), timeoutMs);

      const urlBust = target + (target.includes('?') ? '&' : '?') + '_ts=' + (Date.now() + i);
      return fetch(urlBust, { cache:'no-store', signal: ctl.signal })
        .then(r => {
          clearTimeout(to);
          const t = performance.now() - start;
          if (r.ok){
            ok++; results.push(t);
          } else {
            fail++; results.push(t);
          }
        })
        .catch(_err => {
          clearTimeout(to);
          fail++; results.push(timeoutMs);
        });
    }

    const t0 = performance.now();
    let inFlight = [];
    for (let i=0;i<total;i++){
      inFlight.push(oneFetch(i));
      if (inFlight.length >= concurrencia){
        await Promise.all(inFlight);
        inFlight = [];
      }
    }
    if (inFlight.length) await Promise.all(inFlight);
    const t1 = performance.now();

    // Métricas
    const duracion_ms = Math.round(t1 - t0);
    const lat_prom_ms = results.length ? Math.round(results.reduce((a,b)=>a+b,0)/results.length) : 0;
    const lat_p95_ms  = results.length ? Math.round(results.slice().sort((a,b)=>a-b)[Math.floor(results.length*0.95)-1] || 0) : 0;

    return {
      target, total, concurrencia, timeoutMs,
      ok, fail, duracion_ms, lat_prom_ms, lat_p95_ms,
      muestras_lat: results.length
    };
  }

  btnStress.addEventListener('click', async () => {
    stressStatus.textContent = 'Ejecutando…';
    stressStatus.className = 'pill';
    okCountEl.textContent   = '0';
    failCountEl.textContent = '0';
    duracionEl.textContent  = '—';
    latPromEl.textContent   = '—';
    latP95El.textContent    = '—';
    stressLog.textContent   = '';
    stressLoader.style.display = 'flex';
    btnStress.disabled = true;

    const target       = (stressUrl.value || '').trim();
    const total        = Math.max(1, parseInt(stressTotal.value || '400', 10));
    const concurrencia = Math.max(1, parseInt(stressConc.value || '25', 10));
    const timeoutMs    = Math.max(100, parseInt(stressTimeout.value || '5000', 10));

    try{
      logStress(`Iniciando test → ${target} · total=${total} · conc=${concurrencia} · timeout=${timeoutMs}ms`);
      const res = await stressTest({ target, total, concurrencia, timeoutMs });

      okCountEl.textContent   = String(res.ok);
      failCountEl.textContent = String(res.fail);
      duracionEl.textContent  = `${res.duracion_ms} ms`;
      latPromEl.textContent   = `${res.lat_prom_ms} ms`;
      latP95El.textContent    = `${res.lat_p95_ms} ms`;

      stressStatus.textContent = res.fail === 0 ? 'OK' : 'OK con fallas';
      stressStatus.className = 'pill ' + (res.fail === 0 ? 'ok' : 'bad');

      logStress(JSON.stringify(res, null, 2));
    }catch(e){
      stressStatus.textContent = 'Error';
      stressStatus.className = 'pill bad';
      logStress('Error: ' + e.message);
    }finally{
      stressLoader.style.display = 'none';
      btnStress.disabled = false;
    }
  });

})();
