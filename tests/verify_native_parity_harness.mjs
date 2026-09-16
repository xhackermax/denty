import fs from 'node:fs';
const exists=p=>fs.existsSync(p),read=p=>fs.readFileSync(p,'utf8');
const webPkg=JSON.parse(read('apps/web/package.json'));
const arch=exists('docs/architecture/NATIVE-FEATURES.md')?read('docs/architecture/NATIVE-FEATURES.md'):'';
const parity=exists('docs/qa/FEATURE-PARITY.md')?read('docs/qa/FEATURE-PARITY.md'):'';
const checks=[
 ['native architecture rule is documented',/TanStack Query/.test(arch)&&/legacy-preview/.test(arch)&&/Zustand/.test(arch)],
 ['feature parity matrix exists for Patients and Agenda',/Patients/.test(parity)&&/Agenda/.test(parity)&&/evidence/i.test(parity)],
 ['Playwright config exists',exists('apps/web/playwright.config.ts')],
 ['native parity e2e spec exists',exists('apps/web/e2e/parity/native-core.spec.ts')],
 ['web package exposes e2e parity command',Boolean(webPkg.scripts?.['test:e2e:parity'])&&String(webPkg.scripts['test:e2e:parity']).includes('playwright')],
 ['native features have no legacy-preview imports',!Array.from(walk('apps/web/src/features')).some(p=>read(p).includes('legacy-preview'))],
];
function* walk(dir){if(!exists(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=`${dir}/${e.name}`;if(e.isDirectory())yield*walk(p);else if(/\.[tj]sx?$/.test(e.name))yield p;}}
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}if(failed)process.exit(1);console.log(`${checks.length}/${checks.length} checks passed`);
