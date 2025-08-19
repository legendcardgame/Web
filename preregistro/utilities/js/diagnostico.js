(function(){
  'use strict';

  const $ = s => document.querySelector(s);

  const btnPing = $('#btnPing');
  const btnList = $('#btnList');
  const status  = $('#status');
  const output  = $('#output');

  function setStatus(ok, msg){
    status.className = 'status ' + (ok ? 'ok' : 'bad');
    status.textContent = msg || (ok ? 'OK' : 'Error');
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
      const r   = await fetch(url);          // GET sin headers → sin preflight
      const raw = await r.text();
      let j;
      try { j = JSON.parse(raw); } catch { j = { ok:false, raw }; }
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
      const r   = await fetch(url);          // GET sin headers → sin preflight
      const raw = await r.text();
      let j;
      try { j = JSON.parse(raw); } catch { j = { ok:false, raw }; }
      setStatus(!!j.ok, j.ok ? 'OK' : 'Error');
      // Resumen útil
      if (j.ok && Array.isArray(j.data)){
        show({ ok: true, count: j.data.length, sample: j.data.slice(0, 3) });
      } else {
        show(j);
      }
    }catch(e){
      setStatus(false, 'Error');
      show({error: e.message});
    }
  }

  if (btnPing) btnPing.addEventListener('click', doPing);
  if (btnList) btnList.addEventListener('click', doList);

  // Estado inicial
  if (!window.LCG) {
    setStatus(false, 'Falta config.js');
  } else {
    setStatus(true, 'Listo');
  }
})();
