# Denty Fase Clinica Design

## Objetivo

Construir la primera fase clinica avanzada de Denty sobre el odontograma existente sin perder la organizacion profesional actual del proyecto. La entrega debe permitir trabajar con cuatro vistas clinicas conectadas por el mismo modelo: odontograma general, periodontograma, odontograma ortodontico y odontograma pediatrico automatico segun edad. Tambien debe hacer visibles los diagnosticos endodonticos relevantes en el propio diente.

## Alcance Aprobado

- Periodontograma completo con seis sitios por diente, sondaje, recesion, sangrado, placa, supuracion, movilidad, furca, resumen visual y clasificacion.
- Odontograma ortodontico para registrar hallazgos y aparatos sin romper el odontograma general.
- Odontograma pediatrico automatico segun edad: denticion primaria, mixta o permanente.
- Diagnosticos visuales de endodoncia, incluido absceso apical cronico con marca SVG propia.

Quedan fuera de esta fase: agenda editable, Verifactu, recetas, consentimientos, datafono, tareas, permisos multimedia y carrusel de pacientes. Esos puntos deben ir en fases separadas para no mezclar legal, agenda, pagos y clinica en el mismo cambio.

## Principios

- Un solo modelo clinico compartido. Voz, plan clinico, odontograma general, periodonto, ortodoncia y pediatria deben leer y escribir entidades compatibles.
- No crear una segunda aplicacion ni una segunda fuente de verdad.
- Las vistas clinicas cambian la forma de visualizar y editar, no duplican pacientes ni dientes.
- Toda regla de negocio nueva debe nacer con prueba automatica.
- Las marcas visuales deben ser SVG/CSS local, ligeras y compatibles con el estilo actual.

## Arquitectura

La fase se implementa dentro de `apps/web`, manteniendo el layout Next.js actual.

- `src/domain/odontogram`: mantiene dientes, entidades dentales, denticion, compatibilidad entre tratamientos y diagnosticos visualizables.
- `src/domain/periodontal`: crece de resumen rapido a periodontograma completo, con matriz por diente/sitio y clasificacion derivada.
- `src/domain/endodontics.ts`: expone codigos visuales para diagnosticos pulpares/apicales.
- `src/features/odontogram`: contiene el workspace clinico, pestanas de vistas y componentes visuales SVG.
- `src/shared/odontogram`: adapta entidades persistidas al modelo de dominio sin duplicar reglas.

## Modelo Clinico

### Denticion

Se introduce un tipo `DentitionStage`:

- `primary`: de 0 a 5 anos inclusive.
- `mixed`: de 6 a 12 anos inclusive.
- `permanent`: desde 13 anos.

La edad se calcula a partir de la fecha de nacimiento del paciente cuando exista. Si no existe fecha, la vista usa `permanent` como valor seguro para adultos y muestra que la seleccion es manual. En denticion mixta se renderizan dientes temporales y permanentes necesarios para una exploracion real.

### Entidades

El modelo actual `DentalEntity` se conserva y se amplia con atributos tipados por convencion:

- Periodonto: lecturas por diente y sitio.
- Ortodoncia: clase molar/canina, mordida, apiñamiento, diastemas, overjet, overbite, lineas medias y aparatos.
- Pediatria: exfoliacion, erupcion, caries temprana, selladores, pulpotomia/pulpectomia, coronas pediatricas y mantenedores de espacio.
- Endodoncia visual: diagnostico pulpar/apical y codigo de icono.

### Incompatibilidades

Se mantiene la regla actual: un diente no puede tener caries activa e implante activo al mismo tiempo. La misma regla debe aplicarse desde clic manual, plantillas, voz y plan clinico.

## Periodontograma Completo

La vista periodontal debe tener:

- Tabla o mapa compacto por arcada con seis sitios: MV, V, DV, MP, P/L, DP.
- Profundidad de sondaje en mm.
- Recesion en mm.
- CAL calculado.
- Sangrado, placa y supuracion como marcas visuales.
- Movilidad y furca por diente.
- Resumen superior con BOP, placa, max PD, max CAL y numero de bolsas por umbral.
- Clasificacion visual de riesgo: normal, vigilancia, periodontitis moderada, periodontitis avanzada.

Los datos pueden funcionar en modo demo/local al inicio y quedar listos para persistencia por el BFF existente.

## Odontograma Ortodontico

La vista ortodontica debe compartir el mismo selector de paciente y dientes. Debe registrar:

- Clase molar y canina derecha/izquierda.
- Overjet y overbite.
- Mordida cruzada, abierta, profunda y desviacion de linea media.
- Apiñamiento o diastemas por arcada.
- Aparatos: brackets, alineadores, retenedor, disyuntor, arco lingual, mantenedor.
- Notas clinicas ortodonticas.

Visualmente debe usar overlays discretos sobre los dientes y bandas por arcada, no una pantalla aislada.

## Odontograma Pediatrico

La vista pediatrica debe activarse automaticamente por edad:

- `primary`: mostrar solo denticion temporal.
- `mixed`: mostrar denticion temporal y permanente relevante.
- `permanent`: mostrar denticion permanente.

Debe incluir acciones pediatricas:

- Diente temporal sano, caries, sellador, pulpotomia, pulpectomia, corona pediatrica, exfoliado, erupcionando, mantenedor de espacio.
- Representacion visual diferenciada para raices fantasmas en dientes removibles o exfoliados.

El usuario puede cambiar manualmente la vista para pruebas, pero Denty debe sugerir la vista correcta por edad.

## Diagnosticos Visuales De Endodoncia

Cada diagnostico endodontico con significado visual debe tener un codigo estable:

- `normal_apex`
- `symptomatic_apical_periodontitis`
- `asymptomatic_apical_periodontitis`
- `acute_apical_abscess`
- `chronic_apical_abscess`
- `condensing_osteitis`

El caso obligatorio de esta fase es `chronic_apical_abscess`: debe renderizar una marca SVG apical propia, por ejemplo una lesion circular apical con trayecto/fistula fino, colocada junto a la raiz del diente sin tapar superficies ni numero FDI.

## UI

El workspace clinico tendra pestanas compactas:

- General
- Periodonto
- Ortodoncia
- Pediatrico
- Endodoncia
- Historial

Las pestanas no deben parecer una pagina nueva ni duplicar navegacion. La primera pantalla debe seguir sintiendose como el odontograma de Denty, con controles clinicos densos y claros.

## Errores Y Estados

- Si una accion intenta crear una incompatibilidad clinica, se muestra una alerta breve y no se aplica el cambio.
- Si no hay fecha de nacimiento, se permite vista manual de denticion y se informa en el selector.
- Si un diagnostico no tiene icono especifico, se usa una marca generica de endodoncia y queda registrado sin bloquear el trabajo.
- En modo historico, todas las vistas se leen en solo lectura.

## Pruebas

Las pruebas minimas de esta fase son:

- Dominio de denticion: edades 5, 6, 12, 13 y ausencia de fecha.
- Dominio periodontal: matriz completa, CAL, BOP, placa, supuracion, movilidad y furca.
- Dominio endodontico visual: cada diagnostico apical resuelve a un codigo visual estable.
- Odontograma: incompatibilidad implante/caries sigue protegida.
- UI smoke: el workspace muestra pestanas clinicas y cambia de vista sin romper el render.

## Entrega

La fase se considera lista cuando:

- Existe especificacion aprobada.
- Existe plan de implementacion aprobado.
- El codigo pasa pruebas automatizadas.
- El proyecto construye para Vercel.
- Se sube a GitHub en la rama `vercel-supabase-r6-deploy` o en una rama nueva si el usuario prefiere revisar por PR.
