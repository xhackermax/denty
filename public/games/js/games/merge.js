(function (global) {
  'use strict';
  function mergeLine(line){
    const compact=line.filter(Boolean);const out=[];let score=0;
    for(let i=0;i<compact.length;i++){if(compact[i]===compact[i+1]){const value=compact[i]*2;out.push(value);score+=value;i++;}else out.push(compact[i]);}
    while(out.length<line.length)out.push(0);return{line:out,score};
  }
  function transpose(board){return board[0].map((_,x)=>board.map(row=>row[x]));}
  function reverseRows(board){return board.map(row=>row.slice().reverse());}
  function boardEqual(a,b){return a.every((r,y)=>r.every((v,x)=>v===b[y][x]));}
  function createGame(){
    let api,host,controls,board,score=0,paused=false,cleanupSwipe,keyHandler;
    function empty(){return Array.from({length:4},()=>Array(4).fill(0));}
    function freeCells(){const arr=[];board.forEach((r,y)=>r.forEach((v,x)=>{if(!v)arr.push({x,y});}));return arr;}
    function spawn(){const free=freeCells();if(!free.length)return;const p=free[Math.floor(Math.random()*free.length)];board[p.y][p.x]=Math.random()<.9?2:4;}
    function canMove(){if(freeCells().length)return true;for(let y=0;y<4;y++)for(let x=0;x<4;x++){if(x<3&&board[y][x]===board[y][x+1])return true;if(y<3&&board[y][x]===board[y+1][x])return true;}return false;}
    function processRows(input){let gained=0;const out=input.map(row=>{const m=mergeLine(row);gained+=m.score;return m.line;});return{board:out,gained};}
    function move(direction){if(paused)return;const before=board.map(r=>r.slice());let working=board.map(r=>r.slice()),result;
      if(direction==='left')result=processRows(working);
      else if(direction==='right'){working=reverseRows(working);result=processRows(working);result.board=reverseRows(result.board);}
      else if(direction==='up'){working=transpose(working);result=processRows(working);result.board=transpose(result.board);}
      else{working=transpose(working);working=reverseRows(working);result=processRows(working);result.board=reverseRows(result.board);result.board=transpose(result.board);}
      board=result.board;score+=result.gained;if(!boardEqual(before,board)){spawn();if(result.gained)global.DentyGames.shared.haptic(18);else global.DentyGames.shared.haptic(8);render();api.setScore(score);api.setMeta(`Mayor bloque ${Math.max(...board.flat())}`);if(!canMove()){paused=true;api.finish(score,'No quedan movimientos disponibles.');}}
    }
    function tileClass(v){if(v>=256)return'v256';if(v>=128)return'v128';if(v>=64)return'v64';if(v>=32)return'v32';if(v>=16)return'v16';if(v>=8)return'v8';if(v>=4)return'v4';return'v2';}
    function render(){host.innerHTML=`<div class="merge-board" role="grid" aria-label="Tablero Merge">${board.flatMap((row,y)=>row.map((v,x)=>`<div class="merge-cell" role="gridcell">${v?`<div class="merge-tile ${tileClass(v)}"><span>${v}</span></div>`:''}</div>`)).join('')}</div><div class="gesture-hint"><span>Desliza en cualquier dirección</span></div>`;}
    function reset(){board=empty();score=0;paused=false;spawn();spawn();render();api.setScore(0);api.setMeta('Desliza para combinar bloques iguales');}
    function mount(container,passedApi){api=passedApi;host=container;controls=api.controls;controls.innerHTML='';reset();cleanupSwipe=global.DentyGames.shared.bindSwipe(host,d=>move(d),{threshold:24});keyHandler=e=>{const map={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};if(map[e.key]){e.preventDefault();move(map[e.key]);}};global.addEventListener('keydown',keyHandler);}
    function pause(){paused=true;}function resume(){paused=false;}function restart(){reset();}function destroy(){cleanupSwipe?.();global.removeEventListener('keydown',keyHandler);}return{mount,pause,resume,restart,destroy};
  }
  const exported={mergeLine,createGame};if(global.DentyGames)global.DentyGames.games.merge=exported;if(typeof module!=='undefined'&&module.exports)module.exports=exported;
})(typeof window!=='undefined'?window:globalThis);
