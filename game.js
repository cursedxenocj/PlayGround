(() => {
  'use strict';
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const $ = (s) => document.querySelector(s);
  const ui = {
    garage: $('#garage'), events: $('#events'), results: $('#results'), pause: $('#pause-screen'), hud: $('#hud'), hint: $('#bottom-hint'),
    startEvents: $('#open-events'), start: $('#start-race'), back: $('#back-garage'), resume: $('#resume-btn'), quit: $('#quit-race'),
    speed: $('#speed'), speedFill: $('#speed-fill'), distance: $('#distance'), time: $('#race-time'), progress: $('#progress-fill'), position: $('#position'),
    cash: $('#cash'), garageCash: $('#garage-cash'), condition: $('#condition-fill'), nitro: $('#nitro-fill'), nitroLabel: $('#nitro-label'), style: $('#drift-score'),
    district: $('#district'), eventLabel: $('#event-label'), toast: $('#toast'), carName: $('#car-name'), carDesc: $('#car-desc'), carIndex: $('#car-index'),
    statSpeed: $('#stat-speed'), statAccel: $('#stat-accel'), statHandle: $('#stat-handle'), upgrade: $('#upgrade-btn'), upgradeName: $('#upgrade-name'), upgradeCost: $('#upgrade-cost'),
    resultTitle: $('#result-title'), resultCopy: $('#result-copy'), resultPlace: $('#result-place'), resultTime: $('#result-time'), resultReward: $('#result-reward'), resultKicker: $('#result-kicker'),
    career: $('#career-level'), status: $('#status-text')
  };
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rand = (a, b) => a + Math.random() * (b - a);
  const keys = new Set();
  const cars = [
    {name:'VORTEX GT',desc:'BALANCED STREET COUPE',color:'#e8483f',top:1,accel:1,handle:1,shape:0},
    {name:'KAIJU R',desc:'TURBOCHARGED NIGHT RUNNER',color:'#52d6da',top:1.13,accel:.94,handle:.93,shape:1},
    {name:'NOVA ZX',desc:'LIGHTWEIGHT CORNER HUNTER',color:'#e3ae49',top:.95,accel:1.08,handle:1.16,shape:2}
  ];
  const events = [
    {name:'HARBOR SPRINT',kind:'SPRINT',desc:'A fast 4.2 km dash along the waterfront. Three rivals. One finish line.',district:'HARBOR LOOP',distance:4200,reward:750,unlock:0},
    {name:'NEON RUN',kind:'CIRCUIT',desc:'A longer city circuit through the neon ward. Traffic is heavier after midnight.',district:'NEON WARD',distance:5400,reward:1200,unlock:1},
    {name:'INDUSTRIAL OUTRUN',kind:'OUTRUN',desc:'Six kilometers through the freight district. The toughest crew owns this road.',district:'IRON QUAY',distance:6200,reward:1800,unlock:2}
  ];
  const defaults = {credits:2500,selected:0,upgrade:0,unlocked:0,wins:0,best:[null,null,null]};
  let profile = loadProfile(), W=0, H=0, dpr=1, mode='garage', selectedEvent=0, last=0, game={}, audio=null, audioOn=false;
  function loadProfile(){try{return {...defaults,...JSON.parse(localStorage.getItem('midnightCircuitSave')||'{}')};}catch(_){return {...defaults};}}
  function save(){try{localStorage.setItem('midnightCircuitSave',JSON.stringify(profile));}catch(_){}}
  function resize(){W=innerWidth;H=innerHeight;dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
  addEventListener('resize',resize);resize();
  function makeCity(){return Array.from({length:46},(_,i)=>({x:i/46,w:rand(.009,.036),h:rand(.035,.22),seed:Math.random(),tone:Math.random()}));}
  const city=makeCity(), stars=Array.from({length:95},()=>({x:Math.random(),y:Math.random()*.32,r:Math.random()*1.3,a:rand(.25,.85)}));
  function carStats(){const c=cars[profile.selected];const up=profile.upgrade;return {top:(240+up*11)*c.top,accel:(.72+up*.055)*c.accel,handle:c.handle};}
  function formatTime(s){const m=Math.floor(s/60),sec=(s%60).toFixed(1).padStart(4,'0');return `${String(m).padStart(2,'0')}:${sec}`;}
  function project(lane,meters){const horizon=H*.31,depth=H*.69,p=clamp(1-meters/780,0,1);const curve=Math.sin((game.world||0)*.00031)*W*.035;const half=W*(.06+.39*p);const center=W*.5+curve*(1-p*.45);return {x:center+lane*half*.66,y:horizon+Math.pow(p,1.62)*depth,scale:.12+p*1.08,p,center,half};}
  function polygon(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
  function drawBackground(){
    const sky=ctx.createLinearGradient(0,0,0,H*.72);sky.addColorStop(0,'#06101c');sky.addColorStop(.52,'#172a3c');sky.addColorStop(1,'#674b4a');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    const glow=ctx.createRadialGradient(W*.5,H*.33,3,W*.5,H*.33,W*.52);glow.addColorStop(0,'#ffb16a3b');glow.addColorStop(1,'#ff895000');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H*.65);
    for(const s of stars){ctx.globalAlpha=s.a;ctx.fillStyle='#caebff';ctx.fillRect(s.x*W,s.y*H,s.r,s.r);}ctx.globalAlpha=1;
    const horizon=H*.31,scroll=(game.world||0)*.00012;
    city.forEach((b,i)=>{const x=(b.x*W+scroll*W*.075+W)%W,h=b.h*H,y=horizon-h;const g=ctx.createLinearGradient(0,y,0,horizon);g.addColorStop(0,'#11212c');g.addColorStop(1,'#09131d');ctx.fillStyle=g;ctx.fillRect(x,y,b.w*W,h);ctx.fillStyle=b.tone>.72?'#ff8b6355':'#58dce846';for(let wy=y+8;wy<horizon-5;wy+=10){for(let wx=x+4;wx<x+b.w*W-3;wx+=7){if(Math.floor(wx+wy+b.seed*400)%4)ctx.fillRect(wx,wy,2,3);}}});
    // skyline towers and elevated roads add depth to the city route.
    ctx.strokeStyle='#56a9bd55';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,horizon+6);ctx.lineTo(W,horizon+6);ctx.stroke();
    for(let i=0;i<8;i++){const x=((i/7)*W-(game.world*.00038%1)*W*.12+W)%W;ctx.fillStyle='#7beaff';ctx.shadowColor='#45d9ff';ctx.shadowBlur=10;ctx.fillRect(x,horizon-38,2,38);ctx.shadowBlur=0;ctx.fillStyle='#ff744e';ctx.fillRect(x-1,horizon-40,4,2);}
  }
  function roadCurve(){return Math.sin((game.world||0)*.00031)*W*.035;}
  function drawRoad(){
    const horizon=H*.31,bottom=H+30,curve=roadCurve(),top=W*.06,base=W*.445;
    polygon([[W*.5+curve-top,horizon],[W*.5+curve+top,horizon],[W*.5+curve+base,bottom],[W*.5+curve-base,bottom]],'#20262a');
    polygon([[W*.5+curve-top*.84,horizon],[W*.5+curve+top*.84,horizon],[W*.5+curve+base*.84,bottom],[W*.5+curve-base*.84,bottom]],'#292e31');
    for(let i=0;i<44;i++){const f=((i/44+(game.world*.0011%1))%1),y=horizon+Math.pow(f,1.55)*(bottom-horizon),half=top+(base-top)*f,x=W*.5+curve*f;ctx.fillStyle=`rgba(190,205,196,${.015+f*.02})`;ctx.fillRect(x-half+Math.sin(i*31)*half*.45,y,2+f*3,1+f*2);}
    for(const side of [-1,1]){polygon([[W*.5+curve+side*top*.92,horizon],[W*.5+curve+side*top*1.08,horizon],[W*.5+curve+side*base*1.04,bottom],[W*.5+curve+side*base*.88,bottom]],'#9a4c40');polygon([[W*.5+curve+side*top*1.08,horizon],[W*.5+curve+side*top*1.13,horizon],[W*.5+curve+side*base*1.09,bottom],[W*.5+curve+side*base*1.04,bottom]],'#d0c8b3');}
    const phase=(game.world*.00165)%1;for(let lane=-1;lane<=1;lane+=2)for(let i=0;i<14;i++){const f=((i/14+phase)%1),y=horizon+Math.pow(f,1.58)*(bottom-horizon),half=top+(base-top)*f,x=W*.5+curve*f+lane*half*.33,len=4+f*34;ctx.fillStyle=`rgba(202,226,220,${.18+f*.42})`;ctx.fillRect(x-1,y,2+f*2,len);}
    for(let i=0;i<7;i++){const f=((i/7+(game.world*.0011%1))%1),y=horizon+Math.pow(f,1.6)*(bottom-horizon),half=top+(base-top)*f;for(const side of [-1,1]){const x=W*.5+curve*f+side*(half+5+f*19),s=.2+f*.9;ctx.fillStyle='#334750';ctx.fillRect(x-2*s,y-28*s,4*s,30*s);ctx.fillStyle=i%2?'#ff744a':'#5beaff';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=8*s;ctx.fillRect(x-4*s,y-28*s,8*s,3*s);ctx.shadowBlur=0;}}
    ctx.strokeStyle='#42d7ed45';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(W*.5+curve-top,horizon);ctx.lineTo(W*.5+curve-base,bottom);ctx.moveTo(W*.5+curve+top,horizon);ctx.lineTo(W*.5+curve+base,bottom);ctx.stroke();
  }
  function drawStreetCar(x,y,s,color,shape=0,brake=false,lean=0){
    ctx.save();ctx.translate(x,y);ctx.rotate(lean);ctx.scale(s,s);const w=shape===1?38:34;
    ctx.shadowColor=color;ctx.shadowBlur=8*s;ctx.fillStyle='#090d11';ctx.beginPath();ctx.moveTo(-w*.54,7);ctx.lineTo(-w*.48,-12);ctx.lineTo(-w*.35,-24);ctx.lineTo(-w*.24,-31);ctx.lineTo(w*.25,-31);ctx.lineTo(w*.42,-22);ctx.lineTo(w*.53,6);ctx.lineTo(w*.43,13);ctx.lineTo(-w*.43,13);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
    // tires
    ctx.fillStyle='#07090b';ctx.fillRect(-w*.55,-13,w*.15,22);ctx.fillRect(w*.4,-13,w*.15,22);ctx.fillStyle='#89959a';ctx.fillRect(-w*.54,-6,w*.1,9);ctx.fillRect(w*.44,-6,w*.1,9);
    polygon([[-w*.4,-20],[-w*.27,-29],[w*.22,-29],[w*.37,-20],[w*.43,3],[-w*.43,3]],color);
    polygon([[-w*.27,-27],[-w*.19,-34],[w*.14,-34],[w*.28,-27]],'#243b46');
    ctx.fillStyle='#17252b';ctx.fillRect(-w*.21,-26,w*.42,9);ctx.fillStyle='#d5eff2';ctx.fillRect(-w*.42,-18,w*.84,2);
    ctx.fillStyle=brake?'#ff2b21':'#ff4240';ctx.shadowColor='#ff312a';ctx.shadowBlur=brake?13:6;ctx.fillRect(-w*.42,3,w*.16,4);ctx.fillRect(w*.26,3,w*.16,4);ctx.shadowBlur=0;
    ctx.fillStyle=shape===2?'#eee0bc':'#121b21';ctx.fillRect(-w*.48,8,w*.96,3);ctx.fillStyle='#54e5ef';ctx.fillRect(-w*.09,9,w*.18,2);ctx.restore();
  }
  function drawOpponent(o){const d=o.dist-game.distance;if(d< -25||d>780)return;const p=project(o.lane,d);const color=o.isRival?o.color:o.color;drawStreetCar(p.x,p.y,p.scale*1.35,color,o.shape||0,false,0);if(o.isRival&&p.scale>.38){ctx.save();ctx.globalAlpha=clamp(p.scale,0,.8);ctx.fillStyle='#e7f8fb';ctx.font=`700 ${Math.max(8,9*p.scale)}px Rajdhani`;ctx.textAlign='center';ctx.fillText(o.name,p.x,p.y-40*p.scale);ctx.restore();}}
  function drawPlayer(){const c=cars[profile.selected],x=W*.5+game.lane*W*.16+roadCurve()*.7,y=H*.865,s=Math.min(1,W/1000);game.carX=x;ctx.save();ctx.translate(x,y);if(game.shake>0)ctx.translate(rand(-game.shake,game.shake),rand(-game.shake,game.shake));if(game.boosting){for(let i=0;i<5;i++){ctx.fillStyle=i%2?'#38caff99':'#ffb24caa';ctx.beginPath();ctx.moveTo(-34+i*17,18);ctx.lineTo(-27+i*17,18);ctx.lineTo(-30+i*17,rand(45,82));ctx.closePath();ctx.fill();}}ctx.scale(s,s);drawStreetCar(0,0,2.38,c.color,c.shape,false,game.steer*.055);if(game.drifting){ctx.globalAlpha=.4;ctx.fillStyle='#b8c5c6';ctx.beginPath();ctx.ellipse(-54,20,19,6,-.2,0,Math.PI*2);ctx.ellipse(54,20,19,6,.2,0,Math.PI*2);ctx.fill();}ctx.restore();}
  function render(){drawBackground();drawRoad();if(game.traffic)game.traffic.concat(game.rivals||[]).slice().sort((a,b)=>b.dist-a.dist).forEach(drawOpponent);drawPlayer();if(game.drifting&&Math.abs(game.steer)>.15){ctx.fillStyle='#d6e7ea44';for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(game.carX+(game.steer>0?-36:36)+rand(-8,8),H*.88+rand(0,20),rand(7,15),rand(2,5),0,0,Math.PI*2);ctx.fill();}}}
  function updateGarage(){const c=cars[profile.selected];ui.carName.textContent=c.name;ui.carDesc.textContent=c.desc;ui.carIndex.textContent=`0${profile.selected+1} / 03`;const stats=carStats();ui.statSpeed.style.width=`${clamp(stats.top/290*100,0,100)}%`;ui.statAccel.style.width=`${clamp(stats.accel/1.1*100,0,100)}%`;ui.statHandle.style.width=`${clamp(stats.handle/1.16*100,0,100)}%`;ui.garageCash.textContent=`${profile.credits.toLocaleString()} CR`;ui.cash.textContent=profile.credits.toLocaleString();ui.career.textContent=String(1+profile.wins);const cost=900+profile.upgrade*700;ui.upgradeName.textContent=profile.upgrade>=5?'ENGINE MAXED':'ENGINE UPGRADE';ui.upgradeCost.textContent=profile.upgrade>=5?'MAX LEVEL':`LEVEL ${profile.upgrade+1} · ${cost.toLocaleString()} CR`;ui.upgrade.style.opacity=profile.upgrade>=5?'0.55':'1';}
  function showGarage(){mode='garage';$('#mobile-controls').classList.add('hidden');ui.garage.classList.remove('hidden');ui.events.classList.add('hidden');ui.results.classList.add('hidden');ui.pause.classList.add('hidden');ui.hud.classList.add('hidden');ui.hint.classList.add('hidden');ui.status.textContent='GARAGE // BAY 04';updateGarage();render();}
  function showEvents(){mode='events';$('#mobile-controls').classList.add('hidden');selectedEvent=Math.min(profile.unlocked,events.length-1);ui.garage.classList.add('hidden');ui.events.classList.remove('hidden');renderEventCards();}
  function renderEventCards(){const list=$('#event-list');list.innerHTML='';events.forEach((e,i)=>{const locked=i>profile.unlocked;const b=document.createElement('button');b.className=`event-card ${i===selectedEvent?'selected':''} ${locked?'locked':''}`;b.innerHTML=`<span class="event-number">0${i+1} // ${e.kind}${locked?' · LOCKED':''}</span><strong>${e.name}</strong><small>${locked?'Win the previous event to unlock this route.':e.desc}</small><span class="event-reward">${locked?'🔒':`+${e.reward.toLocaleString()} CR`}</span>`;b.disabled=locked;b.addEventListener('click',()=>{selectedEvent=i;renderEventCards();});list.appendChild(b);});ui.start.disabled=selectedEvent>profile.unlocked;}
  function startRace(){if(selectedEvent>profile.unlocked)return;const e=events[selectedEvent];const lanes=[-.64,0,.64];const rivals=lanes.map((lane,i)=>({name:['ACE','KIRA','GHOST'][i],lane,dist:-rand(12,44),progress:0,speed:rand(168,196)+(selectedEvent*7),color:['#f5c34f','#9a69dc','#d94c55'][i],shape:i%3,isRival:true}));game={distance:0,world:0,speed:0,top:0,condition:100,nitro:100,lane:0,steer:0,traffic:[],rivals,particles:[],spawn:.5,elapsed:0,shake:0,invuln:0,toast:0,toastText:'',drift:0,driftCombo:0,drifting:false,boosting:false,damageFlash:0,rank:4,event:selectedEvent,won:false,style:0,stats:carStats()};mode='race';ui.garage.classList.add('hidden');ui.events.classList.add('hidden');ui.results.classList.add('hidden');ui.pause.classList.add('hidden');ui.hud.classList.remove('hidden');ui.hint.classList.remove('hidden');$('#mobile-controls').classList.remove('hidden');ui.eventLabel.textContent=e.name;ui.district.textContent=e.district;ui.status.textContent=`LIVE // ${e.kind}`;ui.toast.classList.remove('show');last=performance.now();requestAnimationFrame(loop);}
  function toast(text){ui.toast.textContent=text;ui.toast.classList.add('show');game.toast=1.35;}
  function spawnTraffic(){const lane=rand(-.9,.9);game.traffic.push({lane,dist:rand(570,760),speed:rand(72,132),color:['#d5e0dc','#628e9b','#d05b4f','#b99762','#8276ac'][Math.floor(rand(0,5))],shape:Math.floor(rand(0,3)),isRival:false});}
  function rankNow(){let rank=1;for(const r of game.rivals)if(r.progress>game.distance)rank++;return rank;}
  function crash(){if(game.invuln>0)return;game.condition=Math.max(0,game.condition-22);game.invuln=1.15;game.shake=13;game.speed*=.48;game.nitro=Math.max(0,game.nitro-15);game.damageFlash=.35;toast('CONTACT // KEEP IT CLEAN');if(game.condition<=0)finishRace(false,'WRECKED');}
  function update(dt){
    const e=events[game.event],accelerating=keys.has('ArrowUp')||keys.has('KeyW')||game.touchAccelerate,braking=keys.has('ArrowDown')||keys.has('KeyS');
    const input=(keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0);const steerInput=input||game.touchSteer||0;
    game.drifting=(keys.has('ShiftLeft')||keys.has('ShiftRight')||keys.has('Shift')||game.touchDrift)&&Math.abs(steerInput)>.12;
    game.boosting=(keys.has('Space')||keys.has('Shift')&&!game.drifting||game.touchBoost)&&game.nitro>0;
    const max=game.stats.top*(game.boosting?1.19:1);const target=accelerating?max:braking?65:Math.min(max,Math.max(130,game.stats.top*.67));const acceleration=game.stats.accel*(game.boosting?1.45:1);
    game.speed+=(target-game.speed)*Math.min(1,dt*(game.speed<target?acceleration*.9:1.6));if(game.boosting){game.speed=Math.min(game.stats.top*1.2,game.speed+90*dt);game.nitro=Math.max(0,game.nitro-27*dt);}else game.nitro=Math.min(100,game.nitro+3.1*dt);
    game.steer+=(steerInput-game.steer)*Math.min(1,dt*(game.drifting?2.5:5.5));const steeringPower=game.stats.handle*(game.drifting?1.28:1);game.lane=clamp(game.lane+game.steer*dt*(game.speed/150)*.8*steeringPower,-1.34,1.34);
    const metersPerSec=game.speed/3.6;const meters=metersPerSec*dt;game.distance+=meters;game.world+=meters;game.elapsed+=dt;game.top=Math.max(game.top,game.speed);game.spawn-=dt;game.invuln=Math.max(0,game.invuln-dt);game.shake=Math.max(0,game.shake-dt*25);game.damageFlash=Math.max(0,game.damageFlash-dt);if(game.toast>0){game.toast-=dt;if(game.toast<=0)ui.toast.classList.remove('show');}
    if(game.drifting){game.drift+=Math.abs(game.steer)*game.speed*dt*.2;game.driftCombo+=dt;game.style+=Math.round(Math.abs(game.steer)*game.speed*dt*.17);if(game.driftCombo>.8&&Math.floor(game.driftCombo)%2===0&&Math.abs(game.steer)>.4&&game.toast<.2)toast('CLEAN DRIFT // STYLE UP');}else{if(game.drift>25){game.nitro=Math.min(100,game.nitro+Math.min(15,game.drift*.12));game.style+=Math.round(game.drift*1.2);game.drift=0;game.driftCombo=0;}else game.driftCombo=0;}
    if(game.lane<-1.17||game.lane>1.17){game.speed=Math.max(80,game.speed-42*dt);game.condition=Math.max(0,game.condition-5*dt);}
    if(game.spawn<=0){spawnTraffic();game.spawn=rand(.72,1.28)*(game.event===2?.8:1);}
    for(let i=game.traffic.length-1;i>=0;i--){const o=game.traffic[i];o.dist-=(metersPerSec-o.speed/3.6)*dt;if(o.dist<14&&o.dist>-5&&Math.abs(o.lane-game.lane)<.33)crash();if(o.dist<-22)game.traffic.splice(i,1);}
    for(const r of game.rivals){r.progress+=r.speed/3.6*dt;r.dist=r.progress-game.distance;if(r.dist<16&&r.dist>-5&&Math.abs(r.lane-game.lane)<.34){crash();r.dist=28;}}
    game.rank=rankNow();if(game.distance>=e.distance){finishRace(true,'FINISHED');return;}const winner=game.rivals.find(r=>r.progress>=e.distance);if(winner){finishRace(false,'OUTPACED');return;}
    ui.speed.textContent=String(Math.round(game.speed)).padStart(3,'0');ui.speedFill.style.width=`${clamp(game.speed/(game.stats.top*1.2)*100,0,100)}%`;ui.distance.textContent=(game.distance/1000).toFixed(2);ui.time.textContent=formatTime(game.elapsed);ui.progress.style.width=`${clamp(game.distance/e.distance*100,0,100)}%`;ui.position.innerHTML=`${game.rank}<sup>${game.rank===1?'ST':game.rank===2?'ND':game.rank===3?'RD':'TH'}</sup> / 4`;ui.condition.style.width=`${game.condition}%`;ui.condition.style.background=game.condition<35?'#ff665c':'#a6edbb';ui.nitro.style.width=`${game.nitro}%`;ui.nitroLabel.textContent=game.nitro>99?'READY':game.nitro>0?'CHARGING':'EMPTY';ui.style.textContent=game.style.toLocaleString();if(game.damageFlash)canvas.style.filter=`brightness(${1+game.damageFlash*.8}) saturate(1.3)`;else canvas.style.filter='';
  }
  function loop(now){if(mode!=='race')return;const dt=Math.min(.04,(now-last)/1000||0);last=now;update(dt);if(mode==='race'){render();requestAnimationFrame(loop);}}
  function finishRace(won,reason){if(mode!=='race')return;mode='results';game.won=won;const e=events[game.event],rank=game.rank||rankNow(),cleanBonus=Math.min(500,Math.round(game.style*.025)),reward=won?Math.max(200,Math.round(e.reward*(rank===1?1:rank===2?.7:.45))+cleanBonus):Math.round(100+cleanBonus*.3);if(won){profile.credits+=reward;profile.wins++;profile.unlocked=Math.max(profile.unlocked,Math.min(events.length-1,game.event+1));const prev=profile.best[game.event];profile.best[game.event]=prev?Math.min(prev,game.elapsed):game.elapsed;}else profile.credits+=reward;save();ui.resultKicker.textContent=won?'EVENT COMPLETE':reason==='WRECKED'?'VEHICLE WRECKED':'RACE OVER';ui.resultTitle.innerHTML=won?`NIGHT<br><em>${rank===1?'WON.':'RUN.'}</em>`:`${reason==='WRECKED'?'TOO MUCH<br><em>HEAT.</em>':'NOT THIS<br><em>TIME.</em>'}`;ui.resultCopy.textContent=won?(rank===1?'You own the night. The crew knows your name.':`You finished ${rank===2?'second':'third'} — the next run is yours.`):reason==='WRECKED'?'The car took too much damage. Get it fixed and head back out.':'The crew got to the line first. Tune up and take another shot.';ui.resultPlace.textContent=rank===1?'1ST':rank===2?'2ND':rank===3?'3RD':'4TH';ui.resultTime.textContent=formatTime(game.elapsed);ui.resultReward.textContent=`+${reward.toLocaleString()} CR`;ui.results.classList.remove('hidden');ui.hud.classList.add('hidden');ui.hint.classList.add('hidden');$('#mobile-controls').classList.add('hidden');ui.status.textContent='RUN COMPLETE';updateGarage();}
  function pause(){if(mode!=='race')return;mode='paused';ui.pause.classList.remove('hidden');ui.hud.classList.add('hidden');ui.hint.classList.add('hidden');$('#mobile-controls').classList.add('hidden');ui.status.textContent='PAUSED';}
  function resume(){if(mode!=='paused')return;mode='race';ui.pause.classList.add('hidden');ui.hud.classList.remove('hidden');ui.hint.classList.remove('hidden');$('#mobile-controls').classList.remove('hidden');ui.status.textContent=`LIVE // ${events[game.event].kind}`;last=performance.now();requestAnimationFrame(loop);}
  function ensureAudio(){if(!audio){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audio=new AC();const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sawtooth';osc.frequency.value=55;gain.gain.value=0;osc.connect(gain);gain.connect(audio.destination);osc.start();audio={ctx:audio,osc,gain};}audio.ctx.resume();audio.gain.gain.setTargetAtTime(audioOn?.025:0,audio.ctx.currentTime,.08);}
  function updateAudio(){if(audio){audio.osc.frequency.setTargetAtTime(40+(game.speed||0)*.42,audio.ctx.currentTime,.12);audio.gain.gain.setTargetAtTime(audioOn&&mode==='race'?.018:0,audio.ctx.currentTime,.1);}}
  function renderIdle(){if(mode==='garage'||mode==='events'){game={world:(performance.now()*.008)%100000,lane:0,steer:0,shake:0,traffic:[],rivals:[],distance:0,boosting:false,drifting:false};drawBackground();drawRoad();drawStreetCar(W*.7,H*.865,2.4,cars[profile.selected].color,cars[profile.selected].shape,false,0);}}
  $('#prev-car').addEventListener('click',()=>{profile.selected=(profile.selected+cars.length-1)%cars.length;save();updateGarage();renderIdle();});$('#next-car').addEventListener('click',()=>{profile.selected=(profile.selected+1)%cars.length;save();updateGarage();renderIdle();});
  ui.upgrade.addEventListener('click',()=>{const cost=900+profile.upgrade*700;if(profile.upgrade>=5)return;if(profile.credits<cost){toast('NOT ENOUGH CREDITS');return;}profile.credits-=cost;profile.upgrade++;save();updateGarage();});
  ui.startEvents.addEventListener('click',showEvents);ui.back.addEventListener('click',showGarage);ui.start.addEventListener('click',startRace);ui.resume.addEventListener('click',resume);ui.quit.addEventListener('click',showGarage);$('#result-garage').addEventListener('click',showGarage);$('#race-again').addEventListener('click',startRace);
  addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(e.code==='Escape'){if(mode==='race')pause();else if(mode==='paused')resume();}if(mode==='race')keys.add(e.code);});addEventListener('keyup',e=>keys.delete(e.code));
  document.querySelectorAll('.steer-pad button').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();game.touchSteer=Number(b.dataset.steer);b.setPointerCapture(e.pointerId);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>game.touchSteer=0);});
  function holdButton(el,down,up){el.addEventListener('pointerdown',e=>{e.preventDefault();down();el.setPointerCapture(e.pointerId);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(ev,up);}
  holdButton($('#mobile-nitro'),()=>game.touchBoost=true,()=>game.touchBoost=false);holdButton($('#mobile-gas'),()=>game.touchAccelerate=true,()=>game.touchAccelerate=false);holdButton($('#mobile-drift'),()=>{game.touchDrift=true;game.touchSteer=game.lane<0?1:-1;},()=>{game.touchDrift=false;game.touchSteer=0;});
  $('#audio-btn').addEventListener('click',()=>{audioOn=!audioOn;$('#audio-btn').innerHTML=`♪ <span>SOUND ${audioOn?'ON':'OFF'}</span>`;ensureAudio();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();if(mode==='race')pause();}});
  setInterval(()=>{if(mode==='race')updateAudio();},120);
  updateGarage();renderIdle();
})();
