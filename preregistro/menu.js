// /preregistro/menu.js

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
  { slug: "dragon-duel",    img: IMG("dragon-duel") },
  { slug: "speed-duel",     img: IMG("speed-duel") },
  { slug: "win-a-mat",      img: IMG("win-a-mat") },
  { slug: "master-duel",    img: IMG("master-duel") },
];

function renderHero() {
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

function renderGrid() {
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

renderHero();
renderGrid();
