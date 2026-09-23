(function (global) {
  'use strict';
  const W=600,H=600, friction=.985;
  const COURSES=[
    {par:3,start:{x:95,y:505},cup:{x:505,y:95},walls:[{x:250,y:180,w:100,h:25},{x:250,y:355,w:100,h:25}]},
    {par:4,start:{x:85,y:95},cup:{x:510,y:505},walls:[{x:170,y:180,w:260,h:24},{x:170,y:390,w:260,h:24},{x:405,y:205,w:24,h:185}]},
    {par:3,start:{x:105,y:495},cup:{x:500,y:105},walls:[{x:165,y:280,w:270,h:26},{x:285,y:145,w:26,h:135}]},
  ];
  function scoreGolf(totalStrokes,totalPar,holeInOnes){return Math.max(0,3000-totalStrokes*120+totalPar*40+holeInOnes*500);}
  function createGame(){
    let api,host,canvas,ctx,raf=0,running=false,paused=false,last=0,ended=false,pointerId=null,aim=null;
    let holeIndex=0,totalStrokes=0,holeStrokes=0,holeInOnes=0,ball={x:0,y:0,vx:0,vy:0,r:11};
    function course(){return COURSES[holeIndex];}
    function resetBall(){const c=course();ball={x:c.start.x,y:c.start.y,vx:0,vy:0,r:11};holeStrokes=0;aim=null;api?.setMeta(`Hoyo ${holeIndex+1}/3 · Par ${c.par} · Arrastra desde la bola para golpear`);}
    function reset(){holeIndex=0;totalStrokes=0;holeInOnes=0;ended=false;paused=false;last=0;resetBall();api?.setScore(scoreGolf(0,COURSES.reduce((n,c)=>n+c.par,0),0));draw();}
    function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}
    function onDown(e){if(paused||ended||Math.hypot(ball.vx,ball.vy)>8)return;const p=point(e);if(Math.hypot(p.x-ball.x,p.y-ball.y)>42)return;pointerId=e.pointerId;canvas.setPointerCapture?.(pointerId);aim=p;}
    function onMove(e){if(pointerId!==e.pointerId)return;aim=point(e);draw();}
    function onUp(e){if(pointerId!==e.pointerId||!aim)return;const p=point(e),dx=ball.x-p.x,dy=ball.y-p.y,mag=Math.hypot(dx,dy);pointerId=null;aim=null;if(mag<8)return;const power=Math.min(680,mag*4.4);ball.vx=dx/(mag||1)*power;ball.vy=dy/(mag||1)*power;holeStrokes++;totalStrokes++;global.DentyGames.shared.haptic(8);api.setMeta(`Hoyo ${holeIndex+1}/3 · Golpes ${holeStrokes} · Par ${course().par}`);}
    function rectHit(c,x,y){return x+ball.r>c.x&&x-ball.r<c.x+c.w&&y+ball.r>c.y&&y-ball.r<c.y+c.h;}
    function update(dt){if(ended)return;let nx=ball.x+ball.vx*dt,ny=ball.y+ball.vy*dt;
      if(nx-ball.r<24||nx+ball.r>W-24){ball.vx*=-.82;nx=Math.max(24+ball.r,Math.min(W-24-ball.r,nx));}
      if(ny-ball.r<24||ny+ball.r>H-24){ball.vy*=-.82;ny=Math.max(24+ball.r,Math.min(H-24-ball.r,ny));}
      for(const wall of course().walls){if(rectHit(wall,nx,ball.y)){ball.vx*=-.84;nx=ball.x;}if(rectHit(wall,ball.x,ny)){ball.vy*=-.84;ny=ball.y;}}
      ball.x=nx;ball.y=ny;const damp=Math.pow(friction,dt*60);ball.vx*=damp;ball.vy*=damp;if(Math.abs(ball.vx)<2)ball.vx=0;if(Math.abs(ball.vy)<2)ball.vy=0;
      const cup=course().cup;if(Math.hypot(ball.x-cup.x,ball.y-cup.y)<17&&Math.hypot(ball.vx,ball.vy)<90){if(holeStrokes===1)holeInOnes++;advanceHole();return;}
      if(holeStrokes>=12&&Math.hypot(ball.vx,ball.vy)<8)advanceHole(true);
    }
    function advanceHole(forced=false){const c=course();const msg=forced?'Máximo de golpes alcanzado':`Hoyo ${holeIndex+1} completado en ${holeStrokes} golpe${holeStrokes===1?'':'s'}`;holeIndex++;if(holeIndex>=COURSES.length){ended=true;running=false;cancelAnimationFrame(raf);const par=COURSES.reduce((n,h)=>n+h.par,0),score=scoreGolf(totalStrokes,par,holeInOnes);api.setScore(score);api.setMeta(`${totalStrokes} golpes · Par total ${par}`);global.setTimeout(()=>api.finish(score,`${msg}. Total: ${totalStrokes} golpes en 3 hoyos.`),180);return;}resetBall();api.setMeta(`${msg} · Hoyo ${holeIndex+1}/3 · Par ${course().par}`);}
    function draw(){if(!ctx)return;const c=course();ctx.clearRect(0,0,W,H);ctx.fillStyle=global.DentyGames.shared.cssVar('--dg-golf-bg','#e8f4ed');ctx.fillRect(0,0,W,H);ctx.strokeStyle=global.DentyGames.shared.cssVar('--dg-golf-line','#9bc7ad');ctx.lineWidth=3;ctx.strokeRect(24,24,W-48,H-48);for(const wall of c.walls){ctx.fillStyle=global.DentyGames.shared.cssVar('--dg-golf-wall','#d7e1e9');global.DentyGames.shared.roundedRect(ctx,wall.x,wall.y,wall.w,wall.h,8);ctx.fill();}
      ctx.fillStyle='#314a40';ctx.beginPath();ctx.arc(c.cup.x,c.cup.y,13,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#6b7d74';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(c.cup.x,c.cup.y-12);ctx.lineTo(c.cup.x,c.cup.y-63);ctx.stroke();ctx.fillStyle='#008d8a';ctx.beginPath();ctx.moveTo(c.cup.x,c.cup.y-63);ctx.lineTo(c.cup.x+34,c.cup.y-52);ctx.lineTo(c.cup.x,c.cup.y-42);ctx.closePath();ctx.fill();
      ctx.fillStyle='#fff';ctx.strokeStyle='#7c9185';ctx.lineWidth=2;ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);ctx.fill();ctx.stroke();if(aim){ctx.strokeStyle='#2764d8';ctx.lineWidth=3;ctx.setLineDash([8,8]);ctx.beginPath();ctx.moveTo(ball.x,ball.y);ctx.lineTo(ball.x+(ball.x-aim.x),ball.y+(ball.y-aim.y));ctx.stroke();ctx.setLineDash([]);}}
    function frame(ts){if(!running)return;const dt=last?Math.min(.035,(ts-last)/1000):0;last=ts;if(!paused)update(dt);draw();if(running)raf=requestAnimationFrame(frame);}
    function mount(container,passedApi){api=passedApi;host=container;host.innerHTML='<canvas class="game-canvas golf-board" width="600" height="600" aria-label="Mini Golf de 3 hoyos"></canvas>';canvas=host.querySelector('canvas');ctx=canvas.getContext('2d');api.controls.innerHTML='<div class="gesture-hint"><span>Arrastra hacia atrás</span><span>Suelta para golpear</span><span>3 hoyos</span></div>';canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',onUp);reset();running=true;raf=requestAnimationFrame(frame);}
    function pause(){paused=true;}function resume(){if(!ended)paused=false;}function restart(){cancelAnimationFrame(raf);reset();running=true;raf=requestAnimationFrame(frame);}function destroy(){running=false;cancelAnimationFrame(raf);canvas?.removeEventListener('pointerdown',onDown);canvas?.removeEventListener('pointermove',onMove);canvas?.removeEventListener('pointerup',onUp);canvas?.removeEventListener('pointercancel',onUp);host?.replaceChildren();}
    return{mount,pause,resume,restart,destroy};
  }
  const exported={scoreGolf,createGame};if(global.DentyGames)global.DentyGames.games.miniGolf=exported;if(typeof module!=='undefined'&&module.exports)module.exports=exported;
})(typeof window!=='undefined'?window:globalThis);
