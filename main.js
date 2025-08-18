/* ===== Carrusel con autoplay 5s ===== */
const track = document.getElementById('carouselTrack');
const dots  = document.getElementById('carouselDots');
const slides = Array.from(track.children);
let idx = 0;
let timer = null;

function goTo(i){
  idx = (i + slides.length) % slides.length;
  const w = slides[0].getBoundingClientRect().width + 10; // +gap
  track.scrollTo({ left: idx * w, behavior: 'smooth' });
  [...dots.children].forEach((d,j) => d.classList.toggle('active', j===idx));
  resetAutoplay();
}
function next(){ goTo(idx+1); }
function prev(){ goTo(idx-1); }

document.querySelector('.carousel .next').addEventListener('click', next);
document.querySelector('.carousel .prev').addEventListener('click', prev);

/* Dots */
slides.forEach((_,i)=>{
  const b = document.createElement('button');
  if(i===0) b.classList.add('active');
  b.addEventListener('click', ()=>goTo(i));
  dots.appendChild(b);
});

/* Autoplay 5s */
function resetAutoplay(){
  if (timer) clearInterval(timer);
  timer = setInterval(next, 5000);
}
resetAutoplay();

/* Swipe táctil */
let sx=0, dx=0;
track.addEventListener('touchstart', e=>{ sx = e.touches[0].clientX; }, {passive:true});
track.addEventListener('touchmove',  e=>{ dx = e.touches[0].clientX - sx; }, {passive:true});
track.addEventListener('touchend',   ()=>{
  if (dx > 40) prev();
  else if (dx < -40) next();
  sx=dx=0;
});

/* Sincroniza índice al hacer scroll manual */
track.addEventListener('scroll', ()=>{
  const w = slides[0].getBoundingClientRect().width + 10;
  const n = Math.round(track.scrollLeft / w);
  if (n !== idx) {
    idx = n;
    [...dots.children].forEach((d,j)=>d.classList.toggle('active', j===idx));
  }
}, {passive:true});

// --- Accesos directos desde los banners del carrusel (usa ?id=) ---
(function attachCarouselLinks() {
  // Si el nombre del archivo ya coincide con el id del evento,
  // no necesitas mapa. Lo dejo por si en algún caso no coinciden.
  const slugMap = {
    'principal':       'principal',
    'dragon-duel':     'dragon-duel',
    'edison':          'edison',
    'win-a-mat':       'win-a-mat',
    'master-duel':     'master-duel',
    'structure-deck':  'structure-deck',
    'speed-duel':      'speed-duel'
  };

  document.querySelectorAll('.carousel .slide img').forEach(img => {
    const src  = img.getAttribute('src') || '';
    const file = src.split('/').pop().split('.')[0].toLowerCase(); // p.ej. "edison"
    const id   = slugMap[file] || file;  // por si coincide exacto

    // arma la URL correcta para tu página dinámica
    const target = `regional/evento.html?id=${encodeURIComponent(id)}`;

    // si ya está envuelto en <a>, actualiza su href; si no, navega por JS
    const wrapper = img.closest('a.slide');
    if (wrapper) {
      wrapper.href = target;
      return;
    }

    // si no hay <a>, convierte la imagen en enlace clickable y accesible
    img.style.cursor = 'pointer';
    img.setAttribute('role', 'link');
    img.setAttribute('tabindex', '0');

    const go = () => window.location.href = target;
    img.addEventListener('click', go);
    img.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    });
  });
})();
    });
  });
})();
