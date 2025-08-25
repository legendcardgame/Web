// Inserta header + footer en TODAS las páginas y marca activo el ítem del menú inferior
(function () {
  // Detecta la raíz del repo ("/Web")
  var parts = location.pathname.split("/"); // ["", "Web", ...]
  var base = "/" + (parts[1] || "Web");     // "/Web"

  function inject(whereId, url) {
    var el = document.getElementById(whereId);
    if (!el) return Promise.resolve();
    return fetch(url, { cache: "no-cache" })
      .then(function (r) { return r.text(); })
      .then(function (html) { el.innerHTML = html; })
      .catch(function () {});
  }

  function setActiveBottomNav() {
    var nav = document.getElementById("bottomNav");
    if (!nav) return;

    var path = location.pathname.toLowerCase();
    var current = "home";
    if (path.includes("/preregistro/utilities/consulta")) current = "consulta";
    else if (path.includes("/preregistro/")) current = "preregistro";
    else if (path.includes("/ots/")) current = "pareos";
    else if (path.includes("/productos/")) current = "productos";
    else current = "home";

    // Respeta selección almacenada si aplica y si existe ese tab
    var saved = localStorage.getItem("lcg-tab");
    if (saved && [...nav.querySelectorAll("[data-key]")].some(function (a) { return a.dataset.key === saved; })) {
      current = saved;
    }

    nav.querySelectorAll(".nav-item").forEach(function (a) {
      a.classList.toggle("active", a.dataset.key === current);
    });

    nav.addEventListener("click", function (e) {
      var a = e.target.closest("a[data-key]");
      if (!a) return;
      localStorage.setItem("lcg-tab", a.dataset.key);
    });
  }

  // Inyecta header y footer, luego inicializa bottom-nav
  document.addEventListener("DOMContentLoaded", function () {
    inject("site-header", base + "/partials/header.html")
      .then(function () { return inject("site-footer", base + "/partials/footer.html"); })
      .then(setActiveBottomNav);
  });

})();
