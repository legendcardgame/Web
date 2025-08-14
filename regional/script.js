// script.js
let tournamentData = null;
let currentRound = null;

// Lee el archivo 1.txt
fetch('1.txt')
  .then(response => response.text())
  .then(str => {
    // ¿El archivo contiene el torneo?
    if (!str.includes('<Tournament>')) {
      // Muestra el texto libre del archivo
      document.getElementById('rondaInfo').textContent = '';
      document.getElementById('tableContainer').innerHTML = `
        <div class="aviso-previo">${str.replace(/\n/g, '<br>')}</div>
      `;
      // Oculta la barra de búsqueda si quieres (opcional)
      document.getElementById('searchID').style.display = 'none';
      // Oculta botones y demás si lo requieres
      document.getElementById('btnRonda').style.display = 'none';
      document.getElementById('btnHistorial').style.display = 'none';
      return;
    }

    // --------- Si el archivo SÍ es de torneo, sigue normal ----------
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
  const btnRonda = document.getElementById('btnRonda');
  const btnHistorial = document.getElementById('btnHistorial');
  const tableContainer = document.getElementById('tableContainer');
  const historyContainer = document.getElementById('historyContainer');
  const searchInput = document.getElementById('konamiId');

  btnRonda.addEventListener('click', () => {
    btnRonda.classList.add('active');
    btnHistorial.classList.remove('active');
    tableContainer.style.display = 'block';
    historyContainer.style.display = 'none';
  });

  btnHistorial.addEventListener('click', () => {
    btnHistorial.classList.add('active');
    btnRonda.classList.remove('active');
    tableContainer.style.display = 'none';
    historyContainer.style.display = 'block';
  });

  searchInput.addEventListener('input', () => {
    if (searchInput.value.length === 10) {
      buscarEmparejamientos();
    }
  });

  const savedId = localStorage.getItem('konamiId');
  if (savedId) {
    searchInput.value = savedId;
    buscarEmparejamientos();
  }
});
