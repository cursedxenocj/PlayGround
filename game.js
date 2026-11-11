(() => {
  'use strict';
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const $ = (s) => document.querySelector(s);
  const ui = { intro: $('#intro'), end: $('#end-screen'), start: $('#start-btn'), retry: $('#retry-btn'), speed: $('#speed'), speedFill: $('#speed-fill'), distance: $('#distance'), armorFill: $('#armor-fill'), armor: $('#armor-value'), nitroFill: $('#nitro-fill'), nitroLabel: $('#nitro-label'), threat: $('#threat'), toast: $('#toast'), flash: $('#damage-flash'), crosshair: $('#crosshair'), objective: $('#objective-sub'), title: $('#end-title'), copy: $('#end-copy'), finalDistance: $('#final-distance'), finalKills: $('#final-kills'), finalSpeed: $('#final-speed'), sound: $('#sound-btn') };
  let W = 0, H = 0, dpr = 1, running = false, last = 0, time = 0;
  let game = {};
  const keys = new Set();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const resize = () => { W = innerWidth; H = innerHeight; dpr = Math.min(devicePixelRatio || 1, 1.6); canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  addEventListener('resize', resize); resize();
  const init = () => { game = { dist: 0, speed: 80, top: 80, armor: 100, nitro: 100, lane: 0, steer: 0, enemies: [], particles: [], kills: 0, spawn: 0, shake: 0, fire: 0, rocket: 0, invuln: 0, toast: 0, muted: true, mouse: { x: W * .5, y: H * .56 }, stars: Array.from({length: 90}, () => ({x:Math.random(),y:Math.random()*.32,r:Math.random()*1.4,a:rand(.2,.8)})), buildings: makeCity() }; };
  function makeCity(){ return Array.from({length:34},(_,i)=>({x:i/34, w:rand(.012,.036), h:rand(.04,.19), seed:Math.random(), hue:Math.random()})); }
  init();

  function project(lane, dist){
    const horizon = H * .31, depth = H * .74;
    const p = clamp(1 - dist / 900, 0, 1);
    const curve = Math.sin(game.dist * .00035) * (1-p) * W * .035;
    const roadHalf = W * (.055 + .39 * p);
    const center = W*.5 + curve;
    return { x:center + lane * roadHalf * .66, y:horizon + Math.pow(p,1.62)*depth, scale:.12 + p*1.16, p, center, roadHalf };
  }
  function polygon(points, color){ ctx.fillStyle=color; ctx.beginPath(); points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.closePath(); ctx.fill(); }
  function drawBackground(){
    const sky=ctx.createLinearGradient(0,0,0,H*.68); sky.addColorStop(0,'#070d1b');sky.addColorStop(.55,'#14223a');sky.addColorStop(1,'#674448');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    const glow=ctx.createRadialGradient(W*.5,H*.33,3,W*.5,H*.33,W*.43);glow.addColorStop(0,'#ff81532b');glow.addColorStop(1,'#ff815300');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H*.65);
    for(const s of game.stars){ctx.globalAlpha=s.a;ctx.fillStyle='#b8e4ff';ctx.fillRect(s.x*W,s.y*H,s.r,s.r);}ctx.globalAlpha=1;
    const horizon=H*.31, offset=(game.dist*.00013)%1;
    game.buildings.forEach((b,i)=>{const x=(b.x*W + offset*W*.075 + W)%W;const h=b.h*H;const y=horizon-h;const grad=ctx.createLinearGradient(x,y,x,y+h);grad.addColorStop(0,'#101d2b');grad.addColorStop(1,'#0a111a');ctx.fillStyle=grad;ctx.fillRect(x,y,b.w*W,h);ctx.fillStyle=b.hue>.78?'#ff785147':'#60dff043';for(let wy=y+10;wy<horizon-6;wy+=11){for(let wx=x+4;wx<x+b.w*W-3;wx+=8){if((Math.floor(wx+wy+b.seed*400)%5)!==0)ctx.fillRect(wx,wy,2,3);}}});
    // distant elevated highway and lamps
    ctx.strokeStyle='#4ca6b355';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,horizon+6);ctx.lineTo(W,horizon+6);ctx.stroke();
    for(let i=0;i<9;i++){let x=((i/8)*W - (game.dist*.00045%1)*W*.12+W)%W;ctx.fillStyle='#83edff';ctx.shadowColor='#45d9ff';ctx.shadowBlur=10;ctx.fillRect(x,horizon-42,2,42);ctx.shadowBlur=0;ctx.fillStyle='#ff744e';ctx.fillRect(x-1,horizon-44,4,2);}
  }
  function drawRoad(){
    const horizon=H*.31, bottom=H+30, curve=Math.sin(game.dist*.00035)*W*.035;
    const topHalf=W*.055, botHalf=W*.445;
    polygon([[W*.5+curve-topHalf,horizon],[W*.5+curve+topHalf,horizon],[W*.5+curve+botHalf,bottom],[W*.5+curve-botHalf,bottom]],'#20262c');
    polygon([[W*.5+curve-topHalf*.86,horizon],[W*.5+curve+topHalf*.86,horizon],[W*.5+curve+botHalf*.86,bottom],[W*.5+curve-botHalf*.86,bottom]],'#292e31');
    // scrolling asphalt texture
    for(let i=0;i<40;i++){const f=((i/40 + (game.dist*.0009)%1)%1);const y=horizon+Math.pow(f,1.55)*(bottom-horizon);const half=topHalf+(botHalf-topHalf)*f;const x=W*.5+curve*f;ctx.fillStyle=`rgba(190,205,196,${.015+f*.02})`;ctx.fillRect(x-half+Math.sin(i*31)*half*.45,y,2+f*3,1+f*2);}
    for(const sign of [-1,1]){
      polygon([[W*.5+curve+sign*topHalf*.91,horizon],[W*.5+curve+sign*topHalf*1.06,horizon],[W*.5+curve+sign*botHalf*1.04,bottom],[W*.5+curve+sign*botHalf*.88,bottom]],'#8f433c');
      polygon([[W*.5+curve+sign*topHalf*1.06,horizon],[W*.5+curve+sign*topHalf*1.11,horizon],[W*.5+curve+sign*botHalf*1.08,bottom],[W*.5+curve+sign*botHalf*1.04,bottom]],'#d5d3b8');
    }
    const phase=(game.dist*.0017)%1;
    for(let lane=-1;lane<=1;lane+=2){for(let i=0;i<14;i++){const f=((i/14+phase)%1);const y=horizon+Math.pow(f,1.58)*(bottom-horizon);const half=topHalf+(botHalf-topHalf)*f;const x=W*.5+curve*f+lane*half*.33;const len=4+f*34;ctx.fillStyle=`rgba(190,225,222,${.2+f*.42})`;ctx.fillRect(x-1,y,2+f*2,len);}}
    // passing roadside pylons
    for(let i=0;i<7;i++){const f=((i/7+(game.dist*.0011)%1)%1);const y=horizon+Math.pow(f,1.6)*(bottom-horizon);const half=topHalf+(botHalf-topHalf)*f;for(const side of [-1,1]){const x=W*.5+curve*f+side*(half+5+f*19);const scale=.2+f*.9;ctx.fillStyle='#334750';ctx.fillRect(x-2*scale,y-28*scale,4*scale,30*scale);ctx.fillStyle=i%2?'#ff744a':'#5beaff';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=8*scale;ctx.fillRect(x-4*scale,y-28*scale,8*scale,3*scale);ctx.shadowBlur=0;}}
    // edge glow
    ctx.strokeStyle='#42d7ed45';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(W*.5+curve-topHalf,horizon);ctx.lineTo(W*.5+curve-botHalf,bottom);ctx.moveTo(W*.5+curve+topHalf,horizon);ctx.lineTo(W*.5+curve+botHalf,bottom);ctx.stroke();
  }
  function drawEnemy(e){
    const p=project(e.lane,e.dist), s=p.scale; if(e.dist>900||p.y>H+30)return;
    const x=p.x,y=p.y, w=35*s*(e.type==='brute'?1.35:1), h=30*s*(e.type==='brute'?1.2:1);
    ctx.save();ctx.translate(x,y);ctx.shadowColor=e.flash?'#fff':'#c94cff';ctx.shadowBlur=e.flash?22:9*s;
    // glowing hover body
    ctx.fillStyle=e.flash?'#fff':(e.type==='brute'?'#9e4dc1':'#713d9c');ctx.beginPath();ctx.moveTo(-w*.65,-h*.15);ctx.lineTo(-w*.42,-h*.58);ctx.lineTo(-w*.12,-h*.75);ctx.lineTo(w*.37,-h*.56);ctx.lineTo(w*.65,-h*.16);ctx.lineTo(w*.48,h*.08);ctx.lineTo(-w*.48,h*.08);ctx.closePath();ctx.fill();
    ctx.shadowBlur=0;ctx.fillStyle='#e3adff';ctx.fillRect(-w*.17,-h*.51,w*.34,h*.09);ctx.fillStyle='#ff443f';ctx.fillRect(-w*.5,h*.02,w*.16,h*.07);ctx.fillRect(w*.34,h*.02,w*.16,h*.07);
    ctx.fillStyle='#3c234f';ctx.beginPath();ctx.ellipse(0,h*.12,w*.48,h*.15,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e24fff';ctx.fillRect(-w*.15,h*.12,w*.3,Math.max(1,2*s));
    if(e.hp>1){ctx.fillStyle='#16141f';ctx.fillRect(-w*.4,-h*.92,w*.8,3*s);ctx.fillStyle='#ff5b56';ctx.fillRect(-w*.4,-h*.92,w*.8*(e.hp/2),3*s);}
    ctx.restore();
  }
  function drawCar(){
    const x=W*.5+game.lane*W*.16+Math.sin(game.dist*.00035)*W*.035, y=H*.87, scale=Math.min(1,W/1000);game.carX=x;
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale); if(game.shake>0)ctx.translate(rand(-game.shake,game.shake),rand(-game.shake,game.shake));
    // nitro trail
    if(keys.has('Shift')&&game.nitro>0){for(let i=0;i<5;i++){ctx.fillStyle=i%2?'#36caff88':'#ffb24c99';ctx.beginPath();ctx.moveTo(-30+i*15,18);ctx.lineTo(-24+i*15,18);ctx.lineTo(-27+i*15,rand(45,76));ctx.closePath();ctx.fill();}}
    ctx.shadowColor='#00cfff';ctx.shadowBlur=22;ctx.fillStyle='#111b22';ctx.beginPath();ctx.moveTo(-65,16);ctx.lineTo(-57,-20);ctx.lineTo(-42,-39);ctx.lineTo(-24,-44);ctx.lineTo(26,-44);ctx.lineTo(50,-30);ctx.lineTo(61,5);ctx.lineTo(52,21);ctx.lineTo(-54,21);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
    // tires / chassis
    ctx.fillStyle='#090d10';ctx.fillRect(-59,-11,13,31);ctx.fillRect(47,-11,13,31);ctx.fillStyle='#69736f';ctx.fillRect(-58,-3,8,13);ctx.fillRect(50,-3,8,13);
    polygon([[-44,-28],[-29,-40],[21,-40],[40,-29],[49,2],[-49,2]],'#88928a');polygon([[-30,-35],[-20,-44],[19,-44],[32,-34]],'#314550');
    // cockpit and armor plating
    polygon([[-17,-36],[18,-36],[26,-20],[-23,-20]],'#14242c');ctx.strokeStyle='#67e5ee';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-18,-35);ctx.lineTo(-24,-20);ctx.lineTo(27,-20);ctx.lineTo(19,-35);ctx.stroke();
    ctx.fillStyle='#bcc2ae';ctx.fillRect(-47,-16,94,5);ctx.fillStyle='#f6cc73';ctx.fillRect(-47,-16,13,4);ctx.fillRect(34,-16,13,4);ctx.fillStyle='#ff4d42';ctx.fillRect(-42,6,13,4);ctx.fillRect(29,6,13,4);
    // turret and barrel
    ctx.fillStyle='#59635f';ctx.fillRect(-5,-52,10,14);ctx.fillStyle='#87938b';ctx.fillRect(-11,-54,22,6);ctx.fillStyle='#2c3f48';ctx.fillRect(-2,-66,4,16);ctx.fillStyle='#ffbb56';ctx.fillRect(-2,-67,4,2);
    ctx.restore();
  }
  function drawParticles(){for(const p of game.particles){ctx.globalAlpha=clamp(p.life,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
  function render(){drawBackground();drawRoad();game.enemies.slice().sort((a,b)=>b.dist-a.dist).forEach(drawEnemy);drawParticles();drawCar();if(game.rocketFx){ctx.save();ctx.strokeStyle='#ffba61';ctx.lineWidth=3;ctx.shadowColor='#ff672e';ctx.shadowBlur=15;ctx.beginPath();ctx.moveTo(game.carX,H*.82);ctx.lineTo(game.mouse.x,game.mouse.y);ctx.stroke();ctx.restore();}}
  function setToast(text){ui.toast.textContent=text;ui.toast.classList.add('show');game.toast=1.5;}
  function burst(x,y,color,n=18){for(let i=0;i<n;i++)game.particles.push({x,y,vx:rand(-190,190),vy:rand(-220,110),life:rand(.35,.9),size:rand(1,4),color});}
  function spawnEnemy(){const type=Math.random()<.24?'brute':'skimmer';game.enemies.push({lane:rand(-.88,.88),dist:rand(520,890),hp:type==='brute'?2:1,type,flash:0,attack:rand(1.6,3)});}
  function firePulse(){if(!running||game.fire>0)return;game.fire=.17;let best=null,score=Infinity;for(const e of game.enemies){const p=project(e.lane,e.dist),d=Math.hypot(p.x-game.mouse.x,p.y-game.mouse.y);if(d<65*p.scale+18&&d<score){best=e;score=d;}}if(best){best.hp--;best.flash=.1;burst(project(best.lane,best.dist).x,project(best.lane,best.dist).y-10,'#55eeff',5);if(best.hp<=0){const p=project(best.lane,best.dist);burst(p.x,p.y-10,'#ffb44d',20);game.enemies.splice(game.enemies.indexOf(best),1);game.kills++;game.nitro=Math.min(100,game.nitro+9);setToast('HOSTILE DOWN  + NITRO');}}else{burst(game.mouse.x,game.mouse.y,'#59eaff',2);}}
  function fireRocket(){if(!running||game.rocket>0)return;game.rocket=1.05;game.rocketFx=.16;const candidates=game.enemies.filter(e=>{const p=project(e.lane,e.dist);return Math.hypot(p.x-game.mouse.x,p.y-game.mouse.y)<130*p.scale+28;});if(candidates.length){const target=candidates.sort((a,b)=>a.dist-b.dist)[0],p=project(target.lane,target.dist);burst(p.x,p.y-8,'#ff8b45',32);game.enemies.splice(game.enemies.indexOf(target),1);game.kills++;setToast('ROCKET IMPACT  // HOSTILE DOWN');}else setToast('ROCKET AWAY');}
  function takeDamage(amount){if(game.invuln>0)return;game.armor=Math.max(0,game.armor-amount);game.invuln=.6;game.shake=8;ui.flash.style.opacity='.76';setTimeout(()=>ui.flash.style.opacity='0',110);setToast('ARMOR HIT');if(game.armor<=0)finish(false);}
  function update(dt){time+=dt;const accelerating=keys.has('ArrowUp')||keys.has('KeyW'), braking=keys.has('ArrowDown')||keys.has('KeyS'), boosting=(keys.has('ShiftLeft')||keys.has('ShiftRight')||keys.has('Shift'))&&game.nitro>0;
    const target=accelerating?225:braking?55:155;game.speed+=(target-game.speed)*Math.min(1,dt*(accelerating?1.25:1.55));if(boosting){game.speed=Math.min(290,game.speed+145*dt);game.nitro=Math.max(0,game.nitro-30*dt);}else game.nitro=Math.min(100,game.nitro+4.4*dt);
    let input=(keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0);if(Math.abs(input)<.1)input=game.touchSteer||0;game.steer+=(input-game.steer)*Math.min(1,dt*5.2);game.lane=clamp(game.lane+game.steer*dt*(game.speed/145)*1.12,-1.28,1.28);
    game.dist+=game.speed*dt*.0093;game.top=Math.max(game.top,game.speed);game.spawn-=dt;game.fire=Math.max(0,game.fire-dt);game.rocket=Math.max(0,game.rocket-dt);game.rocketFx=Math.max(0,(game.rocketFx||0)-dt);game.invuln=Math.max(0,game.invuln-dt);game.shake=Math.max(0,game.shake-dt*20);if(game.toast>0){game.toast-=dt;if(game.toast<=0)ui.toast.classList.remove('show');}
    if(game.spawn<=0){spawnEnemy();game.spawn=rand(1.0,1.8)*Math.max(.55,1-game.dist*.008);}
    for(let i=game.enemies.length-1;i>=0;i--){const e=game.enemies[i];e.dist-=game.speed*dt*.62;e.flash=Math.max(0,e.flash-dt);e.attack-=dt;if(e.dist<100&&Math.abs(e.lane-game.lane)<.55){if(e.attack<=0){takeDamage(e.type==='brute'?18:11);e.attack=2.2;}e.dist=120;}
      if(e.dist<-30){game.enemies.splice(i,1);}}
    for(let i=game.particles.length-1;i>=0;i--){const p=game.particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=290*dt;p.life-=dt;if(p.life<=0)game.particles.splice(i,1);}
    if(game.dist>8.5)finish(true);
    ui.speed.textContent=String(Math.round(game.speed)).padStart(3,'0');ui.speedFill.style.width=`${clamp(game.speed/290*100,0,100)}%`;ui.distance.textContent=game.dist.toFixed(1);ui.armorFill.style.width=`${game.armor}%`;ui.armor.textContent=game.armor;ui.nitroFill.style.width=`${game.nitro}%`;ui.nitroLabel.textContent=game.nitro>99?'READY':game.nitro>0?'CHARGING':'EMPTY';ui.threat.textContent=game.dist>5?'CRITICAL':game.dist>2.5?'ELEVATED':'LOW';
  }
  function loop(now){if(!running)return;const dt=Math.min(.04,(now-last)/1000||0);last=now;update(dt);render();requestAnimationFrame(loop);}
  function start(){init();running=true;ui.intro.classList.add('hidden');ui.end.classList.add('hidden');ui.crosshair.style.display='block';ui.crosshair.style.left='50%';ui.crosshair.style.top='55%';ui.objective.textContent='ELIMINATE HOSTILES • SURVIVE THE RUN';last=performance.now();requestAnimationFrame(loop);canvas.requestPointerLock?.();}
  function finish(win){if(!running)return;running=false;document.exitPointerLock?.();ui.crosshair.style.display='none';ui.title.textContent=win?'CHECKPOINT BREACHED':'RUN ENDED';ui.copy.textContent=win?'Blockade broken. The city is yours tonight.':'The blockade held. This time.';ui.finalDistance.textContent=game.dist.toFixed(1)+' KM';ui.finalKills.textContent=String(game.kills).padStart(2,'0');ui.finalSpeed.textContent=Math.round(game.top)+' KM/H';ui.end.classList.remove('hidden');}
  ui.start.addEventListener('click',start);ui.retry.addEventListener('click',start);
  addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='Space'){e.preventDefault();fireRocket();}});addEventListener('keyup',e=>keys.delete(e.code));
  canvas.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas){game.mouse.x=clamp(game.mouse.x+e.movementX,0,W);game.mouse.y=clamp(game.mouse.y+e.movementY,0,H);}else{game.mouse.x=e.clientX;game.mouse.y=e.clientY;}if(document.pointerLockElement===canvas){ui.crosshair.style.left=game.mouse.x+'px';ui.crosshair.style.top=game.mouse.y+'px';}});
  canvas.addEventListener('click',()=>{if(running)firePulse();});addEventListener('mousedown',e=>{if(running&&e.button===0)firePulse();});
  document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==canvas&&running)canvas.style.cursor='crosshair';else canvas.style.cursor='none';});
  $('#sound-btn').addEventListener('click',()=>{game.muted=!game.muted;$('#sound-btn').innerHTML=game.muted?'♫ <span>SOUND</span>':'♫ <span>ON</span>';});
  document.querySelectorAll('.steer-pad button').forEach(button=>{const key=button.dataset.key;button.addEventListener('pointerdown',e=>{e.preventDefault();game.touchSteer=key==='ArrowLeft'?-1:1;button.setPointerCapture(e.pointerId);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(ev,()=>game.touchSteer=0);});
  const fireButton=$('#mobile-fire'), boostButton=$('#mobile-boost');fireButton.addEventListener('pointerdown',e=>{e.preventDefault();firePulse();});boostButton.addEventListener('pointerdown',e=>{e.preventDefault();keys.add('Shift');});for(const ev of ['pointerup','pointercancel','lostpointercapture'])boostButton.addEventListener(ev,()=>keys.delete('Shift'));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)keys.clear();});
  render();
})();
