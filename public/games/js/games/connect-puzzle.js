(function (global) {
  'use strict';
  const N=1,E=2,S=4,W=8;
  function rotate(mask){return ((mask<<1)&15)|((mask>>3)&1);}
  function scoreConnect(elapsedMs,rotations){return Math.max(0,5000-Math.floor(elapsedMs/20)-rotations*15);}
  function buildSolved(size=4){
    const path=[];for(let r=0;r<size;r++){const cols=Array.from({length:size},(_,i)=>i);if(r%2)cols.reverse();for(const c of cols)path.push({r,c});}
    const masks=Array(size*size).fill(0);const idx=(r,c)=>r*size+c;
    function dir(a,b){if(b.r===a.r-1)return N;if(b.c===a.c+1)return E;if(b.r===a.r+1)return S;return W;}
    function opposite(d){return d===N?S:d===S?N:d===E?W:E;}
    for(let i=0;i<path.length-1;i++){const a=path[i],b=path[i+1],d=dir(a,b);masks[idx(a.r,a.c)]|=d;masks[idx(b.r,b.c)]|=opposite(d);}
    return masks;
  }
  function connected(tiles,size=4){const opposite=d=>d===N?S:d===S?N:d===E?W:E;const steps=[[N,-1,0],[E,0,1],[S,1,0],[W,0,-1]];const seen=new Set([0]),queue=[0];while(queue.length){const i=queue.shift(),r=Math.floor(i/size),c=i%size,m=tiles[i];for(const [d,dr,dc] of steps){if(!(m&d))continue;const nr=r+dr,nc=c+dc;if(nr<0||nc<0||nr>=size||nc>=size)continue;const ni=nr*size+nc;if(!(tiles[ni]&opposite(d))||seen.has(ni))continue;seen.add(ni);queue.push(ni);}}return seen.has(tiles.length-1);}
  function createGame(){
    let api,host,size=4,solved=[],tiles=[],rotations=0,startAt=0,elapsedBeforePause=0,paused=false,ended=false,timer=0;
    function glyph(mask){const arms=[];if(mask&N)arms.push('<i class="n"></i>');if(mask&E)arms.push('<i class="e"></i>');if(mask&S)arms.push('<i class="s"></i>');if(mask&W)arms.push('<i class="w"></i>');return `<span class="pipe-dot"></span>${arms.join('')}`;}
    function elapsed(){return elapsedBeforePause+(paused?0:Date.now()-startAt);}
    function render(){if(!host)return;host.innerHTML=`<div class="connect-wrap"><div class="connect-head"><strong>${Math.floor(elapsed()/1000)}s</strong><span>${rotations} giros</span></div><div class="connect-grid">${tiles.map((m,i)=>`<button type="button" class="connect-tile ${i===0?'start':''} ${i===tiles.length-1?'end':''}" data-tile="${i}">${glyph(m)}</button>`).join('')}</div></div>`;host.querySelectorAll('[data-tile]').forEach(b=>b.addEventListener('click',()=>turn(Number(b.dataset.tile))));}
    function turn(i){if(paused||ended)return;tiles[i]=rotate(tiles[i]);rotations++;render();if(connected(tiles,size)){ended=true;clearInterval(timer);const ms=elapsed(),score=scoreConnect(ms,rotations);api.setScore(score);api.setMeta(`${Math.floor(ms/1000)} s · ${rotations} giros`);global.setTimeout(()=>api.finish(score,'Circuito conectado de principio a fin.'),180);}}
    function reset(){solved=buildSolved(size);tiles=solved.map(mask=>{let m=mask;const n=1+Math.floor(Math.random()*3);for(let i=0;i<n;i++)m=rotate(m);return m;});rotations=0;elapsedBeforePause=0;startAt=Date.now();paused=false;ended=false;api?.setScore(0);api?.setMeta('Gira las piezas hasta conectar inicio y final');clearInterval(timer);timer=setInterval(render,1000);render();}
    function mount(container,passedApi){api=passedApi;host=container;api.controls.innerHTML='<div class="gesture-hint"><span>Toca para girar</span><span>Conecta inicio → final</span></div>';reset();}
    function pause(){if(paused||ended)return;elapsedBeforePause+=Date.now()-startAt;paused=true;}function resume(){if(!paused||ended)return;paused=false;startAt=Date.now();}function restart(){reset();}function destroy(){clearInterval(timer);host?.replaceChildren();}
    return{mount,pause,resume,restart,destroy};
  }
  const exported={rotate,connected,scoreConnect,buildSolved,createGame};if(global.DentyGames)global.DentyGames.games.connectPuzzle=exported;if(typeof module!=='undefined'&&module.exports)module.exports=exported;
})(typeof window!=='undefined'?window:globalThis);
