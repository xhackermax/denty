import assert from 'node:assert/strict'; const m=await import('../../src/domain/money.ts');
let posts=0; const deps={async loadAttempt(){return {id:'a',providerStatus:'succeeded',ledgerPaymentId:undefined,clinicId:'c',patientId:'p',provider:'stripe',amountCents:500,currency:'EUR',idempotencyKey:'k'}},async postLedger(){posts++;return {id:'pay1'}},async linkLedger(){return undefined}};
const x=await m.postSucceededPayment('a',deps); const y=await m.postSucceededPayment('a',{...deps,async loadAttempt(){return {...await deps.loadAttempt(),ledgerPaymentId:'pay1'}}}); assert.equal(x,'pay1'); assert.equal(y,'pay1'); assert.equal(posts,1);
await assert.rejects(()=>m.postSucceededPayment('a',{...deps,async loadAttempt(){return {...await deps.loadAttempt(),providerStatus:'failed'}}}));
console.log('post payment domain: OK');
