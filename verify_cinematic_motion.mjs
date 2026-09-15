import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('.', import.meta.url);
const index = readFileSync(new URL('./index.html', root), 'utf8');
const app = readFileSync(new URL('./app.js', root), 'utf8');
const motion = existsSync(new URL('./cinematic-motion.js', root)) ? readFileSync(new URL('./cinematic-motion.js', root), 'utf8') : '';
const css = [
  existsSync(new URL('./cinematic-motion.css', root)) ? readFileSync(new URL('./cinematic-motion.css', root), 'utf8') : '',
  existsSync(new URL('./visual-polish.css', root)) ? readFileSync(new URL('./visual-polish.css', root), 'utf8') : ''
].join('\n');

const checks = [
  ['GSAP core CDN is loaded', index.includes('gsap.min.js')],
  ['ScrollTrigger CDN is loaded', index.includes('ScrollTrigger.min.js')],
  ['cinematic motion script is loaded', index.includes('cinematic-motion.js')],
  ['cinematic CSS is loaded', index.includes('cinematic-motion.css')],
  ['GSAP ScrollTrigger registered', motion.includes('ScrollTrigger') && motion.includes('gsap.registerPlugin')],
  ['parallax layer exists', app.includes('cinematic-depth-scene') && css.includes('.cinematic-depth-scene')],
  ['interest points expand on scroll', motion.includes('interest-point') && motion.includes('scale') && css.includes('.interest-point')],
  ['3D perspective is applied', css.includes('perspective') && motion.includes('rotateX') && motion.includes('rotateY')],
  ['reduced motion fallback exists', motion.includes('prefers-reduced-motion') && css.includes('prefers-reduced-motion')],
];

for (const [name, ok] of checks) assert.ok(ok, name);
console.log(`${checks.length}/${checks.length} cinematic motion checks passed`);
