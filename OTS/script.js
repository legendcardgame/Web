let tournamentData = null;
let currentRound = null;

function padId(id) {
  return String(id || '').replace(/\D/g, '').padStart(10, '0');
}

function getPlayerNodeById(id) {
  if (!tournamentData) return null;
  const players = Array.from(tournamentData.querySelectorAll('TournPlayer'));
  return players.find(p => padId(p.querySelector('ID')?.textContent) === id) || null;
}

function getPlayerInfo(id) {
  const node = getPlayerNodeById(id);
  if (!node) return null;
  const nombre = `${node.querySelector('FirstName')?.textContent || ''} ${node.querySelector('LastName')?.textContent || ''}`.trim();
  const rank = node.querySelector('Rank')?.textContent;
  const standing = rank ? parseInt(rank, 10) : '-';
  const dropReason = (node.querySelector('DropReason')?.textContent || '').trim().toLowerCase();
  const dropRound = parseInt(node.querySelector('DropRound')?.textContent || '0', 10);
  const isDrop = (dropReason && dropReason !== 'active') || dropRound > 0;
  return { nombre, standing, isDrop };
}

function hayRondas() {
  return tournamentData && tournamentData.querySelectorAll('TournMatch').length > 0 && currentRound > 0;
}

function renderYaInscrito(nombreJugador, idJugador) {
  const tableContainer = document.getElementById('tableContainer');
  tableContainer.innerHTML = `
    <div class="card">
      <div class="linea-roja"></div>
      ${nombreJugador ? `<div class="jugador">${nombreJugador}</div>` : ''}
      <div class="konami">${idJugador || ''}</div>
      <div class="vs-label">Ya inscrito</div>
      <div class="konami-opo">Ronda ${currentRound}</div>
      <div class="linea-azul"></div>
    </div>
  `;
}

function renderNoEncontrado() {
  const tableContainer = document.getElementById('tableContainer');
  tableContainer.innerHTML = `
    <div class="card">
      <div class="linea-roja"></div>
      <div class="vs-label">No se encontró el Konami ID.</div>
      <div class="linea-azul"></div>
    </div>
  `;
}

/* ------------------- helpers de carga ------------------- */
async function fetchTextNoCache(url) {
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(`${url}${sep}v=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function parseXmlString(xmlString) {
  const parser = new DOMParser();
  return parser.parseFromString(xmlString, 'text/xml');
}

function extractCurrentRoundFromXml(xmlDoc) {
  const n = xmlDoc.querySelector('CurrentRound');
  const r = parseInt(n?.textContent || '0', 10);
  return Number.isFinite(r) ? r : 0;
}

/* ------------------- CARGA DEL TORNEO ------------------- */
async function cargarTorneo() {
  const response = await fetch('1.txt?v=' + Date.now(), { cache: 'no-store' });
  const text = await response.text();
  const trimmed = text.trim();

  // Caso 1: 1.txt contiene una URL remota
  if (trimmed.toUpperCase().startsWith('URL:')) {
    const url = trimmed.slice(4).trim();
    try {
      const xml = await fetchTextNoCache(url);
      tournamentData = parseXmlString(xml);
      currentRound = extractCurrentRoundFromXml(tournamentData);
      document.getElementById('rondaInfo').textContent = `Ronda: ${currentRound}`;
      const msg = document.getElementById('mensajePersonalizado');
      if (msg) msg.style.display = 'none';
      mostrarRondaTab();
      return;
    } catch (e) {
      document.getElementById('rondaInfo').textContent = '';
      const tableContainer = document.getElementById('tableContainer');
      tableContainer.innerHTML = `
        <div class="card">
          <div class="linea-roja"></div>
          <div class="vs-label">⚠️ Error al cargar la URL: ${e.message}</div>
          <div class="linea-azul"></div>
        </div>
      `;
      document.getElementById('historyContainer').style.display = 'none';
      return;
    }
  }

  // Caso 2: 1.txt trae XML directo de KTS
  if (trimmed.startsWith('<?xml')) {
    tournamentData = parseXmlString(trimmed);
    currentRound = extractCurrentRoundFromXml(tournamentData);
    document.getElementById('rondaInfo').textContent = `Ronda: ${currentRound}`;
    const msg = document.getElementById('mensajePersonalizado');
    if (msg) msg.style.display = 'none';
    mostrarRondaTab();
    return;
  }

  // Caso 3: 1.txt es texto plano (mensaje)
  document.getElementById('rondaInfo').textContent = '';
  let msg = document.getElementById('mensajePersonalizado');
  if (!msg) {
    msg = document.createElement('div');
    msg.id = 'mensajePersonalizado';
    document.querySelector('.container').appendChild(msg);
  }
  msg.innerText = trimmed;
  msg.style.display = '';
  document.getElementById('tableContainer').style.display = 'none';
  document.getElementById('historyContainer').style.display = 'none';
}

/* ------------------- BÚSQUEDA / RONDA ACTUAL ------------------- */
function buscarEmparejamientos() {
  if (!tournamentData) return;

  const raw = document.getElementById('konamiId').value.trim();
  const input = padId(raw);
  localStorage.setItem('konamiId', input);

  const tableContainer = document.getElementById('tableContainer');
  tableContainer.innerHTML = '';

  // Info del jugador (si existe)
  const infoJugador = getPlayerInfo(input);

  // Si NO existe ese KID en el XML, avisa y termina
  if (!infoJugador) {
    renderNoEncontrado();
    document.getElementById('historyContainer').innerHTML = '';
    return;
  }

  const nombreJugador = infoJugador.nombre;
  const standingJugador = infoJugador.standing;

  // Si no hay rondas emparejadas todavía → “Ya inscrito”
  if (!hayRondas()) {
    renderYaInscrito(nombreJugador, input);
    // Historial vacío (sin rondas)
    mostrarHistorial(input, standingJugador, nombreJugador, /*forzarSinRondas*/ true);
    return;
  }

  // Buscar emparejamiento en la ronda actual
  const matches = Array.from(tournamentData.querySelectorAll('TournMatch'));
  let encontrado = false;
  let mesa = '';
  let idOponente = '';
  let nombreOponente = '';

  for (const match of matches) {
    const round = parseInt(match.querySelector('Round')?.textContent || '0', 10);
    if (round !== currentRound) continue;

    const plist = match.querySelectorAll('Player');
    const p1 = padId(plist[0]?.textContent || '');
    const p2 = padId(plist[1]?.textContent || '');
    if (input === p1 || input === p2) {
      encontrado = true;
      mesa = match.querySelector('Table')?.textContent || '';
      idOponente = (input === p1) ? p2 : p1;
      const infoOpo = getPlayerInfo(idOponente);
      nombreOponente = infoOpo?.nombre || 'BYE';
      break;
    }
  }

  if (encontrado) {
    tableContainer.innerHTML = `
      <div class="mesa">MESA ${mesa}</div>
      <div class="card">
        <div class="linea-roja"></div>
          <div class="jugador">${nombreJugador}</div>
          <div class="konami">${input}</div>
          <div class="vs-label">VS</div>
          <div class="oponente">${nombreOponente}</div>
          <div class="konami-opo">${idOponente}</div>
        <div class="linea-azul"></div>
      </div>
    `;
  } else {
    // Está inscrito (existe), pero aún no tiene mesa en la ronda actual
    renderYaInscrito(nombreJugador, input);
  }

  mostrarHistorial(input, standingJugador, nombreJugador);
}

/* ------------------- HISTORIAL ------------------- */
function mostrarHistorial(input, standing, nombreJugador, forzarSinRondas = false) {
  const historyContainer = document.getElementById('historyContainer');
  historyContainer.innerHTML = '';

  if (!tournamentData || forzarSinRondas || !hayRondas()) {
    historyContainer.innerHTML = `
      <div class="card">
        <div class="linea-roja"></div>
        <div class="vs-label">Sin historial aún</div>
        <div class="linea-azul"></div>
      </div>`;
    return;
  }

  const matches = Array.from(tournamentData.querySelectorAll('TournMatch'));
  const historial = [];

  matches.forEach(match => {
    const round = parseInt(match.querySelector('Round')?.textContent || '0', 10);
    const plist = match.querySelectorAll('Player');
    const p1 = padId(plist[0]?.textContent || '');
    const p2 = padId(plist[1]?.textContent || '');
    const winnerRaw = (match.querySelector('Winner')?.textContent || '').trim();
    const winner = winnerRaw ? padId(winnerRaw) : '';

    const inputRaw = document.getElementById('konamiId').value.trim();
    const inputId = padId(inputRaw || input);

    if (inputId === p1 || inputId === p2) {
      const idOponente = (inputId === p1) ? p2 : p1;
      const infoOpo = getPlayerInfo(idOponente);
      const nombreOponente = infoOpo?.nombre || '';

      let resultado = '';
      if (!winnerRaw || winnerRaw === '0') {
        resultado = (round === currentRound) ? 'En curso' : 'Empate';
      } else if (winner === inputId) {
        resultado = 'Victoria';
      } else if (winner === idOponente) {
        resultado = 'Derrota';
      } else {
        resultado = 'Empate';
      }

      historial.push({ ronda: round, resultado, nombreOponente });
    }
  });

  historial.sort((a, b) => b.ronda - a.ronda);

  if (historial.length === 0) {
    historyContainer.innerHTML = `
      <div class="card">
        <div class="linea-roja"></div>
        <div class="vs-label">Sin historial aún</div>
        <div class="linea-azul"></div>
      </div>`;
    return;
  }

  let medal = '';
  if (standing === 1) medal = '<span class="medal">🥇</span>';
  else if (standing === 2) medal = '<span class="medal">🥈</span>';
  else if (standing === 3) medal = '<span class="medal">🥉</span>';

  historyContainer.innerHTML = `
    <div class="standing-box">Standing:<br>${standing || '-'}${medal}</div>
    <div class="jugador" style="text-align:center;">${nombreJugador || ''}</div>
  `;

  historial.forEach(({ ronda, resultado, nombreOponente }) => {
    let color = 'result-draw';
    if (resultado === 'Victoria') color = 'result-win';
    else if (resultado === 'Derrota') color = 'result-loss';

    historyContainer.innerHTML += `
      <div class="historial-caja">
        <div class="historial-barra ${color}"></div>
        <div class="contenido-historial">
          <div class="ronda-resultado ${color}">Ronda ${ronda} - ${resultado}</div>
          <div class="vs-nombre">VS ${nombreOponente}</div>
        </div>
      </div>
    `;
  });
}

/* ------------------- TABS ------------------- */
function mostrarRondaTab() {
  document.getElementById('tableContainer').style.display = '';
  document.getElementById('historyContainer').style.display = 'none';
  document.getElementById('btnRonda').classList.add('active');
  document.getElementById('btnHistorial').classList.remove('active');
  buscarEmparejamientos();
}

function mostrarHistorialTab() {
  document.getElementById('tableContainer').style.display = 'none';
  document.getElementById('historyContainer').style.display = '';
  document.getElementById('btnHistorial').classList.add('active');
  document.getElementById('btnRonda').classList.remove('active');
  buscarEmparejamientos();
}

/* ------------------- BOOT ------------------- */
document.getElementById('btnRonda').addEventListener('click', mostrarRondaTab);
document.getElementById('btnHistorial').addEventListener('click', mostrarHistorialTab);

document.getElementById('buscarBtn').addEventListener('click', async () => {
  const id = padId(document.getElementById('konamiId').value.trim());
  localStorage.setItem('konamiId', id);
  await cargarTorneo();
  mostrarRondaTab();
});

document.getElementById('konamiId').addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    const id = padId(e.target.value.trim());
    localStorage.setItem('konamiId', id);
    await cargarTorneo();
    mostrarRondaTab();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  cargarTorneo();
  const lastId = localStorage.getItem('konamiId');
  if (lastId) document.getElementById('konamiId').value = lastId;
});

/* ------- Aviso “¡Nueva ronda!” basado en número de ronda ------- */
(function rondaBadge(){
  const ONE_TXT_URL = '/Web/OTS/1.txt';
  const btn = document.getElementById('buscarBtn');
  if (!btn) return;

  const LS_KEY_ROUND = 'ots-last-round';
  let lastRoundSeen = parseInt(localStorage.getItem(LS_KEY_ROUND) || '0', 10);

  async function getRoundFromSource() {
    try {
      const txt = await fetchTextNoCache(ONE_TXT_URL);
      const t = txt.trim();

      // Si es URL:… descargar el XML remoto y leer CurrentRound
      if (t.toUpperCase().startsWith('URL:')) {
        const url = t.slice(4).trim();
        const xml = await fetchTextNoCache(url);
        const doc = parseXmlString(xml);
        return extractCurrentRoundFromXml(doc);
      }

      // Si es XML directo
      if (t.startsWith('<?xml')) {
        const doc = parseXmlString(t);
        return extractCurrentRoundFromXml(doc);
      }

      // Texto plano: no se puede determinar ronda
      return 0;
    } catch {
      return 0;
    }
  }

  async function checkUpdate(){
    const round = await getRoundFromSource();
    if (round > 0 && lastRoundSeen > 0 && round !== lastRoundSeen) {
      btn.classList.add('has-update');
    } else {
      btn.classList.remove('has-update');
    }
  }

  // Al hacer click en Buscar, “consumimos” la novedad y guardamos la ronda actual
  btn.addEventListener('click', async () => {
    const round = await getRoundFromSource();
    if (round > 0) {
      lastRoundSeen = round;
      localStorage.setItem(LS_KEY_ROUND, String(round));
    }
    btn.classList.remove('has-update');
  });

  // Primera comprobación y luego cada 30s
  checkUpdate();
  setInterval(checkUpdate, 30000);
})();
