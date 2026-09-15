import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const bundle=fs.readFileSync('denty-app.bundle.js','utf8');
const script=html.match(/<script data-denty-gateway-bootstrap>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'bootstrap inline no encontrado');

function el(id=''){
  const handlers={}; const classes=new Set();
  return {id,hidden:false,textContent:'',disabled:false,dataset:{},attributes:{},
    classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},
    addEventListener:(type,fn)=>handlers[type]=fn,
    click:()=>handlers.click?.(),
    setAttribute:(k,v)=>{this?.attributes&&(this.attributes[k]=v)},
    _handlers:handlers,
  };
}
const ids=['accountGateway','accountChooser','accountAccessStage','accountAccessIcon','accountAccessTitle','accountAccessDescription','accountAccessStatus','accountAccessHint','accountContinue','accountBack','appShell'];
const elements=Object.fromEntries(ids.map(id=>[id,el(id)]));
elements.accountAccessStage.hidden=true; elements.appShell.setAttribute=(k,v)=>elements.appShell.attributes[k]=v;
const buttons=['admin','user','patient'].map(type=>{const b=el();b.dataset.accountType=type;return b;});
const storage=new Map();
const context={
  document:{getElementById:id=>elements[id]||null,querySelectorAll:sel=>sel==='[data-account-type]'?buttons:[]},
  sessionStorage:{setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k),getItem:k=>storage.get(k)||null},
  window:{DentyAppReady:true,scrollTo:()=>{}},
};
vm.runInNewContext(script,context);
buttons[0].click();
assert.equal(elements.accountChooser.hidden,true);
assert.equal(elements.accountAccessStage.hidden,false);
assert.match(elements.accountAccessTitle.textContent,/Administrador/);
elements.accountContinue.click();
assert.equal(elements.accountGateway.hidden,true);
assert.equal(elements.appShell.attributes['aria-hidden'],'false');

const checks=[
  ['app guards sessionStorage',/function safePortalStorage[\s\S]{0,500}try\s*\{/.test(app)],
  ['no BAT instructions',!html.includes('ABRIR-DENTY.bat')&&!fs.existsSync('ABRIR-DENTY.bat')],
  ['page loads generated bundle',html.includes('src="./denty-app.bundle.js"')&&bundle.includes('window.DentyAppReady=true')],
  ['assets are relative',html.includes('href="./styles.css"')&&html.includes('src="./denty-logo.png"')]
];
for(const [name,ok] of checks){assert.ok(ok,name);console.log('✓',name);}
console.log('✓ real bootstrap click simulation: Administrador → Continuar');
console.log(`${checks.length+1}/${checks.length+1} runtime gateway checks passed`);
