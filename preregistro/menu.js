// Usa /preregistro/images/ con los mismos nombres que tus banners (.png)
const IMG = (slug) => `./images/${slug}.png`;

// Hero: Evento principal -> página de info
const HERO = {
  slug: "principal",
  img: IMG("principal"),
  href: "../regional/evento.html?id=principal",
};

// Side events en el orden solicitado
const SIDE_EVENTS = [
  { slug: "edison",         img: IMG("edison") },
  { slug: "structure-deck", img: IMG("structure-deck") },
  { slug: "speed-duel",     img: IMG("speed-duel") },
  { slug: "dragon-duel",    img: IMG("dragon-duel") },
  { slug: "win-a-mat",      img: IMG("win-a-mat") },
  { slug: "master-duel",    img: IMG("master-duel") },
];

function renderHero(){
  const el = document.getElementById("heroSlot");
  if (!el) return;
  el.innerHTML = `
    <article class="hero-card">
      <a href="${HERO.href}">
        <img class="hero-img" src="${HERO.img}" alt="Evento Principal">
      </a>
    </article>
  `;
}

function renderGrid(){
  const grid = document.getElementById("gridSlot");
  if (!grid) return;
  grid.innerHTML = SIDE_EVENTS.map(ev => `
    <article class="img-card">
      <a href="../regional/evento.html?id=${encodeURIComponent(ev.slug)}" aria-label="${ev.slug}">
        <img src="${ev.img}" alt="${ev.slug}">
      </a>
    </article>
  `).join("");
}

/* ===== Activa pestaña "Eventos" en el bottom-nav y memoriza ===== */
function markTabEventos(){
  const KEY = 'lcg-tab', VALUE = 'preregistro';
  localStorage.setItem(KEY, VALUE);
  const nav = document.getElementById('bottomNav');
  if (!nav) return;
  nav.querySelectorAll('.nav-item').forEach(a=>{
    a.classList.toggle('active', a.dataset.key === VALUE);
  });
}

/* ===== Ajusta padding inferior según altura real del bottom-nav ===== */
function padForBottomNav(){
  const wrap = document.querySelector('.menu-wrap');
  const nav  = document.getElementById('bottomNav');
  if (!wrap || !nav) return;

  const h = Math.ceil(nav.getBoundingClientRect().height || 0);
  // Expone variable CSS y además fija el padding por si otro CSS pisa la variable
  document.documentElement.style.setProperty('--navH', h + 'px');
  wrap.style.paddingBottom = (h + 24) + 'px';
}

function bootAfterFooter(){
  // Espera a que layout-loader inyecte el footer/nav
  let tries = 0;
  const t = setInterval(()=>{
    const nav = document.getElementById('bottomNav');
    if (nav || tries++ > 120){ // ~6s tope
      clearInterval(t);
      markTabEventos();
      padForBottomNav();
      // Recalcula en cambios relevantes
      window.addEventListener('resize', padForBottomNav);
      window.addEventListener('orientationchange', padForBottomNav);
      setTimeout(padForBottomNav, 250);
      setTimeout(padForBottomNav, 800);
    }
  }, 50);
}

document.addEventListener('DOMContentLoaded', () => {
  renderHero();
  renderGrid();
  bootAfterFooter();
});
