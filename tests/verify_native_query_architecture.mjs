import fs from 'node:fs';
const providers=fs.readFileSync('apps/web/src/components/native/NativeProviders.tsx','utf8');
const layout=fs.readFileSync('apps/web/src/app/layout.tsx','utf8');
const hook=fs.readFileSync('apps/web/src/lib/use-api-data.ts','utf8');
const shell=fs.readFileSync('apps/web/src/components/native/AppShell.tsx','utf8');
const pkg=JSON.parse(fs.readFileSync('apps/web/package.json','utf8'));
const checks=[
 ['NativeProviders owns QueryClient',/QueryClient/.test(providers)&&/QueryClientProvider/.test(providers)],
 ['root layout mounts NativeProviders',/NativeProviders/.test(layout)],
 ['useApiData uses TanStack Query',/useQuery/.test(hook)&&/queryKey/.test(hook)],
 ['realtime invalidates query cache',/invalidateQueries/.test(hook)||/invalidateQueries/.test(shell)],
 ['Zustand dependency remains UI-only',!!pkg.dependencies?.zustand&&!/from ["']zustand["']/.test(hook)],
];
let failed=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok)failed++;}
if(failed)process.exit(1);
console.log(`${checks.length}/${checks.length} checks passed`);
