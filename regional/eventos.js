// regional/eventos.js
// Catálogo de eventos para la página dinámica regional/evento.html
// Puedes cambiar títulos, banners, costos, descripciones y el link del botón.

window.LCG_EVENTS = {
  principal: {
    title:  'Evento Principal',
    banner: '../assets/banners/events/principal.png',
    mode:   'Presencial',
    format: 'TCG Estándar',
    schedule: 'Sáb. 13 de septiembre, 09:00–20:00',
    venue:  'Sede oficial · Puebla',
    desc:   'Main Event oficial clasificatorio. Asegura tu lugar con preregistro.',
    rules:  'https://www.yugioh-card.com/lat-am/rulebook/',
    price:  '$300 MXN',
    register: '../preregistro/index.html',
    ctaText: 'Preregistro'
  },

  edison: {
    title:  'Edison Formato',
    banner: '../assets/banners/events/edison.png',
    mode:   'Presencial',
    format: 'Formato Edison',
    schedule: 'Dom. 14 de septiembre, 10:00–18:00',
    venue:  'Sede oficial · Puebla',
    desc:   'Torneo en el histórico formato Edison.',
    rules:  'https://yugipedia.com/wiki/Edison_Format',
    price:  '$200 MXN',
    register: '../preregistro/index.html',
    ctaText: 'Preregistro'
  },

  dragon_duel: {
    title:  'Dragon Duel',
    banner: '../assets/banners/events/dragon-duel.png',
    mode:   'Presencial',
    format: 'U13',
    schedule: 'Sáb. 13 de septiembre, 12:00–16:00',
    venue:  'Sede oficial · Puebla',
    desc:   'Torneo para duelistas jóvenes.',
    rules:  'https://www.yugioh-card.com/lat-am/dragon-duel/',
    price:  '$150 MXN',
    register: '../preregistro/index.html',
    ctaText: 'Preregistro'
  },

  speed_duel: {
    title:  'Speed Duel',
    banner: '../assets/banners/events/speed-duel.png',
    mode:   'Presencial',
    format: 'Speed Duel',
    schedule: 'Dom. 14 de septiembre, 12:00–17:00',
    venue:  'Sede oficial · Puebla',
    desc:   'Partidas rápidas con habilidades.',
    rules:  'https://www.yugioh-card.com/speedduel/',
    price:  '$150 MXN',
    register: '../preregistro/index.html',
    ctaText: 'Preregistro'
  },

structure_deck: {
  title:    'Structure Deck',
  banner:   '../assets/banners/events/structure-deck.png',
  mode:     'Presencial',
  format:   'Structure Deck',
  schedule: 'Consulta la convocatoria',
  venue:    'Puebla',
  desc:     'Evento especial donde solo se compite con mazos de Structure Deck.',
  rules:    '#', // TODO: coloca aquí el enlace oficial a reglas/convocatoria
  price:    '$150 MXN',
  register: '../preregistro/index.html',
  ctaText:  'Preregistro'
  },

  master_duel: {
    title:  'Master Duel',
    banner: '../assets/banners/events/master-duel.png',
    mode:   'Online/Presencial',
    format: 'Master Duel',
    schedule: 'Calendario por anunciar',
    venue:  'Puebla',
    desc:   'Competencia en la plataforma Master Duel.',
    rules:  'https://www.konami.com/yugioh/masterduel/',
    price:  '$120 MXN',
    register: '../preregistro/index.html',
    ctaText: 'Preregistro'
  },

  win_a_mat: {
    title:  'Win a Mat',
    banner: '../assets/banners/events/win-a-mat.png',
    mode:   'Presencial',
    format: 'Side Event',
    schedule: 'Durante el fin de semana',
    venue:  'Sede oficial · Puebla',
    desc:   '¡Gana tu tapete exclusivo!',
    rules:  '',
    price:  '$200 MXN',
    register: '../preregistro/index.html',
    ctaText: 'Preregistro'
  }
};
