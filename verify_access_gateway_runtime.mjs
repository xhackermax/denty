import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const bundle=fs.readFileSync('denty-app.bundle.js','utf8');

const extract=(re,label)=>{
  const m=app.match(re); assert.ok(m,`${label} no encontrado`); return m[0];
};
const source=[
  extract(/const ACCOUNT_PORTALS = \{[\s\S]*?\n\};/,'ACCOUNT_PORTALS'),
  extract(/function safePortalStorage\([\s\S]*?\n\}/,'safePortalStorage'),
  extract(/function showAccountChooser\([\s\S]*?\n\}/,'showAccountChooser'),
  extract(/function showAccountAccess\([\s\S]*?\n\}/,'showAccountAccess'),
  extract(/function enterSelectedPortal\([\s\S]*?\n\}/,'enterSelectedPortal'),
  extract(/function bindClick\([\s\S]*?\n\}/,'bindClick'),
  extract(/function bindAccountGateway\([\s\S]*?\n\}/,'bindAccountGateway'),
].join('\n');

function el(id=''){
  const classes=new Set();
  return {id,hidden:false,textContent:'',disabled:false,dataset:{},attributes:{},onclick:null,
    classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},
    click(){ this.onclick?.(); },
    setAttribute(k,v){ this.attributes[k]=v; },
  };
}
const ids=['accountGateway','accountChooser','accountAccessStage','accountAccessIcon','accountAccessTitle','accountAccessDescription','accountAccessStatus','accountAccessHint','accountContinue','accountBack','appShell'];
const elements=Object.fromEntries(ids.map(id=>[id,el(id)]));
elements.accountAccessStage.hidden=true;
const buttons=['admin','user','patient'].map(type=>{const b=el();b.dataset.accountType=type;return b;});
const storage=new Map();
const context={
  document:{querySelector:sel=>sel.startsWith('#')?elements[sel.slice(1)]||null:null,querySelectorAll:sel=>sel==='[data-account-type]'?buttons:[]},
  sessionStorage:{setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k),getItem:k=>storage.get(k)||null},
  window:{scrollTo:()=>{}},
  console,
};
vm.createContext(context);
vm.runInContext(`const $=(sel)=>document.querySelector(sel); const $$=(sel)=>Array.from(document.querySelectorAll(sel)); let selectedPortal=null; ${source}; bindAccountGateway();`,context);
buttons[0].click();
assert.equal(elements.accountChooser.hidden,true);
assert.equal(elements.accountAccessStage.hidden,false);
assert.match(elements.accountAccessTitle.textContent,/Administrador/);
elements.accountContinue.click();
assert.equal(elements.accountGateway.hidden,true);
assert.equal(elements.appShell.attributes['aria-hidden'],'false');

const checks=[
  ['single gateway implementation',!html.includes('data-denty-gateway-bootstrap')],
  ['app guards sessionStorage',/function safePortalStorage[\s\S]{0,500}try\s*\{/.test(app)],
  ['page loads generated bundle deferred',html.includes('src="./denty-app.bundle.js" defer')&&bundle.includes('window.DentyAppReady=true')],
  ['assets are relative',html.includes('href="./styles.css"')&&html.includes('src="./denty-logo.png"')]
];
for(const [name,ok] of checks){assert.ok(ok,name);console.log('✓',name);}
console.log('✓ real app gateway click simulation: Administrador → Continuar');
console.log(`${checks.length+1}/${checks.length+1} runtime gateway checks passed`);
