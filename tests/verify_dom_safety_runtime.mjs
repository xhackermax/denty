import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const app=fs.readFileSync('app.js','utf8');
function extractFunction(name){
  const start=app.indexOf(`function ${name}(`); assert.ok(start>=0,`${name} no encontrado`);
  const brace=app.indexOf('{',start); let depth=0;
  for(let i=brace;i<app.length;i++){
    if(app[i]==='{') depth++;
    else if(app[i]==='}' && --depth===0) return app.slice(start,i+1);
  }
  throw new Error(`${name} incompleta`);
}
const source=['toast','bindClick','openDrawer','closeDrawer','safePortalStorage','showAccountAccess'].map(extractFunction).join('\n');
const context={
  document:{querySelector:()=>null},
  window:{},
  sessionStorage:{setItem(){},removeItem(){},getItem(){return null;}},
  clearTimeout, setTimeout,
};
vm.createContext(context);
vm.runInContext(`const $=(sel)=>document.querySelector(sel); let selectedPortal=null; const ACCOUNT_PORTALS={admin:{icon:'x',title:'Admin',description:'d',status:'s',hint:'h'}}; ${source}; toast('x'); bindClick('#missing',()=>{}); openDrawer(); closeDrawer(); showAccountAccess('admin');`,context);
console.log('verify_dom_safety_runtime: OK');
