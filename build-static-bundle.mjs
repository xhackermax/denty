import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const exportNames = source => [...source.matchAll(/export\s+(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g)].map(m=>m[1]);
const stripExports = source => source.replace(/\bexport\s+(?=(?:const|let|var|function|class)\b)/g, '');
const imports = source => [...source.matchAll(/import\s*\{([^}]*)\}\s*from\s*['\"]([^'\"]+)['\"];?/g)].map(m=>({full:m[0],names:m[1].split(',').map(x=>x.trim()).filter(Boolean),target:m[2]}));
const importNames = (source, target) => {
  const found = imports(source).find(x=>x.target===target);
  if(!found) throw new Error(`Import no encontrado: ${target}`);
  return found.names;
};
const removeImport = (source, target) => {
  const found = imports(source).find(x=>x.target===target);
  if(!found) throw new Error(`Import no encontrado: ${target}`);
  return source.replace(found.full, '').replace(/^\s+/, '');
};

let logic = read('logic.js');
const logicExports = exportNames(logic);
logic = stripExports(logic);

let voice = read('voice-router.js');
const voiceLogicImports = importNames(voice, './logic.js');
voice = removeImport(voice, './logic.js');
const voiceExports = exportNames(voice);
voice = stripExports(voice);

let app = read('app.js');
const appLogicImports = importNames(app, './logic.js');
const appVoiceImports = importNames(app, './voice-router.js');
app = removeImport(app, './logic.js');
app = removeImport(app, './voice-router.js');

const banner = `/* Denty static preview bundle. GENERATED FILE.\n * Sources of truth: logic.js, voice-router.js, app.js.\n * Rebuild: node build-static-bundle.mjs\n */\n`;
const bundle = `${banner}
(function(){'use strict';\n${logic}\nwindow.DentyLogic={${logicExports.join(',')}};\n})();\n
(function(){'use strict';\nconst {${voiceLogicImports.join(',')}}=window.DentyLogic;\n${voice}\nwindow.DentyVoice={${voiceExports.join(',')}};\n})();\n
(function(){'use strict';\nconst {${appLogicImports.join(',')}}=window.DentyLogic;\nconst {${appVoiceImports.join(',')}}=window.DentyVoice;\n${app}\n})();\n`;
fs.writeFileSync(path.join(root,'denty-app.bundle.js'), bundle);
console.log(`denty-app.bundle.js generado (${bundle.length} bytes)`);
