# Reglas de actualización de Denty

1. `app.js`, `logic.js` y `voice-router.js` son fuente de verdad. No editar `denty-app.bundle.js` manualmente.
2. Todo cambio visible debe quedar reflejado en `DOCUMENTACION-DENTY.md` y, si altera estructura/navegación, en `UI-MAP.json`.
3. Cada botón nuevo debe tener: selector estable, handler, estado de error/no disponible y prueba.
4. Una tarjeta informativa no debe aparentar ser editable. Si hay un campo configurable, debe persistir o marcarse explícitamente como futuro.
5. Una integración externa caída nunca debe impedir abrir Denty ni navegar por módulos locales.
6. Nunca guardar secretos de TPV, IA o MCP en navegador.
7. Cada entidad nueva debe añadirse a `defaultDb()` y `migrateDb()`.
8. Antes de empaquetar: regenerar bundle, ejecutar pruebas, descomprimir ZIP y repetir pruebas críticas.
9. Diferenciar siempre `implementado`, `simulado en preview` y `pendiente`.
10. Mantener la cuenta Paciente separada del área clínica hasta que exista autenticación y autorización reales.
