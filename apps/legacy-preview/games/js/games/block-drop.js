(function (global) {
  'use strict';

  function clearLines(board) {
    const width = board[0]?.length || 0;
    const kept = board.filter(row => !row.every(Boolean));
    const cleared = board.length - kept.length;
    while (kept.length < board.length) kept.unshift(Array(width).fill(0));
    return { board: kept, cleared };
  }

  const SHAPES = [
    [[1,1,1,1]], [[1,1],[1,1]], [[0,1,0],[1,1,1]],
    [[1,0,0],[1,1,1]], [[0,0,1],[1,1,1]], [[0,1,1],[1,1,0]], [[1,1,0],[0,1,1]],
  ];
  const COLORS = ['#2764d8','#008d8a','#4055a8','#6750b5','#2f8d62','#5578b7','#4f91a1'];

  function rotate(matrix) { return matrix[0].map((_,i)=>matrix.map(row=>row[i]).reverse()); }

  function createGame() {
    const W=10,H=16,CELL=40;
    let board, piece, api, host, canvas, ctx, controls, timer, keyHandler, cleanupSwipe, paused=false, score=0, lines=0;

    function emptyBoard(){ return Array.from({length:H},()=>Array(W).fill(0)); }
    function randomPiece(){ const id=Math.floor(Math.random()*SHAPES.length); return {shape:SHAPES[id].map(r=>r.slice()), x:Math.floor(W/2)-2, y:0, color:id+1}; }
    function collides(test=piece){
      for(let y=0;y<test.shape.length;y++) for(let x=0;x<test.shape[y].length;x++) if(test.shape[y][x]){
        const bx=test.x+x, by=test.y+y;
        if(bx<0||bx>=W||by>=H||(by>=0&&board[by][bx])) return true;
      }
      return false;
    }
    function lock(){
      piece.shape.forEach((row,y)=>row.forEach((v,x)=>{ if(v&&piece.y+y>=0) board[piece.y+y][piece.x+x]=piece.color; }));
      const out=clearLines(board); board=out.board;
      if(out.cleared){ lines+=out.cleared; score += [0,100,300,500,800][out.cleared] || out.cleared*250; global.DentyGames.shared.haptic(18); }
      piece=randomPiece();
      api.setScore(score); api.setMeta(`${lines} línea${lines===1?'':'s'} · nivel ${1+Math.floor(lines/6)}`);
      if(collides()){ paused=true; draw(); api.finish(score,'Tu composición llegó al límite.'); }
    }
    function move(dx,dy){ if(paused) return false; const test={...piece,x:piece.x+dx,y:piece.y+dy}; if(!collides(test)){ piece=test; draw(); return true; } if(dy>0){ lock(); draw(); } return false; }
    function rotatePiece(){ if(paused) return; const old=piece, candidate={...piece,shape:rotate(piece.shape)}; const offsets=[0,-1,1,-2,2]; for(const off of offsets){ const t={...candidate,x:candidate.x+off}; if(!collides(t)){ piece=t; global.DentyGames.shared.haptic(8); draw(); return; } } piece=old; }
    function hardDrop(){ if(paused) return; let cells=0; while(!collides({...piece,y:piece.y+1})){ piece={...piece,y:piece.y+1}; cells++; } score += cells*2; api.setScore(score); lock(); draw(); }
    function tick(){ if(!paused) move(0,1); }
    function drawTile(x,y,colorIndex,alpha=1){
      const pad=3; global.DentyGames.shared.roundedRect(ctx,x*CELL+pad,y*CELL+pad,CELL-pad*2,CELL-pad*2,9);
      ctx.globalAlpha=alpha; ctx.fillStyle=COLORS[(colorIndex-1)%COLORS.length]; ctx.fill(); ctx.globalAlpha=1;
    }
    function draw(){
      ctx.fillStyle='#f8fafc'; ctx.fillRect(0,0,W*CELL,H*CELL);
      ctx.strokeStyle='rgba(104,118,137,.055)'; ctx.lineWidth=1;
      for(let x=1;x<W;x++){ctx.beginPath();ctx.moveTo(x*CELL,0);ctx.lineTo(x*CELL,H*CELL);ctx.stroke();}
      for(let y=1;y<H;y++){ctx.beginPath();ctx.moveTo(0,y*CELL);ctx.lineTo(W*CELL,y*CELL);ctx.stroke();}
      board.forEach((row,y)=>row.forEach((v,x)=>{if(v) drawTile(x,y,v,.82);}));
      if(piece) piece.shape.forEach((row,y)=>row.forEach((v,x)=>{if(v) drawTile(piece.x+x,piece.y+y,piece.color,1);}));
    }
    function reset(){ board=emptyBoard();piece=randomPiece();paused=false;score=0;lines=0;api.setScore(0);api.setMeta('Toca para rotar · desliza para mover');draw(); }

    function mount(container,passedApi){
      api=passedApi;host=container;
      host.innerHTML='<canvas class="game-canvas block-board" width="400" height="640" aria-label="Tablero de Block Drop"></canvas>';
      canvas=host.querySelector('canvas');ctx=canvas.getContext('2d');controls=api.controls;
      controls.innerHTML=`<div class="block-controls"><button class="control" data-act="left" aria-label="Mover a la izquierda">${global.DentyGames.shared.icon('left')}</button><button class="control emphasized" data-act="rotate" aria-label="Rotar">${global.DentyGames.shared.icon('rotate')}</button><button class="control" data-act="right" aria-label="Mover a la derecha">${global.DentyGames.shared.icon('right')}</button><button class="control" data-act="drop" aria-label="Caída rápida">${global.DentyGames.shared.icon('down')}</button></div>`;
      controls.querySelectorAll('[data-act]').forEach(btn=>btn.addEventListener('click',()=>({left:()=>move(-1,0),right:()=>move(1,0),rotate:rotatePiece,drop:hardDrop}[btn.dataset.act])()));
      cleanupSwipe=global.DentyGames.shared.bindSwipe(canvas,(direction,payload)=>{ if(direction==='left')move(-1,0);else if(direction==='right')move(1,0);else if(direction==='down'){payload.magnitude>90?hardDrop():move(0,1);} },{tap:rotatePiece,threshold:22});
      keyHandler=e=>{const m={ArrowLeft:()=>move(-1,0),ArrowRight:()=>move(1,0),ArrowDown:()=>move(0,1),ArrowUp:rotatePiece,' ':hardDrop};if(m[e.key]){e.preventDefault();m[e.key]();}};
      global.addEventListener('keydown',keyHandler);reset();timer=global.setInterval(tick,520);
    }
    function pause(){paused=true;} function resume(){if(piece)paused=false;} function restart(){reset();} function destroy(){global.clearInterval(timer);cleanupSwipe?.();global.removeEventListener('keydown',keyHandler);}
    return {mount,pause,resume,restart,destroy};
  }

  const exported={clearLines,createGame};
  if(global.DentyGames)global.DentyGames.games.blockDrop=exported;
  if(typeof module!=='undefined'&&module.exports)module.exports=exported;
})(typeof window!=='undefined'?window:globalThis);
