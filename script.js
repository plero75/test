
const proxyUrl='https://ratp-proxy.hippodrome-proxy42.workers.dev';
const stops=[{id:'IDFM:70640',name:'Joinville-le-Pont',lines:['C01742','C02251','C01219']},{id:'IDFM:463642',name:'Hippodrome de Vincennes',lines:['C02251']},{id:'IDFM:463645',name:'École du Breuil',lines:['C01219']}];
const dashboard=document.getElementById('dashboard');

async function fetchData(stop){
  try{
    const res=await fetch(`${proxyUrl}/?url=https://prim.iledefrance-mobilites.fr/marketplace/stop-monitoring?MonitoringRef=${stop.id}`);
    const data=await res.json();
    localStorage.setItem(`stop-${stop.id}`,JSON.stringify(data));
    return data.Siri.ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit||[];
  }catch(e){
    const data=localStorage.getItem(`stop-${stop.id}`);
    return data?JSON.parse(data).Siri.ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit:[];
  }
}

async function buildDashboard(){
  dashboard.innerHTML='';
  for(const stop of stops){
    const data=await fetchData(stop);
    const block=document.createElement('div');
    block.className='station';
    block.innerHTML=`<h2>${stop.name}</h2>`;
    data.slice(0,4).forEach(v=>{
      const aimed=v.MonitoredVehicleJourney.MonitoredCall.AimedDepartureTime;
      const time=new Date(aimed).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
      const mins=Math.round((new Date(aimed)-new Date())/60000);
      const cls=mins<5?'imminent':mins<15?'delayed':'late';
      const line=v.MonitoredVehicleJourney.LineRef.value.split(':').pop();
      block.innerHTML+=`<div class="line-block"><img src="icons/${line}.png" width="30"/><div class="time-box ${cls}">${time} ⏱ ${mins} min</div></div>`;
    });
    dashboard.appendChild(block);
  }
}

async function fetchWeather(){
  const res=await fetch('https://api.open-meteo.com/v1/forecast?latitude=48.847&longitude=2.439&current_weather=true');
  const data=await res.json();
  document.getElementById('weather').innerText=`🌤 ${data.current_weather.temperature}°C`;
}

async function fetchNews(){
  const res=await fetch(`${proxyUrl}/?url=https://www.francetvinfo.fr/titres.rss`);
  const txt=await res.text();
  const rss=(new DOMParser()).parseFromString(txt,'text/xml');
  const items=rss.querySelectorAll('item');
  document.getElementById('newsTicker').innerText=[...items].slice(0,5).map(el=>el.querySelector('title').textContent).join(' • ');
}

buildDashboard();fetchWeather();fetchNews();
setInterval(buildDashboard,60000);
setInterval(fetchWeather,1800000);
setInterval(fetchNews,300000);
