const STATION_STOP_AREA = "stop_area:OCE:SA:87582551";
const API_BASE = "https://api.sncf.com/v1/coverage/sncf";

function getApiKey(){
  const p = new URLSearchParams(location.search).get("key");
  if (p) return p;
  if (localStorage.getItem("SNCF_KEY")) return localStorage.getItem("SNCF_KEY");
  if (typeof window.SNCF_API_KEY === "string" && window.SNCF_API_KEY.trim()) return window.SNCF_API_KEY.trim();
  return "";
}

const els = {
  clock: document.getElementById("clock"),
  dd: document.querySelector(".countdown .dd"),
  hh: document.querySelector(".countdown .hh"),
  mm: document.querySelector(".countdown .mm"),
  ss: document.querySelector(".countdown .ss"),
  eta: document.getElementById("eta"),
  meta: document.getElementById("meta"),
  sourceChip: document.getElementById("sourceChip"),
  detailChip: document.getElementById("detailChip"),
  canvas: document.getElementById("confetti"),
};

function updateClock(){
  els.clock.textContent = new Date().toLocaleTimeString("fr-FR", {hour:"2-digit", minute:"2-digit", second:"2-digit"});
}
setInterval(updateClock, 1000); updateClock();

function pad2(n){ return String(n).padStart(2, "0"); }
function fmtHM(d){ return pad2(d.getHours()) + ":" + pad2(d.getMinutes()); }
function parseSncfDate(s){
  const y = +s.slice(0,4), m = +s.slice(4,6)-1, d = +s.slice(6,8);
  const H = +s.slice(9,11), M = +s.slice(11,13), S = +s.slice(13,15);
  return new Date(Date.UTC(y,m,d,H,M,S));
}

async function sncf(path, params = {}){
  const url = new URL(API_BASE + path);
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v));
  const key = getApiKey();
  const headers = key ? { "Authorization": "Basic " + btoa(key + ":") } : {};
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error();
  return res.json();
}

let target = null, timer = null, confettiRunning = false;
function startCountdown(date){
  target = date;
  if (timer) clearInterval(timer);
  document.body.classList.remove("splash");
  const tick = () => {
    const now = Date.now();
    let diff = target - now;
    if (diff <= 0){
      els.dd.textContent = "00";
      els.hh.textContent = "00";
      els.mm.textContent = "00";
      els.ss.textContent = "00";
      els.eta.textContent = "🏊‍♂️ SPLAAASH ! Paul est dans l’eau !";
      els.meta.textContent = "Servez les 🍹, sortez les 🩴 !";
      document.body.classList.add("splash");
      celebrate();
      clearInterval(timer);
      return;
    }
    const d = Math.floor(diff/86400000); diff -= d*86400000;
    const h = Math.floor(diff/3600000);  diff -= h*3600000;
    const m = Math.floor(diff/60000);    diff -= m*60000;
    const s = Math.floor(diff/1000);
    els.dd.textContent = pad2(Math.min(d,99));
    els.hh.textContent = pad2(h);
    els.mm.textContent = pad2(m);
    els.ss.textContent = pad2(s);
    document.title = `💦 Splash dans ${d?d+"j ":""}${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  };
  tick();
  timer = setInterval(tick, 1000);
}

function celebrate(){
  if (confettiRunning) return;
  confettiRunning = true;
  const ctx = els.canvas.getContext("2d");
  const { width, height } = resizeCanvas();
  const pieces = Array.from({length: 240}, () => ({
    x: Math.random()*width,
    y: -Math.random()*height,
    r: Math.random()*6+2,
    vx: (Math.random()-0.5)*0.9,
    vy: Math.random()*2.2+2,
    a: Math.random()*Math.PI*2
  }));
  let run = true; let last = performance.now();
  function frame(t){
    if (!run) return;
    const dt = Math.min(32, t - last); last = t;
    ctx.clearRect(0,0,els.canvas.width, els.canvas.height);
    pieces.forEach(p => {
      p.x += p.vx * dt/16; p.y += p.vy * dt/16; p.a += 0.08;
      if (p.y > height+20) { p.y = -10; p.x = Math.random()*width; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a);
      ctx.fillStyle = ["#38bdf8","#ffd166","#06d6a0","#ff6b6b","#ffffff"][p.r|0 % 5];
      ctx.fillRect(-p.r, -p.r, p.r*2, p.r*2);
      ctx.restore();
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  setTimeout(() => { run = false; confettiRunning = false; }, 12000);
}

function resizeCanvas(){
  const dpr = Math.max(1, devicePixelRatio || 1);
  els.canvas.width = innerWidth * dpr;
  els.canvas.height = innerHeight * dpr;
  els.canvas.style.width = "100%";
  els.canvas.style.height = "100%";
  els.canvas.getContext("2d").scale(dpr, dpr);
  return { width: innerWidth, height: innerHeight };
}
addEventListener("resize", resizeCanvas); resizeCanvas();

async function getTargetTime(){
  const url = new URL(location.href);
  const at = url.searchParams.get("at");
  if (at){
    const t = new Date(at);
    if (!isNaN(t.getTime())){
      els.sourceChip.textContent = "⛱️ Source : horaire manuel";
      els.detailChip.textContent = "Cible : " + t.toLocaleString("fr-FR", { dateStyle:"short", timeStyle:"short" });
      els.meta.textContent = "On vise l’heure fixée par les copains 😎";
      els.eta.textContent = "Splash prévu à " + t.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
      return t;
    }
  }
  const key = getApiKey();
  if (key){
    try{
      els.sourceChip.textContent = "🚆 Source : SNCF (Labouheyre)";
      const data = await sncf(`/stop_areas/${encodeURIComponent(STATION_STOP_AREA)}/arrivals`, {
        count: 8, duration: 5400
      });
      const items = (data.arrivals||[]).map(a => {
        const sdt = a.stop_date_time;
        const when = parseSncfDate(sdt.arrival_date_time);
        const di = a.display_informations || {};
        const origin = di.direction || di.label || "—";
        const mode = di.commercial_mode || "Train";
        return { when, origin, mode, platform: sdt.stop_point && sdt.stop_point.platform };
      }).filter(x => x.when >= new Date(Date.now()-60000)).sort((a,b)=>a.when-b.when);
      if (!items.length) throw new Error();
      const next = items[0];
      els.detailChip.textContent = `${next.mode} depuis ${next.origin} • Quai ${next.platform || "?"}`;
      els.eta.textContent = "Arrivée prévue à " + fmtHM(next.when);
      els.meta.textContent = "On synchronise le splash sur l’arrivée du train 🫧";
      return next.when;
    }catch(e){
      els.sourceChip.textContent = "🚦 Source : démo (fallback)";
    }
  }else{
    els.sourceChip.textContent = "⛱️ Source : horaire manuel/démo";
  }
  const demo = new Date(Date.now() + 10*60*1000 + 5000);
  els.detailChip.textContent = "Mode démo : +10 min";
  els.eta.textContent = "Splash prévu à " + fmtHM(demo);
  els.meta.textContent = "Ajoute ?at=... ou ?key=... pour le vrai timing";
  return demo;
}

(async function(){
  const target = await getTargetTime();
  startCountdown(target);
})();
