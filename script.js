const proxy = 'https://ratp-proxy.hippodrome-proxy42.workers.dev/?url=';

// Arrêts par station
const stops = {
  'Joinville-le-Pont': {
    id: 'STIF:StopArea:SP:43135:',
    lines: ['C01742', 'C02251', 'C01130', 'C01135', 'C01137', 'C01139', 'C01141', 'C01219', 'C01260', 'C01399']
  },
  'Hippodrome de Vincennes': {
    id: 'STIF:StopArea:SP:463641:',
    lines: ['C02251']
  },
  'École du Breuil': {
    id: 'STIF:StopArea:SP:463644:',
    lines: ['C02251', 'C01219']
  }
};

// Affichage météo (simple exemple via open-meteo)
async function fetchWeather() {
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=48.821&longitude=2.435&current_weather=true');
    const data = await res.json();
    const weather = data.current_weather;
    document.getElementById('meteo').innerText = `🌤 ${weather.temperature}°C – Vent ${weather.windspeed} km/h`;
  } catch (e) {
    document.getElementById('meteo').innerText = `⚠️ Météo indisponible`;
  }
}

// Appel API PRIM
async function fetchDepartures(stopId) {
  const url = `https://prim.iledefrance-mobilites.fr/marketplace/stop-monitoring?MonitoringRef=${stopId}`;
  const response = await fetch(proxy + encodeURIComponent(url));
  const data = await response.json();
  return data.Siri?.ServiceDelivery?.StopMonitoringDelivery[0];
}

// Formatage heure
function formatHeure(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
}

function minutesRestantes(dateStr) {
  const diff = (new Date(dateStr) - new Date()) / 60000;
  return Math.round(diff);
}

// Affichage d’une station
function renderStation(stationName, deliveries, linesFilter = []) {
  const container = document.getElementById(stationName);
  container.innerHTML = `<h2>${stationName}</h2>`;

  const lignes = {};

  deliveries?.MonitoredStopVisit?.forEach(visit => {
    const line = visit.MonitoredVehicleJourney?.LineRef?.value?.split(':').pop();
    if (linesFilter.length && !linesFilter.includes(line)) return;

    const destination = visit.MonitoredVehicleJourney.DestinationName?.value || '';
    const aimed = visit.MonitoredVehicleJourney.MonitoredCall.AimedDepartureTime;
    const delay = visit.MonitoredVehicleJourney.MonitoredCall.DepartureStatus;
    const mins = minutesRestantes(aimed);
    const heure = formatHeure(aimed);

    const label = `Ligne ${line} → ${destination}`;
    if (!lignes[label]) lignes[label] = [];

    lignes[label].push({ heure, mins, delay });
  });

  Object.entries(lignes).forEach(([label, passages]) => {
    const section = document.createElement('div');
    section.className = 'line-block';
    section.innerHTML = `<div class="line-title">${label}</div>`;

    const grid = document.createElement('div');
    grid.className = 'grid';

    passages.slice(0, 4).forEach(p => {
      const div = document.createElement('div');
      div.className = 'passage';
      if (p.delay === 'cancelled') div.classList.add('cancelled');
      else if (p.mins <= 5) div.classList.add('highlight');
      else if (p.mins > 50 || p.mins < 0) div.classList.add('late');

      div.innerHTML = p.delay === 'cancelled'
        ? `❌ Supprimé`
        : `${p.heure}<br><small>${p.mins} min</small>`;
      grid.appendChild(div);
    });

    section.appendChild(grid);
    container.appendChild(section);
  });

  deliveries?.GeneralMessage?.forEach(msg => {
    const alert = document.createElement('div');
    alert.className = 'alert';
    alert.innerText = '⚠️ ' + msg?.InfoMessage?.[0]?.value;
    container.appendChild(alert);
  });
}

// Boucle principale
async function renderAll() {
  await fetchWeather();

  for (const [station, {id, lines}] of Object.entries(stops)) {
    try {
      const data = await fetchDepartures(id);
      renderStation(station, data, lines);
    } catch (e) {
      document.getElementById(station).innerHTML = `<h2>${station}</h2><p>⚠️ Erreur de données</p>`;
    }
  }
}

// Lancer
renderAll();
setInterval(renderAll, 30000);
