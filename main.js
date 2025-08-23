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

  // Slides reales antes de clonar (para dots y mapeo)
  const realSlides = Array.from(track.querySelectorAll('.slide'));
  if (!realSlides.length) return;

  // --- Loop infinito: clonar extremos ---
  const firstClone = realSlides[0].cloneNode(true);
  const lastClone  = realSlides[realSlides.length - 1].cloneNode(true);
  track.appendChild(firstClone);
  track.insertBefore(lastClone, track.firstChild);

  // Slides totales (incluyendo clones)
  const slides = Array.from(track.querySelectorAll('.slide'));

  // gap definido en CSS (fallback a 10)
  const cs  = getComputedStyle(track);
  const gap = parseFloat(cs.gap || cs.columnGap || 10);

  const slideWidth = () => slides[0].getBoundingClientRect().width + (Number.isFinite(gap) ? gap : 0);

  // Índice inicial en 1 (porque 0 es el clon del último)
  let idx = 1;
  let timer = null;
  let raf = null;
  let isJumping = false; // evita parpadeos al “teletransportar” tras clones

  function setActiveDot(iReal) {
    if (!dots) return;
    Array.from(dots.children).forEach((d, j) => d.classList.toggle('active', j === iReal));
  }

  function realIndexFromIdx(i) {
    // Mapea idx (con clones) a índice real [0..realSlides.length-1]
    // idx=1 -> real 0; idx=2 -> real 1; ... idx=realSlides.length -> real realSlides.length-1
    const n = realSlides.length;
    return (i - 1 + n) % n;
  }

  function goTo(i, smooth = true) {
    idx = i;
    track.scrollTo({ left: idx * slideWidth(), behavior: smooth ? 'smooth' : 'auto' });
    setActiveDot(realIndexFromIdx(idx));
    restart();
  }

  function next() { goTo(idx + 1); }
  function prev() { goTo(idx - 1); }

  // Posicionar en el primer slide real al cargar
  goTo(1, false);

  // Flechas
  nextBtn && nextBtn.addEventListener('click', next);
  prevBtn && prevBtn.addEventListener('click', prev);

  // Dots (basados en slides reales, no en clones)
  if (dots && !dots.children.length) {
    realSlides.forEach((_, i) => {
      const b = document.createElement('button');
      if (i === 0) b.classList.add('active');
      b.addEventListener('click', () => goTo(i + 1)); // i+1 porque 0 es el clon
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

  // Sincroniza índice al hacer scroll manual + manejo de clones
  track.addEventListener('scroll', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      const n = Math.round(track.scrollLeft / slideWidth());
      if (n !== idx) {
        idx = n;
        setActiveDot(realIndexFromIdx(idx));
      }

      // Si caemos en los clones, saltamos sin animación al real correspondiente
      if (!isJumping) {
        if (idx === slides.length - 1) { // último es clon del primero real
          isJumping = true;
          goTo(1, false); // ir al primer real sin smooth
          isJumping = false;
        } else if (idx === 0) { // primero es clon del último real
          isJumping = true;
          goTo(slides.length - 2, false); // ir al último real sin smooth
          isJumping = false;
        }
      }

      raf = null;
    });
  }, { passive: true });

  // ==== Enlaces desde banners ====
  // Si el slide ya es <a href="...">, RESPEtamos ese href.
  // Solo autogeneramos enlace a /regional/evento.html?id=... cuando no hay href o es '#'.
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

    let linkEl = slide.tagName.toLowerCase() === 'a' ? slide : slide.querySelector('a');

    const src  = img.getAttribute('src') || '';
    const file = src.split('/').pop().split('.')[0].toLowerCase();
    const id   = slugMap[file] || file;
    const href = `regional/evento.html?id=${encodeURIComponent(id)}`;

    if (linkEl) {
      // ---- CAMBIO: respeta enlaces existentes ----
      const current = linkEl.getAttribute('href') || '';
      if (!current || current === '#') {
        linkEl.href = href;
      }
    } else {
      // Si no hay <a>, hacemos clickable el slide con la url generada
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
