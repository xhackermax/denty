(function (global) {
  'use strict';
  function createDeck(symbols, randomizer){
    const random = randomizer || Math.random;
    const cards=symbols.flatMap((symbol,i)=>[{id:`${i}a`,symbol},{id:`${i}b`,symbol}]);
    for(let i=cards.length-1;i>0;i--){const j=Math.floor(Number(random())*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
    return cards;
  }
  function createGame(){
    const symbols=['orbit','wave','spark','leaf','drop','moon','arch','diamond'];
    let api,host,controls,deck,first=null,second=null,locked=false,matches=0,moves=0,startTime=0,timer=null,paused=false;
    function scoreNow(){const seconds=Math.floor((Date.now()-startTime)/1000);return Math.max(100,2000-moves*48-seconds*5);}
    function updateMeta(){api.setScore(scoreNow());api.setMeta(`${matches}/8 parejas · ${moves} movimientos`);}
    function reset(){deck=createDeck(symbols,Math.random);first=second=null;locked=false;matches=0;moves=0;startTime=Date.now();paused=false;render();updateMeta();clearInterval(timer);timer=setInterval(()=>{if(!paused&&matches<8)updateMeta();},1000);}
    function render(){
      host.innerHTML=`<div class="memory-grid" role="grid" aria-label="Juego de memoria">${deck.map((card,index)=>`<button class="memory-card ${card.matched?'matched':''} ${card.revealed?'revealed':''}" data-index="${index}" role="gridcell" aria-label="${card.revealed||card.matched?'Carta '+card.symbol:'Carta oculta'}"><span class="memory-back"></span><span class="memory-face">${global.DentyGames.shared.memorySymbol(card.symbol)}</span></button>`).join('')}</div>`;
      host.querySelectorAll('.memory-card').forEach(btn=>btn.addEventListener('click',()=>flip(Number(btn.dataset.index))));
    }
    function flip(index){if(paused||locked)return;const card=deck[index];if(!card||card.matched||card.revealed)return;card.revealed=true;global.DentyGames.shared.haptic(8);render();if(first===null){first=index;return;}second=index;moves++;locked=true;const a=deck[first],b=deck[second];if(a.symbol===b.symbol){a.matched=b.matched=true;matches++;global.DentyGames.shared.haptic(18);first=second=null;locked=false;render();updateMeta();if(matches===8){clearInterval(timer);const score=scoreNow();api.setScore(score);api.finish(score,`${moves} movimientos · memoria completa`);}return;}setTimeout(()=>{a.revealed=b.revealed=false;first=second=null;locked=false;render();updateMeta();},650);}
    function mount(container,passedApi){api=passedApi;host=container;controls=api.controls;controls.innerHTML='';reset();}
    function pause(){paused=true;}function resume(){paused=false;}function restart(){reset();}function destroy(){clearInterval(timer);}return{mount,pause,resume,restart,destroy};
  }
  const exported={createDeck,createGame};if(global.DentyGames)global.DentyGames.games.memory=exported;if(typeof module!=='undefined'&&module.exports)module.exports=exported;
})(typeof window!=='undefined'?window:globalThis);
