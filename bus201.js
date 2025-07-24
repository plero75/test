fetch("https://ratp-proxy.hippodrome-proxy42.workers.dev/?url=https://prim.iledefrance-mobilites.fr/marketplace/stop-monitoring?MonitoringRef=STIF:StopArea:SP:463644:")
  .then(res => res.json())
  .then(data => console.log("Bus 201 data:", data))
  .catch(err => console.error("Bus 201 error:", err));
