let tournamentData = null;
let currentRound = null;

// Utilidades
function padId(id) {
  return String(id).padStart(10, '0');
}
function buscarJugador(kid) {
  // Busca el jugador en el xml
  const player = Array.from(tournamentData.querySelectorAll('TournPlayer')).find(tp => padId(tp.querySelector('ID')?.textContent) === kid);
  if (!player) return null;
  let standing = player.querySelector('Rank') ? parseInt(player.querySelector('Rank').textContent, 10) : '-';
  let drop = false;
  // Verifica si es drop, si hay un campo <DropReason> o similar y es diferente de 'Active'
  if (player.querySelector('DropReason') && player.querySelector('DropReason').textContent.trim().toLowerCase() !== 'active') drop = true;
  return {
    nombre: `${player.querySelector('FirstName')?.textContent || ''} ${player.querySelector('LastName')?.textContent || ''}`.trim(),
    standing,
    drop
  };
}
function buscarNombre(kid) {
  const player = Array.from(tournamentData.querySelectorAll('TournPlayer')).find(tp => padId(tp.querySelector('ID')?.textContent) === kid);
  if (!player) return 'Oponente desconocido';
  return `${player.querySelector('FirstName')?.textContent || ''} ${player.querySelector('LastName')?.textContent || ''}`.trim();
}

function activarBoton(id) {
  document.getElementById('btnRonda').classList.remove('active');
  document.getElementById('btnHistorial').classList.remove('active');
  document.getElementById(id).classList.add('active');
}

// Mostrar ronda actual
function mostrarRonda() {
  activarBoton('btnRonda');
  document.getElementById('historyContainer').style.display = "none";
  document.getElementById('tableContainer').style.display = "block";
  const inputRaw = document.getElementById('searchID').value.trim();
  if (!inputRaw || !tournamentData) {
    document.getElementById('tableContainer').innerHTML = '';
    return;
  }
  localStorage.setItem('konamiId', inputRaw);
  const input = padId(inputRaw);
  const matches = Array.from(tournamentData.querySelectorAll('TournMatch'));
  let match = null;
  let mesa = '';
  let p1 = '', p2 = '', id1 = '', id2 = '';
  matches.forEach(m => {
    const mp1 = padId(m.querySelectorAll('Player')[0]?.textContent || "");
    const mp2 = padId(m.querySelectorAll('Player')[1]?.textContent || "");
    const round = parseInt(m.querySelector('Round')?.textContent || "0", 10);
    if (round === currentRound && (input === mp1 || input === mp2)) {
      match = m;
      mesa = m.querySelector('Table')?.textContent || '';
      id1 = mp1; id2 = mp2;
    }
  });
  const ctn = document.getElementById('tableContainer');
  if (!match) {
    ctn.innerHTML = `<div class='card-mesa'>No se encontró el Konami ID en la ronda.</div>`;
    return;
  }
  // Nombres y IDs
  const nombre1 = buscarNombre(id1);
  const nombre2 = buscarNombre(id2);
  // Render
  ctn.innerHTML = `
    <div class="card-mesa">
      <div class="mesa-label">Mesa: ${mesa}</div>
      <div class="nombre-carta">${nombre1}<span class="konami-id">${id1}</span></div>
      <div class="vs-label">VS</div>
      <div class="nombre-carta abajo">${nombre2}<span class="konami-id">${id2}</span></div>
    </div>
  `;
}

// Mostrar historial
function mostrarHistorial() {
  activarBoton('btnHistorial');
  document.getElementById('tableContainer').style.display = "none";
  document.getElementById('historyContainer').style.display = "block";
  const inputRaw = document.getElementById('searchID').value.trim();
  if (!inputRaw || !tournamentData) {
    document.getElementById('historyContainer').innerHTML = '';
    return;
  }
  localStorage.setItem('konamiId', inputRaw);
  const input = padId(inputRaw);

  const player = buscarJugador(input);
  // Standing actual
  let standingHtml = '';
  if (player && player.standing > 0) {
    let medal = "";
    if (player.standing === 1) medal = "🥇 ";
    else if (player.standing === 2) medal = "🥈 ";
    else if (player.standing === 3) medal = "🥉 ";
    standingHtml = `<div class="standing-container">Standing: ${medal}${player.standing}º${player.drop ? " - Drop" : ""}</div>`;
  }

  // Historial
  const matches = Array.from(tournamentData.querySelectorAll('TournMatch'));
  let historial = [];
  matches.forEach(m => {
    const p1 = padId(m.querySelectorAll('Player')[0]?.textContent || "");
    const p2 = padId(m.querySelectorAll('Player')[1]?.textContent || "");
    const round = parseInt(m.querySelector('Round')?.textContent || "0", 10);
    const winner = padId(m.querySelector('Winner')?.textContent || "");
    if (input === p1 || input === p2) {
      const oponenteId = input === p1 ? p2 : p1;
      const nombreOponente = buscarNombre(oponenteId);
      let resultado = "Empate";
      if (winner === input) resultado = "Victoria";
      else if (winner === oponenteId) resultado = "Derrota";
      let color = resultado === "Victoria" ? "win" : resultado === "Derrota" ? "loss" : "draw";
      historial.push({ ronda: round, resultado, nombreOponente, color });
    }
  });
  historial.sort((a, b) => b.ronda - a.ronda);

  // Render historial
  const container = document.getElementById('historyContainer');
  container.innerHTML = '';
  if (standingHtml) container.innerHTML += standingHtml;
  if (!historial.length) {
    container.innerHTML += "<div class='card-mesa'>No se encontró el Konami ID.</div>";
    return;
  }
  historial.forEach(({ ronda, resultado, nombreOponente, color }) => {
    const card = document.createElement("div");
    card.className = `historial-card ${color}`;
    const bar = document.createElement("div");
    bar.className = "historial-bar";
    card.appendChild(bar);

    // Primera línea
    const titulo = document.createElement("div");
    titulo.className = `historial-title ${color}`;
    titulo.innerHTML = `Ronda ${ronda} - ${resultado}`;
    card.appendChild(titulo);

    // Segunda línea
    const vs = document.createElement("div");
    vs.className = "historial-vs";
    vs.innerHTML = `VS ${nombreOponente}`;
    card.appendChild(vs);

    container.appendChild(card);
  });
}

// ====== INICIALIZACION ======

fetch('1.txt')
  .then(response => response.text())
  .then(str => {
    const parser = new DOMParser();
    const xml = parser.parseFromString(str, 'text/xml');
    tournamentData = xml;

    const currentRoundNode = tournamentData.querySelector('CurrentRound');
    currentRound = parseInt(currentRoundNode?.textContent || "0", 10);

    const label = document.getElementById('rondaInfo');
    if (label) label.textContent = `Ronda: ${currentRound}`;
  })
  .catch(() => {
    const label = document.getElementById('rondaInfo');
    if (label) label.textContent = 'No se encontró el archivo de torneo.';
  });

document.addEventListener('DOMContentLoaded', () => {
  // Navegación de pestañas
  document.getElementById('btnRonda').onclick = mostrarRonda;
  document.getElementById('btnHistorial').onclick = mostrarHistorial;

  // Buscar automático si hay ID
  const lastId = localStorage.getItem('konamiId');
  if (lastId) {
    document.getElementById('searchID').value = lastId;
    setTimeout(mostrarRonda, 300);
  }
  document.getElementById('searchID').addEventListener('input', e => {
    setTimeout(mostrarRonda, 200);
  });
});
