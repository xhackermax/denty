(function (global) {
  'use strict';

  function nextDirection(current, requested) {
    if (!current || !requested) return current || requested;
    if (current.x + requested.x === 0 && current.y + requested.y === 0) return { ...current };
    return { ...requested };
  }

  function wrap(value, limit) {
    return ((value % limit) + limit) % limit;
  }

  function defaultFood(state) {
    const occupied = new Set(state.snake.map(p => `${p.x}:${p.y}`));
    const free = [];
    for (let y = 0; y < state.rows; y++) for (let x = 0; x < state.cols; x++) if (!occupied.has(`${x}:${y}`)) free.push({ x, y });
    return free.length ? free[Math.floor(Math.random() * free.length)] : { x: -1, y: -1 };
  }

  function stepState(state, foodFactory) {
    if (state.dead) return state;
    const head = state.snake[0];
    const next = {
      x: wrap(head.x + state.dir.x, state.cols),
      y: wrap(head.y + state.dir.y, state.rows),
    };
    const ate = next.x === state.food.x && next.y === state.food.y;
    const bodyToCheck = ate ? state.snake : state.snake.slice(0, -1);
    const body = bodyToCheck.some((p, i) => i > 0 && p.x === next.x && p.y === next.y);
    if (body) return { ...state, dead: true };
    const snake = [next, ...state.snake];
    if (!ate) snake.pop();
    const nextState = { ...state, snake, dead: false, score: state.score + (ate ? 10 : 0) };
    if (ate) nextState.food = (foodFactory || defaultFood)(nextState);
    return nextState;
  }

  function createGame() {
    let api, host, canvas, ctx, controls, cleanupSwipe, timer, keyHandler, state, queuedDir, paused = false;
    const cols = 16, rows = 16, size = 480, cell = size / cols;

    function reset() {
      state = {
        snake: [{x:7,y:8},{x:6,y:8},{x:5,y:8},{x:4,y:8}],
        dir: {x:1,y:0}, food: {x:12,y:8}, cols, rows, score:0, dead:false,
      };
      queuedDir = state.dir;
      paused = false;
      api.setScore(0);
      api.setMeta('Bordes infinitos · solo pierdes si te cruzas contigo');
      draw();
    }

    function setDirection(dir) {
      queuedDir = nextDirection(state.dir, dir);
      global.DentyGames.shared.haptic(8);
    }

    function tick() {
      if (paused || state.dead) return;
      state.dir = queuedDir;
      state = stepState(state);
      api.setScore(state.score);
      if (state.dead) {
        draw();
        global.DentyGames.shared.haptic([18,45,28]);
        api.finish(state.score, 'Te cruzaste con tu propio recorrido.');
        return;
      }
      draw();
    }

    function drawGrid() {
      ctx.strokeStyle = 'rgba(104,118,137,.055)';
      ctx.lineWidth = 1;
      for (let i = 1; i < cols; i++) {
        const p = i * cell;
        ctx.beginPath(); ctx.moveTo(p,0); ctx.lineTo(p,size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,p); ctx.lineTo(size,p); ctx.stroke();
      }
    }

    function draw() {
      if (!ctx || !state) return;
      ctx.clearRect(0,0,size,size);
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(0,0,size,size);
      drawGrid();
      ctx.fillStyle = '#dff4f2';
      ctx.beginPath(); ctx.arc((state.food.x+.5)*cell,(state.food.y+.5)*cell,cell*.31,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#008d8a';
      ctx.beginPath(); ctx.arc((state.food.x+.5)*cell,(state.food.y+.5)*cell,cell*.14,0,Math.PI*2); ctx.fill();
      state.snake.slice().reverse().forEach((part, reverseIndex) => {
        const i = state.snake.length - 1 - reverseIndex;
        const inset = i === 0 ? 4 : 5.5;
        global.DentyGames.shared.roundedRect(ctx, part.x*cell+inset, part.y*cell+inset, cell-inset*2, cell-inset*2, 9);
        ctx.fillStyle = i === 0 ? '#006f70' : `rgba(0,141,138,${Math.max(.5, .95 - i*.025)})`;
        ctx.fill();
      });
      if (state.dead) {
        ctx.fillStyle='rgba(245,248,251,.72)'; ctx.fillRect(0,0,size,size);
      }
    }

    function mount(container, passedApi) {
      api = passedApi; host = container;
      host.innerHTML = '<canvas class="game-canvas square" width="480" height="480" aria-label="Tablero de Snake"></canvas>';
      canvas = host.querySelector('canvas'); ctx = canvas.getContext('2d');
      controls = api.controls;
      controls.innerHTML = `<div class="snake-pad" aria-label="Controles de Snake"><button class="control control-up" data-dir="up" aria-label="Arriba">${global.DentyGames.shared.icon('up')}</button><button class="control control-left" data-dir="left" aria-label="Izquierda">${global.DentyGames.shared.icon('left')}</button><button class="control control-down" data-dir="down" aria-label="Abajo">${global.DentyGames.shared.icon('down')}</button><button class="control control-right" data-dir="right" aria-label="Derecha">${global.DentyGames.shared.icon('right')}</button></div>`;
      const dirs = {up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
      controls.querySelectorAll('[data-dir]').forEach(btn => btn.addEventListener('click', () => setDirection(dirs[btn.dataset.dir])));
      cleanupSwipe = global.DentyGames.shared.bindSwipe(canvas, direction => setDirection(dirs[direction]));
      keyHandler = event => {
        const map = {ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'};
        if (!map[event.key]) return;
        event.preventDefault(); setDirection(dirs[map[event.key]]);
      };
      global.addEventListener('keydown', keyHandler);
      reset(); timer = global.setInterval(tick, 118);
    }

    function pause(){ paused = true; }
    function resume(){ if (!state?.dead) paused = false; }
    function restart(){ reset(); }
    function destroy(){ global.clearInterval(timer); cleanupSwipe?.(); global.removeEventListener('keydown', keyHandler); }
    return { mount, pause, resume, restart, destroy };
  }

  const exported = { nextDirection, wrap, stepState, createGame };
  if (global.DentyGames) global.DentyGames.games.snake = exported;
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
})(typeof window !== 'undefined' ? window : globalThis);
