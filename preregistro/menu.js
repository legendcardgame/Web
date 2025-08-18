// /preregistro/menu.js
// Cambia a .jpg si tus banners no son .png
const IMG = (slug) => `../assets/banners/events/${slug}.png`;

// Hero: evento principal
const HERO = {
  title: "Evento Principal",
  slug: "principal",
  img: IMG("principal"),
  href: "./utilities/preregistro.html?event=principal"
};

// Side events (puedes añadir Structure Deck si quieres 2x3)
const SIDE_EVENTS = [
  { title: "Edison Format",   slug: "edison",          img: IMG("edison") },
  { title: "Win a Mat",       slug: "win-a-mat",       img: IMG("win-a-mat") },
  { title: "Master Duel",     slug: "master-duel",     img: IMG("master-duel") },
  { title: "Speed Duel",      slug: "speed-duel",      img: IMG("speed-duel") },
  // { title: "Structure Deck",  slug: "structure-deck",  img: IMG("structure-deck") },
];

function renderHero() {
  const el = document.getElementById('heroSlot');
  el.innerHTML = `
    <article class="hero-card">
      <a href="${HERO.href}">
        <img class="hero-img" src="${HERO.img}" alt="${HERO.title}">
        <div class="hero-title">${HERO.title}</div>
      </a>
    </article>
  `;
}

function renderGrid() {
  const grid = document.getElementById('gridSlot');
  grid.innerHTML = SIDE_EVENTS.map(ev => `
    <article class="img-card">
      <a href="./utilities/preregistro.html?event=${encodeURIComponent(ev.slug)}" aria-label="${ev.title}">
        <img src="${ev.img}" alt="${ev.title}">
        <div class="img-title">${ev.title}</div>
      </a>
    </article>
  `).join('');
}

renderHero();
renderGrid();
