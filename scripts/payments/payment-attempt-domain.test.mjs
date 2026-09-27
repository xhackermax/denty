import assert from 'node:assert/strict'; const m=await import('../../src/domain/money.ts');
const rows=[]; const store={async find(c,p,k){return rows.find(x=>x.clinicId===c&&x.provider===p&&x.idempotencyKey===k)??null},async create(v){const r={id:'a1',...v};rows.push(r);return r},async update(id,v){Object.assign(rows.find(x=>x.id===id),v);return rows.find(x=>x.id===id)}};
const input={clinicId:'c',patientId:'p',provider:'stripe',amountCents:500,currency:'EUR',idempotencyKey:'same'};
const a=await m.createOrGetPaymentAttempt(store,input); const b=await m.createOrGetPaymentAttempt(store,input); assert.equal(a.id,b.id); assert.equal(rows.length,1);
await m.markPaymentAttempt(store,a,'processing'); assert.equal(a.providerStatus,'processing');
await assert.rejects(()=>m.markPaymentAttempt(store,a,'created'));
console.log('payment attempt domain: OK');
