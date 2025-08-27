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

/* ------------------- CARGA DEL TORNEO ------------------- */
async function cargarTorneo() {
  // Lee 1.txt (puede tener XML directo o un URL)
  const res = await fetch('1.txt?v=' + Date.now(), { cache: 'no-store' });
  const raw = (await res.text()).trim();

  const asXmlDirecto = raw.startsWith('<?xml');
  if (!asXmlDirecto) {
    // Puede venir como "URL: https://..." o sólo "https://..."
    const m = raw.match(/^\s*(?:url\s*:\s*)?(https?:\/\/\S+)\s*$/i);
    if (!m) {
      // No es XML ni URL válido: limpiamos y salimos sin pintar nada feo
      tournamentData = null;
      document.getElementById('rondaInfo').textContent = '';
      document.getElementById('tableContainer').style.display = 'none';
      document.getElementById('historyContainer').style.display = 'none';
      return;
    }
    let url = m[1];
    // Garantiza action=getMaster
    if (!/[?&]action=getMaster\b/i.test(url)) {
      url += (url.includes('?') ? '&' : '?') + 'action=getMaster';
    }
    const t = await fetch(url, { cache: 'no-store' }).then(r => r.text());
    const parser = new DOMParser();
    tournamentData = parser.parseFromString(t, 'text/xml');
  } else {
    const parser = new DOMParser();
    tournamentData = parser.parseFromString(raw, 'text/xml');
  }

  const currentRoundNode = tournamentData.querySelector('CurrentRound');
  currentRound = parseInt(currentRoundNode?.textContent || '0', 10);
  document.getElementById('rondaInfo').textContent = `Ronda: ${currentRound}`;

  // Asegura que tras cargar se dibuje la vista activa
  mostrarRondaTab();
}

/* ------------------- BÚSQUEDA / RONDA ACTUAL ------------------- */
function buscarEmparejamientos() {
  if (!tournamentData) return;

  const raw = document.getElementById('konamiId').value.trim();
  const input = padId(raw);
  localStorage.setItem('konamiId', input);

  const tableContainer = document.getElementById('tableContainer');
  tableContainer.innerHTML = '';

  const infoJugador = getPlayerInfo(input);
  if (!infoJugador) {
    renderNoEncontrado();
    document.getElementById('historyContainer').innerHTML = '';
    return;
  }

  const nombreJugador = infoJugador.nombre;
  const standingJugador = infoJugador.standing;

  if (!hayRondas()) {
    renderYaInscrito(nombreJugador, input);
    mostrarHistorial(input, standingJugador, nombreJugador, true);
    return;
  }

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

/* ------- Aviso “¡Nueva ronda!” en el botón Buscar ------- */
(function rondaBadge(){
  const ONE_TXT_URL = '/Web/OTS/1.txt';
  const btn = document.getElementById('buscarBtn');
  if (!btn) return;
  const LS_KEY = 'ots-1txt-etag';
  let lastSeen = localStorage.getItem(LS_KEY) || '';

  async function fetchMarker(){
    try {
      const r = await fetch(ONE_TXT_URL, { method: 'HEAD', cache: 'no-store' });
      return r.headers.get('etag') || r.headers.get('last-modified') || '';
    } catch { return ''; }
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
