// Proxy de contournement pour l'API RATP/IDFM
const proxyBase = 'https://ratp-proxy.hippodrome-proxy42.workers.dev';

// Liste des arrêts que nous souhaitons suivre. Chaque objet contient l'ID SIRI (StopArea),
// le nom de la station et les codes de lignes à afficher.
const stops = [
  {
    // Joinville‑le‑Pont : utiliser l'identifiant de zone (StopArea)
    id: 'STIF:StopArea:SP:43135:',
    name: 'Joinville-le-Pont',
    lines: ['C02251', 'C01130', 'C01135', 'C01137', 'C01139', 'C01141', 'C01219', 'C01260', 'C01399']
  },
  {
    // Hippodrome de Vincennes : utiliser l'identifiant de zone du bus 77
    id: 'STIF:StopArea:SP:463641:',
    name: 'Hippodrome de Vincennes',
    lines: ['C02251']
  },
  {
    // École du Breuil : utiliser l'identifiant de zone desservie par 77 et 201
    id: 'STIF:StopArea:SP:463644:',
    name: 'École du Breuil',
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
 * Cache local pour stocker la liste des arrêts par ligne afin d'éviter des appels répétés.
 */
const lineStopsCache = {};

/**
 * Retourne le nom d'un arrêt à partir de son identifiant SIRI (StopPointRef) en interrogeant
 * le jeu de données Opendatasoft "Périmètre des données temps réel…". Si le nom n'est pas trouvé,
 * renvoie l'identifiant brut.
 * @param {string} stopPointRef
 * @returns {Promise<string>}
 */
async function getStopName(stopPointRef) {
  try {
    const odsEndpoint =
      `https://data.opendatasoft.com/api/explore/v2.1/catalog/datasets/` +
      `perimetre-des-donnees-temps-reel-disponibles-sur-la-plateforme-dechanges-stif@datailedefrance/records` +
      `?where=ns2_stoppointref%3D%22${encodeURIComponent(stopPointRef)}%22` +
      `&select=ns2_stopname&limit=1`;
    const url = `${proxyBase}/?url=${encodeURIComponent(odsEndpoint)}`;
    const res = await fetch(url);
    const json = await res.json();
    const results = json.results || [];
    if (results.length > 0 && results[0].ns2_stopname) {
      return results[0].ns2_stopname;
    }
  } catch {
    /* ignore */
  }
  return stopPointRef;
}

/**
 * Récupère la liste des arrêts desservis pour une ligne à partir de l'endpoint estimated-timetable.
 * Stocke les résultats en cache par identifiant de ligne pour éviter des requêtes répétées.
 * @param {string} lineRef valeur complète de type "STIF:Line::Cxxxxx:"
 * @returns {Promise<string[]>} Liste des noms des arrêts desservis
 */
async function getStopsForLine(lineRef) {
  if (lineStopsCache[lineRef]) return lineStopsCache[lineRef];
  const endpoint = `https://prim.iledefrance-mobilites.fr/marketplace/estimated-timetable?LineRef=${encodeURIComponent(lineRef)}`;
  const url = `${proxyBase}/?url=${encodeURIComponent(endpoint)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const deliveries =
      data.Siri?.ServiceDelivery?.EstimatedTimetableDelivery?.[0]?.EstimatedJourneyVersionFrame || [];
    if (deliveries.length > 0) {
      const journeys = deliveries[0].EstimatedVehicleJourney || [];
      if (journeys.length > 0) {
        const calls = journeys[0].EstimatedCalls?.EstimatedCall || [];
        const names = [];
        for (const call of calls) {
          const ref = call.StopPointRef?.value;
          if (!ref) continue;
          const name = await getStopName(ref);
          names.push(name);
        }
        lineStopsCache[lineRef] = names;
        return names;
      }
    }
  } catch {
    /* ignore */
  }
  lineStopsCache[lineRef] = [];
  return [];
}

/**
 * Construit l'interface pour toutes les stations définies dans `stops`.
 * Les passages sont regroupés par destination (sens) ; on affiche
 * quatre prochains départs, et pour le premier départ de chaque sens
 * la liste des gares desservies est affichée.
 */
async function buildDashboard() {
  dashboard.innerHTML = '';
  for (const stop of stops) {
    const data = await fetchData(stop);

    // Crée un conteneur pour cette station
    const block = document.createElement('div');
    block.className = 'station';
    block.innerHTML = `<h2>${stop.name}</h2>`;

    // Groupe les visites par destination (direction) et filtre selon les lignes autorisées
    const grouped = {};
    data.forEach(v => {
      const lineCode = v.MonitoredVehicleJourney.LineRef.value.split(':').pop();
      if (!stop.lines.includes(lineCode)) return;
      const destination =
        v.MonitoredVehicleJourney.DestinationName?.[0]?.value || 'Destination';
      if (!grouped[destination]) grouped[destination] = [];
      grouped[destination].push(v);
    });

    // Pour chaque direction, afficher jusqu'à 4 prochains départs
    for (const [destination, visits] of Object.entries(grouped)) {
      const dirSection = document.createElement('div');
      dirSection.className = 'direction';
      dirSection.innerHTML = `<h3>Direction : ${destination}</h3>`;

      visits.slice(0, 4).forEach(async (v, idx) => {
        const aimed = v.MonitoredVehicleJourney.MonitoredCall.AimedDepartureTime;
        const departureDate = new Date(aimed);
        const timeStr = departureDate.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        });
        const mins = Math.round((departureDate - new Date()) / 60000);
        const statusClass = getStatusClass(mins);
        const lineCode = v.MonitoredVehicleJourney.LineRef.value.split(':').pop();

        // Statut de départ
        const depStatus = v.MonitoredVehicleJourney.MonitoredCall.DepartureStatus;
        let timeBoxClass = statusClass;
        let timeBoxContent;
        if (depStatus && depStatus.toLowerCase() === 'cancelled') {
          timeBoxClass = 'cancelled';
          timeBoxContent = '❌ Supprimé';
        } else {
          timeBoxContent = `${timeStr} ⏱ ${mins} min`;
        }

        // Élément pour l'affichage de la ligne et de l'heure
        const lineBlock = document.createElement('div');
        lineBlock.className = 'line-block';
        lineBlock.innerHTML = `
          <img src="icons/${lineCode}.png" width="30" alt="Ligne ${lineCode}"/>
          <div class="time-box ${timeBoxClass}">${timeBoxContent}</div>
        `;
        dirSection.appendChild(lineBlock);

        // Pour le premier passage de cette direction, afficher la liste des gares desservies
        if (idx === 0) {
          const fullLineRef = v.MonitoredVehicleJourney.LineRef.value;
          try {
            const stopsList = await getStopsForLine(fullLineRef);
            if (stopsList && stopsList.length > 0) {
              const stopsDiv = document.createElement('div');
              stopsDiv.className = 'stops-list';
              stopsDiv.innerHTML =
                `<details><summary>Gares desservies</summary><ul>` +
                stopsList.map(name => `<li>${name}</li>`).join('') +
                `</ul></details>`;
              dirSection.appendChild(stopsDiv);
            }
          } catch {
            /* ignore les erreurs */
          }
        }
      });

      block.appendChild(dirSection);
    }
    dashboard.appendChild(block);
  }
}

/**
 * Récupère la météo actuelle et met à jour l’élément #weather.
 */
async function fetchWeather() {
  try {
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=48.847&longitude=2.439&current_weather=true'
    );
    const data = await res.json();
    document.getElementById('weather').innerText = `🌤 ${data.current_weather.temperature}°C`;
  } catch {
    document.getElementById('weather').innerText = '🌤 --°C';
  }
}

/**
 * Récupère les titres des actualités et met à jour l’élément #newsTicker.
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
  } catch {
    document.getElementById('newsTicker').innerText = '';
  }
}

/**
 * Fonction d’initialisation : lance le tableau de bord, la météo et les news,
 * puis programme les rafraîchissements périodiques.
 */
function init() {
  buildDashboard();
  fetchWeather();
  fetchNews();
  setInterval(buildDashboard, 60 * 1000);
  setInterval(fetchWeather, 30 * 60 * 1000);
  setInterval(fetchNews, 5 * 60 * 1000);
}

document.addEventListener('DOMContentLoaded', init);

