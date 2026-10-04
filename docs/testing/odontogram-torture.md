# Auditoría de estabilidad y regresión de Denty

La suite adversarial aplica la matriz Web Stability and Regression Torture Tests 1.0.0 al odontograma y a rutas principales de Denty. Algunas expectativas fallan en el código actual: son diagnósticos de problemas pendientes, no una suite aprobada. Los comandos de auditoría se activan explícitamente; los tests normales no ejecutan estas pruebas ni las sesiones de varias horas.

## Preparación

Usar Node 24, `npm ci` y `npx playwright install chromium`. Las pruebas de navegador arrancan el servidor Next de producción y el sustituto de Supabase de `e2e/support/fake-supabase.mjs`. Compilar con configuración de pruebas:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54399 \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=e2e-publishable \
SUPABASE_URL=http://127.0.0.1:54399 \
SUPABASE_PUBLISHABLE_KEY=e2e-publishable npm run build
```

Puede usarse `PLAYWRIGHT_CHROMIUM_PATH` para un Chromium instalado. `E2E_APP_PORT` y `FAKE_SUPABASE_PORT` permiten aislar ejecuciones. Cada ejecución comparte una base ficticia y utiliza un solo worker: no aumentar los workers sin separar las bases.

## Ejecución

```bash
npm run test:torture:domain
npm run test:torture:sql
npm run test:torture:browser
npm run test:torture:monkey
npm run test:torture:long
```

El navegador determinista cubre escritorio y tableta; sus ciclos de menú y diálogo usan también una ventana móvil de 360 px. Monkey ejecuta 1.000 acciones con semilla reproducible. El comando largo ejecuta 30 minutos de tortura y después 120 minutos de sesión prolongada, en escritorio. Duración total prevista: al menos 150 minutos. Se pueden ejecutar por separado:

```bash
DENTY_TORTURE=1 DENTY_LONG_TESTS=1 npx playwright test e2e/torture-random.spec.ts --project=desktop-chromium --grep 'TORTURE combined'
DENTY_TORTURE=1 DENTY_LONG_TESTS=1 npx playwright test e2e/torture-random.spec.ts --project=desktop-chromium --grep ST005
```

Configuración: `DENTY_MONKEY_SEED` (1000), `DENTY_TORTURE_MINUTES` (30), `DENTY_SOAK_MINUTES` (120), `DENTY_HEAP_BUDGET_MB` (256). Reducir las duraciones sirve para diagnosticar el ejecutor, pero no satisface la prueba original. No lanzar muchas instancias de Chromium en paralelo: la presión del ejecutor puede producir falsos fallos de carga.

## Evidencias

Las pruebas deterministas conservan trazas al fallar. Las de carga prolongada desactivan esa captura continua para evitar que el ejecutor retenga cada DOM. Guardan secuencias, UTC, URL, errores de consola/red, capturas de fallo, muestras del heap y un checkpoint JSON cada minuto. El JSON final se adjunta como `complete-torture-report.json`. Para obtener un informe estructurado persistente:

```bash
DENTY_TORTURE=1 PLAYWRIGHT_JSON_OUTPUT_NAME=torture-results.json npx playwright test e2e/torture-stability.spec.ts e2e/torture-network.spec.ts e2e/torture-clinical.spec.ts --reporter=json
```

La semilla reproduce las elecciones aleatorias; hay que conservar el registro porque disponibilidad de controles, tiempos y respuestas pueden cambiar. Los fallos deterministas del guardado y del historial tienen casos propios para repetir la causa sin depender de azar.

## Alcance y límites

Se ejecutan componentes React, rutas Next y el flujo cliente/servidor de la aplicación. Supabase Auth/PostgREST/RPC es un sustituto en memoria: no prueba credenciales reales, JWT, RLS ni bloqueos concurrentes. La suite SQL adicional ejecuta funciones originales sobre PGlite con tablas y restricciones pertinentes extraídas de las migraciones; utiliza stubs explícitos de autenticación y tablas de presupuesto simplificadas, sin reproducir todo el despliegue. La caducidad de la sesión de aplicación se comprueba modificando `app_sessions` sin borrar las cookies. Los fallos HTTP se inyectan en el guardado del odontograma; no representan todos los servicios de Denty. La cancelación interrumpe una petición antes de entregarla al servidor, sin afirmar que pueda deshacer una escritura ya aceptada.

El random explora navegación, historial del navegador, recargas, scroll, búsqueda, controles de vista, undo/redo, diálogos, duplicación y cierre de pestañas, y marcas clínicas con interrupciones de lectura y pausas aleatorias reproducibles. No intenta todos los formularios ni todos los módulos especializados. Antes de navegar espera el autoguardado: las interrupciones de escritura y selección histórica se prueban por separado de forma determinista. Algunas acciones disponibles solo en ciertas rutas quedan registradas como `unavailable`; no cuentan como interacciones exitosas con un botón. Se detectan respuestas API 4xx/5xx inesperadas; el 404 documentado CLINICAL_PLAN_NOT_FOUND solo se acepta si la fixture realmente carece de plan.

La memoria medida es el heap JavaScript de Chromium tras una limpieza forzada. Las recargas cambian la vida del renderer. Un heap por debajo del presupuesto no demuestra ausencia de fugas; faltan memoria nativa, GPU y servidor. El soak conserva una sesión con navegación y recargas, no dos horas sobre un único DOM.

Los identificadores internos de los casos de dominio describen sus propios invariantes; no deben confundirse automáticamente con los identificadores homónimos de la matriz del usuario. El informe de auditoría contiene la correspondencia de cobertura y las limitaciones.
