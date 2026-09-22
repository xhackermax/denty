(function (global) {
  'use strict';
  const SESSION_SECONDS=45;
  function createGame(){
    let api,host,timer=0,spawnTimer=0,remaining=SESSION_SECONDS,score=0,streak=0,paused=false,ended=false,cells=[];
    function buildCells(){cells=Array.from({length:9},(_,i)=>({i,type:'empty',active:false}));}
    function targetMarkup(cell){if(!cell.active)return '<span class="whack-empty">+</span>';if(cell.type==='healthy')return '<span class="whack-symbol healthy" aria-label="Diente sano">✓</span><small>Sano</small>';return '<span class="whack-symbol cavity" aria-label="Caries">●</span><small>Caries</small>';}
    function render(){if(!host)return;host.innerHTML=`<div class="whack-wrap"><div class="whack-head"><strong>${remaining}s</strong><span>Racha ${streak}</span></div><div class="whack-grid">${cells.map(c=>`<button class="whack-cell ${c.active?c.type:''}" data-whack="${c.i}" type="button">${targetMarkup(c)}</button>`).join('')}</div></div>`;host.querySelectorAll('[data-whack]').forEach(b=>b.addEventListener('click',()=>hit(Number(b.dataset.whack))));}
    function spawn(){if(ended)return;if(!paused){for(const c of cells){c.active=false;c.type='empty';}const count=remaining<15?3:remaining<30?2:1;const used=new Set();for(let n=0;n<count;n++){let i;do{i=Math.floor(Math.random()*cells.length)}while(used.has(i));used.add(i);cells[i].active=true;cells[i].type=Math.random()<.24?'healthy':'cavity';}render();}const delay=Math.max(360,760-(SESSION_SECONDS-remaining)*8);spawnTimer=setTimeout(spawn,delay);}
    function hit(i){if(paused||ended)return;const c=cells[i];if(!c?.active)return;if(c.type==='healthy'){score=Math.max(0,score-60);streak=0;global.DentyGames.shared.haptic([8,18,8]);}else{streak++;score+=50+Math.min(100,streak*5);global.DentyGames.shared.haptic(6);}c.active=false;api.setScore(score);render();}
    function finish(){if(ended)return;ended=true;clearInterval(timer);clearInterval(spawnTimer);api.setMeta(`45 segundos · racha máxima de precisión`);api.finish(score,'Has limpiado tantas caries como has podido sin tocar dientes sanos.');}
    function reset(){clearInterval(timer);clearInterval(spawnTimer);buildCells();remaining=SESSION_SECONDS;score=0;streak=0;paused=false;ended=false;api?.setScore(0);api?.setMeta('Toca caries y bacterias · evita los dientes sanos');render();timer=setInterval(()=>{if(paused||ended)return;remaining--;if(remaining<=0){remaining=0;render();finish();}else render();},1000);spawn();}
    function mount(container,passedApi){api=passedApi;host=container;api.controls.innerHTML='<div class="gesture-hint"><span>45 segundos</span><span>● Caries = puntos</span><span>✓ Sano = penalización</span></div>';reset();}
    function pause(){paused=true;}function resume(){if(!ended)paused=false;}function restart(){reset();}function destroy(){clearInterval(timer);clearInterval(spawnTimer);host?.replaceChildren();}
    return{mount,pause,resume,restart,destroy};
  }
  const exported={createGame};if(global.DentyGames)global.DentyGames.games.whackCavity=exported;if(typeof module!=='undefined'&&module.exports)module.exports=exported;
})(typeof window!=='undefined'?window:globalThis);
