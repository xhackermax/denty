(function (global) {
  'use strict';
  const W=720,H=420,GROUND=344;
  function createGame(){
    let api,host,canvas,ctx,raf=0,running=false,paused=false,last=0,ended=false,keyHandler,pointerHandler;
    let state;
    function reset(){
      state={player:{x:116,y:GROUND-34,w:32,h:32,vy:0,grounded:true},speed:250,distance:0,score:0,spawn:0.8,obstacles:[],teeth:[]};
      paused=false;ended=false;last=0;api?.setScore(0);api?.setMeta('Un toque para saltar · dificultad creciente');draw();
    }
    function jump(){
      if(!state||ended||paused||!state.player.grounded)return;
      state.player.vy=-590;state.player.grounded=false;global.DentyGames.shared.haptic(7);
    }
    function spawn(){
      const x=W+40,r=Math.random();
      if(r<.18){state.obstacles.push({x,w:82,h:16,y:GROUND-16,type:'platform'});}
      else if(r<.32){state.obstacles.push({x,w:70,h:8,y:GROUND+2,type:'gap'});}
      else if(r<.44){state.obstacles.push({x,w:66,h:16,y:GROUND-105,type:'bar',phase:Math.random()*Math.PI*2});}
      else{const h=28+Math.random()*28;state.obstacles.push({x,w:28+Math.random()*18,h,y:GROUND-h,type:'spike'});}
      if(Math.random()<.5)state.teeth.push({x:x+70,y:GROUND-90-Math.random()*70,r:9,taken:false});
    }
    function hit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
    function finish(){
      if(ended)return;ended=true;running=false;cancelAnimationFrame(raf);global.DentyGames.shared.haptic([18,40,28]);api.finish(state.score,'Llegaste muy lejos. Un intento más siempre cabe.');
    }
    function update(dt){
      const p=state.player;state.speed=Math.min(470,state.speed+dt*5.8);state.distance+=state.speed*dt;state.spawn-=dt;
      if(state.spawn<=0){spawn();state.spawn=.78+Math.random()*.72;}
      p.vy+=1580*dt;p.y+=p.vy*dt;if(p.y+p.h>=GROUND){p.y=GROUND-p.h;p.vy=0;p.grounded=true;}
      for(const o of state.obstacles){o.x-=state.speed*dt;if(o.type==='bar')o.y=GROUND-105+Math.sin(state.distance/90+o.phase)*42;}
      for(const t of state.teeth)t.x-=state.speed*dt;
      state.obstacles=state.obstacles.filter(o=>o.x+o.w>-30);state.teeth=state.teeth.filter(t=>t.x+t.r>-20&&!t.taken);
      for(const o of state.obstacles){if(o.type==='gap'){if(p.grounded&&p.x+p.w>o.x&&p.x<o.x+o.w){finish();return;}}else if(hit(p,o)){finish();return;}}
      for(const t of state.teeth){const dx=(p.x+p.w/2)-t.x,dy=(p.y+p.h/2)-t.y;if(dx*dx+dy*dy<(t.r+18)*(t.r+18)){t.taken=true;state.score+=25;}}
      state.score=Math.max(state.score,Math.floor(state.distance/14));api.setScore(state.score);
    }
    function draw(){
      if(!ctx||!state)return;ctx.clearRect(0,0,W,H);ctx.fillStyle='#f8fafc';ctx.fillRect(0,0,W,H);
      ctx.strokeStyle='rgba(50,75,100,.07)';ctx.lineWidth=1;for(let x=0;x<W;x+=48){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
      ctx.fillStyle='#e7f4f3';ctx.fillRect(0,GROUND,W,H-GROUND);ctx.fillStyle='#0b7777';ctx.fillRect(0,GROUND,W,3);
      for(const o of state.obstacles){if(o.type==='gap'){ctx.fillStyle='#f8fafc';ctx.fillRect(o.x,GROUND-2,o.w,H-GROUND+4);continue;}ctx.fillStyle=o.type==='spike'?'#4055a8':o.type==='bar'?'#6750b5':'#dbe7f5';if(o.type==='spike'){ctx.beginPath();ctx.moveTo(o.x,o.y+o.h);ctx.lineTo(o.x+o.w/2,o.y);ctx.lineTo(o.x+o.w,o.y+o.h);ctx.closePath();ctx.fill();}else{global.DentyGames.shared.roundedRect(ctx,o.x,o.y,o.w,o.h,7);ctx.fill();}}
      for(const t of state.teeth){ctx.fillStyle='#fff';ctx.strokeStyle='#008d8a';ctx.lineWidth=3;ctx.beginPath();ctx.arc(t.x,t.y,t.r,0,Math.PI*2);ctx.fill();ctx.stroke();}
      const p=state.player;ctx.save();ctx.translate(p.x+p.w/2,p.y+p.h/2);ctx.rotate(Math.min(.45,p.vy/1600));ctx.fillStyle='#008d8a';global.DentyGames.shared.roundedRect(ctx,-p.w/2,-p.h/2,p.w,p.h,9);ctx.fill();ctx.restore();
    }
    function frame(ts){if(!running)return;const dt=last?Math.min(.035,(ts-last)/1000):0;last=ts;if(!paused&&!ended)update(dt);draw();if(running)raf=requestAnimationFrame(frame);}
    function mount(container,passedApi){api=passedApi;host=container;host.innerHTML='<canvas class="game-canvas impossible-board" width="720" height="420" aria-label="Denty Impossible"></canvas>';canvas=host.querySelector('canvas');ctx=canvas.getContext('2d');api.controls.innerHTML='<button class="control emphasized impossible-jump" type="button">Saltar</button>';pointerHandler=()=>jump();canvas.addEventListener('pointerdown',pointerHandler);api.controls.querySelector('button').addEventListener('click',pointerHandler);keyHandler=e=>{if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();jump();}};global.addEventListener('keydown',keyHandler);reset();running=true;raf=requestAnimationFrame(frame);}
    function pause(){paused=true;}function resume(){if(!ended)paused=false;}function restart(){reset();running=true;cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);}function destroy(){running=false;cancelAnimationFrame(raf);canvas?.removeEventListener('pointerdown',pointerHandler);global.removeEventListener('keydown',keyHandler);host?.replaceChildren();}
    return{mount,pause,resume,restart,destroy};
  }
  const exported={createGame};if(global.DentyGames)global.DentyGames.games.dentyImpossible=exported;if(typeof module!=='undefined'&&module.exports)module.exports=exported;
})(typeof window!=='undefined'?window:globalThis);
