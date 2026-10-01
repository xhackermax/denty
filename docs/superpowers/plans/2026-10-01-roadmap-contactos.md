# Tarjetas de contactos especiales Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (native) or superpowers:subagent-driven-development. Steps use checkbox syntax for tracking.

**Goal:** Mostrar contactos agrupados, acciones rápidas y filtros en una interfaz adaptable.

**Architecture:** Separar presentación de tarjetas y normalización de destinos de contacto, conservando API y formularios existentes.

**Tech Stack:** Next 16.3, React 19, TypeScript, Mantine, Supabase y Vitest; CLI Supabase y age para copias.

**Spec:** [Diseño aprobado](../specs/2026-10-01-roadmap-design.md).

## Global Constraints

- Hacer push a `main`; Vercel despliega con su integración GitHub. No declarar estado remoto sin evidencia.
- No revertir datos guardados, inventar precios ni modificar dosis del vademécum.
- TDD, aislamiento por clínica, permisos conservados y documentación menor de 200 líneas por archivo.
- Antes de push: suite completa, TypeScript, lint, formato y pipeline `vercel-build`.

## Review Focus

- Teléfono con espacios/prefijo internacional: formar enlaces válidos sin inventar país para WhatsApp.
- Email inválido o vacío: no crear un enlace accionable.
- Clipboard no disponible o rechazada: mostrar error y mantener datos.
- Categoría vacía o desconocida: grupo General y color de reserva.
- Búsqueda sin resultados: estado vacío con Añadir contacto sin perder filtros.

## Tarea: Tarjetas de contactos especiales

**Files:**
- `src/features/admin/clinic-contacts/clinic-contacts-list.tsx`
- `src/features/admin/clinic-contacts/contact-card.tsx (nuevo)`
- `src/features/admin/clinic-contacts/contact-links.ts (nuevo)`
- `src/features/admin/clinic-contacts/__tests__/contact-links.test.ts`
- `src/features/admin/clinic-contacts/__tests__/clinic-contacts-list.test.tsx`

**Interfaces:** `contactPhoneLinks(phone: string): { tel: string; whatsapp: string | null } | null`; `contactEmailLink(email: string): string | null`; tarjetas consumen los contactos tipados de la API actual.

- [ ] Escribir pruebas en `__tests__` para los cinco casos de Review Focus y estas expectativas de comportamiento (adaptar imports a los módulos reales):

```ts
expect(contactPhoneLinks("+34 600 111 222")?.whatsapp).toBe("https://wa.me/34600111222");
expect(contactEmailLink("ana@example.com")).toBe("mailto:ana@example.com");
expect(contactEmailLink("")).toBeNull();
```

- [ ] Ejecutar las pruebas del bloque y confirmar fallos por el comportamiento ausente, corrigiendo fixtures antes de modificar producción.
- [ ] Implementar: Convertir la lista en grupos de tarjetas Mantine con avatar/iniciales, iconos suaves y colores por categoría. Conservar formularios y permisos. Añadir llamar/WhatsApp/email/copiar, etiquetas accesibles, búsqueda y filtro arriba, y acciones del estado vacío.
- [ ] Ejecutar `NODE_ENV=test node_modules/.bin/vitest run src/features/admin/clinic-contacts/__tests__ --maxWorkers=4` y confirmar cero fallos; medir cobertura del código nuevo (mínimo 80%).
- [ ] Revisar el diff, comprobar permisos y errores del bloque y crear un commit propio con pruebas verdes.
