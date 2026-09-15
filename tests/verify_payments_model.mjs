import assert from 'node:assert/strict';
import { defaultDb, migrateDb, isSettledPayment, paymentAmountForBudget } from '../apps/legacy-preview/logic.js';
let passed=0,total=0;
function check(name,fn){ total++; try{fn();passed++;console.log('PASS',name);}catch(e){console.error('FAIL',name,'-',e.message);process.exitCode=1;} }

check('default db has terminal payment settings',()=>{
  const db=defaultDb();
  assert.equal(typeof db.settings.payments,'object');
  assert.equal(db.settings.payments.currency,'EUR');
  assert.equal(db.settings.payments.default_reader_id,'');
});
check('legacy payments are migrated as paid records',()=>{
  const db=migrateDb({payments:[{id:1,patient_id:2,budget_id:3,amount:100,method:'tarjeta'}]});
  assert.equal(db.payments[0].status,'paid');
  assert.equal(db.payments[0].currency,'EUR');
});
check('settled helper accepts paid and successful only',()=>{
  assert.equal(isSettledPayment({status:'paid'}),true);
  assert.equal(isSettledPayment({status:'successful'}),true);
  assert.equal(isSettledPayment({status:'pending'}),false);
  assert.equal(isSettledPayment({status:'failed'}),false);
});
check('budget paid total excludes pending failed and cancelled attempts',()=>{
  const db=defaultDb();
  db.payments=[
    {id:1,budget_id:4,amount:50,status:'paid'},
    {id:2,budget_id:4,amount:20,status:'pending'},
    {id:3,budget_id:4,amount:10,status:'failed'},
    {id:4,budget_id:4,amount:5,status:'cancelled'},
    {id:5,budget_id:4,amount:15,status:'successful'},
  ];
  assert.equal(paymentAmountForBudget(db,4),65);
});
console.log(`\n${passed}/${total} payment model checks passed`);
if(process.exitCode) process.exit(process.exitCode);
