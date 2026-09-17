(function (global) {
  'use strict';
  const root = global.DentyGames = global.DentyGames || { games: {} };
  let patientId = '';
  let cachedDashboard = null;
  const activePlays = new Map();
  const PENDING_KEY = 'denty.games.pending-plays.v1';

  function readPending(){ try{return JSON.parse(global.sessionStorage.getItem(PENDING_KEY)||'{}')||{};}catch(_){return{};} }
  function writePending(value){ try{global.sessionStorage.setItem(PENDING_KEY,JSON.stringify(value));}catch(_){} }
  function rememberPlay(gameId,playId){const pending=readPending();pending[gameId]=playId;writePending(pending);activePlays.set(gameId,playId);}
  function forgetPlay(gameId){const pending=readPending();delete pending[gameId];writePending(pending);activePlays.delete(gameId);}
  async function request(path,options){
    const response=await fetch(path,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(options?.headers||{})},...options});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw Object.assign(new Error(payload?.error?.message||'No se pudo conectar con Denty.'),{status:response.status,payload});
    return payload;
  }
  function legacyAlias(){try{return root.shared?.getActiveProfile?.()?.alias||undefined;}catch(_){return undefined;}}
  function init(id){patientId=String(id||'');}
  async function dashboard(){
    if(!patientId)throw new Error('No se ha identificado al paciente.');
    const alias=legacyAlias();
    const query=alias?`?legacyAlias=${encodeURIComponent(alias)}`:'';
    cachedDashboard=await request(`/api/patient/${encodeURIComponent(patientId)}/games/dashboard${query}`);
    return cachedDashboard;
  }
  async function start(gameId){
    if(!patientId)throw new Error('No se ha identificado al paciente.');
    const result=await request(`/api/patient/${encodeURIComponent(patientId)}/games/plays/start`,{method:'POST',body:JSON.stringify({gameId,legacyAlias:legacyAlias()})});
    rememberPlay(gameId,result.playId);return result;
  }
  async function finish(gameId,score){
    const playId=activePlays.get(gameId)||readPending()[gameId];
    if(!playId)throw new Error('No hay una partida activa para finalizar.');
    const result=await request(`/api/patient/${encodeURIComponent(patientId)}/games/plays/${encodeURIComponent(playId)}/finish`,{method:'POST',body:JSON.stringify(score==null?{}:{score})});
    forgetPlay(gameId);return result;
  }
  async function generateVoucher(){return request(`/api/patient/${encodeURIComponent(patientId)}/games/voucher`,{method:'POST',body:'{}'});}
  root.serverSession={init,dashboard,start,finish,generateVoucher,cached:()=>cachedDashboard};
})(window);
