let tournamentData = null;
let currentRound = null;

/* ============ NUEVO: helpers de origen ============ */
const isUrl = s => /^https?:\/\/\S+$/i.test((s || '').trim());
const looksLikeXml = s => /^\s*<\?xml|<\s*Tournament[\s>]/i.test(s || '');

function getSrcFromQuery() {
  try {
    const u = new URL(location.href);
    const s = (u.searchParams.get('src') || '').trim();
    return isUrl(s) ? s : null;
  } catch { return null; }
}

async function fetchText(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.text();
}

/* ================================================== */

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
  try {
    // 1) Prioridad: ?src=
    let source = getSrcFromQuery();

    // 2) Si no hay, intenta usar origen guardado (si llegas a guardarlo en el futuro)
    if (!source) {
      const saved = (localStorage.getItem('ots_remote_src') || '').trim();
      if (isUrl(saved)) source = saved;
    }

    // 3) Si aún no hay, leemos 1.txt; si su contenido es URL, usamos esa URL
    let text;
    if (!source) {
      const localTxt = await fetchText('1.txt?v=' + Date.now());
      if (isUrl(localTxt.trim())) {
        source = localTxt.trim();
      } else {
        text = localTxt; // puede ser XML o texto manual
      }
    }

    // Si tenemos source remoto, lo descargamos
    if (source) {
      text = await fetchText(source + (source.includes('?') ? '&' : '?') + '_t=' + Date.now());
    }

    if (looksLikeXml(text)) {
      const parser = new DOMParser();
      tournamentData = parser.parseFromString(text, 'text/xml');

      const currentRoundNode = tournamentData.querySelector('CurrentRound');
      currentRound = parseInt(currentRoundNode?.textContent || '0', 10);
      document.getElementById('rondaInfo').textContent = `Ronda: ${currentRound}`;

      const msg = document.getElementById('mensajePersonalizado');
      if (msg) msg.style.display = 'none';

      // Asegura que tras cargar se dibuje la vista activa
      mostrarRondaTab();
    } else {
      // Texto plano / modo manual
      document.getElementById('rondaInfo').textContent = '';
      let msg = document.getElementById('mensajePersonalizado');
      if (!msg) {
        msg = document.createElement('div');
        msg.id = 'mensajePersonalizado';
        document.querySelector('.container').appendChild(msg);
      }
      msg.innerText = text;
      msg.style.display = '';
      document.getElementById('tableContainer').style.display = 'none';
      document.getElementById('historyContainer').style.display = 'none';
    }
  } catch (err) {
    console.error('Error al cargar torneo:', err);
    // En caso de error, mostramos mensaje y ocultamos vistas
    document.getElementById('rondaInfo').textContent = '';
    let msg = document.getElementById('mensajePersonalizado');
    if (!msg) {
      msg = document.createElement('div');
      msg.id = 'mensajePersonalizado';
      document.querySelector('.container').appendChild(msg);
    }
    msg.innerText = 'No se pudo cargar el torneo. Verifica la URL o el contenido de 1.txt.';
    msg.style.display = '';
    document.getElementById('tableContainer').style.display = 'none';
    document.getElementById('historyContainer').style.display = 'none';
  }
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
