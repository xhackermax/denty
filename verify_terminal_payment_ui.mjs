import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('styles.css','utf8');
let n=0,total=0;
function check(name,fn){total++;try{fn();n++;console.log('PASS',name)}catch(e){console.error('FAIL',name,'-',e.message);process.exitCode=1}}
check('payment modal exposes terminal checkout action',()=>assert.ok(app.includes('startTerminalPayment')));
check('card checkout posts to backend payment API',()=>assert.match(app,/paymentApi\(['"]\/api\/payments\/checkout['"]/));
check('terminal checkout polls provider state',()=>assert.ok(app.includes('pollTerminalCheckout')));
check('successful provider state becomes locally paid',()=>assert.match(app,/status\s*=\s*['"]paid['"]/));
check('failed checkout is persisted but not paid',()=>assert.ok(app.includes("'failed'")));
check('terminal checkout can be cancelled',()=>{assert.ok(app.includes('/api/payments/terminate'));assert.ok(app.includes('cancelTerminalPayment'));});
check('budget totals use settled payment helper',()=>assert.ok(app.includes('paymentAmountForBudget')));
check('terminal state has visible checkout styling',()=>assert.match(css,/terminal-payment/));
check('finance dashboard shows payment attempt status history',()=>{assert.ok(app.includes('renderPaymentHistory'));assert.ok(app.includes('verification_required'));});
console.log(`\n${n}/${total} terminal payment UI checks passed`); if(process.exitCode) process.exit(process.exitCode);
