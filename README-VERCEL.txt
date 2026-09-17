DENTY · ZIP PARA VERCEL DROP TO DEPLOY

Este paquete es plano: package.json y Next.js están en la raíz.
No contiene pnpm-workspace.yaml, Prisma ni el monorepo completo.

Cambio incluido:
- Puente fijo por selección de inicio y final.
- El tramo intermedio se genera automáticamente.
- Dientes ausentes intermedios se representan como pónticos.
- Dientes/implantes presentes se usan como pilares.
- Funciona para puentes sobre dientes naturales, implantes y mixtos.

En Vercel: Framework = Next.js y Output Directory = Default.

DENTY GAMES · RANKINGS Y BONO
-----------------------------
La interfaz del hub de juegos va incluida en este ZIP. Para que ranking global, records compartidos, contador de partidas y bonos funcionen con datos reales, configura DENTY_API_URL en Vercel apuntando al API Denty actualizado y aplica la migracion Prisma incluida en el proyecto completo. Si el API no esta conectado, el hub mantiene un estado visual seguro sin inventar rankings ni bonos.
