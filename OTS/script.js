let tournamentData = null;
let currentRound = null;

function padId(id) {
  return String(id).padStart(10, '0');
}
function qText(sel, ctx) {
  return (ctx.querySelector(sel)?.textContent || '').trim();
}
function findPlayerById(kid) {
  return Array.from(tournamentData.querySelectorAll('TournPlayer'))
    .find(p => padId(qText('Player > ID', p)) === kid) || null;
}

function ensureBuscarBtnBadge() {
  const btn = document.getElementById('buscarBtn');
  if (!btn) return;
  // Inserta estructura esperada por tu CSS (sin cambiar estilos.css)
  if (!btn.querySelector('.btn-label')) {
    const txt = btn.textContent.trim();
    btn.textContent = '';
    const span = document.createElement('span');
    span.className = 'btn-label';
    span.textContent = txt || 'Buscar';
    btn.appendChild(span);
  }
  if (!btn.querySelector('.badge-new')) {
    const b = document.createElement('span');
    b.className = 'badge-new';
    b.textContent = '¡Nueva ronda!';
    btn.appendChild(b);
  }
}

function mostrarMensajePersonalizado(texto) {
  document.getElementById('tableContainer').style.display = 'none';
  document.getElementById('historyContainer').style.display = 'none';
  let msg = document.getElementById('mensajePersonalizado');
  if (!msg) {
    msg = document.createElement('div');
    msg.id = 'mensajePersonalizado';
    document.querySelector('.container').appendChild(msg);
  }
  msg.innerText = texto;
  msg.style.display = '';
}
function ocultarMensajePersonalizado() {
  let msg = document.getElementById('mensajePersonalizado');
  if (msg) msg.style.display = 'none';
  document.getElementById('tableContainer').style.display = '';
  document.getElementById('historyContainer').style.display = '';
}

async function cargarTorneo() {
  const response = await fetch('1.txt?v=' + Date.now());
  const text = await response.text();

  if (text.trim().startsWith('<?xml')) {
    const parser = new DOMParser();
    tournamentData = parser.parseFromString(text, 'text/xml');
    currentRound = parseInt(qText('CurrentRound', tournamentData) || "0", 10);
    document.getElementById('rondaInfo').textContent = `Ronda: ${currentRound}`;
    ocultarMensajePersonalizado();
    mostrarRonda();
  } else {
    document.getElementById('rondaInfo').textContent = '';
    mostrarMensajePersonalizado(text);
  }
}

function getPlayerInfo(id) {
  const playerNode = findPlayerById(id);
  if (!playerNode) return null;
  const nombre = `${qText('Player > FirstName', playerNode)} ${qText('Player > LastName', playerNode)}`.trim();
  const rank = qText('Rank', playerNode);
  const standing = rank ? parseInt(rank, 10) : '-';
  const dropRound = qText('DropRound', playerNode);
  const isDrop = dropRound && parseInt(dropRound, 10) > 0;
  return { nombre, standing, isDrop };
}

// Tarjeta “Ya inscrito” (sin clases nuevas)
function tarjetaInscrito(nombre, konamiId, ronda) {
  return `
    <div class="card">
      <div class="linea-roja"></div>
        <div class="jugador" style="margin-top:18px">${nombre}</div>
        <div class="konami">${konamiId}</div>
        <div class="vs-label" style="margin:10px 0 6px 0">Ya inscrito</div>
        <div class="konami-opo" style="margin-bottom:16px">Ronda ${ronda}</div>
      <div class="linea-azul"></div>
    </div>
  `;
}

function buscarEmparejamientos() {
  const inputRaw = document.getElementById('konamiId').value.trim();
  const input = padId(inputRaw);
  localStorage.setItem('konamiId', input);

  const tableContainer = document.getElementById('tableContainer');
  const historyContainer = document.getElementById('historyContainer');

  if (!tournamentData || !input) {
    tableContainer.innerHTML = "";
    historyContainer.innerHTML = "";
    return;
  }

  // ¿Jugador existe?
  const infoJugador = getPlayerInfo(input);
  if (!infoJugador) {
    tableContainer.innerHTML = `<div class="card" style="padding:16px 10px"><div class="vs-label">Konami ID no encontrado</div></div>`;
    historyContainer.innerHTML = '';
    return;
  }

  // Buscar emparejamiento de la ronda actual
  const matches = Array.from(tournamentData.querySelectorAll('TournMatch'));
  let encontrado = false, idOponente = '', mesa = '';

  for (const match of matches) {
    const ps = match.querySelectorAll('Player');
    const round = parseInt(qText('Round', match) || "0", 10);
    if (round !== currentRound) continue;
    const p1 = padId(qText('Player', ps[0] || match));
    const p2 = padId(qText('Player', ps[1] || match));
    if (input === p1 || input === p2) {
      encontrado = true;
      mesa = qText('Table', match) || '';
      idOponente = input === p1 ? p2 : p1;
      break;
    }
  }

  // Sin rondas o sin match en la ronda actual → Ya inscrito
  if (!currentRound || currentRound === 0 || !encontrado) {
    tableContainer.innerHTML = tarjetaInscrito(infoJugador.nombre, input, currentRound || 0);
  } else {
    const infoOpo = getPlayerInfo(idOponente);
    const nombreOponente = infoOpo ? infoOpo.nombre : 'BYE';
    tableContainer.innerHTML = `
      <div class="mesa">MESA ${mesa}</div>
      <div class="card">
        <div class="linea-roja"></div>
          <div class="jugador">${infoJugador.nombre}</div>
          <div class="konami">${input}</div>
          <div class="vs-label">VS</div>
          <div class="oponente">${nombreOponente}</div>
          <div class="konami-opo">${idOponente || ""}</div>
        <div class="linea-azul"></div>
      </div>
    `;
  }

  // Historial
  mostrarHistorial(input, infoJugador.standing, infoJugador.nombre);
}

// Tab: Ronda
function mostrarRonda() {
  document.getElementById('tableContainer').style.display = '';
  document.getElementById('historyContainer').style.display = 'none';
  document.getElementById('btnRonda').classList.add('active');
  document.getElementById('btnHistorial').classList.remove('active');
  buscarEmparejamientos();
}

// Tab: Historial
function mostrarHistorialTab() {
  document.getElementById('tableContainer').style.display = 'none';
  document.getElementById('historyContainer').style.display = '';
  document.getElementById('btnHistorial').classList.add('active');
  document.getElementById('btnRonda').classList.remove('active');
  buscarEmparejamientos();
}

function mostrarHistorial(input, standing, nombreJugador) {
  const historyContainer = document.getElementById('historyContainer');
  if (!tournamentData) {
    historyContainer.innerHTML = '';
    return;
  }

  const matches = Array.from(tournamentData.querySelectorAll('TournMatch'));
  let historial = [];
  for (const match of matches) {
    const ps = match.querySelectorAll('Player');
    const p1 = padId(qText('Player', ps[0] || match));
    const p2 = padId(qText('Player', ps[1] || match));
    const round = parseInt(qText('Round', match) || "0", 10);
    const winnerRaw = qText('Winner', match);
    const winner = winnerRaw ? padId(winnerRaw) : "";

    if (input === p1 || input === p2) {
      const idOponente = input === p1 ? p2 : p1;
      const infoOpo = getPlayerInfo(idOponente);
      const nombreOponente = infoOpo ? infoOpo.nombre : '';
      let resultado = '';
      if (!winnerRaw || winnerRaw === '0') {
        resultado = (round === currentRound) ? 'En curso' : 'Empate';
      } else if (winner === input) {
        resultado = 'Victoria';
      } else if (winner === idOponente) {
        resultado = 'Derrota';
      } else {
        resultado = 'Empate';
      }
      historial.push({ ronda: round, resultado, nombreOponente });
    }
  }

  historial.sort((a, b) => b.ronda - a.ronda);

  let medal = standing === 1 ? '🥇' : standing === 2 ? '🥈' : standing === 3 ? '🥉' : '';
  let standingHTML = `
    <div class="standing-box">Standing:<br>${standing || '-'}${medal ? `<span class="medal">${medal}</span>` : ''}</div>
    <div class="jugador" style="text-align:center;">${nombreJugador}</div>
  `;

  let content = standingHTML;

  if (!historial.length) {
    content += tarjetaInscrito(nombreJugador, input, currentRound || 0);
    historyContainer.innerHTML = content;
    return;
  }

  for (const { ronda, resultado, nombreOponente } of historial) {
    let colorBarra = (resultado === 'Victoria') ? 'result-win' :
                     (resultado === 'Derrota') ? 'result-loss' : 'result-draw';
    content += `
      <div class="historial-caja">
        <div class="historial-barra ${colorBarra}"></div>
        <div class="contenido-historial">
          <div class="ronda-resultado">Ronda ${ronda} - ${resultado}</div>
          <div class="vs-nombre">VS ${nombreOponente}</div>
        </div>
      </div>
    `;
  }

  historyContainer.innerHTML = content;
}

// Alternar pestañas
document.getElementById('btnRonda').addEventListener('click', mostrarRonda);
document.getElementById('btnHistorial').addEventListener('click', mostrarHistorialTab);

// Buscar / Enter
document.getElementById('buscarBtn').addEventListener('click', async () => {
  const raw = document.getElementById('konamiId').value.trim();
  const id = padId(raw);
  localStorage.setItem('konamiId', id);
  await cargarTorneo();
  mostrarRonda();
});
document.getElementById('konamiId').addEventListener('keydown', async (e) => {
  if (e.key === "Enter") {
    const id = padId(e.target.value.trim());
    localStorage.setItem('konamiId', id);
    await cargarTorneo();
    mostrarRonda();
  }
});

// Init
document.addEventListener('DOMContentLoaded', () => {
  ensureBuscarBtnBadge();
  cargarTorneo();
  const lastId = localStorage.getItem('konamiId');
  if (lastId) document.getElementById('konamiId').value = lastId;
});

// ===== Aviso “¡Nueva ronda!” (cambia 1.txt) =====
(function rondaBadge(){
  const ONE_TXT_URL = '/Web/OTS/1.txt';  // ajusta si tu 1.txt vive en otra ruta
  const btn = document.getElementById('buscarBtn');
  if (!btn) return;

  const LS_KEY = 'ots-1txt-etag';
  let lastSeen = localStorage.getItem(LS_KEY) || '';

  async function fetchMarker(){
    try {
      const r = await fetch(ONE_TXT_URL, { method: 'HEAD', cache: 'no-store' });
      return r.headers.get('etag') || r.headers.get('last-modified') || '';
    } catch {
      return '';
    }
  }
  async function checkUpdate(){
    const current = await fetchMarker();
    if (!current) return;
    if (!lastSeen) {
      lastSeen = current;
      localStorage.setItem(LS_KEY, current);
      btn.classList.remove('has-update');
      return;
    }
    btn.classList.toggle('has-update', current !== lastSeen);
  }
  btn.addEventListener('click', async () => {
    const current = await fetchMarker();
    if (current) {
      lastSeen = current;
      localStorage.setItem(LS_KEY, current);
    }
    btn.classList.remove('has-update');
  });
  checkUpdate();
  setInterval(checkUpdate, 30000);
})();
