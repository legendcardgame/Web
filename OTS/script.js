let tournamentData = null;
let currentRound = null;

function padId(id) {
  return String(id).padStart(10, '0');
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

  // Si el archivo parece XML, parsea normalmente
  if (text.trim().startsWith('<?xml')) {
    const parser = new DOMParser();
    tournamentData = parser.parseFromString(text, 'text/xml');
    const currentRoundNode = tournamentData.querySelector('CurrentRound');
    currentRound = parseInt(currentRoundNode?.textContent || "0", 10);
    document.getElementById('rondaInfo').textContent = `Ronda: ${currentRound}`;
    ocultarMensajePersonalizado();
    // Mostrar la ronda por defecto
    mostrarRonda();
  } else {
    // Si es texto plano, muestra como mensaje personalizado
    document.getElementById('rondaInfo').textContent = '';
    mostrarMensajePersonalizado(text);
  }
}

function getPlayerInfo(id) {
  const players = Array.from(tournamentData.querySelectorAll('TournPlayer'));
  const playerNode = players.find(p => padId(p.querySelector('ID')?.textContent) === id);
  if (!playerNode) return null;
  const nombre = `${playerNode.querySelector('FirstName')?.textContent || ''} ${playerNode.querySelector('LastName')?.textContent || ''}`.trim();
  const rank = playerNode.querySelector('Rank')?.textContent;
  let standing = rank ? parseInt(rank, 10) : '-';
  // Check for drop
  const dropRound = playerNode.querySelector('DropRound')?.textContent || '';
  const isDrop = dropRound && parseInt(dropRound, 10) > 0;
  return { nombre, standing, isDrop };
}

function buscarEmparejamientos() {
  const inputRaw = document.getElementById('konamiId').value.trim();
  const input = padId(inputRaw);
  localStorage.setItem('konamiId', input);

  if (!tournamentData || !input) {
    document.getElementById('tableContainer').innerHTML = "";
    document.getElementById('historyContainer').innerHTML = "";
    return;
  }

  const matches = Array.from(tournamentData.querySelectorAll('TournMatch'));
  const players = Array.from(tournamentData.querySelectorAll('TournPlayer'));

  let encontrado = false;
  let emparejamiento = null;
  let nombreJugador = '';
  let nombreOponente = '';
  let idOponente = '';
  let mesa = '';
  let standingJugador = '-';

  // Buscar Standing y Nombre del jugador
  const infoJugador = getPlayerInfo(input);
  if (infoJugador) {
    nombreJugador = infoJugador.nombre;
    standingJugador = infoJugador.standing;
  }

  // Buscar emparejamiento actual
  for (const match of matches) {
    const round = parseInt(match.querySelector('Round')?.textContent || "0", 10);
    if (round !== currentRound) continue;
    const p1 = padId(match.querySelectorAll('Player')[0]?.textContent || "");
    const p2 = padId(match.querySelectorAll('Player')[1]?.textContent || "");
    if (input === p1 || input === p2) {
      encontrado = true;
      emparejamiento = match;
      mesa = match.querySelector('Table')?.textContent || '';
      idOponente = input === p1 ? p2 : p1;
      const infoOpo = getPlayerInfo(idOponente);
      nombreOponente = infoOpo ? infoOpo.nombre : '';
      break;
    }
  }

  // Mostrar ronda actual
  const tableContainer = document.getElementById('tableContainer');
  if (encontrado) {
    tableContainer.innerHTML = `
      <div class="mesa">MESA ${mesa}</div>
      <div class="card">
        <div class="linea-roja"></div>
          <div class="jugador">${nombreJugador}</div>
          <div class="konami">${input}</div>
          <div class="vs-label">VS</div>
          <div class="oponente">${nombreOponente || "BYE"}</div>
          <div class="konami-opo">${idOponente || ""}</div>
        <div class="linea-azul"></div>
      </div>
    `;
  } else {
    tableContainer.innerHTML = `<div style="text-align:center;font-size:1.1rem;font-weight:bold;margin-top:32px;">No se encontró el Konami ID o no tienes emparejamiento esta ronda.</div>`;
  }

  // Mostrar historial
  mostrarHistorial(input, standingJugador, nombreJugador);
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
  // Historial, de ronda más reciente a más antigua
  let historial = [];
  matches.forEach(match => {
    const p1 = padId(match.querySelectorAll('Player')[0]?.textContent || "");
    const p2 = padId(match.querySelectorAll('Player')[1]?.textContent || "");
    const round = parseInt(match.querySelector('Round')?.textContent || "0", 10);
    const winnerRaw = match.querySelector('Winner')?.textContent?.trim() || "";
    const winner = winnerRaw ? padId(winnerRaw) : "";
    if (input === p1 || input === p2) {
      const idOponente = input === p1 ? p2 : p1;
      const infoOpo = getPlayerInfo(idOponente);
      const nombreOponente = infoOpo ? infoOpo.nombre : '';
      let resultado = '';
  if (!winnerRaw || winnerRaw === '0') {
  if (round === currentRound) {
    resultado = 'En curso';
  } else {
    resultado = 'Empate';
  }
} else if (winner === input) {
  resultado = 'Victoria';
} else if (winner === idOponente) {
  resultado = 'Derrota';
}
      historial.push({
        ronda: round,
        resultado,
        nombreOponente,
        idOponente,
      });
    }
  });

  historial.sort((a, b) => b.ronda - a.ronda);

  // Medalla según standing
  let medal = "";
  if (standing === 1) medal = '<span class="medal">🥇</span>';
  else if (standing === 2) medal = '<span class="medal">🥈</span>';
  else if (standing === 3) medal = '<span class="medal">🥉</span>';

  // Mostrar standing y nombre arriba
  let standingHTML = `<div class="standing-box">Standing:<br>${standing || '-'}${medal}</div>
  <div class="jugador" style="text-align:center;">${nombreJugador}</div>`;

  let content = standingHTML;

  historial.forEach(({ ronda, resultado, nombreOponente }) => {
    let colorBarra = '';
    let colorTexto = '';
    if (resultado === 'Victoria') {
      colorBarra = 'result-win';
      colorTexto = 'result-win';
    } else if (resultado === 'Derrota') {
      colorBarra = 'result-loss';
      colorTexto = 'result-loss';
    } else {
      colorBarra = 'result-draw';
      colorTexto = 'result-draw';
    }

    content += `
      <div class="historial-caja">
        <div class="historial-barra ${colorBarra}"></div>
        <div class="contenido-historial">
          <div class="ronda-resultado ${colorTexto}">Ronda ${ronda} - ${resultado}</div>
          <div class="vs-nombre">VS ${nombreOponente}</div>
        </div>
      </div>
    `;
  });

  historyContainer.innerHTML = content;
}

// Alternar pestañas
document.getElementById('btnRonda').addEventListener('click', mostrarRonda);
document.getElementById('btnHistorial').addEventListener('click', mostrarHistorialTab);

// Botón buscar y Enter en input
document.getElementById('buscarBtn').addEventListener('click', async () => {
  const raw = document.getElementById('konamiId').value.trim();
  const id = padId(raw);
  localStorage.setItem('konamiId', id);   // guarda primero
  await cargarTorneo();                   // vuelve a leer 1.txt (con cache-buster)
  mostrarRonda();                         // actualiza vista
});

document.getElementById('konamiId').addEventListener('keydown', async (e) => {
  if (e.key === "Enter") {
    const id = padId(e.target.value.trim());
    localStorage.setItem('konamiId', id);
    await cargarTorneo();
    mostrarRonda();
  }
});
// Al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  cargarTorneo();
  const lastId = localStorage.getItem('konamiId');
  if (lastId) document.getElementById('konamiId').value = lastId;
});

// ===== Aviso “¡Nueva ronda!” en el botón Buscar cuando cambie 1.txt =====
(function rondaBadge(){
  // Ajusta si tu 1.txt vive en otra ruta
  const ONE_TXT_URL = '/Web/OTS/1.txt';

  const btn = document.getElementById('buscarBtn');
  if (!btn) return;

  const LS_KEY = 'ots-1txt-etag'; // dónde guardamos la versión vista
  let lastSeen = localStorage.getItem(LS_KEY) || '';

  async function fetchMarker(){
    try {
      // HEAD evita descargar el archivo entero y salta caches
      const r = await fetch(ONE_TXT_URL, { method: 'HEAD', cache: 'no-store' });
      // Tomamos ETag o Last-Modified, lo que exista
      const etag = r.headers.get('etag') || r.headers.get('last-modified') || '';
      return etag;
    } catch (e) {
      // Si falla, no rompemos el flujo
      return '';
    }
  }

  async function checkUpdate(){
    const current = await fetchMarker();
    if (!current) {
      // Si no pudimos leer headers, no alteramos el estado
      return;
    }
    // Si es la primera vez que entran y no hay lastSeen, inicializamos sin mostrar alerta
    if (!lastSeen) {
      lastSeen = current;
      localStorage.setItem(LS_KEY, current);
      btn.classList.remove('has-update');
      return;
    }
    // Si cambió respecto a lo último visto → mostrar badge
    if (current !== lastSeen) {
      btn.classList.add('has-update');
    } else {
      btn.classList.remove('has-update');
    }
  }

  // Marca como "visto" al buscar (y oculta la chapita)
  btn.addEventListener('click', async () => {
    const current = await fetchMarker();
    if (current) {
      lastSeen = current;
      localStorage.setItem(LS_KEY, current);
    }
    btn.classList.remove('has-update');
  });

  // Primera verificación y luego cada 30s (ajusta si quieres)
  checkUpdate();
  setInterval(checkUpdate, 30000);
})();
