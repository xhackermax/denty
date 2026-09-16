import fs from 'fs';
const barPath='apps/web/src/features/voice/VoiceCommandBar.tsx';
const shellPath='apps/web/src/components/native/AppShell.tsx';
const cssPath='apps/web/src/app/globals.css';
let pass=0,fail=0;
function ok(cond,msg){if(cond){pass++;console.log('PASS',msg)}else{fail++;console.error('FAIL',msg)}}
ok(fs.existsSync(barPath),'native VoiceCommandBar exists');
const bar=fs.existsSync(barPath)?fs.readFileSync(barPath,'utf8'):'';
const shell=fs.readFileSync(shellPath,'utf8');
const css=fs.readFileSync(cssPath,'utf8');
ok(bar.includes('/api/voice/preview'),'voice command previews through server');
ok(bar.includes('/api/voice/execute'),'voice command executes through server');
ok(/SpeechRecognition|webkitSpeechRecognition/.test(bar),'browser speech recognition is optional input');
ok(/requiresConfirmation/.test(bar)&&/Confirmar/.test(bar),'sensitive actions require explicit confirmation UI');
ok(/readback/.test(bar),'server readback is shown before execution');
ok(shell.includes('VoiceCommandBar'),'voice bar is mounted in native AppShell');
ok(css.includes('.voice-command-bar'),'voice bar has native responsive styles');
console.log(`\n${pass} passed, ${fail} failed`);
if(fail)process.exit(1);
