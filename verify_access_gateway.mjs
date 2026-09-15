import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('styles.css','utf8');

const checks=[
  ['initial account gateway exists',()=>assert.ok(html.includes('id="accountGateway"'))],
  ['gateway has administrator account',()=>assert.match(html,/data-account-type="admin"[\s\S]{0,260}Cuenta Administrador/)],
  ['gateway has user account',()=>assert.match(html,/data-account-type="user"[\s\S]{0,260}Cuenta Usuario/)],
  ['gateway has patient account',()=>assert.match(html,/data-account-type="patient"[\s\S]{0,260}Cuenta Paciente/)],
  ['app starts hidden behind gateway',()=>assert.match(html,/<div[^>]*(?:id="appShell"[^>]*class="[^"]*account-gated|class="[^"]*account-gated[^"]*"[^>]*id="appShell")/)],
  ['portal selection is separate from db currentUser',()=>{assert.ok(app.includes('selectedPortal')); assert.ok(app.includes('sessionStorage'));}],
  ['selecting account opens prepared access stage',()=>{assert.ok(app.includes('showAccountAccess')); assert.ok(html.includes('id="accountAccessStage"'));}],
  ['no username or password is required yet',()=>{const i=html.indexOf('id="accountAccessStage"'); const body=html.slice(i,i+3000); assert.ok(!/type="password"|name="password"|name="username"/.test(body));}],
  ['patient account does not expose clinic app',()=>assert.ok(app.includes("selectedPortal==='patient'"))],
  ['gateway has dedicated responsive styling',()=>assert.match(css,/\.account-gateway/)]
];

let passed=0;
for(const [name,fn] of checks){
  try{fn();passed++;console.log('✓',name);}catch(err){console.error('✗',name);console.error(err.message);process.exitCode=1;}
}
console.log(`${passed}/${checks.length} access gateway checks passed`);
if(process.exitCode) process.exit(process.exitCode);
