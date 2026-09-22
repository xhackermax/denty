(function (global) {
  'use strict';

  const root = global.DentyGames = global.DentyGames || { games: {} };

  function haptic(pattern) {
    if (!global.navigator || typeof global.navigator.vibrate !== 'function') return;
    try { global.navigator.vibrate(pattern); } catch (_) {}
  }

  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

  function roundedRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, w, h, radius) : (function () {
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x + w, y, x + w, y + h, radius);
      ctx.arcTo(x + w, y + h, x, y + h, radius);
      ctx.arcTo(x, y + h, x, y, radius);
      ctx.closePath();
    })();
  }

  function bindSwipe(element, onSwipe, options) {
    const threshold = Number(options?.threshold || 28);
    let start = null;
    const down = event => {
      const point = event.touches ? event.touches[0] : event;
      start = { x: point.clientX, y: point.clientY, t: Date.now() };
    };
    const up = event => {
      if (!start) return;
      const point = event.changedTouches ? event.changedTouches[0] : event;
      const dx = point.clientX - start.x;
      const dy = point.clientY - start.y;
      const ax = Math.abs(dx), ay = Math.abs(dy);
      const elapsed = Date.now() - start.t;
      const payload = { dx, dy, elapsed, magnitude: Math.max(ax, ay) };
      start = null;
      if (Math.max(ax, ay) < threshold) {
        if (options?.tap) options.tap(payload);
        return;
      }
      onSwipe(ax > ay ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'), payload);
    };
    element.addEventListener('pointerdown', down);
    element.addEventListener('pointerup', up);
    element.addEventListener('pointercancel', () => { start = null; });
    return () => {
      element.removeEventListener('pointerdown', down);
      element.removeEventListener('pointerup', up);
    };
  }

  const iconPaths = {
    back: '<path d="M14 6 8 12l6 6"/><path d="M9 12h11"/>',
    more: '<circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/>',
    pause: '<path d="M9 7v10M15 7v10"/>',
    play: '<path d="m9 7 8 5-8 5Z"/>',
    restart: '<path d="M19 8v5h-5"/><path d="M18.2 13A7 7 0 1 1 17 7"/>',
    left: '<path d="m14 7-5 5 5 5"/>',
    right: '<path d="m10 7 5 5-5 5"/>',
    up: '<path d="m7 14 5-5 5 5"/>',
    down: '<path d="m7 10 5 5 5-5"/>',
    rotate: '<path d="M18 10a6 6 0 1 0-1.8 6.2"/><path d="M18 5v5h-5"/>',
    trophy: '<path d="M8 5h8v4a4 4 0 0 1-8 0Z"/><path d="M8 7H5v1a4 4 0 0 0 4 4M16 7h3v1a4 4 0 0 1-4 4M12 13v4M9 19h6"/>',
    user: '<circle cx="12" cy="8" r="3"/><path d="M6.5 19c.9-3.5 2.8-5.3 5.5-5.3s4.6 1.8 5.5 5.3"/>',
    switch: '<path d="M7 8h10l-3-3M17 16H7l3 3"/>',
    exit: '<path d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10"/><path d="M13 8l4 4-4 4M17 12H9"/>',
    snake: '<path d="M5 17c0-3 2-5 5-5h4a3 3 0 0 0 0-6h-1"/><circle cx="10.5" cy="6" r="1.2"/>',
    block: '<rect x="5" y="5" width="6" height="6" rx="1.5"/><rect x="13" y="5" width="6" height="6" rx="1.5"/><rect x="9" y="13" width="6" height="6" rx="1.5"/>',
    run: '<circle cx="14" cy="5.5" r="2"/><path d="m12.5 8-2.5 4 3.5 2 2-3.2M13.5 14l-3 5M13.5 14l4 3M10 12l-4 1"/>',
    memory: '<rect x="5" y="6" width="10" height="12" rx="2"/><rect x="9" y="4" width="10" height="12" rx="2"/>',
    merge: '<rect x="4" y="6" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><path d="M11 9h3l3 3-3 3h-3"/><rect x="16" y="9" width="5" height="6" rx="1.5"/>',
    hockey: '<circle cx="8" cy="15" r="3.4"/><circle cx="16.5" cy="8" r="2"/><path d="M4.5 19.5h7M12.5 4.5h7"/>',

    impossible: '<path d="m7 18 5-12 5 12Z"/><path d="M5 18h14"/>',
    ttt: '<path d="M8 4 6 20M18 4l-2 16M4 9h16M3 15h16"/>',
    golf: '<path d="M8 4v14"/><path d="m8 5 8 3-8 3"/><circle cx="15.5" cy="18" r="2"/><path d="M5 20h14"/>',
    breakout: '<rect x="4" y="5" width="16" height="5" rx="1"/><path d="M5 14h14M8 19h8"/><circle cx="12" cy="12" r="1.5"/>',
    whack: '<path d="M8 5c0 4-2 5-2 8a6 6 0 0 0 12 0c0-3-2-4-2-8"/><circle cx="12" cy="12" r="2"/>',
    connect: '<path d="M5 7h5v5h4v5h5"/><circle cx="5" cy="7" r="2"/><circle cx="19" cy="17" r="2"/>',
    road: '<path d="M9 4 7 20M15 4l2 16M12 5v3M12 11v3M12 17v2"/>',
  };

  function icon(name, size) {
    const path = iconPaths[name] || iconPaths.more;
    return `<svg aria-hidden="true" viewBox="0 0 24 24" width="${size || 22}" height="${size || 22}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  }

  function memorySymbol(name) {
    const shapes = {
      orbit: '<circle cx="12" cy="12" r="4.5"/><path d="M4 12c2.2-4.4 5-6.5 8-6.5s5.8 2.1 8 6.5c-2.2 4.4-5 6.5-8 6.5S6.2 16.4 4 12Z"/>',
      wave: '<path d="M4 12c2-4 4-4 6 0s4 4 6 0 4-4 4 0"/>',
      spark: '<path d="m12 4 1.7 5.2L19 11l-5.3 1.8L12 18l-1.7-5.2L5 11l5.3-1.8Z"/>',
      leaf: '<path d="M18 5C10 5 6 9 6 15c5 1 10-2 12-10Z"/><path d="M7 16c2-3 5-5 9-7"/>',
      drop: '<path d="M12 4c3 4 5 6.2 5 9a5 5 0 0 1-10 0c0-2.8 2-5 5-9Z"/>',
      moon: '<path d="M17.5 16.5A7 7 0 0 1 9 6a7 7 0 1 0 8.5 10.5Z"/>',
      arch: '<path d="M5 17V12a7 7 0 0 1 14 0v5"/><path d="M9 17v-5a3 3 0 0 1 6 0v5"/>',
      diamond: '<path d="m12 4 7 8-7 8-7-8Z"/>',
    };
    return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${shapes[name] || shapes.orbit}</svg>`;
  }

  root.shared = {
    haptic,
    clamp,
    roundedRect,
    bindSwipe,
    icon,
    memorySymbol,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.shared;
})(typeof window !== 'undefined' ? window : globalThis);
