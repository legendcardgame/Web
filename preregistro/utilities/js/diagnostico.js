(function(){
  'use strict';

  const $ = s => document.querySelector(s);

  const btnPing   = $('#btnPing');
  const btnList   = $('#btnList');
  const statusEl  = $('#status');
  const output    = $('#output');

  // Load test UI
  const btnLoad   = $('#btnLoadTest');
  const inpTotal  = $('#ltTotal');
  const inpConc   = $('#ltConc');
  const inpTO     = $('#ltTO');
  const urlView   = $('#ltUrlView');

  function setStatus(ok, msg){
    statusEl.className = 'status ' + (ok ? 'ok' : 'bad');
    statusEl.textContent = msg || (ok ? 'OK' : 'Error');
  }
  function show(obj){
    try{
      output.textContent = typeof obj === 'string'
        ? obj
        : JSON.stringify(obj, null, 2);
    }catch{
      output.textContent = String(obj);
    }
  }
  function requireConfig(){
    if (!window.LCG || !window.LCG.API_BASE){
      setStatus(false, 'Falta window.LCG.API_BASE');
      show('Asegúrate de cargar config.js antes de diagnostico.js');
      return false;
    }
    return true;
  }

  async function doPing(){
    if(!requireConfig()) return;
    const url = `${window.LCG.API_BASE}?action=ping&_t=${Date.now()}`;
    try{
      setStatus(true, 'Solicitando…');
      const r   = await fetch(url);
      const raw = await r.text();
      let j; try{ j = JSON.parse(raw); }catch{ j = { ok:false, raw }; }
      setStatus(!!j.ok, j.ok ? 'OK' : 'Error');
      show(j);
    }catch(e){
      setStatus(false, 'Error');
      show({error: e.message});
    }
  }

  async function doList(){
    if(!requireConfig()) return;
    if (!window.LCG.ADMIN_KEY){
      setStatus(false, 'Falta ADMIN_KEY');
      show('Define window.LCG.ADMIN_KEY en config.js');
      return;
    }
    const url = `${window.LCG.API_BASE}?adminKey=${encodeURIComponent(window.LCG.ADMIN_KEY)}&_t=${Date.now()}`;
    try{
      setStatus(true, 'Solicitando…');
      const r   = await fetch(url);
      const raw = await r.text();
      let j; try{ j = JSON.parse(raw); }catch{ j = { ok:false, raw }; }
      setStatus(!!j.ok, j.ok ? 'OK' : 'Error');
      if (j.ok && Array.isArray(j.data)){
        show({ ok: true, count: j.data.length, sample: j.data.slice(0,3) });
      } else {
        show(j);
      }
    }catch(e){
      setStatus(false, 'Error');
      show({error: e.message});
    }
  }

  // -------- Mini stress test (Pareos) ----------
  async function runLoadTestPareos(){
    const URL = (window.LCG && window.LCG.PAREOS_URL) || '';
    urlView.textContent = URL || 'No definido (window.LCG.PAREOS_URL)';

    if (!URL){
      setStatus(false, 'Falta PAREOS_URL');
      show('Define window.LCG.PAREOS_URL en config.js');
      return;
    }

    const total = Math.max(1, Number(inpTotal.value || 400));
    const conc  = Math.max(1, Number(inpConc.value  || 25));
    const toMs  = Math.max(100, Number(inpTO.value  || 5000));

    setStatus(true, `Ejecutando… total=${total} conc=${conc}`);
    show('Iniciando prueba…');

    // Métricas
    const lat = []; // ms
    let ok = 0, fail = 0;

    function p95(arr){
      if (!arr.length) return 0;
      const a = [...arr].sort((x,y)=>x-y);
      const i = Math.ceil(0.95 * a.length) - 1;
      return a[Math.max(0,i)];
    }

    // Cliente con timeout
    async function timedFetch(u, timeout){
      const ctl = new AbortController();
      const id  = setTimeout(()=>ctl.abort('timeout'), timeout);
      const t0  = performance.now();
      try{
        // GET sin headers para evitar preflight/CORS extra
        const r = await fetch(u, { signal: ctl.signal, cache: 'no-store' });
        const t1 = performance.now();
        lat.push(t1 - t0);
        if (!r.ok) throw new Error('HTTP '+r.status);
        ok++;
      }catch(e){
        fail++;
      }finally{
        clearTimeout(id);
      }
    }

    // Ejecuta en lotes de 'conc' concurrentes
    const tasks = Array.from({length: total}, (_,i)=> ()=> timedFetch(URL + (URL.includes('?') ? '&' : '?') + '_t=' + (Date.now()+i), toMs));

    const start = performance.now();
    for (let i=0; i<tasks.length; i += conc){
      await Promise.all( tasks.slice(i, i+conc).map(fn => fn()) );
      // Feedback parcial
      setStatus(true, `Progreso: ${Math.min(i+conc,total)}/${total}`);
    }
    const end = performance.now();

    const result = {
      target: URL,
      total, concurrencia: conc, timeoutMs: toMs,
      ok, fail,
      duracion_ms: Math.round(end - start),
      lat_prom_ms: lat.length ? Math.round(lat.reduce((a,b)=>a+b,0)/lat.length) : 0,
      lat_p95_ms:  Math.round(p95(lat)),
      muestras_lat: lat.length
    };
    setStatus(true, 'Completado');
    show(result);
  }

  // Eventos
  if (btnPing)   btnPing.addEventListener('click', doPing);
  if (btnList)   btnList.addEventListener('click', doList);
  if (btnLoad)   btnLoad.addEventListener('click', runLoadTestPareos);

  // Estado inicial
  if (!window.LCG) {
    setStatus(false, 'Falta config.js');
  } else {
    setStatus(true, 'Listo');
    urlView.textContent = (window.LCG.PAREOS_URL || '—');
  }
})();
