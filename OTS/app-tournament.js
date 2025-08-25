let tournamentData = null;
let currentRound = 0;

const padId = s => String(s || '').replace(/\D/g,'').padStart(10,'0');

function activarBoton(id) {
  document.getElementById('btnRonda').classList.remove('active');
  document.getElementById('btnHistorial').classList.remove('active');
  document.getElementById(id).classList.add('active');
}

function getPlayerNodeById(id){
  return Array.from(tournamentData.querySelectorAll('TournPlayer'))
    .find(tp => padId(tp.querySelector('ID')?.textContent) === id) || null;
}
function getPlayerName(id){
  const n = getPlayerNodeById(id);
  if (!n) return '';
  return `${n.querySelector('FirstName')?.textContent || ''} ${n.querySelector('LastName')?.textContent || ''}`.trim();
}
function getPlayerStanding(id){
  const n = getPlayerNodeById(id);
  if (!n) return '-';
  const r = n.querySelector('Rank')?.textContent;
  return r ? parseInt(r,10) : '-';
}
function hayRondas(){
  return tournamentData && tournamentData.querySelectorAll('TournMatch').length > 0;
}

/* ---------------- RONDA ---------------- */
function mostrarRonda(){
  activarBoton('btnRonda');
  document.getElementById('historyContainer').style.display = 'none';
  document.getElementById('tableContainer').style.display = 'block';

  const raw = document.getElementById('searchID').value.trim();
  if (!raw || !tournamentData) { document.getElementById('tableContainer').innerHTML=''; return; }
  const id = padId(raw);
  localStorage.setItem('konamiId', id);

  const nombreJugador = getPlayerName(id);

  // Sin matches en el XML => “Ya inscrito”
  if (!hayRondas()){
    document.getElementById('tableContainer').innerHTML = `
      <div class="card-mesa">
        <div class="mesa-label">—</div>
        <div class="nombre-carta">${nombreJugador}<span class="konami-id">${id}</span></div>
        <div class="vs-label">Ya inscrito</div>
        <div class="nombre-carta abajo"><span class="konami-id">Ronda ${currentRound}</span></div>
      </div>`;
    return;
  }

  const matches = Array.from(tournamentData.querySelectorAll('TournMatch'));
  let mesa='', id1='', id2='', encontrado=false;
  for (const m of matches){
    const round = parseInt(m.querySelector('Round')?.textContent || '0',10);
    if (round !== currentRound) continue;
    const plist = m.querySelectorAll('Player');
    const mp1 = padId(plist[0]?.textContent || '');
    const mp2 = padId(plist[1]?.textContent || '');
    if (id === mp1 || id === mp2){
      encontrado = true;
      mesa = m.querySelector('Table')?.textContent || '';
      id1 = mp1; id2 = mp2;
      break;
    }
  }

  const ctn = document.getElementById('tableContainer');
  if (!encontrado){
    ctn.innerHTML = `
      <div class="card-mesa">
        <div class="nombre-carta">${nombreJugador}<span class="konami-id">${id}</span></div>
        <div class="vs-label">Ya inscrito</div>
        <div class="nombre-carta abajo"><span class="konami-id">Ronda ${currentRound}</span></div>
      </div>`;
    return;
  }

  ctn.innerHTML = `
    <div class="card-mesa">
      <div class="mesa-label">Mesa: ${mesa}</div>
      <div class="nombre-carta">${getPlayerName(id1)}<span class="konami-id">${id1}</span></div>
      <div class="vs-label">VS</div>
      <div class="nombre-carta abajo">${getPlayerName(id2)}<span class="konami-id">${id2}</span></div>
    </div>`;
}

/* --------------- HISTORIAL --------------- */
function mostrarHistorial(){
  activarBoton('btnHistorial');
  document.getElementById('tableContainer').style.display = 'none';
  document.getElementById('historyContainer').style.display = 'block';

  const raw = document.getElementById('searchID').value.trim();
  if (!raw || !tournamentData){ document.getElementById('historyContainer').innerHTML=''; return; }
  const id = padId(raw);
  localStorage.setItem('konamiId', id);

  if (!hayRondas()){
    document.getElementById('historyContainer').innerHTML = "<div class='card-mesa'>Sin historial aún</div>";
    return;
  }

  const matches = Array.from(tournamentData.querySelectorAll('TournMatch'));
  const historial=[];
  matches.forEach(m=>{
    const plist = m.querySelectorAll('Player');
    const p1 = padId(plist[0]?.textContent || '');
    const p2 = padId(plist[1]?.textContent || '');
    if (id!==p1 && id!==p2) return;
    const round = parseInt(m.querySelector('Round')?.textContent || '0',10);
    const winnerRaw = (m.querySelector('Winner')?.textContent || '').trim();
    const winner = winnerRaw ? padId(winnerRaw) : '';
    const opo = (id===p1)?p2:p1;
    let resultado = '';
    if (!winnerRaw || winnerRaw==='0') resultado = (round===currentRound)?'En curso':'Empate';
    else if (winner===id) resultado='Victoria';
    else if (winner===opo) resultado='Derrota';
    else resultado='Empate';
    historial.push({ ronda: round, resultado, nombreOponente: getPlayerName(opo) });
  });
  historial.sort((a,b)=>b.ronda-a.ronda);

  const cont = document.getElementById('historyContainer');
  if (!historial.length){ cont.innerHTML="<div class='card-mesa'>Sin historial aún</div>"; return; }

  let medal = '';
  const standing = getPlayerStanding(id);
  if (standing===1) medal='🥇';
  else if (standing===2) medal='🥈';
  else if (standing===3) medal='🥉';

  cont.innerHTML = `<div class="standing-container">Standing: ${standing}${medal? ' ' + medal : ''}</div>`;
  historial.forEach(({ronda,resultado,nombreOponente})=>{
    const color = resultado==='Victoria' ? 'win' : resultado==='Derrota' ? 'loss' : 'draw';
    cont.innerHTML += `
      <div class="historial-card ${color}">
        <div class="historial-bar"></div>
        <div class="historial-title ${color}">Ronda ${ronda} - ${resultado}</div>
        <div class="historial-vs">VS ${nombreOponente}</div>
      </div>`;
  });
}

/* --------------- BOOT --------------- */
fetch('1.txt').then(r=>r.text()).then(str=>{
  const xml = new DOMParser().parseFromString(str,'text/xml');
  tournamentData = xml;
  currentRound = parseInt(xml.querySelector('CurrentRound')?.textContent || '0', 10);
  const label = document.getElementById('rondaInfo');
  if (label) label.textContent = `Ronda: ${currentRound}`;
}).catch(()=>{
  const label = document.getElementById('rondaInfo');
  if (label) label.textContent = 'No se encontró el archivo de torneo.';
});

document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('btnRonda').onclick = mostrarRonda;
  document.getElementById('btnHistorial').onclick = mostrarHistorial;

  const lastId = localStorage.getItem('konamiId');
  if (lastId){
    document.getElementById('searchID').value = lastId;
    setTimeout(mostrarRonda, 300);
  }
  document.getElementById('searchID').addEventListener('input', ()=>{
    setTimeout(mostrarRonda, 200);
  });
});
