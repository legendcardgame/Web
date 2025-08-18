(function () {
  const nav = document.getElementById('bottomNav');
  if (!nav) return;

  // ---------- Mapeo de rutas -> pestaña ----------
  // Ajusta si cambias carpetas o nombres de archivos.
  function routeToKey(path, search) {
    const p = (path || location.pathname).toLowerCase();
    const q = (search || location.search).toLowerCase();

    // 1) Tu Status (consulta + preinscripción) -> solo utilidades de preregistro
    if (p.includes('/preregistro/utilities/')) {
      // Ejemplos: /preregistro/utilities/consulta.html, /preregistro/utilities/preregistro.html
      return 'consulta'; // etiqueta "Tu Status"
    }

    // 2) Pareos (herramienta de pareos/OTS)
    if (p.includes('/ots/') || p.includes('/pareos/')) {
      return 'pareos';
    }

    // 3) Eventos (menú de eventos + páginas de información)
    // - /preregistro/ (menú con los botones)
    // - /regional/ (páginas dinámicas de información)
    if (p.includes('/preregistro/') || p.includes('/regional/')) {
      return 'preregistro'; // etiqueta "Eventos"
    }

    // 4) Novedades
    if (p.includes('/novedades/')) {
      return 'novedades';
    }

    // 5) Inicio (default)
    return 'home';
  }

  // ---------- Activación visual ----------
  function setActive(key) {
    nav.querySelectorAll('.nav-item').forEach(a => {
      a.classList.toggle('active', a.dataset.key === key);
    });
  }

  // ---------- Inicial ----------
  let key = routeToKey(location.pathname, location.search);

  // Como respaldo: si estamos en una página “neutra” (casi nunca)
  // y hay una última selección válida, úsala.
  if (!key) {
    const saved = localStorage.getItem('lcg-tab');
    if (saved && nav.querySelector(`[data-key="${saved}"]`)) {
      key = saved;
    } else {
      key = 'home';
    }
  }
  setActive(key);

  // ---------- Guardar cuando el usuario toca el nav ----------
  nav.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-key]');
    if (!a) return;
    localStorage.setItem('lcg-tab', a.dataset.key);
    setActive(a.dataset.key); // feedback inmediato
    // no prevenimos la navegación
  });

  // ---------- Re-evaluar al volver atrás o cambiar de historial ----------
  window.addEventListener('popstate', () => {
    setActive(routeToKey(location.pathname, location.search));
  });

  // Soporte para volver con BFCache (Safari/iOS especialmente)
  window.addEventListener('pageshow', (evt) => {
    // Si la página se restauró de caché, re-evaluamos
    if (evt.persisted) {
      setActive(routeToKey(location.pathname, location.search));
    }
  });
})();
