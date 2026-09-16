(function (global) {
  'use strict';

  const WIN_SCORE = 7;

  function clamp(value,min,max){return Math.min(max,Math.max(min,value));}

  function clampPaddle(position, side, table){
    const r=Number(table.paddleRadius||34);
    const mid=Number(table.h)/2;
    const x=clamp(Number(position.x)||0,r,Number(table.w)-r);
    const y=side==='top'
      ? clamp(Number(position.y)||0,r,mid-r)
      : clamp(Number(position.y)||0,mid+r,Number(table.h)-r);
    return {x,y};
  }

  function detectGoal(puck, table){
    const half=Number(table.goalWidth||170)/2;
    const cx=Number(table.w)/2;
    const r=Number(table.puckRadius||puck.r||16);
    const insideGoal=Number(puck.x)>=cx-half+r*.35 && Number(puck.x)<=cx+half-r*.35;
    if(!insideGoal)return null;
    if(Number(puck.y)<-r)return 'bottom';
    if(Number(puck.y)>Number(table.h)+r)return 'top';
    return null;
  }

  function resolvePaddleCollision(puck,paddle){
    const dx=Number(puck.x)-Number(paddle.x);
    const dy=Number(puck.y)-Number(paddle.y);
    const minDist=Number(puck.r||16)+Number(paddle.r||34);
    let dist=Math.hypot(dx,dy);
    if(dist>=minDist)return {...puck};
    if(dist<.001){dist=1;}
    const nx=dist>.001?dx/dist:0;
    const ny=dist>.001?dy/dist:-1;
    const pvx=Number(paddle.vx)||0;
    const pvy=Number(paddle.vy)||0;
    const incomingVx=Number(puck.vx)||0;
    const incomingVy=Number(puck.vy)||0;
    const relativeAlong=(incomingVx-pvx)*nx+(incomingVy-pvy)*ny;
    const impulse=Math.max(220,Math.abs(relativeAlong)*1.75+Math.hypot(pvx,pvy)*.5);
    let vx=incomingVx-relativeAlong*nx*1.7+nx*impulse;
    let vy=incomingVy-relativeAlong*ny*1.7+ny*impulse;
    const speed=Math.hypot(vx,vy)||1;
    const target=clamp(speed,220,760);
    vx=vx/speed*target;vy=vy/speed*target;
    return {...puck,x:Number(paddle.x)+nx*(minDist+.6),y:Number(paddle.y)+ny*(minDist+.6),vx,vy};
  }

  function createGame(){
    const W=720,H=420,MID=H/2,PADDLE_R=34,PUCK_R=16,GOAL_W=174;
    const table={w:W,h:H,paddleRadius:PADDLE_R,puckRadius:PUCK_R,goalWidth:GOAL_W};
    let api,host,canvas,ctx,raf,paused=false,orientationBlocked=false,dead=false,last=0,serveUntil=0,winner=null;
    let puck,paddles,scores,pointers=new Map(),resizeHandler,orientationHandler;

    function resetPaddles(){
      paddles={
        top:{x:W/2,y:96,targetX:W/2,targetY:96,r:PADDLE_R,vx:0,vy:0,color:'#008d8a'},
        bottom:{x:W/2,y:H-96,targetX:W/2,targetY:H-96,r:PADDLE_R,vx:0,vy:0,color:'#2764d8'}
      };
    }

    function resetPuck(direction){
      const angle=(Math.random()*.5-.25);
      const dir=direction==='top'?-1:direction==='bottom'?1:(Math.random()<.5?-1:1);
      puck={x:W/2,y:H/2,vx:Math.sin(angle)*260,vy:dir*Math.cos(angle)*260,r:PUCK_R,trail:[]};
      serveUntil=performance.now()+650;
    }

    function updateHud(){
      api.setScore?.(0);
      api.setMeta?.(`Teal ${scores.top} · ${scores.bottom} Azul · primero en ${WIN_SCORE}`);
      const top=host.querySelector('[data-hockey-score="top"]');
      const bottom=host.querySelector('[data-hockey-score="bottom"]');
      if(top)top.textContent=scores.top;
      if(bottom)bottom.textContent=scores.bottom;
    }

    function reset(){
      cancelAnimationFrame(raf);pointers.clear();paused=false;dead=false;winner=null;scores={top:0,bottom:0};resetPaddles();resetPuck();last=performance.now();updateHud();draw();raf=requestAnimationFrame(loop);
    }

    function canvasPoint(event){
      const rect=canvas.getBoundingClientRect();
      return {x:(event.clientX-rect.left)*W/rect.width,y:(event.clientY-rect.top)*H/rect.height};
    }

    function pointerSide(point){return point.y<MID?'top':'bottom';}

    function assignPointer(event){
      const point=canvasPoint(event),side=pointerSide(point);
      if([...pointers.values()].includes(side))return;
      pointers.set(event.pointerId,side);canvas.setPointerCapture?.(event.pointerId);movePointer(event);
    }

    function movePointer(event){
      const side=pointers.get(event.pointerId);if(!side)return;
      const point=clampPaddle(canvasPoint(event),side,table);
      paddles[side].targetX=point.x;paddles[side].targetY=point.y;
    }

    function releasePointer(event){pointers.delete(event.pointerId);}

    function scoreGoal(side){
      scores[side]+=1;global.DentyGames.shared.haptic([16,28,20]);updateHud();
      if(scores[side]>=WIN_SCORE){
        winner=side;dead=true;paused=true;
        api.finish?.(0,`${side==='top'?'Teal':'Azul'} gana ${scores.top}–${scores.bottom}.`);
        return;
      }
      resetPuck(side==='top'?'bottom':'top');
    }

    function updatePaddles(dt){
      for(const side of ['top','bottom']){
        const p=paddles[side];const prevX=p.x,prevY=p.y;
        const follow=1-Math.exp(-dt*25);
        p.x+=(p.targetX-p.x)*follow;p.y+=(p.targetY-p.y)*follow;
        const clamped=clampPaddle(p,side,table);p.x=clamped.x;p.y=clamped.y;
        p.vx=clamp((p.x-prevX)/Math.max(dt,.001),-900,900);p.vy=clamp((p.y-prevY)/Math.max(dt,.001),-900,900);
      }
    }

    function updatePuck(dt){
      if(performance.now()<serveUntil){puck.x=W/2;puck.y=H/2;return;}
      puck.x+=puck.vx*dt;puck.y+=puck.vy*dt;
      puck.vx*=Math.pow(.997,dt*60);puck.vy*=Math.pow(.997,dt*60);
      const speed=Math.hypot(puck.vx,puck.vy);
      if(speed<185){const k=185/(speed||1);puck.vx*=k;puck.vy*=k;}
      if(speed>760){const k=760/speed;puck.vx*=k;puck.vy*=k;}

      if(puck.x-puck.r<0){puck.x=puck.r;puck.vx=Math.abs(puck.vx);}
      if(puck.x+puck.r>W){puck.x=W-puck.r;puck.vx=-Math.abs(puck.vx);}

      const goalHalf=GOAL_W/2;
      const inMouth=puck.x>W/2-goalHalf && puck.x<W/2+goalHalf;
      if(!inMouth){
        if(puck.y-puck.r<0){puck.y=puck.r;puck.vy=Math.abs(puck.vy);}
        if(puck.y+puck.r>H){puck.y=H-puck.r;puck.vy=-Math.abs(puck.vy);}
      }

      puck=resolvePaddleCollision(puck,paddles.top);
      puck=resolvePaddleCollision(puck,paddles.bottom);
      const goal=detectGoal(puck,table);if(goal){scoreGoal(goal);return;}
      puck.trail.unshift({x:puck.x,y:puck.y});if(puck.trail.length>7)puck.trail.length=7;
    }

    function update(dt){updatePaddles(dt);if(!dead)updatePuck(dt);}

    function drawTable(){
      ctx.clearRect(0,0,W,H);ctx.fillStyle='#f8fafc';ctx.fillRect(0,0,W,H);
      ctx.strokeStyle='rgba(21,34,53,.09)';ctx.lineWidth=2;
      global.DentyGames.shared.roundedRect(ctx,12,12,W-24,H-24,28);ctx.stroke();
      ctx.setLineDash([9,12]);ctx.strokeStyle='rgba(21,34,53,.08)';ctx.beginPath();ctx.moveTo(28,MID);ctx.lineTo(W-28,MID);ctx.stroke();ctx.setLineDash([]);
      ctx.beginPath();ctx.arc(W/2,MID,58,0,Math.PI*2);ctx.strokeStyle='rgba(21,34,53,.055)';ctx.stroke();
      const gx=W/2-GOAL_W/2;
      ctx.lineWidth=5;ctx.lineCap='round';
      ctx.strokeStyle='rgba(0,141,138,.32)';ctx.beginPath();ctx.moveTo(gx,14);ctx.lineTo(gx+GOAL_W,14);ctx.stroke();
      ctx.strokeStyle='rgba(39,100,216,.30)';ctx.beginPath();ctx.moveTo(gx,H-14);ctx.lineTo(gx+GOAL_W,H-14);ctx.stroke();
    }

    function drawPaddle(p){
      const grad=ctx.createRadialGradient(p.x-9,p.y-10,4,p.x,p.y,p.r);
      grad.addColorStop(0,'rgba(255,255,255,.88)');grad.addColorStop(.12,p.color);grad.addColorStop(1,p.color);
      ctx.save();ctx.shadowColor='rgba(21,34,53,.12)';ctx.shadowBlur=14;ctx.shadowOffsetY=5;ctx.fillStyle=grad;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.shadowColor='transparent';ctx.strokeStyle='rgba(255,255,255,.58)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,p.r-6,0,Math.PI*2);ctx.stroke();ctx.restore();
    }

    function drawPuck(){
      puck.trail?.slice().reverse().forEach((t,i)=>{const alpha=(i+1)/(puck.trail.length+1)*.09;ctx.fillStyle=`rgba(21,34,53,${alpha})`;ctx.beginPath();ctx.arc(t.x,t.y,PUCK_R*(.55+i*.04),0,Math.PI*2);ctx.fill();});
      ctx.save();ctx.shadowColor='rgba(21,34,53,.16)';ctx.shadowBlur=10;ctx.shadowOffsetY=4;ctx.fillStyle='#152235';ctx.beginPath();ctx.arc(puck.x,puck.y,puck.r,0,Math.PI*2);ctx.fill();ctx.shadowColor='transparent';ctx.strokeStyle='rgba(255,255,255,.32)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(puck.x-3,puck.y-4,puck.r-5,Math.PI*.95,Math.PI*1.65);ctx.stroke();ctx.restore();
    }

    function draw(){drawTable();drawPaddle(paddles.top);drawPaddle(paddles.bottom);drawPuck();}

    function loop(now){
      if(dead)return;const dt=Math.min(.03,(now-last)/1000||0);last=now;if(!paused&&!orientationBlocked)update(dt);draw();raf=requestAnimationFrame(loop);
    }

    function orientationState(){
      const guard=host.querySelector('.hockey-orientation');if(!guard)return;
      const portrait=global.innerHeight>global.innerWidth && global.innerWidth<900;
      orientationBlocked=portrait;
      guard.hidden=!portrait;
      last=performance.now();
    }

    function mount(container,passedApi){
      api=passedApi;host=container;
      host.innerHTML=`<div class="hockey-wrap"><div class="hockey-score hockey-score-top"><span>TEAL</span><strong data-hockey-score="top">0</strong></div><canvas class="game-canvas hockey-board" width="720" height="420" aria-label="Air Hockey para dos jugadores"></canvas><div class="hockey-score hockey-score-bottom"><strong data-hockey-score="bottom">0</strong><span>AZUL</span></div><div class="hockey-orientation" hidden><div><strong>Gira el teléfono</strong><span>Air Hockey se juega en horizontal.</span></div></div></div>`;
      canvas=host.querySelector('canvas');ctx=canvas.getContext('2d');api.controls.innerHTML='';
      canvas.addEventListener('pointerdown',assignPointer);canvas.addEventListener('pointermove',movePointer);canvas.addEventListener('pointerup',releasePointer);canvas.addEventListener('pointercancel',releasePointer);canvas.addEventListener('contextmenu',e=>e.preventDefault());
      resizeHandler=()=>orientationState();orientationHandler=()=>orientationState();global.addEventListener('resize',resizeHandler);global.addEventListener('orientationchange',orientationHandler);
      reset();orientationState();
    }

    function pause(){paused=true;}
    function resume(){if(!dead){paused=false;last=performance.now();}}
    function restart(){reset();orientationState();}
    function destroy(){cancelAnimationFrame(raf);if(canvas){canvas.removeEventListener('pointerdown',assignPointer);canvas.removeEventListener('pointermove',movePointer);canvas.removeEventListener('pointerup',releasePointer);canvas.removeEventListener('pointercancel',releasePointer);}global.removeEventListener('resize',resizeHandler);global.removeEventListener('orientationchange',orientationHandler);pointers.clear();}
    return {mount,pause,resume,restart,destroy};
  }

  const exported={WIN_SCORE,clampPaddle,detectGoal,resolvePaddleCollision,createGame};
  if(global.DentyGames)global.DentyGames.games.airHockey=exported;
  if(typeof module!=='undefined'&&module.exports)module.exports=exported;
})(typeof window!=='undefined'?window:globalThis);
