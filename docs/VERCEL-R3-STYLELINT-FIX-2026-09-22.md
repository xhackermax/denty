# Denty V3 — Vercel R3 Stylelint fix

Fecha: 2026-09-22

## Motivo

El deployment R2 superó instalación, preflight, arquitectura, Prettier y ESLint, pero Vercel se detuvo en Stylelint sobre `src/features/odontogram/odontogram.module.css`.

## Correcciones

- Se fusionó el selector duplicado `.archBlock` sin alterar sus propiedades efectivas.
- `.toothSvg` y `.toothLabel` base se declaran antes de las variantes de arco superior/inferior, eliminando `no-descending-specificity`.
- Las reglas de tonos de la leyenda se normalizaron a bloques separados.
- Las media queries del odontograma se expandieron y separaron para mantenerse estables después de Prettier.
- No se modificaron los assets protegidos de Denty Games ni el modelo clínico del odontograma.

## Validación local independiente de dependencias

- Vercel preflight: 7/7.
- Architecture gate: OK.
- Games integrity: 20/20.
- API parity: 193/193.

La validación final de Stylelint, TypeScript, Vitest y `next build` corresponde al pipeline Node 24 de Vercel, ya que el entorno de reparación no dispone del árbol npm instalado de la ejecución remota.
