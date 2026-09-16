import fs from 'node:fs';
import crypto from 'node:crypto';
import { qrMatrixM } from '../apps/api/src/modules/billing/qr.ts';
const payload='https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR?nif=B12345678&numserie=F-000123&fecha=16-09-2026&importe=950.00';
const matrix=qrMatrixM(payload);
const hash=crypto.createHash('sha256').update(matrix.flat().map(Boolean).map(x=>x?'1':'0').join('')).digest('hex');
const routes=fs.readFileSync('apps/api/src/modules/billing/routes.ts','utf8');
const pdf=fs.existsSync('apps/api/src/modules/billing/invoice-pdf.ts')?fs.readFileSync('apps/api/src/modules/billing/invoice-pdf.ts','utf8'):'';
const checks=[
 ['QR matrix matches reference implementation',matrix.length===45&&hash==='dbdd2b8ce7b1dad10f0d0546efab275c8b8db28a12082892fcc62b5b1e7d93ec'],
 ['invoice PDF renderer embeds QR modules',/qrMatrixM/.test(pdf)&&/ re /.test(pdf)],
 ['invoice PDF route is exposed server-side',/\/api\/invoices\/:id\/pdf/.test(routes)],
 ['invoice PDF reads immutable fiscal qrPayload',/fiscalRecord/.test(routes)&&/qrPayload/.test(pdf)],
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}if(failed)process.exit(1);console.log(`${checks.length}/${checks.length} checks passed`);
