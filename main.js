/* ===== Carrusel con autoplay (5s), dots, flechas, swipe y enlaces ===== */
(() => {
  const carousel = document.querySelector('.carousel');
  if (!carousel) return;

  // Usa el PRIMER track dentro del carrusel (evita conflictos si hay duplicados)
  const track   = carousel.querySelector('.track');
  const nextBtn = carousel.querySelector('.next');
  const prevBtn = carousel.querySelector('.prev');
  const dots    = document.getElementById('carouselDots') || carousel.querySelector('.dots');
  if (!track) return;

  const slides = Array.from(track.querySelectorAll('.slide'));
  if (!slides.length) return;

  // gap definido en CSS (fallback a 10)
  const cs  = getComputedStyle(track);
  const gap = parseFloat(cs.gap || cs.columnGap || 10);

  let idx = 0;
  let timer = null;

  const slideWidth = () => slides[0].getBoundingClientRect().width + (Number.isFinite(gap) ? gap : 0);

  function setActiveDot(i) {
    if (!dots) return;
    Array.from(dots.children).forEach((d, j) => d.classList.toggle('active', j === i));
  }

  function goTo(i, smooth = true) {
    idx = (i + slides.length) % slides.length;
    track.scrollTo({ left: idx * slideWidth(), behavior: smooth ? 'smooth' : 'auto' });
    setActiveDot(idx);
    restart();
  }

  const next = () => goTo(idx + 1);
  const prev = () => goTo(idx - 1);

  // Flechas
  nextBtn && nextBtn.addEventListener('click', next);
  prevBtn && prevBtn.addEventListener('click', prev);

  // Dots
  if (dots && !dots.children.length) {
    slides.forEach((_, i) => {
      const b = document.createElement('button');
      if (i === 0) b.classList.add('active');
      b.addEventListener('click', () => goTo(i));
      dots.appendChild(b);
    });
  }

  // Autoplay
  function restart() { stop(); timer = setInterval(next, 5000); }
  function stop()    { if (timer) { clearInterval(timer); timer = null; } }
  restart();

  // Pausa al interactuar / pestaña oculta
  carousel.addEventListener('mouseenter', stop);
  carousel.addEventListener('mouseleave', restart);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : restart()));

  // Swipe táctil
  let sx = 0, dx = 0;
  track.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchmove',  e => { dx = e.touches[0].clientX - sx; }, { passive: true });
  track.addEventListener('touchend',   () => {
    if (dx > 40) prev(); else if (dx < -40) next();
    sx = dx = 0;
  }, { passive: true });

  // Sincroniza índice al hacer scroll manual
  let raf = null;
  track.addEventListener('scroll', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      const n = Math.round(track.scrollLeft / slideWidth());
      if (n !== idx) { idx = n; setActiveDot(idx); }
      raf = null;
    });
  }, { passive: true });

  // Enlaces desde banners a /regional/evento.html?id=...
  const slugMap = {
    'principal':      'principal',
    'dragon-duel':    'dragon-duel',
    'edison':         'edison',
    'win-a-mat':      'win-a-mat',
    'master-duel':    'master-duel',
    'structure-deck': 'structure-deck',
    'speed-duel':     'speed-duel'
  };

  slides.forEach(slide => {
    const img = slide.querySelector('img');
    if (!img) return;

    // Si ya es <a class="slide">, solo aseguramos el href; si es <div>, lo hacemos clickable
    let linkEl = slide.tagName.toLowerCase() === 'a' ? slide : slide.querySelector('a');

    const src  = img.getAttribute('src') || '';
    const file = src.split('/').pop().split('.')[0].toLowerCase();
    const id   = slugMap[file] || file;
    const href = `regional/evento.html?id=${encodeURIComponent(id)}`;

    if (linkEl) {
      // No pisamos si ya está correcto
      if (!/regional\/evento\.html/i.test(linkEl.getAttribute('href') || '')) {
        linkEl.href = href;
      }
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
