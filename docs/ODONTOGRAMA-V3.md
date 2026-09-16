# Odontograma V3

Odontograma V3 anade entidades clinicas compartidas por odontograma, voz y plan clinico.

## Entidades

- `bridge`: puente con dientes, pilares y ponticos.
- `implant_restoration`: implante, pilar y corona relacionados.
- `removable_prosthesis`: protesis por arco.
- `orthodontics`: tratamiento ortodontico por arco y componentes.
- `pediatric`: tratamientos de odontopediatria.
- `periodontal_chart`: resumen visual periodontal.
- `snapshot`: corte temporal para comparar antes y ahora.

## Compatibilidad

El odontograma legacy sigue funcionando. Las entidades V3 sincronizan estados legacy cuando es necesario, pero no borran datos anteriores.

## Voz y plan clinico

La voz crea entidades V3 para tratamientos complejos. El plan clinico deriva items desde esas mismas entidades para evitar modelos paralelos.
