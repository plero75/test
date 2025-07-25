const monitoringRefs = {
  joinville: {
    name: "Joinville-le-Pont",
    refs: ["STIF:StopArea:SP:43135:"]
  },
  hippodrome: {
    name: "Hippodrome de Vincennes",
    refs: ["STIF:StopArea:SP:463641:"]
  },
  breuil: {
    name: "École du Breuil",
    refs: ["STIF:StopArea:SP:463644:"]
  }
};

const lignesJoinville = ["C02251", "C01130", "C01135", "C01137", "C01139", "C01141", "C01219", "C01260", "C01399"];

async function fetchData(monitoringRef) {
  const proxy = 'https://ratp-proxy.hippodrome-proxy42.workers.dev/?url=';
  const url = `https://prim.iledefrance-mobilites.fr/marketplace/stop-monitoring?MonitoringRef=${monitoringRef}`;
  try {
    const response = await fetch(proxy + encodeURIComponent(url));
    const data = await response.json();
    return data.Siri.ServiceDelivery.StopMonitoringDelivery[0];
  } catch (e) {
    return null;
  }
}

function formatTime(dateStr) {
  const date = new Date(dateStr);
  return isNaN(date) ? 'Invalid Date' : date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
}

function minutesRemaining(dateStr) {
  const now = new Date();
  const then = new Date(dateStr);
  return Math.round((then - now) / 60000);
}

function renderDepartures(containerId, title, deliveriesList) {
  const el = document.getElementById(containerId);
  el.innerHTML = `<div class="station-title">${title}</div>`;
  const lignes = {};

  deliveriesList.forEach(deliveries => {
    if (!deliveries || !deliveries.MonitoredStopVisit) return;

    deliveries.MonitoredStopVisit.forEach(v => {
      const dir = v.MonitoredVehicleJourney.DirectionName?.value || '';
      const line = v.MonitoredVehicleJourney.LineRef?.value || '';
      const destination = v.MonitoredVehicleJourney.DestinationName?.value || '';

      // Filtrage des lignes pour Joinville uniquement
      if (containerId === 'joinville' && !lignesJoinville.includes(line)) return;

      const scheduled = v.MonitoredVehicleJourney.MonitoredCall.AimedDepartureTime;
      const minutes = minutesRemaining(scheduled);
      const heure = formatTime(scheduled);

      const key = `${line} → ${destination}`;
      if (!lignes[key]) lignes[key] = [];
      lignes[key].push({heure, minutes});
    });

    if (deliveries?.GeneralMessage) {
      deliveries.GeneralMessage.forEach(m => {
        const alert = document.createElement('div');
        alert.className = 'alert';
        alert.textContent = '⚠ ' + (m?.InfoMessage?.[0]?.value || 'Perturbation');
        el.appendChild(alert);
      });
    }
  });

  Object.entries(lignes).forEach(([dir, passages]) => {
    const block = document.createElement('div');
    block.innerHTML = `<div class="ligne-title">🚍 ${dir}</div>`;
    const grid = document.createElement('div');
    grid.className = 'grid';
    passages.slice(0, 4).forEach(p => {
      const div = document.createElement('div');
      let classe = 'passage';
      if (p.minutes <= 5) classe += ' highlight';
      else if (p.minutes > 50 || p.minutes < 0) classe += ' late';
      div.className = classe;
      div.innerHTML = isNaN(p.minutes) ? `Invalid` : `${p.heure}<br><small>${p.minutes} min</small>`;
      grid.appendChild(div);
    });
    block.appendChild(grid);
    el.appendChild(block);
  });
}

async function renderAll() {
  for (const [key, {name, refs}] of Object.entries(monitoringRefs)) {
    const allDeliveries = await Promise.all(refs.map(fetchData));
    renderDepartures(key, name, allDeliveries);
  }
}

renderAll();
setInterval(renderAll, 30000);
