# Denty V3 · Paridad funcional 2.3.7

## Fuente de comportamiento

La versión 2.3.7 se usa como especificación funcional. Denty V3 conserva los flujos
útiles, pero no copia el bundle legacy ni su arquitectura local-first.

## Recuperado en esta entrega

- Logo histórico de Denty en `public/assets/denty-logo.png`.
- Dashboard operativo con Ahora / Después / Atención y accesos rápidos.
- Pacientes: búsqueda, alta rápida, importación CSV con número de ficha y perfil.
- Agenda: vistas por pipeline, doctor, día y lista; estados de atención y alta rápida.
- Odontograma SVG interactivo con 25 estados, superficies, plantillas, puente, undo/redo.
- Reglas clínicas recuperadas: puente por orden de arcada, implante-pilar-corona,
  endodoncia-perno-corona y ciclo clínico de estados sin cambiar caries/ausencia.
- Endodoncia AAE, periodoncia de seis puntos, plan por dependencias y presupuesto.
- Pipeline clínico explícito: odontograma -> diagnóstico -> plan -> presupuesto -> citas.
- Laboratorio, recetas, documentos, comunicaciones, finanzas, análisis, campañas,
  alertas, fichaje, tareas, administración y ajustes como módulos V3.
- Portal paciente: citas, tratamiento, documentos, recetas, pagos, ayuda y privacidad.
- Denty Games recuperado como módulo de paciente con 13 juegos y modo demo aislado.
- Barra de voz/texto con interpretación, previsualización y confirmación antes de ejecutar.
- Navegación y shell con el logo histórico y estructura de módulos original recuperada.

## Decisiones de arquitectura

- No se copia `denty-app.bundle.js` ni `local-api.ts`.
- No se guarda información clínica en localStorage, sessionStorage o IndexedDB.
- La lógica clínica se mantiene en `src/domain` y las features consumen sus comandos.
- La demo funcional usa estado React en memoria hasta conectar `shared/api` al backend.
- El pipeline Vercel/CI moderno se conserva sin mezclar source legacy o monorepo.

## Integraciones que siguen necesitando backend real

Las superficies se conservan, pero no se simulan como integraciones productivas:

- autenticación, recuperación de cuenta y sesiones de usuario;
- persistencia multiusuario y control de versiones / conflictos 409;
- VERI*FACTU y comunicación con AEAT;
- proveedor certificado de receta electrónica;
- WhatsApp, SMS y correo transaccional reales;
- APIs de Meta/Google para campañas;
- copias cifradas, restauración y operaciones RGPD;
- firma/auditoría clínica persistente y documentos legales definitivos;
- realtime/SSE y notificaciones servidor.

Estas piezas deben entrar por la capa `shared/api` de V3, con esquemas Zod, permisos,
idempotencia y errores tipados. No deben reactivar el API local del legacy.

## Criterio de paridad

Esta entrega recupera la superficie funcional y los flujos principales para continuar la
migración dentro de V3. No declara paridad productiva de backend hasta que las
integraciones anteriores dispongan de contratos y pruebas de integración reales.
