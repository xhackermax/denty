import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app=readFileSync('app.js','utf8');
const html=readFileSync('index.html','utf8');

const checks=[
  ['app imports the validated Voice Router',()=>assert.match(app,/from '\.\/voice-router\.js'/)],
  ['global microphone exists outside assistant screen',()=>assert.ok(html.includes('id="globalVoiceBtn"'))],
  ['global microphone is bound to speech recognition',()=>assert.match(app,/globalVoiceBtn[^\n]*startSpeech|globalVoiceBtn[\s\S]{0,180}startSpeech/)],
  ['command execution is asynchronous for external fallback',()=>assert.match(app,/async function runCommand\(/)],
  ['local rules run before AI fallback',()=>{
    const start=app.indexOf('async function runCommand('); const end=app.indexOf('function startSpeech',start); const body=app.slice(start,end);
    assert.ok(body.indexOf('parseVoiceCommand')>=0); assert.ok(body.indexOf('requestExternalVoiceInterpret')>body.indexOf('parseVoiceCommand'));
  }],
  ['external AI responses are schema validated',()=>assert.match(app,/validateStructuredCommand\(.*external|validateStructuredCommand\(externalCommand/)],
  ['AI fallback sends minimum context rather than the full db',()=>{
    const start=app.indexOf('async function requestExternalVoiceInterpret'); const end=app.indexOf('async function runCommand',start); const body=app.slice(start,end);
    assert.ok(body.includes('patient_id')); assert.ok(body.includes('view')); assert.ok(!body.includes('JSON.stringify(db)'));
  }],
  ['assistant UI explains rule first and AI fallback behavior',()=>{
    const start=app.indexOf('function renderAssistant'); const body=app.slice(start,start+5000);
    assert.match(body,/Voice Router|Router de voz/); assert.match(body,/NLU local|reglas locales/); assert.match(body,/LLM|IA/);
  }],
  ['assistant includes daily workflow examples',()=>{
    const start=app.indexOf('function renderAssistant'); const body=app.slice(start,start+5000);
    assert.match(body,/cob|pago/i); assert.match(body,/laboratorio/i); assert.match(body,/comentario/i);
  }],
  ['speech recognition can use configured continuous mode',()=>assert.match(app,/recognition\.continuous\s*=\s*!!?\(?db\.settings.*voice.*continuous/s)]
];

let passed=0;
for(const [name,fn] of checks){ try{fn();passed++;console.log('✓',name);}catch(err){console.error('✗',name);console.error(err.message);process.exitCode=1;} }
console.log(`${passed}/${checks.length} voice UI checks passed`);
if(process.exitCode) process.exit(process.exitCode);
