import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('apps/legacy-preview/app.js', 'utf8');
const modalCloseButtons = [...app.matchAll(/<div class="modal-title">[\s\S]*?<button([^>]*)>[^<]*(?:x|Ã—|×)[^<]*<\/button>/g)];

assert.ok(modalCloseButtons.length >= 8, 'debe detectar los cierres de modales principales');

for (const [index, match] of modalCloseButtons.entries()) {
  const attrs = match[1];
  assert.match(attrs, /\btype="button"/, `la X del modal ${index + 1} debe ser type="button"`);
  assert.match(attrs, /\bdata-dialog-close\b/, `la X del modal ${index + 1} debe usar cierre explicito`);
}

assert.match(app, /document\.addEventListener\('click'[\s\S]*data-dialog-close/, 'debe existir cierre delegado para X de modales');

console.log('verify_modal_close_buttons: OK');
