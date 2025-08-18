// /preregistro/menu.js

// Usa /preregistro/images/ y los mismos nombres que ya manejas
const IMG = (slug) => `./images/${slug}.png`;  // cambia a .jpg si tus archivos son .jpg

// Hero: Evento principal (solo imagen, sin texto)
const HERO = {
  slug: "principal",
  img: IMG("principal"),
  href: "./utilities/preregistro.html?event=principal"
};

// Side events: ahora 6 botones
const SIDE_EVENTS = [
  { slug: "edison",         img: IMG("edison") },
  { slug: "win-a-mat",      img: IMG("win-a-mat") },
  { slug: "master-duel",    img: IMG("master-duel") },
  { slug: "speed-duel",     img: IMG("speed-duel") },
  { slug: "structure-deck", img: IMG("structure-deck") },
  { slug: "dragon-duel",    img: IMG("dragon-duel") },
];

function renderHero() {
  const el = document.getElementById('heroSlot');
  el.innerHTML = `
    <article class="hero-card">
      <a href="${HERO.href}">
        <img class="hero-img" src="${HERO.img}" alt="Evento Principal">
      </a>
    </article>
  `;
}

function renderGrid() {
  const grid = document.getElementById('gridSlot');
  grid.innerHTML = SIDE_EVENTS.map(ev => `
    <article class="img-card">
      <a href="./utilities/preregistro.html?event=${encodeURIComponent(ev.slug)}" aria-label="${ev.slug}">
        <img src="${ev.img}" alt="${ev.slug}">
      </a>
    </article>
  `).join('');
}

renderHero();
renderGrid();
