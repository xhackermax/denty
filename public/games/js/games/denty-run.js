(function (global) {
  'use strict';

  const TOOTH_BONUS = 25;
  const MAX_JUMPS = 2;

  function rectsOverlap(a,b){return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;}
  function runScore(distance, teethCollected){return Math.max(0,Math.floor(Number(distance)||0)) + Math.max(0,Math.floor(Number(teethCollected)||0))*TOOTH_BONUS;}
  function canJump(jumpsUsed){return Math.max(0,Number(jumpsUsed)||0) < MAX_JUMPS;}
  function classifyObstacleContact(prevBox, box, obstacle, vy){
    if(!rectsOverlap(box,obstacle)) return 'none';
    const prevBottom=prevBox.y+prevBox.h;
    const nowBottom=box.y+box.h;
    const landingFromAbove=Number(vy)>=0 && prevBottom<=obstacle.y+7 && nowBottom>=obstacle.y;
    return landingFromAbove?'land':'hit';
  }
  function playerOverHole(player, holes){
    const footX=player.x+player.w*.5;
    return (holes||[]).some(h=>footX>h.x+3 && footX<h.x+h.w-3);
  }
  function collectTeeth(teeth, hitbox){
    let collected=0;
    const remaining=[];
    for(const tooth of teeth||[]){
      if(rectsOverlap(hitbox,tooth)) collected++;
      else remaining.push(tooth);
    }
    return {collected,remaining};
  }

  function createGame(){
    const W=480,H=320,GROUND=256,STAND_H=62,SLIDE_H=36;
    let api,host,canvas,ctx,controls,raf,keyHandler,cleanupSwipe,paused=false,last=0;
    let player,obstacles,holes,teeth,spawnIn,holeSpawnIn,toothSpawnIn,speed,distance,dead=false,teethCollected=0,elapsed=0,toothId=0;

    function reset(){
      player={x:76,y:GROUND-STAND_H,w:34,h:STAND_H,vy:0,sliding:false,slideUntil:0,jumpsUsed:0,onSurface:true,fallingHole:false};
      obstacles=[];holes=[];teeth=[];spawnIn=1.35;holeSpawnIn=3.2;toothSpawnIn=.45;speed=170;distance=0;teethCollected=0;paused=false;dead=false;elapsed=0;toothId=0;last=performance.now();
      api.setScore(0);updateMeta();draw();raf=requestAnimationFrame(loop);
    }

    function updateMeta(){api.setMeta(`Dientes ${teethCollected} · +${teethCollected*TOOTH_BONUS} bonus · salto 2×`);}

    function standUp(){
      if(!player.sliding)return true;
      const bottom=player.y+player.h;
      const candidate={x:player.x,y:bottom-STAND_H,w:player.w,h:STAND_H};
      if(obstacles.some(o=>rectsOverlap(candidate,o)))return false;
      player.h=STAND_H;player.y=bottom-STAND_H;player.sliding=false;return true;
    }

    function jump(){
      if(dead||paused||!canJump(player.jumpsUsed))return;
      standUp();
      player.vy=player.jumpsUsed===0?-520:-470;
      player.jumpsUsed+=1;player.onSurface=false;player.fallingHole=false;
      global.DentyGames.shared.haptic(player.jumpsUsed===2?12:8);
      updateMeta();
    }

    function slide(){
      if(dead||paused||!player.onSurface)return;
      if(!player.sliding){
        const bottom=player.y+player.h;
        player.h=SLIDE_H;player.y=bottom-SLIDE_H;player.sliding=true;
      }
      player.slideUntil=performance.now()+700;
      global.DentyGames.shared.haptic(8);
    }

    function addObstacle(type,x=W+30){
      if(type==='overhead'){
        obstacles.push({x,y:GROUND-78,w:64,h:28,type:'overhead'});
      }else if(type==='platform'){
        obstacles.push({x,y:GROUND-48,w:78,h:48,type:'platform'});
      }else{
        const h=34+Math.random()*18;
        obstacles.push({x,y:GROUND-h,w:34+Math.random()*15,h,type:'ground'});
      }
    }

    function spawnObstaclePattern(){
      const r=Math.random();
      if(r<.34) addObstacle('ground');
      else if(r<.64) addObstacle('overhead');
      else if(r<.84) addObstacle('platform');
      else {
        if(Math.random()<.5){addObstacle('ground');addObstacle('overhead',W+190);}
        else {addObstacle('overhead');addObstacle('ground',W+195);}
      }
      spawnIn=1.15+Math.random()*.72;
    }

    function spawnHole(){
      const w=70+Math.random()*34;
      holes.push({x:W+40,w});
      holeSpawnIn=3.6+Math.random()*2.8;
    }

    function addTooth(x,y,phase=0){teeth.push({id:`t${++toothId}`,x,y,w:24,h:28,baseY:y,phase});}

    function spawnToothPattern(){
      const start=W+36;
      const pattern=Math.floor(Math.random()*4);
      if(pattern===0){for(let i=0;i<4;i++) addTooth(start+i*34,GROUND-58,i*.55);}
      else if(pattern===1){[GROUND-66,GROUND-96,GROUND-126,GROUND-96,GROUND-66].forEach((y,i)=>addTooth(start+i*33,y,i*.4));}
      else if(pattern===2){for(let i=0;i<3;i++) addTooth(start+i*36,GROUND-128+i*5,i*.65);}
      else {[GROUND-58,GROUND-84,GROUND-110,GROUND-136].forEach((y,i)=>addTooth(start+i*32,y,i*.48));}
      toothSpawnIn=1.55+Math.random()*1.15;
    }

    function playerHitbox(){return {x:player.x+6,y:player.y+4,w:player.w-12,h:player.h-6};}
    function rawPlayerBox(){return {x:player.x,y:player.y,w:player.w,h:player.h};}

    function finish(reason){
      if(dead)return;
      dead=true;paused=true;global.DentyGames.shared.haptic([18,45,28]);
      api.finish(runScore(distance,teethCollected),`${reason} · ${teethCollected} diente${teethCollected===1?'':'s'} · +${teethCollected*TOOTH_BONUS} bonus`);
    }

    function update(dt){
      elapsed+=dt;
      speed=Math.min(295,speed+dt*2.15);
      distance+=speed*dt*.085;

      const prevRaw=rawPlayerBox();
      const prevBox={x:prevRaw.x+5,y:prevRaw.y+3,w:prevRaw.w-10,h:prevRaw.h-5};
      player.onSurface=false;
      player.vy+=1250*dt;player.y+=player.vy*dt;

      spawnIn-=dt;if(spawnIn<=0)spawnObstaclePattern();
      holeSpawnIn-=dt;if(holeSpawnIn<=0)spawnHole();
      toothSpawnIn-=dt;if(toothSpawnIn<=0)spawnToothPattern();

      obstacles.forEach(o=>o.x-=speed*dt);
      obstacles=obstacles.filter(o=>o.x+o.w>-40);
      holes.forEach(h=>h.x-=speed*dt);
      holes=holes.filter(h=>h.x+h.w>-40);
      teeth.forEach(t=>{t.x-=speed*dt;t.y=t.baseY+Math.sin(elapsed*4.4+t.phase)*4;});
      teeth=teeth.filter(t=>t.x+t.w>-30);

      let safeLanding=null;
      const currentRaw=rawPlayerBox();
      const currentBox={x:currentRaw.x+5,y:currentRaw.y+3,w:currentRaw.w-10,h:currentRaw.h-5};
      for(const o of obstacles){
        const contact=classifyObstacleContact(prevBox,currentBox,o,player.vy);
        if(contact==='land'){
          if(!safeLanding||o.y<safeLanding.y)safeLanding=o;
        }else if(contact==='hit'){
          finish('Has chocado con un obstáculo');return;
        }
      }

      if(safeLanding){
        player.y=safeLanding.y-player.h;player.vy=0;player.jumpsUsed=0;player.onSurface=true;player.fallingHole=false;
      }else{
        const overHole=playerOverHole(player,holes);
        const floorY=GROUND-player.h;
        if(!player.fallingHole && player.vy>=0 && player.y>=floorY){
          if(overHole){
            player.fallingHole=true;
          }else{
            player.y=floorY;player.vy=0;player.jumpsUsed=0;player.onSurface=true;
          }
        }
      }

      if(player.sliding && performance.now()>=player.slideUntil)standUp();
      if(player.fallingHole && player.y>H+20){finish('Has caído en un agujero');return;}

      const hb=playerHitbox();
      const pickup=collectTeeth(teeth,hb);
      if(pickup.collected){teethCollected+=pickup.collected;teeth=pickup.remaining;global.DentyGames.shared.haptic(10);updateMeta();}

      api.setScore(runScore(distance,teethCollected));
    }

    function drawTooth(t){
      const cx=t.x+t.w/2,cy=t.y+t.h/2;
      ctx.save();ctx.translate(cx,cy);
      const bob=Math.sin(elapsed*4.4+t.phase);
      ctx.rotate(Math.sin(elapsed*2.1+t.phase)*.045);ctx.scale(1+bob*.018,1+bob*.018);
      ctx.beginPath();ctx.moveTo(-8,-8);ctx.bezierCurveTo(-9,-14,-4,-16,0,-13);ctx.bezierCurveTo(4,-16,9,-14,8,-8);ctx.bezierCurveTo(7,-2,5,5,3,11);ctx.bezierCurveTo(2,14,0,12,0,8);ctx.bezierCurveTo(0,12,-2,14,-3,11);ctx.bezierCurveTo(-5,5,-7,-2,-8,-8);ctx.closePath();
      ctx.fillStyle='#fff';ctx.shadowColor='rgba(64,85,168,.12)';ctx.shadowBlur=8;ctx.shadowOffsetY=3;ctx.fill();ctx.shadowColor='transparent';ctx.strokeStyle='rgba(64,85,168,.48)';ctx.lineWidth=1.5;ctx.lineJoin='round';ctx.stroke();ctx.restore();
    }

    function drawBackground(){
      ctx.fillStyle=global.DentyGames.shared.cssVar('--dg-canvas-bg','#f8fafc');ctx.fillRect(0,0,W,H);
      const farShift=(distance*1.5)%220;ctx.fillStyle=global.DentyGames.shared.cssVar('--dg-canvas-grid','rgba(64,85,168,.035)');
      for(let i=-1;i<4;i++){ctx.beginPath();ctx.arc(i*220-farShift+95,84+(i%2)*12,62,0,Math.PI*2);ctx.fill();}
      const midShift=(distance*3.5)%150;ctx.strokeStyle=global.DentyGames.shared.cssVar('--dg-canvas-grid','rgba(64,85,168,.07)');ctx.lineWidth=1.5;
      for(let i=-1;i<5;i++){const x=i*150-midShift+30;ctx.beginPath();ctx.moveTo(x,GROUND-12);ctx.quadraticCurveTo(x+42,GROUND-54,x+84,GROUND-12);ctx.stroke();}
    }

    function drawGround(){
      const sorted=holes.slice().sort((a,b)=>a.x-b.x);
      ctx.strokeStyle=global.DentyGames.shared.cssVar('--dg-canvas-grid-strong','rgba(64,85,168,.16)');ctx.lineWidth=2;ctx.lineCap='round';
      let cursor=20;
      for(const h of sorted){
        const start=Math.max(20,h.x),end=Math.min(W-20,h.x+h.w);
        if(start>cursor){ctx.beginPath();ctx.moveTo(cursor,GROUND+.5);ctx.lineTo(start,GROUND+.5);ctx.stroke();}
        if(end>20&&start<W-20){
          ctx.fillStyle='rgba(21,34,53,.055)';
          ctx.beginPath();ctx.moveTo(start,GROUND+1);ctx.quadraticCurveTo((start+end)/2,GROUND+28,end,GROUND+1);ctx.lineTo(end,GROUND+34);ctx.lineTo(start,GROUND+34);ctx.closePath();ctx.fill();
        }
        cursor=Math.max(cursor,end);
      }
      if(cursor<W-20){ctx.beginPath();ctx.moveTo(cursor,GROUND+.5);ctx.lineTo(W-20,GROUND+.5);ctx.stroke();}
      const laneShift=(distance*8)%74;ctx.strokeStyle=global.DentyGames.shared.cssVar('--dg-canvas-grid','rgba(64,85,168,.07)');ctx.lineWidth=3;
      for(let i=-1;i<8;i++){const x=i*74-laneShift;const blocked=sorted.some(h=>x+15>h.x&&x+15<h.x+h.w);if(blocked)continue;ctx.beginPath();ctx.moveTo(x,GROUND+18);ctx.lineTo(x+30,GROUND+18);ctx.stroke();}
    }

    function drawObstacles(){
      obstacles.forEach(o=>{
        global.DentyGames.shared.roundedRect(ctx,o.x,o.y,o.w,o.h,o.type==='overhead'?14:11);
        ctx.fillStyle=o.type==='overhead'?'#d9def5':o.type==='platform'?'#7280c8':'#4055a8';ctx.fill();
        if(o.type==='overhead'){
          ctx.fillStyle='#4055a8';global.DentyGames.shared.roundedRect(ctx,o.x+9,o.y+9,o.w-18,3,2);ctx.fill();
          ctx.strokeStyle='rgba(64,85,168,.28)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(o.x+10,o.y+o.h);ctx.lineTo(o.x+10,o.y+o.h+13);ctx.moveTo(o.x+o.w-10,o.y+o.h);ctx.lineTo(o.x+o.w-10,o.y+o.h+13);ctx.stroke();
        }
      });
    }

    function drawPlayer(){
      const airborne=!player.onSurface;
      const runPhase=elapsed*11;
      const bounce=!airborne&&!player.sliding?Math.sin(runPhase*2)*1.7:0;
      ctx.save();ctx.translate(player.x,player.y+bounce);
      ctx.strokeStyle='#4055a8';ctx.fillStyle='#4055a8';ctx.lineWidth=5;ctx.lineCap='round';ctx.lineJoin='round';
      if(player.sliding){
        ctx.beginPath();ctx.moveTo(4,25);ctx.quadraticCurveTo(17,19,31,25);ctx.stroke();ctx.beginPath();ctx.arc(31,15,6,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(15,26);ctx.lineTo(6,33);ctx.moveTo(24,25);ctx.lineTo(35,32);ctx.stroke();
      }else{
        const arm=Math.sin(runPhase)*7;const leg=Math.sin(runPhase)*9;
        ctx.beginPath();ctx.arc(20,8,6,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(18,17);ctx.lineTo(15,34);ctx.stroke();ctx.beginPath();ctx.moveTo(17,22);ctx.lineTo(30,26+arm*.35);ctx.moveTo(17,23);ctx.lineTo(8,29-arm*.35);ctx.stroke();ctx.beginPath();ctx.moveTo(15,34);ctx.lineTo(7+leg*.45,51);ctx.moveTo(15,34);ctx.lineTo(27-leg*.45,50);ctx.stroke();
      }
      if(player.jumpsUsed===2&&airborne){ctx.fillStyle='rgba(64,85,168,.13)';ctx.beginPath();ctx.arc(17,player.h+9,9,0,Math.PI*2);ctx.fill();}
      ctx.restore();
    }

    function draw(){ctx.clearRect(0,0,W,H);drawBackground();drawGround();teeth.forEach(drawTooth);drawObstacles();drawPlayer();}

    function loop(now){
      if(dead)return;
      const dt=Math.min(.034,(now-last)/1000||0);last=now;
      if(!paused)update(dt);
      draw();raf=requestAnimationFrame(loop);
    }

    function mount(container,passedApi){
      api=passedApi;host=container;
      host.innerHTML='<canvas class="game-canvas run-board" width="480" height="320" aria-label="Denty Run"></canvas><div class="gesture-hint"><span>↑ Saltar · 2×</span><span>↓ Agacharse</span></div>';
      canvas=host.querySelector('canvas');ctx=canvas.getContext('2d');controls=api.controls;controls.innerHTML='';
      cleanupSwipe=global.DentyGames.shared.bindSwipe(canvas,d=>{if(d==='up')jump();if(d==='down')slide();},{tap:jump,threshold:24});
      keyHandler=e=>{if(['ArrowUp',' ','w','W'].includes(e.key)){e.preventDefault();jump();}if(['ArrowDown','s','S'].includes(e.key)){e.preventDefault();slide();}};
      global.addEventListener('keydown',keyHandler);reset();
    }

    function pause(){paused=true;}
    function resume(){if(!dead){paused=false;last=performance.now();}}
    function restart(){cancelAnimationFrame(raf);reset();}
    function destroy(){cancelAnimationFrame(raf);cleanupSwipe?.();global.removeEventListener('keydown',keyHandler);}
    return{mount,pause,resume,restart,destroy};
  }

  const exported={TOOTH_BONUS,MAX_JUMPS,rectsOverlap,runScore,canJump,classifyObstacleContact,playerOverHole,collectTeeth,createGame};
  if(global.DentyGames)global.DentyGames.games.dentyRun=exported;
  if(typeof module!=='undefined'&&module.exports)module.exports=exported;
})(typeof window!=='undefined'?window:globalThis);
