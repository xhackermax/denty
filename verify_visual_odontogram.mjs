import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('.', import.meta.url);
const app = readFileSync(new URL('./app.js', root), 'utf8');
const css = [
  readFileSync(new URL('./styles.css', root), 'utf8'),
  existsSync(new URL('./visual-polish.css', root)) ? readFileSync(new URL('./visual-polish.css', root), 'utf8') : ''
].join('\n');

const checks = [
  ['page transition class exists', app.includes('animatePageTransition') && css.includes('.page-transition-enter')],
  ['scroll reveal exists', app.includes('setupScrollReveal') && css.includes('.scroll-reveal')],
  ['odontogram semantic helpers exist', app.includes('statusVisualSemantics') && app.includes('semantic-pending')],
  ['pending states do not draw extraction X', app.includes("status==='extraction'") && !app.includes("red&&status!=='caries'?'<path class=\"extract-mark\"")],
  ['healthy tooth uses green outline', css.includes('.tooth-outline.tone-green') && css.includes('#19a76c')],
  ['redo states use blue fill with red outline', css.includes('.semantic-redo') && css.includes('stroke:#ef334b')],
  ['pending states use red mark', css.includes('.semantic-pending') && css.includes('fill:#ef334b')],
  ['legend icon follows same semantic classes', app.includes('legend-treatment-mark') && app.includes('semantic-redo')],
  ['old inconsistent minimal colors are overridden', css.includes('.surface-red-dot{fill:#ef334b') && css.includes('.extract-mark{stroke:#ef334b')],
];

for (const [name, ok] of checks) assert.ok(ok, name);
console.log(`${checks.length}/${checks.length} odontogram visual checks passed`);
