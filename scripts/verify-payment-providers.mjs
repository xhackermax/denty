import fs from 'node:fs';
const required = [
  'src/domain/money.ts',
  'src/app/api/denty/card-terminal/_sumup.ts',
  'src/app/api/denty/[...path]/route.ts',
  'supabase/migrations/20260927210000_payment_providers.sql',
];
const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) { console.error('Missing payment files:', missing); process.exit(1); }
console.log('Payment provider architecture OK:', required.length, 'files');
