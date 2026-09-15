import { defaultDb, migrateDb } from '../apps/legacy-preview/logic.js';
import fs from 'node:fs';

const app = fs.readFileSync('./apps/legacy-preview/app.js','utf8');
const readme = fs.readFileSync('./README.md','utf8');
let passed=0, total=0;
function check(name, condition){ total++; if(condition){ passed++; console.log('PASS',name); } else { console.error('FAIL',name); process.exitCode=1; } }

const fresh=defaultDb();
check('default voice settings exist', fresh.settings?.voice && typeof fresh.settings.voice==='object');
check('voice defaults include ai mode', ['auto','rules','llm','mcp','off'].includes(fresh.settings?.voice?.ai_mode));
check('voice defaults include continuous', typeof fresh.settings?.voice?.continuous==='boolean');
check('voice defaults include readback', typeof fresh.settings?.voice?.readback==='boolean');
const migrated=migrateDb({settings:{appearance:'dark',voice:{continuous:true}}});
check('migration preserves old setting', migrated.settings.appearance==='dark');
check('migration deep merges voice settings', migrated.settings.voice.continuous===true && typeof migrated.settings.voice.readback==='boolean' && !!migrated.settings.voice.ai_mode);
check('settings UI exposes AI mode', app.includes('voiceAiMode'));
check('settings UI exposes continuous voice', app.includes('voiceContinuous'));
check('settings UI exposes readback', app.includes('voiceReadback'));
check('settings UI can inspect server status', app.includes('checkAiStatus'));
check('README explains Ollama', /Ollama/i.test(readme) && /DENTY_AI_PROVIDER/i.test(readme));
check('README explains MCP', /DENTY_MCP_URL/i.test(readme));
console.log(`\n${passed}/${total} passed`);
if(passed!==total) process.exitCode=1;
