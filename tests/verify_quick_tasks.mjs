import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const app=readFileSync('app.js','utf8');
const html=readFileSync('index.html','utf8');

const checks=[
  ['quick task dialog is present',()=>assert.ok(html.includes('id="quickTaskModal"'))],
  ['home Tarea button has an event binding',()=>assert.match(app,/data-open-task[\s\S]{0,240}openQuickTaskModal|\$\$\('\[data-open-task\]'\)[\s\S]{0,180}openQuickTaskModal/)],
  ['quick launcher contains create patient',()=>assert.match(app,/data-quick-task="patient"/)],
  ['quick launcher contains collect payment',()=>assert.match(app,/data-quick-task="payment"/)],
  ['quick launcher contains create appointment',()=>assert.match(app,/data-quick-task="appointment"/)],
  ['quick launcher contains receive laboratory work',()=>assert.match(app,/data-quick-task="lab"/)],
  ['tasks is a real rendered view rather than placeholder',()=>{
    assert.match(app,/state\.view==='tasks'\) main\.innerHTML=renderTasks\(\)/);
    assert.match(app,/function renderTasks\(/);
  }],
  ['task completion is bound',()=>assert.match(app,/data-task-done/)],
  ['global payment modal supports patient selection',()=>{
    const i=app.indexOf('function openPaymentModal'); const body=app.slice(i,i+7000); assert.match(body,/name="patient_id"/);
  }],
  ['global lab modal supports patient selection and received preset',()=>{
    const i=app.indexOf('function openWorkModal'); const body=app.slice(i,i+7000); assert.match(body,/name="patient_id"/); assert.match(body,/pref\.status|status:\s*pref/);
  }]
];
let passed=0;
for(const [name,fn] of checks){try{fn();passed++;console.log('✓',name);}catch(err){console.error('✗',name);console.error(err.message);process.exitCode=1;}}
console.log(`${passed}/${checks.length} quick task checks passed`);
if(process.exitCode) process.exit(process.exitCode);
