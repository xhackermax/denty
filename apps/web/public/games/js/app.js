(function (global) {
  'use strict';
  const DG = global.DentyGames;
  const shared = DG.shared;
  const app = document.getElementById('app');

  const games = [
    { id:'snake', key:'snake', name:'Snake', icon:'snake', accent:'#008d8a', soft:'#e4f6f5', desc:'Fluido, simple y preciso.', how:'Desliza sobre el tablero o usa la cruceta. Los bordes son infinitos: si sales por un lado, reapareces por el contrario. Solo pierdes al chocar con tu propio cuerpo.', recordMode:'live' },
    { id:'blockDrop', key:'blockDrop', name:'Block Drop', icon:'block', accent:'#2764d8', soft:'#eaf0fc', desc:'Encaja, limpia y continúa.', how:'Desliza a izquierda o derecha, toca para rotar y baja para acelerar. El botón ↓ hace caída rápida.', recordMode:'live' },
    { id:'dentyRun', key:'dentyRun', name:'Denty Run', icon:'run', accent:'#4055a8', soft:'#eceefa', desc:'Corre, esquiva y recoge dientes.', how:'Desliza ↑ para saltar. Puedes saltar una segunda vez en el aire. Desliza ↓ para agacharte bajo obstáculos altos. Puedes aterrizar encima de los obstáculos sin perder; solo mueres al chocarlos de frente o caer en un agujero. Cada diente suma 25 puntos.', recordMode:'live' },
    { id:'memory', key:'memory', name:'Memory', icon:'memory', accent:'#6750b5', soft:'#f0ecf9', desc:'Parejas, calma y memoria.', how:'Toca dos cartas para descubrirlas. Encuentra las ocho parejas con el menor número de movimientos.', recordMode:'finish' },
    { id:'merge', key:'merge', name:'Merge', icon:'merge', accent:'#2f8d62', soft:'#e8f4ed', desc:'Desliza y combina.', how:'Desliza en las cuatro direcciones. Dos bloques iguales se fusionan una sola vez en cada movimiento.', recordMode:'live' },
    { id:'airHockey', key:'airHockey', name:'Air Hockey', icon:'hockey', accent:'#008d8a', soft:'#e4f6f5', desc:'Dos personas. Un móvil. A siete goles.', how:'Gira el teléfono en horizontal. Cada jugador controla su pala con un dedo dentro de su mitad. Primero en llegar a 7 goles gana.', recordMode:'none', multiplayer:true },
  ];

  let current = null;
  let currentMeta = null;
  let currentScore = 0;
  let currentRecord = 0;
  let recordBroken = false;
  let paused = false;
  let menuOpen = false;

  function formatNumber(value){ return new Intl.NumberFormat('es-ES').format(Math.max(0,Math.floor(Number(value)||0))); }
  function gameStyle(meta){ return `--game-accent:${meta.accent};--game-soft:${meta.soft}`; }
  function esc(value){ return String(value ?? '').replace(/[&<>"']/g,ch=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch])); }

  function brand(right){
    return `<div class="brand-row"><div class="brand-lockup"><div class="brand-mark">${shared.icon('memory',18)}</div><div><div class="brand-name">Denty<i></i></div><div class="brand-sub">Games</div></div></div>${right || '<span class="demo-chip">Demo web</span>'}</div>`;
  }

  function renderAccess(message=''){
    destroyCurrent();
    const profiles=shared.getProfiles();
    app.innerHTML=`<main class="access-frame">${brand()}<section class="access-hero"><div class="access-icon">${shared.icon('user',26)}</div><p class="eyebrow">Denty Games</p><h1>Tu alias.<br>Y a jugar.</h1><p>Es lo único que necesitamos en esta demo. Se usará para tus récords y rankings, nunca tu nombre clínico.</p></section><section class="access-card"><form id="aliasForm" novalidate><label for="aliasInput">Alias</label><div class="alias-entry"><span>@</span><input id="aliasInput" name="alias" maxlength="18" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="MolarKing" aria-describedby="aliasHelp aliasError"><button class="primary-button access-submit" type="submit">Entrar</button></div><small id="aliasHelp">2–18 caracteres. Puedes cambiar de alias desde el hub.</small><p class="form-error" id="aliasError" ${message?'':'hidden'}>${esc(message)}</p></form></section>${profiles.length?`<section class="saved-profiles"><div class="section-heading"><h2>Perfiles en este dispositivo</h2><span>${profiles.length}</span></div><div class="profile-list">${profiles.map(p=>`<button type="button" class="profile-row" data-profile-id="${esc(p.id)}"><span class="profile-avatar">${esc(p.alias.slice(0,1).toUpperCase())}</span><span><strong>@${esc(p.alias)}</strong><small>Continuar con este perfil</small></span>${shared.icon('right',18)}</button>`).join('')}</div></section>`:''}<p class="footer-note">Demo local. La estructura está preparada para sustituir estos perfiles por autenticación y almacenamiento de servidor.</p></main>`;
    const input=document.getElementById('aliasInput');
    document.getElementById('aliasForm').addEventListener('submit',event=>{
      event.preventDefault();
      const result=shared.createProfile(input.value);
      if(!result.ok){const error=document.getElementById('aliasError');error.textContent=result.error;error.hidden=false;input.focus();return;}
      renderHub();
    });
    app.querySelectorAll('[data-profile-id]').forEach(btn=>btn.addEventListener('click',()=>{shared.setActiveProfile(btn.dataset.profileId);renderHub();}));
    setTimeout(()=>input?.focus(),0);
  }

  function card(meta){
    const record=shared.getRecord(meta.id);
    const footer=meta.multiplayer
      ? `<div class="record-row multiplayer-row"><span>Modo</span><strong>2 jugadores · local</strong></div>`
      : `<div class="record-row"><span>Récord personal</span><strong>${formatNumber(record)}</strong></div>`;
    return `<button class="game-card ${meta.multiplayer?'multiplayer-card':''}" type="button" data-game="${meta.id}" style="${gameStyle(meta)}"><div><div class="game-card-top"><span class="game-icon">${shared.icon(meta.icon,26)}</span><span class="arrow-hint">${shared.icon('right',18)}</span></div><h3>${meta.name}</h3><p>${meta.desc}</p></div>${footer}</button>`;
  }

  function renderHub(){
    destroyCurrent();
    const profile=shared.getActiveProfile();
    if(!profile){renderAccess();return;}
    const soloGames=games.filter(g=>!g.multiplayer);
    const records=soloGames.map(g=>({g,score:shared.getRecord(g.id)})).sort((a,b)=>b.score-a.score);
    const best=records[0];
    const played=records.filter(x=>x.score>0).length;
    const profileButton=`<button class="profile-chip" id="profileSwitch" type="button" aria-label="Cambiar perfil"><span class="profile-dot">${esc(profile.alias.slice(0,1).toUpperCase())}</span><span>@${esc(profile.alias)}</span>${shared.icon('switch',16)}</button>`;
    app.innerHTML=`<main class="app-frame">${brand(profileButton)}<section class="hero"><p class="eyebrow">Denty Paciente</p><h1>Un descanso rápido,<br>sin salir de Denty.</h1><p>Seis juegos sencillos y cuidados, incluido Air Hockey para dos personas. Sin anuncios, sin monedas y sin ruido visual.</p></section><section class="summary"><article class="summary-card"><small>Tu mejor marca</small><strong class="summary-value">${best?.score?formatNumber(best.score):'—'}</strong><small>${best?.score?best.g.name:'Juega una primera partida para guardar tu récord.'}</small></article><article class="summary-card"><small>Juegos probados</small><strong class="summary-value">${played}/${soloGames.length}</strong><small>Juegos individuales de @${esc(profile.alias)}.</small></article></section><div class="section-heading"><h2>Juegos</h2><span>Siempre disponibles</span></div><section class="games-grid">${games.map(card).join('')}</section><p class="footer-note">Perfil activo: <strong>@${esc(profile.alias)}</strong>. Esta demo separa los récords por alias. El backend real podrá sustituir este almacenamiento local sin cambiar los motores.</p></main>`;
    document.getElementById('profileSwitch').addEventListener('click',()=>{shared.clearActiveProfile();renderAccess();});
    app.querySelectorAll('[data-game]').forEach(btn=>btn.addEventListener('click',()=>openGame(btn.dataset.game)));
  }

  function openGame(id){
    const profile=shared.getActiveProfile();
    if(!profile){renderAccess('Elige un alias antes de jugar.');return;}
    destroyCurrent();
    const meta=games.find(g=>g.id===id);if(!meta)return;
    const factory=DG.games[meta.key]?.createGame;if(!factory)return;
    currentMeta=meta;current=factory();currentScore=0;currentRecord=shared.getRecord(id);recordBroken=false;paused=false;menuOpen=false;
    app.innerHTML=`<main class="game-frame game-${meta.id}" style="${gameStyle(meta)}"><header class="game-topbar"><button class="back-label" id="backBtn" type="button" aria-label="Salir del juego y volver a Juegos">${shared.icon('back',18)}<span>Juegos</span></button><div class="game-top-center"><strong>${meta.name}</strong><small>${meta.multiplayer?'2 jugadores · local':'@'+esc(profile.alias)}</small></div><button class="top-button" id="menuBtn" type="button" aria-label="Opciones">${shared.icon('more')}</button></header><div class="game-title-block"><span class="game-title-icon">${shared.icon(meta.icon,28)}</span><h2>${meta.name}</h2><p>${meta.desc}</p></div>${meta.multiplayer?`<section class="score-panel multiplayer-summary"><div class="score-main"><small>Modo</small><strong>2 jugadores</strong></div><div class="record-box"><small>Victoria</small><strong>7 goles</strong></div></section>`:`<section class="score-panel"><div class="score-main"><small>Puntuación</small><strong class="score-value" id="scoreValue">0</strong></div><div class="record-box"><small>Récord</small><strong id="recordValue">${formatNumber(currentRecord)}</strong></div></section>`}<div class="game-stage"><div id="gameHost" class="game-host"></div><div class="pause-curtain" id="pauseCurtain" hidden><div class="pause-card"><strong>Pausado</strong><span>Tu partida se queda exactamente aquí.</span><div class="pause-actions"><button type="button" class="secondary-button" id="pauseExit">Salir</button><button type="button" class="primary-button" id="resumeBtn">Continuar</button></div></div></div></div><div id="gameMeta" class="game-meta"></div><div id="gameControls" class="game-controls"></div><div class="menu-popover" id="gameMenu" hidden><button class="menu-item" id="pauseMenu" type="button">${shared.icon('pause',18)}<span>Pausar</span></button><button class="menu-item" id="restartMenu" type="button">${shared.icon('restart',18)}<span>Reiniciar partida</span></button><button class="menu-item" id="helpMenu" type="button">${shared.icon('memory',18)}<span>Cómo jugar</span></button><button class="menu-item danger" id="exitMenu" type="button">${shared.icon('exit',18)}<span>Salir del juego</span></button></div><aside class="instructions"><strong>Controles</strong>${meta.how}</aside></main><div class="overlay" id="overlay" hidden></div>`;

    const api={
      controls:document.getElementById('gameControls'),
      setScore(score){currentScore=Math.max(0,Math.floor(Number(score)||0));const scoreEl=document.getElementById('scoreValue');if(scoreEl)scoreEl.textContent=formatNumber(currentScore);if(!meta.multiplayer&&meta.recordMode==='live'&&currentScore>currentRecord){const saved=shared.saveRecord(meta.id,currentScore);currentRecord=saved.value;recordBroken=true;const el=document.getElementById('recordValue');if(el){el.textContent=formatNumber(currentRecord);el.classList.add('new-record');}}},
      setMeta(text){document.getElementById('gameMeta').textContent=String(text||'');},
      finish(score,subtitle){finishGame(score,subtitle);},
    };
    current.mount(document.getElementById('gameHost'),api);

    document.getElementById('backBtn').addEventListener('click',requestExitGame);
    document.getElementById('menuBtn').addEventListener('click',toggleMenu);
    document.getElementById('pauseMenu').addEventListener('click',()=>{toggleMenu(false);setPaused(true);});
    document.getElementById('restartMenu').addEventListener('click',()=>{toggleMenu(false);setPaused(false);current.restart();currentScore=0;recordBroken=false;});
    document.getElementById('helpMenu').addEventListener('click',()=>{toggleMenu(false);showInfo('Cómo jugar',meta.how);});
    document.getElementById('exitMenu').addEventListener('click',()=>{toggleMenu(false);requestExitGame();});
    document.getElementById('resumeBtn').addEventListener('click',()=>setPaused(false));
    document.getElementById('pauseExit').addEventListener('click',requestExitGame);
  }

  function requestExitGame(){
    if(!current){renderHub();return;}
    const wasPaused=paused;
    setPaused(true);
    const overlay=document.getElementById('overlay');
    overlay.hidden=false;
    overlay.innerHTML=`<section class="sheet compact-sheet" role="dialog" aria-modal="true" aria-label="Salir de la partida"><div class="sheet-icon">${shared.icon('exit',24)}</div><h2>¿Salir del juego?</h2><p>Volverás a Denty Games. Tus récords ya guardados de <strong>@${esc(shared.getActiveProfile()?.alias || '')}</strong> se mantienen.</p><div class="sheet-actions"><button type="button" class="secondary-button" id="cancelExitGame">Seguir jugando</button><button type="button" class="primary-button" id="confirmExitGame">Salir</button></div></section>`;
    document.getElementById('cancelExitGame').addEventListener('click',()=>{overlay.hidden=true;if(!wasPaused)setPaused(false);});
    document.getElementById('confirmExitGame').addEventListener('click',renderHub);
  }

  function setPaused(value){
    if(!current)return;paused=Boolean(value);const curtain=document.getElementById('pauseCurtain');if(paused){current.pause?.();if(curtain)curtain.hidden=false;}else{current.resume?.();if(curtain)curtain.hidden=true;}
  }

  function toggleMenu(force){
    const menu=document.getElementById('gameMenu');if(!menu)return;menuOpen=typeof force==='boolean'?force:!menuOpen;menu.hidden=!menuOpen;
  }

  function finishGame(score,subtitle){
    if(!currentMeta)return;
    currentScore=Math.max(0,Math.floor(Number(score)||0));
    if(currentMeta.multiplayer){
      setPaused(true);
      const overlay=document.getElementById('overlay');overlay.hidden=false;
      overlay.innerHTML=`<section class="sheet" role="dialog" aria-modal="true" aria-label="Fin de la partida"><div class="sheet-icon">${shared.icon('hockey',24)}</div><h2>Partida terminada</h2><p>${subtitle||'Air Hockey local para dos jugadores.'}</p><div class="sheet-actions"><button type="button" class="secondary-button" id="finishHome">Salir a Juegos</button><button type="button" class="primary-button" id="finishReplay">Revancha</button></div></section>`;
      document.getElementById('finishHome').addEventListener('click',renderHub);
      document.getElementById('finishReplay').addEventListener('click',()=>{overlay.hidden=true;setPaused(false);current.restart();});
      return;
    }
    let result={isNew:false,value:currentRecord};
    if(currentMeta.recordMode==='finish'||currentScore>currentRecord){result=shared.saveRecord(currentMeta.id,currentScore);currentRecord=result.value;recordBroken=recordBroken||result.isNew;}
    const record=document.getElementById('recordValue');if(record){record.textContent=formatNumber(currentRecord);if(recordBroken)record.classList.add('new-record');}
    setPaused(true);
    const overlay=document.getElementById('overlay');overlay.hidden=false;
    overlay.innerHTML=`<section class="sheet" role="dialog" aria-modal="true" aria-label="Fin de la partida"><div class="sheet-icon">${shared.icon(recordBroken?'trophy':currentMeta.icon,24)}</div><h2>${recordBroken?'Nuevo récord':'Partida terminada'}</h2><p>${subtitle||'Tu puntuación se ha guardado en este dispositivo.'}</p><div class="sheet-score">${formatNumber(currentScore)}</div><p>${recordBroken?'Nueva mejor marca personal.':'Récord personal: '+formatNumber(currentRecord)}</p><div class="sheet-actions"><button type="button" class="secondary-button" id="finishHome">Salir a Juegos</button><button type="button" class="primary-button" id="finishReplay">Jugar otra vez</button></div></section>`;
    document.getElementById('finishHome').addEventListener('click',renderHub);
    document.getElementById('finishReplay').addEventListener('click',()=>{overlay.hidden=true;setPaused(false);recordBroken=false;current.restart();});
  }

  function showInfo(title,text){
    const overlay=document.getElementById('overlay');if(!overlay)return;const wasPaused=paused;setPaused(true);overlay.hidden=false;overlay.innerHTML=`<section class="sheet" role="dialog" aria-modal="true"><div class="sheet-icon">${shared.icon(currentMeta.icon,24)}</div><h2>${title}</h2><p>${text}</p><div class="sheet-actions one"><button type="button" class="primary-button" id="infoClose">Entendido</button></div></section>`;document.getElementById('infoClose').addEventListener('click',()=>{overlay.hidden=true;if(!wasPaused)setPaused(false);});
  }

  function destroyCurrent(){if(current){try{current.destroy?.();}catch(_){}current=null;}currentMeta=null;paused=false;menuOpen=false;}

  document.addEventListener('visibilitychange',()=>{if(document.hidden&&current)setPaused(true);});
  if(shared.getActiveProfile()) renderHub(); else renderAccess();
})(window);
