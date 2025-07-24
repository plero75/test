document.addEventListener("DOMContentLoaded", () => {
  const dynamicSpans = document.querySelectorAll(".dynamic-switch");
  setInterval(() => {
    dynamicSpans.forEach(span => {
      span.dataset.toggle = span.dataset.toggle === "delay" ? "countdown" : "delay";
      span.textContent = span.dataset.toggle === "delay" ? span.dataset.delay : span.dataset.countdown;
    });
  }, 3000);

  const endpoint = "https://ratp-proxy.hippodrome-proxy42.workers.dev/?url=https://prim.iledefrance-mobilites.fr/marketplace/stop-monitoring?MonitoringRef=STIF:StopArea:SP:43135:";
  fetch(endpoint)
    .then(res => res.json())
    .then(data => {
      const visits = data.Siri.ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit || [];
      const directions = {};

      visits.forEach(visit => {
        const mj = visit.MonitoredVehicleJourney;
        const dir = mj.DirectionName || mj.DirectionRef || "Direction inconnue";
        const aimed = new Date(mj.MonitoredCall.AimedDepartureTime);
        const expected = new Date(mj.MonitoredCall.ExpectedDepartureTime);
        const now = new Date();
        const delayMin = Math.round((expected - aimed) / 60000);
        const untilMin = Math.round((expected - now) / 60000);
        const line = mj.PublishedLineName;
        const stops = (mj.MonitoredCall.StopPointRef || "").split(":").pop();
        const stopName = mj.MonitoredCall.StopPointName || "Gare inconnue";
        const destinations = (mj.DestinationName || []).join(", ");
        const stopList = (mj.SituationRef ? [mj.SituationRef] : []).join(", ");

        const status = visit.MonitoredCall.DepartureStatus === "cancelled"
          ? "cancelled"
          : delayMin > 0 ? "delayed" : "onTime";

        if (!directions[dir]) directions[dir] = [];
        directions[dir].push({ line, aimed, expected, untilMin, delayMin, status, stopName, destinations });
      });

      const block = document.querySelector(".line-block");
      block.innerHTML = `<div class="header">🚇 RER A — Joinville-le-Pont</div>`;

      Object.entries(directions).forEach(([dirName, departures]) => {
        block.innerHTML += `<div class="direction">🧭 ${dirName}</div>`;
        departures.slice(0, 4).forEach(dep => {
          if (dep.status === "cancelled") {
            block.innerHTML += `<div class="cancelled fade">❌ Départ de ${dep.aimed.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} supprimé</div>`;
          } else {
            const aimedStr = dep.aimed.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
            const expectedStr = dep.expected.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
            const countdown = `⏳ dans ${dep.untilMin} min`;
            const delay = dep.delayMin > 0 ? `⚠️ Retard +${dep.delayMin} min` : "";
            const destinations = dep.destinations ? `→ ${dep.destinations}` : "";
            const row = `
              <div class="row fade">
                <span>🕐 ${dep.delayMin > 0 ? `<span class='crossed'>${aimedStr}</span> → ${expectedStr}` : expectedStr} ${destinations}</span>
                <span class="dynamic-switch" data-toggle="countdown" data-countdown="${countdown}" data-delay="${delay || countdown}">${countdown}</span>
                <span class="status">${dep.status === "onTime" ? "✅ À l'heure" : "⚠️ Retard"}</span>
              </div>`;
            block.innerHTML += row;
          }
        });
      });

      block.innerHTML += `<div class="alert">ℹ️ Info trafic non chargée (à intégrer)</div>`;
    })
    .catch(error => console.error("Erreur API PRIM:", error));
});
