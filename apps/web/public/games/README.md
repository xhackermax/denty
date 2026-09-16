# Denty Games · Demo web

Demo autónoma de los cinco juegos de Denty. No está integrada en el proyecto clínico.

## Cómo probar

La forma más sencilla es abrir `denty-games-demo.html`. Es un único archivo con estilos y JavaScript incluidos.

También puedes usar la versión modular comenzando por `index.html`.

## Flujo de usuario

1. Denty Games exige un alias antes de mostrar los juegos.
2. El alias es el único dato del perfil en esta demo.
3. Se pueden crear varios alias en el mismo dispositivo y volver a entrar con cualquiera de ellos.
4. Cada alias conserva sus propios récords.
5. Desde el hub se puede cambiar de perfil.
6. Dentro de cada juego hay salida visible a `Juegos`, salida en el menú de opciones y salida desde la pausa.
7. Salir de una partida pide confirmación y nunca elimina los récords ya guardados.

## Arquitectura preparada para servidor

El almacenamiento local está encapsulado en `js/core/shared.js`. Los motores de los juegos no conocen perfiles ni persistencia. En una futura integración, la capa de perfiles/récords puede sustituirse por una API sin reescribir Snake, Block Drop, Denty Run, Memory o Merge.

El ranking real entre dispositivos todavía requerirá backend. En esta demo la separación por alias funciona únicamente en el dispositivo actual.

## Snake

Snake usa bordes infinitos: salir por arriba devuelve al jugador por abajo, y lo mismo en los cuatro lados. Las paredes no matan; la única derrota es chocar contra el propio cuerpo.

## Denty Run

Denty Run incluye animación de carrera fluida, parallax sutil y dientes coleccionables. Cada diente suma 25 puntos extra además de la puntuación por distancia. Tiene doble salto, agacharse bajo obstáculos altos, obstáculos bajos que se saltan, secuencias que alternan ambas acciones y agujeros en el suelo. Aterrizar encima de un obstáculo es seguro; solo se pierde al chocarlo lateralmente/de frente o al caer en un agujero.


## Air Hockey

Sexto juego local para 2 personas en el mismo teléfono. Requiere orientación horizontal, cada jugador controla una pala con un dedo dentro de su mitad y gana quien llega primero a 7 goles. No guarda récord individual porque la partida pertenece a dos jugadores.
