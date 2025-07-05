function simulatePassages(id) {
  const now = new Date();
  const container = document.getElementById(id);
  let content = '';
  for (let i = 0; i < 4; i++) {
    const minutes = Math.floor(Math.random() * 20) + 1;
    content += `<div>🕒 Passage dans ${minutes} min</div>`;
  }
  container.innerHTML = content;
}

function simulateAlert(id) {
  const container = document.getElementById(id);
  if (Math.random() < 0.2) { // 20% chance of alert
    container.innerHTML = '⚠️ Perturbation : Retards possibles.';
  } else {
    container.innerHTML = '';
  }
}

function simulateVelib() {
  const container = document.getElementById('velib-status');
  const bikes = Math.floor(Math.random() * 20);
  const docks = Math.floor(Math.random() * 20);
  container.innerHTML = `Station Joinville : 🚲 ${bikes} vélos / 🅿️ ${docks} places libres`;
}

function simulateTraffic() {
  const container = document.getElementById('traffic-status');
  const status = ['Fluide', 'Dense', 'Bouchons', 'Incident en cours'];
  const randomStatus = status[Math.floor(Math.random() * status.length)];
  container.innerHTML = `A86 & Périph : ${randomStatus}`;
}

function simulateWeather() {
  const container = document.getElementById('weather-info');
  const temp = 15 + Math.floor(Math.random() * 10);
  const conditions = ['Ensoleillé', 'Nuageux', 'Pluie', 'Orages'];
  const condition = conditions[Math.floor(Math.random() * conditions.length)];
  container.innerHTML = `${temp}°C - ${condition}`;
}

function updateDashboard() {
  simulatePassages('rer-a-passages');
  simulatePassages('bus-77-passages');
  simulatePassages('bus-201-passages');
  simulateAlert('rer-a-alert');
  simulateAlert('bus-77-alert');
  simulateAlert('bus-201-alert');
  simulateVelib();
  simulateTraffic();
  simulateWeather();
}

updateDashboard();
setInterval(updateDashboard, 30000); // refresh every 30s
