// script.js complet avec gestion des retards, suppressions, directions, gares desservies, messages de perturbation, météo et Vélib

const stops = [
  {
    name: "Joinville-le-Pont",
    id: "STIF:StopArea:SP:43135:",
    line: "C01742",
    containerId: "joinville"
  },
  {
    name: "Hippodrome de Vincennes",
    id: "STIF:StopArea:SP:463641:",
    line: "C01219",
    containerId: "vincennes"
  },
  {
    name: "École du Breuil",
    id: "STIF:StopArea:SP:463644:",
    line: "C01219",
    containerId: "breuil"
  }
];

function fetchAndDisplay() {
  stops.forEach(stop => {
    fetchPassages(stop);
  });
  fetchWeather();
  fetchVelib();
}

async function fetchPassages(stop) {
  const url = `https://ratp-proxy.hippodrome-proxy42.workers.dev/?url=${encodeURIComponent(`https://prim.iledefrance-mobilites.fr/marketplace/stop-monitoring?MonitoringRef=${stop.id}`)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const visits = data.Siri.ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit;
    const block = document.getElementById(stop.containerId);
    if (!block) {
      console.error(`❌ Bloc introuvable pour containerId: ${stop.containerId}`);
      return;
    }

    block.innerHTML = `<h2>${stop.name}</h2>`;

    const grouped = {};
    visits.forEach(v => {
      const mvj = v.MonitoredVehicleJourney;
      const dir = mvj.DirectionRef || mvj.DestinationName?.[0]?.value || "inconnu";
      if (!grouped[dir]) grouped[dir] = [];
      grouped[dir].push({
        aimed: mvj.MonitoredCall?.AimedDepartureTime,
        expected: mvj.MonitoredCall?.ExpectedDepartureTime,
        status: mvj.MonitoredCall?.DepartureStatus,
        destination: mvj.DestinationName?.[0]?.value || mvj.DestinationName || "",
        stops: mvj.MonitoredCall?.StopPointRef,
        tripId: mvj.VehicleJourneyRef
      });
    });

    Object.keys(grouped).forEach(dir => {
      block.innerHTML += `<h3>${grouped[dir][0].destination}</h3>`;
      const grid = document.createElement("div");
      grid.className = "grid-passages";

      grouped[dir].slice(0, 4).forEach(p => {
        if (!p.aimed || !p.expected) return;

        const aimed = new Date(p.aimed);
        const expected = new Date(p.expected);
        const now = new Date();
        const diff = Math.round((expected - now) / 60000);
        const isDelayed = expected.getTime() !== aimed.getTime();
        const isCancelled = p.status === "cancelled";

        const timeStr = expected.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        let content = "";

        if (isCancelled) {
          content = `<div class='train-item cancelled'><s>${timeStr}</s><br>❌ supprimé</div>`;
        } else if (diff > 50) {
          content = `<div class='train-item'>${timeStr}</div>`;
        } else {
          let detail = diff <= 5 ? `⏱ <strong>${diff} min</strong>` : `⏳ ${diff} min`;
          content = `<div class='train-item${diff <= 5 ? " highlight" : ""}'>${timeStr}<br>${detail}</div>`;
        }

        grid.innerHTML += content;
      });

      block.appendChild(grid);
    });

    await fetchTrafficMessages(stop.line, block);
    await fetchStopsServed(stop.id, block);
  } catch (err) {
    console.error("Erreur API PRIM:", err);
  }
}

async function fetchTrafficMessages(lineId, container) {
  const url = `https://ratp-proxy.hippodrome-proxy42.workers.dev/?url=${encodeURIComponent(`https://prim.iledefrance-mobilites.fr/marketplace/general-message?LineRef=STIF:Line::${lineId}:`)}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    const messages = data?.Siri?.ServiceDelivery?.GeneralMessageDelivery?.[0]?.InfoMessage || [];

    messages.forEach(msg => {
      const shortMsg = msg.Content?.Message?.find(m => m.MessageType === "SHORT_MESSAGE");
      if (shortMsg) {
        const alertDiv = document.createElement("div");
        alertDiv.className = "alert";
        alertDiv.textContent = `⚠️ ${shortMsg.MessageText.value}`;
        container.appendChild(alertDiv);
      }
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des messages trafic :", error);
    const fallback = document.createElement("div");
    fallback.className = "alert";
    fallback.textContent = `ℹ️ Info trafic non chargée (à intégrer)`;
    container.appendChild(fallback);
  }
}

async function fetchStopsServed(monitoringRef, container) {
  const vehicleUrl = `https://ratp-proxy.hippodrome-proxy42.workers.dev/?url=${encodeURIComponent(`https://prim.iledefrance-mobilites.fr/marketplace/stop-monitoring?MonitoringRef=${monitoringRef}`)}`;
  try {
    const response = await fetch(vehicleUrl);
    const data = await response.json();
    const vehicleRef = data?.Siri?.ServiceDelivery?.StopMonitoringDelivery?.[0]?.MonitoredStopVisit?.[0]?.MonitoredVehicleJourney?.VehicleJourneyRef;
    if (!vehicleRef) return;

    const journeyUrl = `https://ratp-proxy.hippodrome-proxy42.workers.dev/?url=${encodeURIComponent(`https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia/vehicle_journeys/${vehicleRef}`)}`;
    const jRes = await fetch(journeyUrl);
    const jData = await jRes.json();
    const stopTimes = jData.vehicle_journeys?.[0]?.stop_times || [];

    const stopsList = stopTimes.map(s => s.stop_point.name).join(" – ");
    const stopsDiv = document.createElement("div");
    stopsDiv.className = "stops-scroller";
    stopsDiv.textContent = stopsList;
    container.appendChild(stopsDiv);
  } catch (error) {
    console.warn("Erreur lors de la récupération des arrêts desservis :", error);
  }
}

async function fetchWeather() {
  const container = document.getElementById("weather");
  if (!container) return;
  try {
    const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=48.83&longitude=2.44&current_weather=true");
    const data = await res.json();
    const weather = data.current_weather;
    container.innerHTML = `🌤 ${weather.temperature}°C – Vent ${weather.windspeed} km/h`;
  } catch (e) {
    container.innerHTML = "🌦 Météo indisponible";
  }
}

async function fetchVelib() {
  const container = document.getElementById("velib");
  if (!container) return;
  try {
    const res = await fetch("https://velib-metropole-opendata.smoove.pro/opendata/Velib_Metropole/station_information.json");
    const info = await res.json();
    const stationIds = ["12123", "12124"];
    const stations = info.data.stations.filter(s => stationIds.includes(s.station_id));
    container.innerHTML = stations.map(s => `🚲 ${s.name}`).join("<br>");
  } catch (e) {
    container.innerHTML = "🚲 Vélib indisponible";
  }
}

document.addEventListener("DOMContentLoaded", fetchAndDisplay);
