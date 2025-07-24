fetch("https://ratp-proxy.hippodrome-proxy42.workers.dev/?url=https://prim.iledefrance-mobilites.fr/marketplace/stop-monitoring?MonitoringRef=STIF:StopArea:SP:463641:")
  .then(res => res.json())
  .then(data => console.log("Bus 77 data:", data))
  .catch(err => console.error("Bus 77 error:", err));
