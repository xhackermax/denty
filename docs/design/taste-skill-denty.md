# Taste Skill para Denty

## Uso y procedencia

Guías incorporadas desde https://github.com/Leonxlnx/taste-skill:

- `redesign-existing-projects`: auditar la interfaz existente y aplicar mejoras acotadas.
- `minimalist-ui`: orientar superficies, jerarquía y espaciado hacia un diseño sobrio.

Las copias originales están en `.agents/skills/`. Leerlas desde AGENTS.md,
también para los agentes que entran por CLAUDE.md. La licencia MIT está en
`.agents/skills/TASTE-LICENSE.txt`. Esta incorporación configura el trabajo
de diseño; no altera componentes, dependencias ni estilos de la aplicación.

## Reglas clínicas que prevalecen

1. Conservar Next.js, React, Mantine, CSS Modules, Tabler Icons y Motion.
   No introducir bibliotecas, fuentes remotas ni sustituir iconos por gusto.
2. Mantener los colores semánticos del odontograma: rojo pendiente,
   azul realizado, azul con borde rojo insatisfactorio y verde sano.
   Conservar también la semántica de estados de citas y alertas.
   La regla de un único acento se aplica a la decoración, no a datos clínicos.
3. Mantener modos claro y oscuro, densidad compacta y cómoda, navegación,
   permisos, guardado automático, controles de capas y «Mostrar todo».
4. Priorizar legibilidad y velocidad de trabajo. No aplicar espacios de portada,
   titulares editoriales grandes, rejillas asimétricas o efectos de scroll
   a la agenda, tablas, formularios o diagramas dentales.
5. Mantener foco visible, navegación por teclado, etiquetas accesibles,
   contraste WCAG AA y objetivos táctiles de al menos 44 px.
6. Usar animaciones breves solo para dar feedback. Respetar reducción de
   movimiento y mostrar inmediatamente datos y controles clínicos.
   No ocultar contenido esperando animaciones de entrada.
7. Preferir superficies sólidas, bordes discretos y radios consistentes.
   Reservar sombras para elementos cuya superposición debe ser evidente.
   No introducir imágenes decorativas, textura, degradados ni datos ficticios.
8. Mantener la fuente local existente durante esta primera fase.
   Evaluar cualquier sustitución con capturas y métricas de legibilidad;
   no tratar la prohibición de Inter de la guía como un requisito funcional.

## Flujo de revisión

Leer tokens, tema y componentes compartidos antes de cambiar una pantalla.
Registrar hallazgos con rutas y distinguir evidencia del código de observación
visual. Elegir un incremento pequeño y revisar su alcance con el usuario.
Aplicar cambios sobre los tokens existentes cuando corresponda.

Para cambios de runtime, seguir las reglas de pruebas de CLAUDE.md y ejecutar
checks afectados, typecheck, lint y formato. Verificar en navegador a 390, 768
y 1440 px, con ambos modos y densidades; probar teclado, tacto y movimiento
reducido. Usar fixtures de prueba para capturas, nunca datos reales de pacientes.

## Revisión inicial del código — 4 de octubre de 2026

Base inspeccionada: `2b54811`. No se ejecutó la aplicación ni se realizaron
capturas: los siguientes hallazgos son del código, no una auditoría visual.

| Hallazgo | Evidencia | Primera mejora propuesta |
| --- | --- | --- |
| Botones, pestañas y selectores comparten formas de píldora | `src/styles/global.css`: radios de 999 px | Distinguir acciones, filtros y navegación con radios de control |
| Superficies y tablas utilizan desenfoque y sombras | `src/shared/ui/shared-ui.module.css`: surface y tableWrap | Evaluar fondos sólidos y bordes discretos |
| El fondo global introduce degradados azules | `src/styles/global.css`: body::before | Evaluar un fondo neutro para la zona de trabajo |
| La navegación acumula sombras y brillo | `src/app/_components/shell/app-shell.module.css`: navIndicator y bottomIndicator redefinidos al final | Unificar el indicador activo sin brillo decorativo |
| El modo oscuro usa negro puro | `src/styles/tokens.css`: --denty-bg | Comparar carbón oscuro sin degradar contraste |
| Los KPI no declaran cifras tabulares en su clase | `src/shared/ui/shared-ui.module.css`: kpiValue | Verificar alineación de importes y aplicar cifras tabulares donde sea necesario |

## Elementos existentes que conviene conservar

- Tokens centrales y tema de Mantine con ajustes explícitos de contraste.
- Foco visible y soporte global para reducción de movimiento.
- Objetivos táctiles de iconos de 44 px y campos de 16 px en pantallas táctiles.
- Contenedor con ancho máximo y navegación adaptada a móvil y escritorio.
- Componentes compartidos para estados vacíos, errores y carga.
- Controles de capas del odontograma ya presentes, con pruebas asociadas.

## Primer incremento recomendado

Revisar superficies y jerarquía de controles compartidos antes de rediseñar
módulos completos: botones, pestañas, tarjetas, tablas e indicador activo.
Preparar una comparación visual antes/después y validar los flujos de agenda,
selección de paciente y odontograma. Este informe propone ese incremento;
no declara que el rediseño esté implementado.
