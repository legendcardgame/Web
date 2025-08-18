// Utilidades
const $ = s => document.querySelector(s);
const pad10 = id => String(id || "").replace(/\D/g, '').padStart(10, '0');

const form   = $('#preForm');
const btn    = $('#submitBtn');
const msg    = $('#msg');
const file   = $('#payment');
const overlayOk  = $('#overlaySuccess');
const overlayErr = $('#overlayError');

const fields = {
  konamiId:  $('#konamiId'),
  firstName: $('#firstName'),
  lastName:  $('#lastName'),
  email:     $('#email'),
  phone:     $('#phone'),
};

/* ===== Selector de evento (2×2 botones) ===== */
const eventHidden = $('#eventType');
const optionGrid  = $('#eventOptions');

if (optionGrid) {
  optionGrid.addEventListener('click', (e) => {
    const btnSel = e.target.closest('.opt-btn');
    if (!btnSel) return;
    const id = btnSel.dataset.id || '';
    optionGrid.querySelectorAll('.opt-btn')
      .forEach(b => b.classList.toggle('active', b === btnSel));
    eventHidden.value = id;
    localStorage.setItem('pre_event', id);
  });
}

// Restaura selección previa o via URL (?event= / ?e=)
(function restoreEventSelection(){
  try {
    const params  = new URLSearchParams(location.search);
    const fromUrl = (params.get('event') || params.get('e') || '').toLowerCase();
    const prevSel = localStorage.getItem('pre_event');
    const target  = fromUrl || prevSel || '';
    if (target && optionGrid) {
      const selBtn = optionGrid.querySelector(`.opt-btn[data-id="${target}"]`);
      if (selBtn) selBtn.click();
    }
  } catch(_) {}
})();

// Rellena desde localStorage
Object.entries(fields).forEach(([k, el]) => {
  const v = localStorage.getItem('pre_' + k);
  if (v) el.value = v;
});

if (form) {
  form.addEventListener('submit', (e) => { e.preventDefault(); e.stopPropagation(); });
}
if (btn) {
  btn.addEventListener('click', onSubmit);
}

async function fileToBase64(f){
  if (!f) return "";
  const r = new FileReader();
  return await new Promise((res, rej) => {
    r.onload  = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(f);
  });
}

function showOverlay(el, ms=2500){
  if (!el) return;
  el.style.display = 'flex';
  setTimeout(() => { el.style.display = 'none'; }, ms);
}

async function onSubmit(e){
  e?.preventDefault?.();
  e?.stopPropagation?.();
  msg.textContent = "";

  // Guarda cache local
  Object.entries(fields).forEach(([k, el]) => {
    localStorage.setItem('pre_' + k, el.value.trim());
  });

  const payload = {
    konamiId:  pad10(fields.konamiId.value),
    firstName: fields.firstName.value.trim(),
    lastName:  fields.lastName.value.trim(),
    email:     fields.email.value.trim(),
    phone:     fields.phone.value.trim(),
    paymentBase64: await fileToBase64(file.files?.[0]),
    eventType: eventHidden.value || ''
  };

  // Validaciones
  if (!payload.eventType) {
    msg.textContent = "Selecciona un evento.";
    showOverlay(overlayErr, 2200);
    return;
  }
  if (!/^\d{10}$/.test(payload.konamiId)) {
    msg.textContent = "Konami ID debe tener 10 dígitos.";
    showOverlay(overlayErr, 2200);
    return;
  }
  if (!payload.firstName || !payload.lastName) {
    msg.textContent = "Nombre y apellidos son obligatorios.";
    showOverlay(overlayErr, 2200);
    return;
  }

  btn.disabled = true;
  const oldBtn = btn.textContent;
  btn.textContent = 'Enviando';
  btn.classList.add('dots');

  try {
    const r = await fetch(window.LCG.API_BASE, {
      method:'POST',
      body:(() => {
        const fd = new FormData();
        Object.entries(payload).forEach(([k,v]) => v && fd.append(k, v));
        return fd;
      })(),
      redirect:'follow',
    });

    const text = await r.text();
    let j;
    try { j = JSON.parse(text); }
    catch { throw new Error('Respuesta inválida del servidor'); }
    if (!j.ok) throw new Error(j.message || "Error al enviar");

    localStorage.setItem('konamiId', payload.konamiId);

    msg.innerHTML = `✅ ${j.mode === 'insert' ? 'Registro creado' : 'Datos actualizados'}.` +
                    (j.paymentUrl ? '<br><span class="help">Comprobante subido correctamente.</span>' : '');

    showOverlay(overlayOk, 2500);

  } catch(err){
    msg.textContent = '❌ ' + err.message;
    showOverlay(overlayErr, 2500);
  } finally {
    btn.disabled = false;
    btn.textContent = oldBtn;
    btn.classList.remove('dots');
  }
}

/* Marca “Preregistro” activo en el bottom-nav */
(function markPreregistroActive(){
  try {
    localStorage.setItem('lcg-tab','preregistro');
    const tryMark = () => {
      const nav = document.getElementById('bottomNav') || document.querySelector('#site-footer nav');
      if (!nav) return false;
      nav.querySelectorAll('.nav-item').forEach(a=>{
        a.classList.toggle('active',
          (a.dataset?.key||'') === 'preregistro' || (a.href||'').includes('/preregistro/')
        );
      });
      return true;
    };
    if (!tryMark()) setTimeout(tryMark, 80);
    window.addEventListener('pageshow', tryMark);
  } catch(_) {}
})();
