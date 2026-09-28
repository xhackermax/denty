import fs from 'node:fs';
import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync('package.json','utf8'));
if (pkg.dependencies?.stripe !== '22.6.2') process.exit(1);
for (const f of ['src/app/api/denty/card-terminal/_sumup.ts']) {
  if (!fs.existsSync(f)) process.exit(1);
}
console.log('Stripe official SDK integration present: stripe@22.6.2');
