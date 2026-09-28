import assert from 'node:assert/strict'; const m=await import('../../src/domain/money.ts');
let posted=0;const deps={async refresh(){return 'succeeded'},async markSucceeded(){},async post(){posted++;return 'pay'}};assert.equal(await m.reconcileProviderPayment({id:'a',providerStatus:'processing',ledgerPaymentId:undefined},deps),'pay');assert.equal(posted,1);assert.equal(await m.reconcileProviderPayment({id:'a',providerStatus:'succeeded',ledgerPaymentId:'existing'},deps),'existing');assert.equal(posted,1);
console.log('reconciliation domain: OK');
