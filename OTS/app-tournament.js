let tournamentData = null;
let currentRound = null;

// ---------- Utilidades ----------
function padId(id) {
  return String(id).padStart(10, '0');
}
function qText(sel, ctx) {
  return (ctx.querySelector(sel)?.textContent || '').trim();
}
function findPlayerById(kid) {
  return Array.from(tournamentData.querySelectorAll('TournPlayer'))
    .find(tp => padId(qText('Player > ID', tp)) === kid) || null;
}
function buscarJugador(kid) {
  const player = findPlayerById(kid);
  if (!player) return null;
  const standing = player.querySelector('Rank') ? parseInt(qText('Rank', player), 10) : '-';
  const drop = (qText('DropReason', player).toLowerCase() || 'active') !== 'active';
  const nombre = `${qText('Player > FirstName', player)} ${qText('Player > LastName', player)}`.trim();
  return { nombre, standing, drop };
}
function buscarNombre(kid) {
  const player = findPlayerById(kid);
  return player ? `${qText('Player > FirstName', player)} ${qText('Player > LastName', player)}`.trim()
                : 'Oponente desconocido';
}

function activarBoton(id) {
  document.getElementById('btnRonda').classList.remove('active');
  document.getElementById('btnHistorial').classList.remove('active');
  document.getElementById(id).classList.add('active');
}

// ---------- Tarjeta “Ya inscrito” (sin clases nuevas) ----------
function tarjetaInscritoHTML(nombre, konamiId, ronda) {
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

// ---------- Mostrar ronda actual ----------
function mostrarRonda() {
  activarBoton('btnRonda');
  document.getElementById('historyContainer').style.display = "none";
  document.getElementById('tableContainer').style.display = "block";

  const inputRaw = document.getElementById('searchID').value.trim();
  const ctn = document.getElementById('tableContainer');

  if (!inputRaw || !tournamentData) {
    ctn.innerHTML = '';
    return;
  }

  const input = padId(inputRaw);
  localStorage.setItem('konamiId', input);

  // ¿Existe jugador?
  const jugador = buscarJugador(input);
  if (!jugador) {
    ctn.innerHTML = `<div class='card' style="padding:16px 10px"><div class='vs-label'>Konami ID no encontrado</div></div>`;
    return;
  }

  // Ronda actual
  const matches = Array.from(tournamentData.querySelectorAll('TournMatch'));
  let match = null, mesa = '', id1 = '', id2 = '';

  for (const m of matches) {
    const ps = m.querySelectorAll('Player');
    const mp1 = padId(qText('Player', ps[0] || m));
    const mp2 = padId(qText('Player', ps[1] || m));
    const round = parseInt(qText('Round', m) || '0', 10);
    if (round === currentRound && (input === mp1 || input === mp2)) {
      match = m; mesa = qText('Table', m);
      id1 = mp1; id2 = mp2;
      break;
    }
  }

  // Sin rondas o sin match aún → “Ya inscrito”
  if (!currentRound || currentRound === 0 || !match) {
    ctn.innerHTML = tarjetaInscritoHTML(jugador.nombre, input, currentRound || 0);
    return;
  }

  // Con emparejamiento → render mesa VS
  const nombre1 = buscarNombre(id1);
  const nombre2 = buscarNombre(id2);
  ctn.innerHTML = `
    <div class="mesa">MESA ${mesa}</div>
    <div class="card">
      <div class="linea-roja"></div>
        <div class="jugador">${nombre1}</div>
        <div class="konami">${id1}</div>
        <div class="vs-label">VS</div>
        <div class="oponente">${nombre2 || "BYE"}</div>
        <div class="konami-opo">${id2 || ""}</div>
      <div class="linea-azul"></div>
    </div>
  `;
}

// ---------- Mostrar historial ----------
function mostrarHistorial() {
  activarBoton('btnHistorial');
  document.getElementById('tableContainer').style.display = "none";
  document.getElementById('historyContainer').style.display = "block";

  const inputRaw = document.getElementById('searchID').value.trim();
  const container = document.getElementById('historyContainer');

  if (!inputRaw || !tournamentData) {
    container.innerHTML = '';
    return;
  }
  const input = padId(inputRaw);
  localStorage.setItem('konamiId', input);

  const player = buscarJugador(input);
  let standingHtml = '';
  if (player && player.standing > 0) {
    let medal = player.standing === 1 ? '🥇 ' : player.standing === 2 ? '🥈 ' : player.standing === 3 ? '🥉 ' : '';
    standingHtml = `<div class="standing-box">Standing:<br>${medal}${player.standing}</div>`;
  }

  // Arma historial
  const matches = Array.from(tournamentData.querySelectorAll('TournMatch'));
  let historial = [];
  for (const m of matches) {
    const ps = m.querySelectorAll('Player');
    const p1 = padId(qText('Player', ps[0] || m));
    const p2 = padId(qText('Player', ps[1] || m));
    const round = parseInt(qText('Round', m) || '0', 10);
    const winnerTxt = qText('Winner', m);
    const winner = winnerTxt ? padId(winnerTxt) : '';

    if (input === p1 || input === p2) {
      const oponente = input === p1 ? p2 : p1;
      const nombreOponente = buscarNombre(oponente);
      let resultado = 'Empate';
      if (!winnerTxt || winnerTxt === '0') {
        resultado = (round === currentRound) ? 'En curso' : 'Empate';
      } else if (winner === input) {
        resultado = 'Victoria';
      } else if (winner === oponente) {
        resultado = 'Derrota';
      }
      historial.push({ ronda: round, resultado, nombreOponente });
    }
  }
  historial.sort((a,b) => b.ronda - a.ronda);

  container.innerHTML = '';
  if (standingHtml) container.innerHTML += standingHtml;

  if (!historial.length) {
    if (player) {
      container.innerHTML += tarjetaInscritoHTML(player.nombre, input, currentRound || 0);
    } else {
      container.innerHTML += `<div class='card' style="padding:16px 10px"><div class='vs-label'>Konami ID no encontrado</div></div>`;
    }
    return;
  }

  for (const { ronda, resultado, nombreOponente } of historial) {
    const color =
      resultado === 'Victoria' ? 'result-win' :
      resultado === 'Derrota' ? 'result-loss' : 'result-draw';

    const card = document.createElement('div');
    card.className = 'historial-caja';
    card.innerHTML = `
      <div class="historial-barra ${color}"></div>
      <div class="contenido-historial">
        <div class="ronda-resultado">${`Ronda ${ronda} - ${resultado}`}</div>
        <div class="vs-nombre">VS ${nombreOponente}</div>
      </div>
    `;
    container.appendChild(card);
  }
}

// ---------- Init ----------
fetch('1.txt')
  .then(r => r.text())
  .then(str => {
    const parser = new DOMParser();
    tournamentData = parser.parseFromString(str, 'text/xml');
    currentRound = parseInt(qText('CurrentRound', tournamentData) || '0', 10);
    const label = document.getElementById('rondaInfo');
    if (label) label.textContent = `Ronda: ${currentRound}`;
  })
  .catch(() => {
    const label = document.getElementById('rondaInfo');
    if (label) label.textContent = 'No se encontró el archivo de torneo.';
  });

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnRonda').onclick = mostrarRonda;
  document.getElementById('btnHistorial').onclick = mostrarHistorial;

  const lastId = localStorage.getItem('konamiId');
  if (lastId) {
    document.getElementById('searchID').value = lastId;
    setTimeout(mostrarRonda, 300);
  }
  document.getElementById('searchID').addEventListener('input', () => {
    setTimeout(mostrarRonda, 200);
  });
});
