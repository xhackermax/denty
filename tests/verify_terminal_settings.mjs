import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync('app.js','utf8');
let n=0,total=0;
function check(name,fn){total++;try{fn();n++;console.log('PASS',name)}catch(e){console.error('FAIL',name,'-',e.message);process.exitCode=1}}
check('settings navigation includes payments and terminals',()=>assert.match(app,/Pagos y datáfonos/));
check('payments settings editor exists',()=>assert.ok(app.includes('renderPaymentsSettingsEditor')));
check('settings can read provider status',()=>assert.ok(app.includes('/api/payments/status')));
check('settings can list readers',()=>assert.ok(app.includes('/api/payments/readers')));
check('settings can pair reader',()=>{assert.ok(app.includes('pairTerminalForm'));assert.ok(app.includes('/api/payments/readers/pair'));});
check('settings can save default reader',()=>assert.ok(app.includes('paymentSettingsForm')));
check('reader can be assigned per clinic site',()=>assert.ok(app.includes('reader_by_site')));
console.log(`\n${n}/${total} terminal settings checks passed`); if(process.exitCode) process.exit(process.exitCode);
