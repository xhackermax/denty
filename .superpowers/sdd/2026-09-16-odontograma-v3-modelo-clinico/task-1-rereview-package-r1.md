# Re-review package Task 1 Fix Round 1

Base: c9d6967d00c5b2d2b383cb88fcd61bbb8e258210
Head: 019a26ac83b837165a40a3cb5e86ea1642828836

## Open findings
1. Critical preservation issue in syncLegacyOdontogramFromEntities.
2. Important missing preservation test.

## Commits
019a26a Preserve legacy odontogram data during v3 sync

## Diff
diff --git a/apps/legacy-preview/logic.js b/apps/legacy-preview/logic.js
index 245d1eb..8400277 100644
--- a/apps/legacy-preview/logic.js
+++ b/apps/legacy-preview/logic.js
@@ -563,21 +563,26 @@ function legacyCodeForEntity(entity){
   if(entity.type==='removable_prosthesis') return entity.status==='planned'?'removable_pending':entity.status==='repair'||entity.status==='failed'?'removable_bad':'removable';
   if(entity.type==='orthodontics') return 'prosthesis_pending';
   if(entity.type==='pediatric') return entity.status==='completed'?'healthy':'filling_pending';
   return '';
 }
 export function syncLegacyOdontogramFromEntities(db, patientId){
   const od=ensureOdontogram(db, patientId);
   for(const entity of odontogramEntitiesForPatient(db, patientId)){
     const code=legacyCodeForEntity(entity);
     if(!code) continue;
-    for(const tooth of entity.teeth||[]) if(od[String(tooth)]) setToothLegendState(db, patientId, String(tooth), code);
+    for(const tooth of entity.teeth||[]){
+      const record=od[String(tooth)];
+      if(!record) continue;
+      record.whole_states=[...new Set([...toothWholeStates(record), code].filter(Boolean))];
+      if(!record.status || record.status==='healthy') record.status=code;
+    }
   }
   return od;
 }
 
 export function clearToothSurface(db, patientId, tooth, surface){
   const t=String(tooth), s=normalizeSurfaceForTooth(t, surface);
   const od=ensureOdontogram(db, patientId);
   if(od[t] && s) delete od[t].surfaces[s];
   return od[t];
 }
diff --git a/tests/verify_odontogram_v3_model.mjs b/tests/verify_odontogram_v3_model.mjs
index 549f0e0..d5dd8e2 100644
--- a/tests/verify_odontogram_v3_model.mjs
+++ b/tests/verify_odontogram_v3_model.mjs
@@ -35,22 +35,34 @@ const bridge = createOdontogramEntity(db, 1, {
 
 assert.equal(bridge.type, 'bridge');
 assert.equal(bridge.teeth.join(','), '13,14,15,16');
 assert.equal(bridge.components.filter(x => x.role === 'abutment').length, 2);
 assert.equal(odontogramEntitiesForPatient(db, 1, { type: 'bridge' }).length, 1);
 
 const updated = updateOdontogramEntity(db, 1, bridge.id, { status: 'active', metadata: { material: 'metal-ceramica' } });
 assert.equal(updated.status, 'active');
 assert.equal(updated.metadata.material, 'metal-ceramica');
 
+const legacyBeforeSync = ensureOdontogram(db, 1);
+legacyBeforeSync['13'].whole_states = ['missing'];
+legacyBeforeSync['13'].surfaces.O = 'caries';
+legacyBeforeSync['13'].periodontal.depths.mv = '6';
+legacyBeforeSync['13'].periodontal.bleeding.mv = true;
+legacyBeforeSync['13'].position.rotation = true;
+
 syncLegacyOdontogramFromEntities(db, 1);
 const od = ensureOdontogram(db, 1);
 for (const tooth of ['13', '14', '15', '16']) {
   assert.ok(toothWholeStates(od[tooth]).includes('prosthesis'), `tooth ${tooth} has legacy prosthesis`);
 }
+assert.ok(toothWholeStates(od['13']).includes('missing'), 'sync preserves existing missing whole state');
+assert.equal(od['13'].surfaces.O, 'caries', 'sync preserves existing surfaces');
+assert.equal(od['13'].periodontal.depths.mv, '6', 'sync preserves periodontal depths');
+assert.equal(od['13'].periodontal.bleeding.mv, true, 'sync preserves periodontal flags');
+assert.equal(od['13'].position.rotation, true, 'sync preserves position flags');
 
 const inactive = deactivateOdontogramEntity(db, 1, bridge.id, 'duplicated');
 assert.equal(inactive.active, false);
 assert.equal(inactive.deactivated_reason, 'duplicated');
 assert.equal(odontogramEntitiesForPatient(db, 1).length, 0);
 
 console.log('verify_odontogram_v3_model: OK');
