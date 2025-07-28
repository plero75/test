// Proxy de contournement pour l'API RATP/IDFM
const proxyBase = 'https://ratp-proxy.hippodrome-proxy42.workers.dev';

// Liste des arrêts à suivre
const stops = [
  {
    id: 'STIF:StopArea:SP:43135:',
    name: 'Joinville-le-Pont',
    lines: ['C02251', 'C01219']
  },
  {
    id: 'STIF:StopArea:SP:463641:',
    name: 'Hippodrome de Vincennes',
    lines: ['C02251']
  },
  {
    id: 'STIF:StopArea:SP:463644:',
    name: 'École du Breuil',
    lines: ['C01219', 'C02251']
  }
];

const dashboard = document.getElementById('dashboard');

async function fetchData(stop) {
  const endpoint = `https://prim.iledefrance-mobilites.fr/marketplace/stop-monitoring?MonitoringRef=${stop.id}`;
  const url = `${proxyBase}/?url=${encodeURIComponent(endpoint)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    localStorage.setItem(`stop-${stop.id}`, JSON.stringify(data));
    return data.Siri.ServiceDelivery.StopMonitoringDelivery?.[0].MonitoredStopVisit || [];
  } catch (e) {
    const cached = localStorage.getItem(`stop-${stop.id}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      return parsed.Siri.ServiceDelivery.StopMonitoringDelivery?.[0].MonitoredStopVisit || [];
    }
    return [];
  }
}

function getStatusClass(mins) {
  if (mins < 5) return 'imminent';
  if (mins < 15) return 'delayed';
  return 'late';
}

const lineStopsCache = {};

async function buildDashboard() {
  dashboard.innerHTML = '';
  for (const stop of stops) {
    const data = await fetchData(stop);
    console.log(`📡 Données reçues pour ${stop.name}:`, data);

    const block = document.createElement('div');
    block.className = 'station';
    block.innerHTML = `<h2>${stop.name}</h2><p><em>${data.length} passages détectés</em></p>`;

    const grouped = {};
    data.forEach(v => {
      const lineCodeMatch = v.MonitoredVehicleJourney.LineRef.value.match(/C\d{5}/);
      const lineCode = lineCodeMatch ? lineCodeMatch[0] : 'UNKNOWN';
      if (!stop.lines.includes(lineCode)) return;

      const dest = v.MonitoredVehicleJourney.DestinationName?.[0]?.value || 'Destination inconnue';
      if (!grouped[dest]) grouped[dest] = [];
      grouped[dest].push(v);
    });

    for (const [destination, visits] of Object.entries(grouped)) {
      const dirSection = document.createElement('div');
      dirSection.className = 'direction';
      dirSection.innerHTML = `<h3>Direction : ${destination}</h3>`;

      visits.slice(0, 4).forEach((v, idx) => {
        const aimed = v.MonitoredVehicleJourney.MonitoredCall.AimedDepartureTime;
        const departureDate = new Date(aimed);
        const timeStr = departureDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const mins = Math.round((departureDate - new Date()) / 60000);
        const statusClass = getStatusClass(mins);

        const depStatus = v.MonitoredVehicleJourney.MonitoredCall.DepartureStatus;
        let timeBoxClass = statusClass;
        let timeBoxContent;
        if (depStatus && depStatus.toLowerCase() === 'cancelled') {
          timeBoxClass = 'cancelled';
          timeBoxContent = '❌ Supprimé';
        } else {
          timeBoxContent = `${timeStr} ⏱ ${mins} min`;
        }

        const lineCodeMatch = v.MonitoredVehicleJourney.LineRef.value.match(/C\d{5}/);
        const lineCode = lineCodeMatch ? lineCodeMatch[0] : 'UNKNOWN';

        const lineBlock = document.createElement('div');
        lineBlock.className = 'line-block';
        lineBlock.innerHTML = `
          <img src="icons/${lineCode}.png" width="30" alt="Ligne ${lineCode}" />
          <div class="time-box ${timeBoxClass}">${timeBoxContent}</div>
        `;
        dirSection.appendChild(lineBlock);
      });

      block.appendChild(dirSection);
    }

    dashboard.appendChild(block);
  }
}

async function fetchWeather() {
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=48.847&longitude=2.439&current_weather=true');
    const data = await res.json();
    document.getElementById('weather').innerText = `🌤 ${data.current_weather.temperature}°C`;
  } catch {
    document.getElementById('weather').innerText = '🌤 --°C';
  }
}

async function fetchNews() {
  try {
    const rssUrl = 'https://www.francetvinfo.fr/titres.rss';
    const url = `${proxyBase}/?url=${encodeURIComponent(rssUrl)}`;
    const res = await fetch(url);
    const xmlText = await res.text();
    const rss = new DOMParser().parseFromString(xmlText, 'text/xml');
    const items = rss.querySelectorAll('item');
    const titles = Array.from(items).slice(0, 5).map(el => el.querySelector('title').textContent.trim()).join(' • ');
    document.getElementById('newsTicker').innerText = titles;
  } catch (e) {
    console.error('🛑 Erreur flux RSS :', e);
    document.getElementById('newsTicker').innerText = '';
  }
}

function init() {
  buildDashboard();
  fetchWeather();
  fetchNews();
  setInterval(buildDashboard, 60000);
  setInterval(fetchWeather, 30 * 60 * 1000);
  setInterval(fetchNews, 5 * 60 * 1000);
}

document.addEventListener('DOMContentLoaded', init);
