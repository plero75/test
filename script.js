// Proxy de contournement pour l'API RATP/IDFM
const proxyBase = 'https://ratp-proxy.hippodrome-proxy42.workers.dev';

// Liste des arrêts que nous souhaitons suivre. Chaque objet contient l'ID IDFM, le nom de la station et
// les codes de lignes à afficher.
const stops = [
  {
    id: 'IDFM:70640',
    name: 'Joinville-le-Pont',
    // Affiche toutes les lignes demandées pour Joinville‑le‑Pont
    lines: ['C02251', 'C01130', 'C01135', 'C01137', 'C01139', 'C01141', 'C01219', 'C01260', 'C01399']
  },
  {
    id: 'IDFM:463642',
    name: 'Hippodrome de Vincennes',
    lines: ['C02251']
  },
  {
    id: 'IDFM:463645',
    name: 'École du Breuil',
    // Ajout des lignes 77 (C02251) et 201 (C01219)
    lines: ['C01219', 'C02251']
  }
];

// Élément principal où sera construit le tableau de bord.
const dashboard = document.getElementById('dashboard');

/**
 * Récupère les passages pour un arrêt donné via l'API PRIM. Utilise localStorage
 * comme cache de secours en cas d'échec de la requête réseau.
 * @param {{id:string,name:string,lines:string[]}} stop
 * @returns {Promise<Array>} liste des visites surveillées
 */
async function fetchData(stop) {
  const endpoint = `https://prim.iledefrance-mobilites.fr/marketplace/stop-monitoring?MonitoringRef=${stop.id}`;
  const url = `${proxyBase}/?url=${encodeURIComponent(endpoint)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    // mise en cache des données pour cet arrêt
    localStorage.setItem(`stop-${stop.id}`, JSON.stringify(data));
    return (
      data.Siri.ServiceDelivery.StopMonitoringDelivery?.[0]
        .MonitoredStopVisit || []
    );
  } catch (e) {
    // si la requête échoue, tente de lire le cache
    const cached = localStorage.getItem(`stop-${stop.id}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      return (
        parsed.Siri.ServiceDelivery.StopMonitoringDelivery?.[0]
          .MonitoredStopVisit || []
      );
    }
    return [];
  }
}

/**
 * Calcule la classe CSS à appliquer en fonction du nombre de minutes restantes avant le départ.
 * @param {number} mins
 */
function getStatusClass(mins) {
  if (mins < 5) return 'imminent';
  if (mins < 15) return 'delayed';
  return 'late';
}

/**
 * Construit l'interface pour toutes les stations définies dans `stops`.
 */
async function buildDashboard() {
  dashboard.innerHTML = '';
  for (const stop of stops) {
    const data = await fetchData(stop);

    // bloc station
    const block = document.createElement('div');
    block.className = 'station';
    block.innerHTML = `<h2>${stop.name}</h2>`;

    // Filtre les visites en fonction des codes de ligne définis pour cette station
    const filtered = data.filter(v => {
      const lineCode = v.MonitoredVehicleJourney.LineRef.value
        .split(':')
        .pop();
      return stop.lines.includes(lineCode);
    });

    // Affiche jusqu'à 4 prochains passages parmi les lignes sélectionnées
    filtered.slice(0, 4).forEach(v => {
      const aimed = v.MonitoredVehicleJourney.MonitoredCall.AimedDepartureTime;
      const departureDate = new Date(aimed);
      const timeStr = departureDate.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
      const mins = Math.round((departureDate - new Date()) / 60000);
      const statusClass = getStatusClass(mins);
      const lineCode = v.MonitoredVehicleJourney.LineRef.value
        .split(':')
        .pop();

      const lineBlock = document.createElement('div');
      lineBlock.className = 'line-block';
      // Image d’icône : on suppose que des fichiers PNG sont disponibles dans un dossier "icons" nommé selon le code de ligne
      lineBlock.innerHTML = `
        <img src="icons/${lineCode}.png" width="30" alt="Ligne ${lineCode}"/>
        <div class="time-box ${statusClass}">${timeStr} ⏱ ${mins} min</div>
      `;
      block.appendChild(lineBlock);
    });

    dashboard.appendChild(block);
  }
}

/**
 * Récupère les données météo actuelles et met à jour l'élément avec l'id "weather".
 */
async function fetchWeather() {
  try {
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=48.847&longitude=2.439&current_weather=true'
    );
    const data = await res.json();
    document.getElementById('weather').innerText =
      `🌤 ${data.current_weather.temperature}°C`;
  } catch (e) {
    document.getElementById('weather').innerText = '🌤 --°C';
  }
}

/**
 * Récupère les titres des actualités depuis franceinfo et met à jour le ticker d’actualité.
 */
async function fetchNews() {
  try {
    const rssUrl = 'https://www.francetvinfo.fr/titres.rss';
    const url = `${proxyBase}/?url=${encodeURIComponent(rssUrl)}`;
    const res = await fetch(url);
    const xmlText = await res.text();
    const rss = new DOMParser().parseFromString(xmlText, 'text/xml');
    const items = rss.querySelectorAll('item');
    const titles = Array.from(items)
      .slice(0, 5)
      .map(el => el.querySelector('title').textContent.trim())
      .join(' • ');
    document.getElementById('newsTicker').innerText = titles;
  } catch (e) {
    document.getElementById('newsTicker').innerText = '';
  }
}

/**
 * Fonction d’initialisation appelée lors du chargement du DOM.
 * Lance immédiatement un premier affichage et programme les mises à jour périodiques.
 */
function init() {
  buildDashboard();
  fetchWeather();
  fetchNews();
  // Rafraîchissement des données toutes les minutes pour les horaires de transport
  setInterval(buildDashboard, 60 * 1000);
  // Rafraîchissement de la météo toutes les 30 minutes
  setInterval(fetchWeather, 30 * 60 * 1000);
  // Rafraîchissement des actualités toutes les 5 minutes
  setInterval(fetchNews, 5 * 60 * 1000);
}

document.addEventListener('DOMContentLoaded', init);
