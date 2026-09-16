import fs from 'node:fs';
const schema=fs.readFileSync('packages/db/prisma/schema.prisma','utf8');
const service=fs.readFileSync('apps/api/src/modules/clinical/service.ts','utf8');
const routes=fs.readFileSync('apps/api/src/modules/clinical/routes.ts','utf8');
const ui=fs.readFileSync('apps/web/src/features/treatment-plan/PlanGraphEditor.tsx','utf8');
const checks=[
 ['plan item stores priority override reason',/priorityOverrideReason\s+String\?/.test(schema)],
 ['service exposes auditable priority override',/updatePlanItemPriority/.test(service)&&/priority_override/.test(service)&&/writeAudit/.test(service)],
 ['API exposes priority override endpoint',/priority-override/.test(routes)],
 ['dependency removal requires a reason',/removeDependency[\s\S]*reason/.test(service)&&/dependency_removed/.test(service)],
 ['graph editor asks for dependency reason',/Motivo/.test(ui)&&/dependencyReason/.test(ui)],
 ['graph editor exposes priority override reason',/priorityOverrideReason/.test(ui)&&/Cambiar prioridad/.test(ui)],
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}if(failed)process.exit(1);console.log(`${checks.length}/${checks.length} checks passed`);
