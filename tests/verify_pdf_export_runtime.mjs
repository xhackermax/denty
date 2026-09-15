import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app = fs.readFileSync('app.js', 'utf8');
function extractFunction(name){
  const start = app.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} no encontrado`);
  const brace = app.indexOf('{', start);
  let depth = 0;
  for(let i = brace; i < app.length; i++){
    if(app[i] === '{') depth++;
    else if(app[i] === '}' && --depth === 0) return app.slice(start, i + 1);
  }
  throw new Error(`${name} incompleta`);
}

const source = [extractFunction('requirePin'), extractFunction('downloadClinicalPdf')].join('\n');
let clickedDownload = null;
let auditRecord = null;
const context = {
  db:{security:{pin_enabled:true,admin_pin_hash:'1234-preview'},auditLog:[]},
  state:{patientId:1},
  pinUnlocked:false,
  prompt(){ throw new Error('prompt() is not supported'); },
  toast(){},
  persist(){},
  recordAudit(action, patientId, detail){ auditRecord = {action, patientId, detail}; },
  printableDocumentHtml(kind, id){ return `<section>${kind}:${id}</section>`; },
  Blob: class { constructor(parts, options){ this.parts = parts; this.options = options; } },
  URL:{createObjectURL(){ return 'blob:denty-pdf'; }, revokeObjectURL(){}},
  setTimeout(fn){ fn(); },
  document:{createElement(tag){ return {tag, set href(v){ this._href=v; }, get href(){ return this._href; }, set download(v){ this._download=v; }, get download(){ return this._download; }, click(){ clickedDownload = {href:this.href, download:this.download}; }}; }}
};
vm.createContext(context);
vm.runInContext(source, context);

assert.doesNotThrow(() => vm.runInContext("downloadClinicalPdf('doc:42')", context));
assert.deepEqual(clickedDownload, {href:'blob:denty-pdf', download:'denty-doc-42.pdf.html'});
assert.deepEqual(auditRecord, {action:'document.pdf.export', patientId:1, detail:'doc:42'});
console.log('verify_pdf_export_runtime: OK');
