(function (global) {
  'use strict';
  const W=540,H=720,LANES=3;
  function createGame(){
    let api,host,canvas,ctx,raf=0,running=false,paused=false,last=0,ended=false,cleanupSwipe,keyHandler,pointerHandler,state;
    const laneX=i=>130+i*140;
    function reset(){state={lane:1,speed:250,distance:0,score:0,spawn:.8,cars:[],passes:0};paused=false;ended=false;last=0;api?.setScore(0);api?.setMeta('Cambia de carril · evita el tráfico');draw();}
    function moveLane(delta){if(!state||ended)return;state.lane=Math.max(0,Math.min(LANES-1,state.lane+delta));global.DentyGames.shared.haptic(6);}
    function spawn(){const lane=Math.floor(Math.random()*LANES);state.cars.push({lane,y:-110,w:70,h:116,counted:false,speed:state.speed*(.85+Math.random()*.25)});}
    function finish(){if(ended)return;ended=true;running=false;cancelAnimationFrame(raf);api.finish(state.score,'La carretera se complica cuanto más avanzas.');}
    function update(dt){state.speed=Math.min(560,state.speed+dt*7);state.distance+=state.speed*dt;state.spawn-=dt;if(state.spawn<=0){spawn();state.spawn=.58+Math.random()*.52;}
      const py=H-150,px=laneX(state.lane)-35;for(const car of state.cars){car.y+=car.speed*dt;if(!car.counted&&car.y>py+100){car.counted=true;state.passes++;state.score+=35;}if(car.lane===state.lane&&car.y+car.h>py&&car.y<py+106){finish();return;}}
      state.cars=state.cars.filter(c=>c.y<H+140);state.score=Math.max(state.score,Math.floor(state.distance/15)+state.passes*35);api.setScore(state.score);
    }
    function draw(){if(!ctx||!state)return;ctx.clearRect(0,0,W,H);ctx.fillStyle=global.DentyGames.shared.cssVar('--dg-road-edge','#edf2f4');ctx.fillRect(0,0,W,H);ctx.fillStyle=global.DentyGames.shared.cssVar('--dg-road-surface','#4c5965');ctx.fillRect(62,0,W-124,H);ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=5;ctx.setLineDash([26,24]);for(let i=1;i<LANES;i++){ctx.beginPath();ctx.moveTo(62+i*(W-124)/LANES,0);ctx.lineTo(62+i*(W-124)/LANES,H);ctx.stroke();}ctx.setLineDash([]);
      for(const c of state.cars){const x=laneX(c.lane)-35;ctx.fillStyle='#cbd8e6';global.DentyGames.shared.roundedRect(ctx,x,c.y,c.w,c.h,18);ctx.fill();ctx.fillStyle='#879caf';global.DentyGames.shared.roundedRect(ctx,x+10,c.y+18,c.w-20,31,9);ctx.fill();}
      const x=laneX(state.lane)-35,y=H-150;ctx.fillStyle='#008d8a';global.DentyGames.shared.roundedRect(ctx,x,y,70,106,20);ctx.fill();ctx.fillStyle='#dff4f2';global.DentyGames.shared.roundedRect(ctx,x+11,y+18,48,28,8);ctx.fill();}
    function frame(ts){if(!running)return;const dt=last?Math.min(.035,(ts-last)/1000):0;last=ts;if(!paused&&!ended)update(dt);draw();if(running)raf=requestAnimationFrame(frame);}
    function mount(container,passedApi){api=passedApi;host=container;host.innerHTML='<canvas class="game-canvas road-board" width="540" height="720" aria-label="Endless Road"></canvas>';canvas=host.querySelector('canvas');ctx=canvas.getContext('2d');api.controls.innerHTML='<div class="road-controls"><button class="control" data-move="-1" aria-label="Carril izquierdo">←</button><button class="control" data-move="1" aria-label="Carril derecho">→</button></div>';api.controls.querySelectorAll('[data-move]').forEach(b=>b.addEventListener('click',()=>moveLane(Number(b.dataset.move))));cleanupSwipe=global.DentyGames.shared.bindSwipe(canvas,d=>{if(d==='left')moveLane(-1);if(d==='right')moveLane(1);});pointerHandler=e=>{const r=canvas.getBoundingClientRect();moveLane((e.clientX-r.left)<r.width/2?-1:1);};canvas.addEventListener('pointerdown',pointerHandler);keyHandler=e=>{if(e.key==='ArrowLeft')moveLane(-1);if(e.key==='ArrowRight')moveLane(1);};global.addEventListener('keydown',keyHandler);reset();running=true;raf=requestAnimationFrame(frame);}
    function pause(){paused=true;}function resume(){if(!ended)paused=false;}function restart(){reset();running=true;cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);}function destroy(){running=false;cancelAnimationFrame(raf);cleanupSwipe?.();canvas?.removeEventListener('pointerdown',pointerHandler);global.removeEventListener('keydown',keyHandler);host?.replaceChildren();}
    return{mount,pause,resume,restart,destroy};
  }
  const exported={createGame};if(global.DentyGames)global.DentyGames.games.endlessRoad=exported;if(typeof module!=='undefined'&&module.exports)module.exports=exported;
})(typeof window!=='undefined'?window:globalThis);
