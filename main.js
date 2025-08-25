/* ===== Slider con FADE, autoplay 5s, flechas, dots y reset de timer =====*/
(() => {
  // ====== MODO FADE (nuevo) ======
  const ss = document.querySelector('.slideshow');
  if (ss) {
    const viewport = ss.querySelector('.ss-viewport');
    const slides   = Array.from(viewport.querySelectorAll('.ss-slide'));
    const prevBtn  = ss.querySelector('.ss-nav.prev');
    const nextBtn  = ss.querySelector('.ss-nav.next');
    const dotsBox  = ss.querySelector('#slideshowDots') || ss.querySelector('.ss-dots');
    if (!slides.length) return;

    let i = Math.max(0, slides.findIndex(s => s.classList.contains('active')));
    if (i < 0) i = 0;
    let timer = null;

    function setActive(n){
      slides.forEach((s, idx) => s.classList.toggle('active', idx === n));
      if (dotsBox) Array.from(dotsBox.children).forEach((d, idx) => d.classList.toggle('active', idx === n));
      i = n;
    }
    function next(){ setActive((i + 1) % slides.length); restart(); }
    function prev(){ setActive((i - 1 + slides.length) % slides.length); restart(); }

    // Dots "< … … … >"
    if (dotsBox && !dotsBox.children.length) {
      slides.forEach((_, idx) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = '•';
        if (idx === i) b.classList.add('active');
        b.addEventListener('click', () => { setActive(idx); restart(); });
        dotsBox.appendChild(b);
      });
    }

    // Autoplay 5s (reinicia al navegar manualmente)
    function stop(){ if (timer){ clearInterval(timer); timer = null; } }
    function start(){ timer = setInterval(next, 5000); }
    function restart(){ stop(); start(); }
    start();

    // Flechas
    prevBtn && prevBtn.addEventListener('click', prev);
    nextBtn && nextBtn.addEventListener('click', next);

    // Pausa al hover / pestaña oculta
    ss.addEventListener('mouseenter', stop);
    ss.addEventListener('mouseleave', start);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

    // Teclado (opcional)
    ss.addEventListener('keydown', (e)=>{
      if (e.key === 'ArrowLeft')  { e.preventDefault(); prev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    });

    setActive(i);
    return; // listo en modo slideshow
  }

  // ====== FALLBACK: carrusel viejo (.carousel) — solo respeta hrefs existentes ======
  const carousel = document.querySelector('.carousel');
  if (!carousel) return;

  const track = carousel.querySelector('.track');
  if (!track) return;

  const slides = Array.from(track.querySelectorAll('.slide'));
  slides.forEach(slide => {
    const img = slide.querySelector('img');
    if (!img) return;

    // Si el slide ya tiene <a href="...">, lo respetamos; si NO tiene href o es "#",
    // autogeneramos link a /regional/evento.html?id=slug
    let linkEl = slide.tagName.toLowerCase() === 'a' ? slide : slide.querySelector('a');

    const src  = img.getAttribute('src') || '';
    const file = src.split('/').pop().split('.')[0].toLowerCase();

    const slugMap = {
      'principal':      'principal',
      'dragon-duel':    'dragon-duel',
      'edison':         'edison',
      'win-a-mat':      'win-a-mat',
      'master-duel':    'master-duel',
      'structure-deck': 'structure-deck',
      'speed-duel':     'speed-duel'
    };
    const id   = slugMap[file] || file;
    const href = `regional/evento.html?id=${encodeURIComponent(id)}`;

    if (linkEl) {
      const current = linkEl.getAttribute('href') || '';
      if (!current || current === '#') linkEl.href = href; // solo si está vacío o '#'
    } else {
      slide.style.cursor = 'pointer';
      slide.setAttribute('role', 'link');
      slide.setAttribute('tabindex', '0');
      const go = () => { window.location.href = href; };
      slide.addEventListener('click', go);
      slide.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
      });
    }
  });
})();
