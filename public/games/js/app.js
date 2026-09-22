(function (global) {
  'use strict';
  const DG = global.DentyGames;
  const shared = DG.shared;
  const app = document.getElementById('app');

  const games = [
    { id:'snake', key:'snake', name:'Snake', icon:'snake', accent:'#008d8a', soft:'#e4f6f5', desc:'Fluido, simple y preciso.', how:'Desliza sobre el tablero o usa la cruceta. Los bordes son infinitos: si sales por un lado, reapareces por el contrario. Solo pierdes al chocar con tu propio cuerpo.', ranked:true, recordMode:'live' },
    { id:'blockDrop', key:'blockDrop', name:'Block Drop', icon:'block', accent:'#2764d8', soft:'#eaf0fc', desc:'Encaja, limpia y continúa.', how:'Desliza a izquierda o derecha, toca para rotar y baja para acelerar. El botón ↓ hace caída rápida.', ranked:true, recordMode:'live' },
    { id:'dentyRun', key:'dentyRun', name:'Denty Run', icon:'run', accent:'#4055a8', soft:'#eceefa', desc:'Corre, esquiva y recoge dientes.', how:'Desliza ↑ para saltar. Puedes saltar una segunda vez en el aire. Desliza ↓ para agacharte bajo obstáculos altos. Puedes aterrizar encima de los obstáculos sin perder; solo mueres al chocarlos de frente o caer en un agujero. Cada diente suma 25 puntos.', ranked:true, recordMode:'live' },
    { id:'memory', key:'memory', name:'Memory', icon:'memory', accent:'#6750b5', soft:'#f0ecf9', desc:'Parejas, calma y memoria.', how:'Toca dos cartas para descubrirlas. Encuentra las ocho parejas con el menor número de movimientos.', ranked:true, recordMode:'finish' },
    { id:'merge', key:'merge', name:'Merge', icon:'merge', accent:'#2f8d62', soft:'#e8f4ed', desc:'Desliza y combina.', how:'Desliza en las cuatro direcciones. Dos bloques iguales se fusionan una sola vez en cada movimiento.', ranked:true, recordMode:'live' },
    { id:'airHockey', key:'airHockey', name:'Air Hockey', icon:'hockey', accent:'#008d8a', soft:'#e4f6f5', desc:'Dos personas. Un móvil. A siete goles.', how:'Gira el teléfono en horizontal. Cada jugador controla su pala con un dedo dentro de su mitad. Primero en llegar a 7 goles gana.', ranked:false, recordMode:'none', multiplayer:true },
    { id:'dentyImpossible', key:'dentyImpossible', name:'Denty Impossible', icon:'impossible', accent:'#4055a8', soft:'#eceefa', desc:'Un toque. Un salto. Cada metro cuenta.', how:'El recorrido avanza solo. Toca la pantalla o pulsa Saltar para superar obstáculos. La velocidad aumenta poco a poco.', ranked:true, recordMode:'live' },
    { id:'ticTacToe', key:'ticTacToe', name:'Tres en raya', icon:'ttt', accent:'#6750b5', soft:'#f0ecf9', desc:'Contra la máquina o con otra persona.', how:'Elige un modo. Forma una línea de tres símbolos antes que tu rival.', ranked:false, recordMode:'none', modePicker:true },
    { id:'miniGolf', key:'miniGolf', name:'Mini Golf', icon:'golf', accent:'#2f8d62', soft:'#e8f4ed', desc:'Tres hoyos. Menos golpes, más puntos.', how:'Arrastra desde la bola hacia atrás para elegir dirección y potencia. Suelta para golpear. Completa los 3 hoyos con el menor número de golpes.', ranked:true, recordMode:'finish' },
    { id:'breakoutDental', key:'breakoutDental', name:'Breakout Dental', icon:'breakout', accent:'#2764d8', soft:'#eaf0fc', desc:'Rompe la placa y encadena combos.', how:'Mueve la pala con el dedo o las flechas. Mantén la bola en juego, rompe todos los bloques y aprovecha el combo.', ranked:true, recordMode:'live' },
    { id:'whackCavity', key:'whackCavity', name:'Whack-a-Cavity', icon:'whack', accent:'#008d8a', soft:'#e4f6f5', desc:'Caries sí. Dientes sanos no.', how:'Durante 45 segundos toca las caries que aparezcan. Evita los dientes sanos porque restan puntos y rompen la racha.', ranked:true, recordMode:'finish' },
    { id:'connectPuzzle', key:'connectPuzzle', name:'Conecta', icon:'connect', accent:'#6750b5', soft:'#f0ecf9', desc:'Gira piezas y completa el circuito.', how:'Toca cada pieza para girarla. Conecta el inicio con el final usando el menor tiempo y número de giros posible.', ranked:true, recordMode:'finish' },
    { id:'endlessRoad', key:'endlessRoad', name:'Endless Road', icon:'road', accent:'#4055a8', soft:'#eceefa', desc:'Tres carriles. Tráfico infinito.', how:'Desliza o toca izquierda/derecha para cambiar de carril. Esquiva el tráfico mientras la velocidad aumenta.', ranked:true, recordMode:'live' },
  ];
  const rewardMessages = [
    'Sentimos la espera. Hazla más entretenida: 3 partidas = 1 € de descuento.',
    'Tu tiempo también cuenta. Juega 3 partidas y gana 1 € de descuento.',
    '¿Un ratito de espera? Juega 3 partidas y llévate 1 € de descuento.',
    'En Denty hasta la espera tiene recompensa: 3 partidas = 1 € de descuento.',
  ];
  const rewardMessage = rewardMessages[Math.floor(Math.random()*rewardMessages.length)];

  let current=null,currentMeta=null,currentScore=0,currentRecord=0,recordBroken=false,paused=false,menuOpen=false,currentDashboard=null,finishConsumed=false;
  function formatNumber(value){return new Intl.NumberFormat('es-ES').format(Math.max(0,Math.floor(Number(value)||0)));}
  function gameStyle(meta){return `--game-accent:${meta.accent};--game-soft:${meta.soft}`;}
  function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));}
  function brand(right=''){return `<div class="brand-row"><div class="brand-lockup"><div class="brand-mark">${shared.icon('memory',18)}</div><div><div class="brand-name">Denty<i></i></div><div class="brand-sub">Games</div></div></div>${right}</div>`;}
  function gameData(id){return currentDashboard?.games?.find(game=>game.id===id)||null;}

  function rewardCard(visit){
    if(visit?.voucher){return `<section class="reward-card voucher-state"><p>${esc(rewardMessage)}</p><strong>Bono generado: ${(visit.voucher.amountCents/100).toFixed(0)} €</strong><span>${visit.voucher.status==='APPLIED'?'Aplicado por recepción':'Disponible para que recepción lo aplique'}</span><small>Máximo 5 € de descuento.</small></section>`;}
    if(!visit?.active){return `<section class="reward-card"><p>${esc(rewardMessage)}</p><strong>El bono se activa cuando recepción confirme tu llegada a sala de espera.</strong><small>Máximo 5 € de descuento.</small></section>`;}
    const count=Math.min(15,Number(visit.rewardGamesCount||0)),potential=Number(visit.rewardPotentialCents||0)/100,remaining=count<3?3-count:0;
    return `<section class="reward-card"><p>${esc(rewardMessage)}</p><div class="reward-progress"><strong>${count}/15 partidas · Bono potencial ${potential.toFixed(0)} €</strong><span style="--reward-progress:${Math.min(100,count/15*100)}%"></span></div>${remaining?`<span>Te faltan ${remaining} partida${remaining===1?'':'s'} para desbloquear 1 €.</span>`:`<button id="generateVoucher" class="primary-button">Generar bono de ${potential.toFixed(0)} €</button>`}<small>Máximo 5 € de descuento.</small></section>`;
  }
  function leaderboardHtml(data){
    if(!data?.leaderboard?.length)return '<div class="mini-leaderboard empty"><b>Ranking global</b><span>Aún no hay puntuaciones.</span></div>';
    return `<div class="mini-leaderboard"><b>Ranking global · Top 3</b><ol>${data.leaderboard.map((row,index)=>`<li><span>${index+1}. ${esc(row.label)}</span><strong>${formatNumber(row.score)}</strong></li>`).join('')}</ol></div>`;
  }
  function card(meta){
    const data=meta.ranked===false?null:gameData(meta.id);
    let footer='';
    if(meta.modePicker){
      footer='<div class="record-row multiplayer-row"><span>Modos</span><strong>Máquina · 2 jugadores</strong></div>';
    }else if(meta.ranked===false){
      footer=`<div class="record-row multiplayer-row"><span>Modo</span><strong>${meta.multiplayer?'2 jugadores · local':'Sin ranking'}</strong></div>`;
    }else{
      footer=`${leaderboardHtml(data)}<div class="record-row personal-rank"><span>Récord personal${data?.personalRank?` · Puesto #${data.personalRank}`:''}</span><strong>${data?.personalBest?formatNumber(data.personalBest):'—'}</strong></div>`;
    }
    return `<button class="game-card ${meta.ranked===false?'multiplayer-card':''}" type="button" data-game="${meta.id}" style="${gameStyle(meta)}"><div><div class="game-card-top"><span class="game-icon">${shared.icon(meta.icon,26)}</span><span class="arrow-hint">${shared.icon('right',18)}</span></div><h3>${meta.name}</h3><p>${meta.desc}</p></div>${footer}</button>`;
  }

  async function renderHub(){
    destroyCurrent();
    app.innerHTML=`<main class="app-frame">${brand()}<section class="hero"><p class="eyebrow">Denty Paciente</p><h1>Juega mientras esperas.</h1><p>Cada partida puede mejorar tu récord y, durante la espera confirmada por recepción, acercarte a tu bono.</p></section><section class="summary-card"><small>Cargando</small><strong>Rankings y récords...</strong></section></main>`;
    try{currentDashboard=await DG.serverSession.dashboard();}
    catch(error){
      currentDashboard={profile:{label:'Ficha ••----'},visit:{active:false,rewardGamesCount:0,rewardPotentialCents:0,maxRewardCents:500,voucher:null},games:games.map(g=>({id:g.id,leaderboard:[],personalBest:null,personalRank:null}))};
    }
    const profile=currentDashboard.profile||{label:'Ficha ••----'};
    app.innerHTML=`<main class="app-frame">${brand(`<span class="profile-chip static"><span class="profile-dot">#</span><span>${esc(profile.label||'Ficha ••----')}</span></span>`)}<section class="hero"><p class="eyebrow">Denty Paciente</p><h1>Juega mientras esperas.</h1><p class="patient-identity">Jugando como <strong>${esc(profile.label||'Ficha ••----')}</strong></p><p>Rankings entre pacientes de la clínica y tus mejores marcas, siempre dentro de Denty.</p></section>${rewardCard(currentDashboard.visit)}<div class="section-heading"><h2>Juegos</h2><span>Rankings y récords</span></div><section class="games-grid">${games.map(card).join('')}</section><p class="footer-note">Los rankings muestran solo una ficha parcialmente oculta. Tu nombre clínico nunca aparece en Denty Games.</p></main><div class="overlay" id="overlay" hidden></div>`;
    document.querySelectorAll('[data-game]').forEach(btn=>btn.addEventListener('click',()=>void openGame(btn.dataset.game)));
    const voucherButton=document.getElementById('generateVoucher');if(voucherButton)voucherButton.addEventListener('click',confirmVoucherDialog);
  }

  function confirmVoucherDialog(){
    const visit=currentDashboard?.visit;if(!visit?.active)return;const euros=(Number(visit.rewardPotentialCents||0)/100).toFixed(0),overlay=document.getElementById('overlay');if(!overlay)return;
    overlay.hidden=false;overlay.innerHTML=`<section class="sheet compact-sheet" role="dialog" aria-modal="true" aria-label="Generar bono"><div class="sheet-icon">${shared.icon('trophy',24)}</div><h2>¿Generar bono?</h2><p>Vas a generar un bono de ${euros} €. Solo puedes generar un bono por esta cita y después no podrás aumentarlo.</p><div class="sheet-actions"><button id="cancelVoucher" class="secondary-button" type="button">Seguir jugando</button><button id="confirmVoucher" class="primary-button" type="button">Generar bono</button></div></section>`;
    document.getElementById('cancelVoucher').addEventListener('click',()=>{overlay.hidden=true;});
    document.getElementById('confirmVoucher').addEventListener('click',async()=>{const button=document.getElementById('confirmVoucher');button.disabled=true;button.textContent='Generando…';try{await DG.serverSession.generateVoucher();overlay.hidden=true;await renderHub();}catch(error){button.disabled=false;button.textContent='Generar bono';showHubInfo('No se pudo generar el bono',error.message);}});
  }
  function showHubInfo(title,text){const overlay=document.getElementById('overlay');if(!overlay)return;overlay.hidden=false;overlay.innerHTML=`<section class="sheet compact-sheet" role="dialog" aria-modal="true"><h2>${esc(title)}</h2><p>${esc(text)}</p><div class="sheet-actions one"><button id="hubInfoClose" class="primary-button">Entendido</button></div></section>`;document.getElementById('hubInfoClose').addEventListener('click',()=>overlay.hidden=true);}
  async function beginServerPlay(gameId){try{await DG.serverSession.start(gameId);return true;}catch(error){showHubInfo('No se pudo iniciar la partida',error.message);return false;}}

  function chooseTicTacToeMode(meta){
    const overlay=document.getElementById('overlay');if(!overlay)return;
    overlay.hidden=false;overlay.innerHTML=`<section class="sheet compact-sheet" role="dialog" aria-modal="true" aria-label="Elegir modo"><div class="sheet-icon">${shared.icon('ttt',24)}</div><h2>Tres en raya</h2><p>¿Cómo quieres jugar?</p><div class="mode-choice-grid"><button class="mode-choice" id="ticAi" type="button"><strong>Contra la máquina</strong><span>Tú eres X. La máquina juega O.</span></button><button class="mode-choice" id="ticLocal" type="button"><strong>2 jugadores</strong><span>Comparte el móvil o la tablet.</span></button></div><button class="secondary-button mode-cancel" id="ticCancel" type="button">Cancelar</button></section>`;
    document.getElementById('ticCancel').addEventListener('click',()=>overlay.hidden=true);
    document.getElementById('ticAi').addEventListener('click',()=>{overlay.hidden=true;void launchGame(meta,'ticTacToeAi',{mode:'ai',modeLabel:'Contra la máquina',multiplayer:false});});
    document.getElementById('ticLocal').addEventListener('click',()=>{overlay.hidden=true;void launchGame(meta,'ticTacToeLocal',{mode:'local',modeLabel:'2 jugadores · local',multiplayer:true});});
  }

  async function openGame(id){
    const meta=games.find(g=>g.id===id);if(!meta)return;
    if(meta.modePicker){chooseTicTacToeMode(meta);return;}
    await launchGame(meta,meta.id,{multiplayer:Boolean(meta.multiplayer),modeLabel:meta.multiplayer?'2 jugadores · local':''});
  }

  async function launchGame(meta,sessionGameId,options={}){
    const factory=DG.games[meta.key]?.createGame;if(!factory)return;
    if(!(await beginServerPlay(sessionGameId)))return;
    destroyCurrent();currentMeta={...meta,sessionGameId,multiplayer:Boolean(options.multiplayer),modeLabel:options.modeLabel||'',ranked:meta.ranked!==false};current=factory(options);currentScore=0;currentRecord=Number(currentMeta.ranked?gameData(meta.id)?.personalBest||0:0);recordBroken=false;paused=false;menuOpen=false;finishConsumed=false;
    const playerLabel=currentDashboard?.profile?.label||'Ficha ••----';
    const scorePanel=currentMeta.ranked
      ? `<section class="score-panel"><div class="score-main"><small>Puntuación</small><strong class="score-value" id="scoreValue">0</strong></div><div class="record-box"><small>Récord</small><strong id="recordValue">${formatNumber(currentRecord)}</strong></div></section>`
      : `<section class="score-panel multiplayer-summary"><div class="score-main"><small>Modo</small><strong>${esc(currentMeta.modeLabel||'Partida local')}</strong></div><div class="record-box"><small>Ranking</small><strong>No aplica</strong></div></section>`;
    app.innerHTML=`<main class="game-frame game-${meta.id}" style="${gameStyle(meta)}"><header class="game-topbar"><button class="back-label" id="backBtn" type="button" aria-label="Salir del juego y volver a Juegos">${shared.icon('back',18)}<span>Juegos</span></button><div class="game-top-center"><strong>${meta.name}</strong><small>${currentMeta.multiplayer?'2 jugadores · local':esc(playerLabel)}</small></div><button class="top-button" id="menuBtn" type="button" aria-label="Opciones">${shared.icon('more')}</button></header><div class="game-title-block"><span class="game-title-icon">${shared.icon(meta.icon,28)}</span><h2>${meta.name}</h2><p>${meta.desc}</p></div>${scorePanel}<div class="game-stage"><div id="gameHost" class="game-host"></div><div class="pause-curtain" id="pauseCurtain" hidden><div class="pause-card"><strong>Pausado</strong><span>Tu partida se queda exactamente aquí.</span><div class="pause-actions"><button type="button" class="secondary-button" id="pauseExit">Salir</button><button type="button" class="primary-button" id="resumeBtn">Continuar</button></div></div></div></div><div id="gameMeta" class="game-meta"></div><div id="gameControls" class="game-controls"></div><div class="menu-popover" id="gameMenu" hidden><button class="menu-item" id="pauseMenu" type="button">${shared.icon('pause',18)}<span>Pausar</span></button><button class="menu-item" id="restartMenu" type="button">${shared.icon('restart',18)}<span>Reiniciar partida</span></button><button class="menu-item" id="helpMenu" type="button">${shared.icon('memory',18)}<span>Cómo jugar</span></button><button class="menu-item danger" id="exitMenu" type="button">${shared.icon('exit',18)}<span>Salir del juego</span></button></div><aside class="instructions"><strong>Controles</strong>${meta.how}</aside></main><div class="overlay" id="overlay" hidden></div>`;
    const api={controls:document.getElementById('gameControls'),setScore(score){currentScore=Math.max(0,Math.floor(Number(score)||0));const el=document.getElementById('scoreValue');if(el)el.textContent=formatNumber(currentScore);if(currentMeta.ranked&&currentScore>currentRecord){const r=document.getElementById('recordValue');if(r)r.classList.add('new-record');}},setMeta(text){const el=document.getElementById('gameMeta');if(el)el.textContent=String(text||'');},finish(score,subtitle){finishOnce(score,subtitle);}};
    current.mount(document.getElementById('gameHost'),api);
    document.getElementById('backBtn').addEventListener('click',requestExitGame);document.getElementById('menuBtn').addEventListener('click',toggleMenu);document.getElementById('pauseMenu').addEventListener('click',()=>{toggleMenu(false);setPaused(true);});document.getElementById('restartMenu').addEventListener('click',async()=>{toggleMenu(false);if(!(await beginServerPlay(currentMeta.sessionGameId)))return;finishConsumed=false;setPaused(false);current.restart();currentScore=0;recordBroken=false;});document.getElementById('helpMenu').addEventListener('click',()=>{toggleMenu(false);showInfo('Cómo jugar',meta.how);});document.getElementById('exitMenu').addEventListener('click',()=>{toggleMenu(false);requestExitGame();});document.getElementById('resumeBtn').addEventListener('click',()=>setPaused(false));document.getElementById('pauseExit').addEventListener('click',requestExitGame);
  }

  function finishOnce(score,subtitle){if(finishConsumed)return;finishConsumed=true;void finishGame(score,subtitle);}

  function requestExitGame(){if(!current){void renderHub();return;}const wasPaused=paused;setPaused(true);const overlay=document.getElementById('overlay');overlay.hidden=false;overlay.innerHTML=`<section class="sheet compact-sheet" role="dialog" aria-modal="true" aria-label="Salir de la partida"><div class="sheet-icon">${shared.icon('exit',24)}</div><h2>¿Salir del juego?</h2><p>Esta partida no contará para el ranking ni para el bono si no la terminas.</p><div class="sheet-actions"><button type="button" class="secondary-button" id="cancelExitGame">Seguir jugando</button><button type="button" class="primary-button" id="confirmExitGame">Salir</button></div></section>`;document.getElementById('cancelExitGame').addEventListener('click',()=>{overlay.hidden=true;if(!wasPaused)setPaused(false);});document.getElementById('confirmExitGame').addEventListener('click',()=>void renderHub());}
  function setPaused(value){if(!current)return;paused=Boolean(value);const curtain=document.getElementById('pauseCurtain');if(paused){current.pause?.();if(curtain)curtain.hidden=false;}else{current.resume?.();if(curtain)curtain.hidden=true;}}
  function toggleMenu(force){const menu=document.getElementById('gameMenu');if(!menu)return;menuOpen=typeof force==='boolean'?force:!menuOpen;menu.hidden=!menuOpen;}

  async function finishGame(score,subtitle){
    if(!currentMeta)return;currentScore=Math.max(0,Math.floor(Number(score)||0));let serverResult;
    try{serverResult=await DG.serverSession.finish(currentMeta.sessionGameId,currentMeta.ranked?currentScore:undefined);}catch(error){const overlay=document.getElementById('overlay');overlay.hidden=false;overlay.innerHTML=`<section class="sheet"><h2>Partida pendiente de guardar</h2><p>${esc(error.message)}</p><div class="sheet-actions one"><button class="primary-button" id="retryFinish">Reintentar guardar</button></div></section>`;document.getElementById('retryFinish').addEventListener('click',()=>void finishGame(currentScore,subtitle));return;}
    currentRecord=Number(serverResult.personalBest||0);recordBroken=Boolean(serverResult.recordImproved);setPaused(true);const overlay=document.getElementById('overlay');overlay.hidden=false;
    if(!currentMeta.ranked)overlay.innerHTML=`<section class="sheet"><div class="sheet-icon">${shared.icon(currentMeta.icon||'hockey',24)}</div><h2>Partida terminada</h2><p>${subtitle||'Partida local terminada.'}</p><div class="sheet-actions"><button type="button" class="secondary-button" id="finishHome">Salir a Juegos</button><button type="button" class="primary-button" id="finishReplay">${currentMeta.multiplayer?'Revancha':'Jugar otra vez'}</button></div></section>`;
    else overlay.innerHTML=`<section class="sheet"><div class="sheet-icon">${shared.icon(recordBroken?'trophy':currentMeta.icon,24)}</div><h2>${recordBroken?'Nuevo récord':'Partida terminada'}</h2><p>${subtitle||'Tu puntuación se ha guardado en Denty.'}</p><div class="sheet-score">${formatNumber(currentScore)}</div><p>${recordBroken?'Nueva mejor marca personal.':'Récord personal: '+formatNumber(currentRecord)}</p><div class="sheet-actions"><button type="button" class="secondary-button" id="finishHome">Salir a Juegos</button><button type="button" class="primary-button" id="finishReplay">${currentMeta.multiplayer?'Revancha':'Jugar otra vez'}</button></div></section>`;
    document.getElementById('finishHome').addEventListener('click',()=>void renderHub());document.getElementById('finishReplay').addEventListener('click',async()=>{if(!(await beginServerPlay(currentMeta.sessionGameId)))return;finishConsumed=false;overlay.hidden=true;setPaused(false);recordBroken=false;currentScore=0;current.restart();});
  }
  function showInfo(title,text){const overlay=document.getElementById('overlay');if(!overlay)return;const wasPaused=paused;setPaused(true);overlay.hidden=false;overlay.innerHTML=`<section class="sheet" role="dialog" aria-modal="true"><div class="sheet-icon">${shared.icon(currentMeta?.icon||'memory',24)}</div><h2>${esc(title)}</h2><p>${esc(text)}</p><div class="sheet-actions one"><button type="button" class="primary-button" id="infoClose">Entendido</button></div></section>`;document.getElementById('infoClose').addEventListener('click',()=>{overlay.hidden=true;if(!wasPaused)setPaused(false);});}
  function destroyCurrent(){if(current){try{current.destroy?.();}catch(_){}current=null;}currentMeta=null;paused=false;menuOpen=false;finishConsumed=false;}
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&current)setPaused(true);});
  const params=new URLSearchParams(global.location.search);DG.serverSession.init(params.get('patientId')||'',params.get('demo')||'',params.get('recordNumber')||'');void renderHub();
})(window);
