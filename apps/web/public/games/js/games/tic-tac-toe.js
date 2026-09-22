(function (global) {
  'use strict';
  const WIN_LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  function winner(board){for(const [a,b,c] of WIN_LINES){if(board[a]&&board[a]===board[b]&&board[a]===board[c])return board[a];}return board.every(Boolean)?'draw':null;}
  function minimax(board,isMax){const result=winner(board);if(result==='O')return 10;if(result==='X')return -10;if(result==='draw')return 0;let best=isMax?-Infinity:Infinity;for(let i=0;i<9;i++){if(board[i])continue;board[i]=isMax?'O':'X';const value=minimax(board,!isMax);board[i]='';best=isMax?Math.max(best,value):Math.min(best,value);}return best;}
  function bestAiMove(board){let best=-Infinity,move=-1;for(let i=0;i<9;i++){if(board[i])continue;board[i]='O';const value=minimax(board,false);board[i]='';if(value>best){best=value;move=i;}}return move;}
  function createGame(options={}){
    const mode=options.mode==='local'?'local':'ai';
    const sessionGameId=mode==='local'?'ticTacToeLocal':'ticTacToeAi';
    let api,host,board,turn='X',finished=false,paused=false,clickHandler;const stats={wins:0,draws:0,losses:0};
    function render(){if(!host)return;host.innerHTML=`<div class="ttt-wrap"><div class="ttt-status">${finished?'Partida terminada':mode==='ai'?(turn==='X'?'Tu turno':'Turno de la máquina'):`Turno de ${turn}`}</div><div class="ttt-board" role="grid" aria-label="Tres en raya">${board.map((v,i)=>`<button type="button" class="ttt-cell ${v?'filled':''}" data-cell="${i}" aria-label="Casilla ${i+1}">${v||''}</button>`).join('')}</div><div class="ttt-mode">${mode==='ai'?`Contra la máquina · ${stats.wins} G / ${stats.draws} E / ${stats.losses} P`:'2 jugadores · mismo dispositivo'}</div></div>`;host.querySelectorAll('[data-cell]').forEach(btn=>btn.addEventListener('click',clickHandler));}
    function finishIfNeeded(){const result=winner(board);if(!result)return false;finished=true;if(mode==='ai'){if(result==='draw')stats.draws++;else if(result==='X')stats.wins++;else stats.losses++;}let text=result==='draw'?'Empate.':result==='X'?(mode==='ai'?'¡Has ganado!':'Gana X.'):(mode==='ai'?'Gana la máquina.':'Gana O.');render();api.setMeta(text);global.setTimeout(()=>api.finish(undefined,text),220);return true;}
    function aiTurn(){if(finished||mode!=='ai')return;const move=bestAiMove(board);if(move>=0)board[move]='O';turn='X';if(!finishIfNeeded())render();}
    function play(index){if(paused||finished||board[index])return;if(mode==='ai'&&turn!=='X')return;board[index]=turn;if(finishIfNeeded())return;if(mode==='ai'){turn='O';render();global.setTimeout(aiTurn,320);}else{turn=turn==='X'?'O':'X';render();}}
    clickHandler=e=>play(Number(e.currentTarget.dataset.cell));
    function reset(){board=Array(9).fill('');turn='X';finished=false;paused=false;api?.setScore(0);api?.setMeta(mode==='ai'?'Tú eres X · la máquina es O':'Dos jugadores · X empieza');render();}
    function mount(container,passedApi){api=passedApi;host=container;api.controls.innerHTML='<span class="gesture-hint"><span>Toca una casilla</span></span>';reset();}
    function pause(){paused=true;}function resume(){paused=false;}function restart(){reset();}function destroy(){host?.replaceChildren();}
    return{mount,pause,resume,restart,destroy,sessionGameId};
  }
  const exported={winner,minimax,bestAiMove,createGame};if(global.DentyGames)global.DentyGames.games.ticTacToe=exported;if(typeof module!=='undefined'&&module.exports)module.exports=exported;
})(typeof window!=='undefined'?window:globalThis);
