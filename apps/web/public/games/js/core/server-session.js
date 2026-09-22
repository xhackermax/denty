(function (global) {
  'use strict';
  const root = global.DentyGames = global.DentyGames || { games: {} };
  let patientId = '';
  let cachedDashboard = null;
  let demoMode = false;
  let demoRecordNumber = '000001';
  let demoStorageKey = '';
  const activePlays = new Map();
  const PENDING_KEY = 'denty.games.pending-plays.v1';
  const DEMO_PATIENT_ID = 'demo-juan-perez';
  const DEMO_KEY = 'denty.games.demo-juan-perez.v1';
  const RANKED = new Set(['snake','blockDrop','dentyRun','memory','merge','dentyImpossible','miniGolf','breakoutDental','whackCavity','connectPuzzle','endlessRoad']);
  const ALL_GAMES = ['snake','blockDrop','dentyRun','memory','merge','airHockey','dentyImpossible','ticTacToeAi','ticTacToeLocal','miniGolf','breakoutDental','whackCavity','connectPuzzle','endlessRoad'];

  function readPending(){ try{return JSON.parse(global.sessionStorage.getItem(PENDING_KEY)||'{}')||{};}catch(_){return{};} }
  function writePending(value){ try{global.sessionStorage.setItem(PENDING_KEY,JSON.stringify(value));}catch(_){} }
  function rememberPlay(gameId,playId){const pending=readPending();pending[gameId]=playId;writePending(pending);activePlays.set(gameId,playId);}
  function forgetPlay(gameId){const pending=readPending();delete pending[gameId];writePending(pending);activePlays.delete(gameId);}
  function demoKey(){return demoStorageKey||DEMO_KEY;}
  function demoState(){
    const empty={rewardGamesCount:0,voucher:null,records:{}};
    try{return {...empty,...(JSON.parse(global.localStorage.getItem(demoKey())||'{}')||{})};}catch(_){return empty;}
  }
  function saveDemo(state){try{global.localStorage.setItem(demoKey(),JSON.stringify(state));}catch(_){} }
  function demoLabel(){const value=String(demoRecordNumber||'').trim();return value?`Ficha ••${value.slice(-4)}`:'Ficha ••----';}
  function demoReward(count){return Math.min(500,Math.floor(Math.max(0,Number(count)||0)/3)*100);}
  function demoDashboard(){
    const state=demoState();
    return {
      profile:{label:demoLabel()},
      visit:{active:!state.voucher,rewardGamesCount:state.rewardGamesCount||0,rewardPotentialCents:state.voucher?0:demoReward(state.rewardGamesCount),maxRewardCents:500,voucher:state.voucher||null},
      games:ALL_GAMES.map(id=>{
        if(!RANKED.has(id))return{id,leaderboard:[],personalBest:null,personalRank:null,gamesPlayed:null};
        const record=state.records?.[id]||{bestScore:0,gamesPlayed:0};
        return{id,leaderboard:record.bestScore>0?[{label:demoLabel(),score:record.bestScore}]:[],personalBest:record.bestScore||null,personalRank:record.bestScore>0?1:null,gamesPlayed:record.gamesPlayed||0};
      })
    };
  }
  function demoStart(gameId){
    if(!ALL_GAMES.includes(gameId))throw new Error('Juego no permitido.');
    const playId=`demo-${gameId}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    rememberPlay(gameId,playId);
    return{playId,gameId,startedAt:new Date().toISOString()};
  }
  function demoFinish(gameId,score){
    const playId=activePlays.get(gameId)||readPending()[gameId];
    if(!playId)throw new Error('No hay una partida activa para finalizar.');
    const state=demoState();
    state.records=state.records||{};
    let recordImproved=false,personalBest=null,personalRank=null;
    if(RANKED.has(gameId)){
      const current=state.records[gameId]||{bestScore:0,gamesPlayed:0};
      const nextScore=Math.max(0,Math.floor(Number(score)||0));
      recordImproved=nextScore>current.bestScore;
      state.records[gameId]={bestScore:Math.max(current.bestScore,nextScore),gamesPlayed:current.gamesPlayed+1};
      personalBest=state.records[gameId].bestScore||null;
      personalRank=personalBest?1:null;
    }
    if(!state.voucher)state.rewardGamesCount=Math.min(15,(state.rewardGamesCount||0)+1);
    saveDemo(state);forgetPlay(gameId);
    return{play:{id:playId,gameId,status:'FINISHED',score:score==null?null:Math.max(0,Math.floor(Number(score)||0)),countsForReward:!state.voucher},recordImproved,personalBest,personalRank,rewardGamesCount:state.rewardGamesCount,rewardPotentialCents:state.voucher?0:demoReward(state.rewardGamesCount)};
  }
  function demoVoucher(){
    const state=demoState();
    if(state.voucher)return state.voucher;
    const amountCents=demoReward(state.rewardGamesCount);
    if(amountCents<100)throw new Error('Necesitas al menos 3 partidas válidas.');
    state.voucher={id:'demo-voucher-0001',amountCents,status:'AVAILABLE'};
    saveDemo(state);return state.voucher;
  }
  async function request(path,options){
    const response=await fetch(path,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(options?.headers||{})},...options});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw Object.assign(new Error(payload?.error?.message||'No se pudo conectar con Denty.'),{status:response.status,payload});
    return payload;
  }
  function init(id,demoMarker,recordNumber){const marker=String(demoMarker||'');const juanDemo=String(id||'')===DEMO_PATIENT_ID||marker==='juan-perez';const legacyPreview=marker==='legacy-preview';demoMode=juanDemo||legacyPreview;patientId=juanDemo?DEMO_PATIENT_ID:String(id||'');demoRecordNumber=String(recordNumber||'').trim()||(juanDemo?'000001':'');demoStorageKey=juanDemo?DEMO_KEY:(legacyPreview?`denty.games.legacy-preview.${patientId||'unknown'}.v1`:'');cachedDashboard=null;}
  async function dashboard(){
    if(!patientId)throw new Error('No se ha identificado al paciente.');
    if(demoMode||patientId===DEMO_PATIENT_ID){cachedDashboard=demoDashboard();return cachedDashboard;}
    cachedDashboard=await request(`/api/patient/${encodeURIComponent(patientId)}/games/dashboard`);
    return cachedDashboard;
  }
  async function start(gameId){
    if(!patientId)throw new Error('No se ha identificado al paciente.');
    if(demoMode||patientId===DEMO_PATIENT_ID)return demoStart(gameId);
    const result=await request(`/api/patient/${encodeURIComponent(patientId)}/games/plays/start`,{method:'POST',body:JSON.stringify({gameId})});
    rememberPlay(gameId,result.playId);return result;
  }
  async function finish(gameId,score){
    if(demoMode||patientId===DEMO_PATIENT_ID)return demoFinish(gameId,score);
    const playId=activePlays.get(gameId)||readPending()[gameId];
    if(!playId)throw new Error('No hay una partida activa para finalizar.');
    const result=await request(`/api/patient/${encodeURIComponent(patientId)}/games/plays/${encodeURIComponent(playId)}/finish`,{method:'POST',body:JSON.stringify(score==null?{}:{score})});
    forgetPlay(gameId);return result;
  }
  async function generateVoucher(){
    if(demoMode||patientId===DEMO_PATIENT_ID)return demoVoucher();
    return request(`/api/patient/${encodeURIComponent(patientId)}/games/voucher`,{method:'POST',body:'{}'});
  }
  root.serverSession={init,dashboard,start,finish,generateVoucher,cached:()=>cachedDashboard};
})(window);
