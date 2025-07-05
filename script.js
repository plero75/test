const lines = [
  { id: "rer-a", monitoringRef: "STIF:StopArea:SP:43135:", lineRef: "STIF:Line::C00001:" },
  { id: "bus-77", monitoringRef: "STIF:StopArea:SP:463641:", lineRef: "STIF:Line::C01777:" },
  { id: "bus-201", monitoringRef: "STIF:StopArea:SP:463644:", lineRef: "STIF:Line::C02101:" },
];

const proxyBase = "https://ratp-proxy.hippodrome-proxy42.workers.dev/?url=";

async function buildDashboard() {
  for (const line of lines) {
    const stopMonitoringUrl = proxyBase + encodeURIComponent(`https://prim.iledefrance-mobilites.fr/marketplace/stop-monitoring?MonitoringRef=${line.monitoringRef}`);
    const res = await fetch(stopMonitoringUrl);
    if (!res.ok) { console.error(`Erreur API stop-monitoring pour ${line.id}`); continue; }
    const data = await res.json();
    const visits = data.Siri.ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit || [];
    const directions = {};

    visits.forEach(v => {
      const dir = v.MonitoredVehicleJourney.DirectionRef.replace(/[:.]/g, "-") || "unk";
      if (!directions[dir]) directions[dir] = [];
      directions[dir].push(v);
    });

    for (const [dir, trips] of Object.entries(directions)) {
      const containerId = `${line.id}-${dir}`;
      const container = document.getElementById(containerId);
      if (!container) continue;
      container.innerHTML = ""; // reset

      trips.forEach(async trip => {
        const aimed = new Date(trip.MonitoredVehicleJourney.MonitoredCall.AimedDepartureTime);
        const expected = new Date(trip.MonitoredVehicleJourney.MonitoredCall.ExpectedDepartureTime);
        const diffMin = Math.round((expected - new Date()) / 60000);
        const dest = trip.MonitoredVehicleJourney.DestinationName;
        const jpRef = trip.MonitoredVehicleJourney.JourneyPatternRef;

        const stops = await fetchStopsForJourney(jpRef);
        const stopsText = stops ? stops.join(" ➔ ") : "Inconnu";

        const div = document.createElement("div");
        div.classList.add("passage");
        div.innerHTML = `🕒 ${expected.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} – ${dest} (dans ${diffMin} min)
        <div class="stops">Dessert : ${stopsText}</div>`;
        container.appendChild(div);
      });
    }
    fetchAndInjectTraffic(line.lineRef, line.id);
  }
}

async function fetchStopsForJourney(journeyPatternRef) {
  const jpUrl = proxyBase + encodeURIComponent(`https://prim.iledefrance-mobilites.fr/marketplace/journey-patterns/${journeyPatternRef}`);
  const res = await fetch(jpUrl);
  if (!res.ok) return null;
  const jpData = await res.json();
  return jpData.stopPoints?.map(sp => sp.name);
}

async function fetchAndInjectTraffic(lineRef, containerBaseId) {
  const trafficUrl = proxyBase + encodeURIComponent(`https://prim.iledefrance-mobilites.fr/marketplace/general-message?LineRef=${lineRef}`);
  const res = await fetch(trafficUrl);
  if (!res.ok) return;
  const data = await res.json();
  const messages = data.Siri.ServiceDelivery.GeneralMessageDelivery[0].InfoMessage || [];
  const now = new Date();

  for (const dir of ["up", "down"]) {
    const container = document.getElementById(`${containerBaseId}-${dir}`);
    if (!container) continue;

    messages.forEach(m => {
      const start = new Date(m.ValidityPeriod.StartTime);
      const end = new Date(m.ValidityPeriod.EndTime);
      if (now >= start && now <= end) {
        const alertDiv = document.createElement("div");
        alertDiv.classList.add("traffic-alert");
        alertDiv.textContent = `⚠️ ${m.Message.Text}`;
        container.appendChild(alertDiv);
      }
    });
  }
}

buildDashboard();
