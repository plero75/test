<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard Hippodrome Paris-Vincennes</title>
  <style>
    body {
      background-color: #1e1e2f;
      color: #fff;
      font-family: sans-serif;
      margin: 0;
      padding: 2rem;
    }
    h1 {
      margin-bottom: 2rem;
    }
    .section {
      margin-bottom: 3rem;
    }
    .station-title {
      font-size: 1.5rem;
      margin-bottom: 1rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
    }
    .passage {
      padding: 1rem;
      background-color: #292943;
      border-radius: 0.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .passage.highlight {
      background-color: #4caf50;
      color: #000;
      font-weight: bold;
    }
    .passage.late {
      background-color: #444;
      color: #aaa;
    }
    .alert {
      background-color: #ffc107;
      color: #000;
      padding: 1rem;
      margin-top: 1rem;
      border-radius: 0.5rem;
    }
    .ligne-title {
      margin: 1rem 0 0.5rem;
      font-weight: bold;
      font-size: 1.2rem;
    }
  </style>
</head>
<body>
  <h1>🚉 Dashboard Hippodrome Paris-Vincennes</h1>
  <div class="section" id="joinville"></div>
  <div class="section" id="hippodrome"></div>
  <div class="section" id="breuil"></div>
  <script>
    const monitoringRefs = {
      joinville: {
        id: "STIF:StopArea:SP:43135:",
        name: "Joinville-le-Pont"
      },
      hippodrome: {
        id: "STIF:StopArea:SP:463641:",
        name: "Hippodrome de Vincennes"
      },
      breuil: {
        id: "STIF:StopArea:SP:463644:",
        name: "École du Breuil"
      }
    }

    async function fetchData(monitoringRef) {
      const proxy = 'https://ratp-proxy.hippodrome-proxy42.workers.dev/?url=';
      const url = `https://prim.iledefrance-mobilites.fr/marketplace/stop-monitoring?MonitoringRef=${monitoringRef}`;
      const response = await fetch(proxy + encodeURIComponent(url));
      const data = await response.json();
      return data.Siri.ServiceDelivery.StopMonitoringDelivery[0];
    }

    function formatTime(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    }

    function minutesRemaining(dateStr) {
      const now = new Date();
      const then = new Date(dateStr);
      return Math.round((then - now) / 60000);
    }

    function renderDepartures(containerId, title, deliveries) {
      const el = document.getElementById(containerId);
      el.innerHTML = `<div class="station-title">${title}</div>`;
      const lignes = {};

      deliveries.MonitoredStopVisit.forEach(v => {
        const dir = v.MonitoredVehicleJourney.DirectionName?.value || '';
        const line = v.MonitoredVehicleJourney.LineRef?.value || '';
        const destination = v.MonitoredVehicleJourney.DestinationName?.value || '';
        const scheduled = v.MonitoredVehicleJourney.MonitoredCall.AimedDepartureTime;
        const minutes = minutesRemaining(scheduled);
        const heure = formatTime(scheduled);

        const key = `${line} → ${destination}`;
        if (!lignes[key]) lignes[key] = [];
        lignes[key].push({heure, minutes});
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
          else if (p.minutes > 50) classe += ' late';
          div.className = classe;
          div.innerHTML = p.minutes > 50 ? `${p.heure}` : `${p.heure}<br><small>${p.minutes} min</small>`;
          grid.appendChild(div);
        });
        block.appendChild(grid);
        el.appendChild(block);
      });

      if (deliveries?.GeneralMessage) {
        deliveries.GeneralMessage.forEach(m => {
          const alert = document.createElement('div');
          alert.className = 'alert';
          alert.textContent = '⚠ ' + (m?.RecordedAtTime ? m.InfoMessage?.[0]?.value : '');
          el.appendChild(alert);
        });
      }
    }

    async function renderAll() {
      for (const [key, {id, name}] of Object.entries(monitoringRefs)) {
        const data = await fetchData(id);
        renderDepartures(key, name, data);
      }
    }

    renderAll();
  </script>
</body>
</html>