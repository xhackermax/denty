(function (global) {
  'use strict';

  const root = global.DentyGames = global.DentyGames || { games: {} };
  const memoryStore = new Map();

  function safeStorage() {
    try {
      const s = global.localStorage;
      const key = '__denty_games_probe__';
      s.setItem(key, '1');
      s.removeItem(key);
      return s;
    } catch (_) {
      return {
        getItem: key => memoryStore.has(key) ? memoryStore.get(key) : null,
        setItem: (key, value) => memoryStore.set(key, String(value)),
        removeItem: key => memoryStore.delete(key),
      };
    }
  }

  const storage = safeStorage();
  const REGISTRY_KEY = 'denty.games.profiles.v2';
  const RECORD_KEY = 'denty.games.records.v2';
  const LEGACY_PROFILE_KEY = 'denty.games.profile.v1';
  const LEGACY_RECORD_KEY = 'denty.games.records.v1';

  function readJson(key, fallback) {
    try {
      const parsed = JSON.parse(storage.getItem(key) || 'null');
      return parsed ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try { storage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function normalizeAlias(value) {
    return String(value || '')
      .normalize('NFKC')
      .replace(/[<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 18);
  }

  function aliasKey(value) {
    return normalizeAlias(value).toLocaleLowerCase('es-ES');
  }

  function profileId() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') return global.crypto.randomUUID();
    return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function emptyRegistry() { return { version: 2, activeProfileId: null, profiles: [] }; }

  function migrateLegacy(registry) {
    if (registry.profiles.length) return registry;
    const legacy = readJson(LEGACY_PROFILE_KEY, null);
    const alias = normalizeAlias(legacy?.alias);
    if (!alias || aliasKey(alias) === 'tú' || aliasKey(alias) === 'tu') return registry;
    const profile = { id: profileId(), alias, createdAt: new Date().toISOString() };
    registry.profiles.push(profile);
    registry.activeProfileId = profile.id;
    const legacyRecords = readJson(LEGACY_RECORD_KEY, {});
    if (legacyRecords && typeof legacyRecords === 'object') writeJson(RECORD_KEY, { [profile.id]: legacyRecords });
    writeJson(REGISTRY_KEY, registry);
    return registry;
  }

  function getRegistry() {
    const raw = readJson(REGISTRY_KEY, emptyRegistry());
    const registry = {
      version: 2,
      activeProfileId: typeof raw?.activeProfileId === 'string' ? raw.activeProfileId : null,
      profiles: Array.isArray(raw?.profiles) ? raw.profiles
        .map(p => ({ id: String(p?.id || ''), alias: normalizeAlias(p?.alias), createdAt: String(p?.createdAt || '') }))
        .filter(p => p.id && p.alias) : [],
    };
    if (registry.activeProfileId && !registry.profiles.some(p => p.id === registry.activeProfileId)) registry.activeProfileId = null;
    return migrateLegacy(registry);
  }

  function saveRegistry(registry) {
    const clean = {
      version: 2,
      activeProfileId: registry?.activeProfileId || null,
      profiles: Array.isArray(registry?.profiles) ? registry.profiles : [],
    };
    writeJson(REGISTRY_KEY, clean);
    return clean;
  }

  function getProfiles() { return getRegistry().profiles.slice(); }

  function getActiveProfile() {
    const registry = getRegistry();
    return registry.profiles.find(p => p.id === registry.activeProfileId) || null;
  }

  function createProfile(aliasValue) {
    const alias = normalizeAlias(aliasValue);
    if (alias.length < 2) return { ok: false, error: 'El alias debe tener al menos 2 caracteres.' };
    const registry = getRegistry();
    const existing = registry.profiles.find(p => aliasKey(p.alias) === aliasKey(alias));
    if (existing) {
      registry.activeProfileId = existing.id;
      saveRegistry(registry);
      return { ok: true, profile: existing, existing: true };
    }
    const profile = { id: profileId(), alias, createdAt: new Date().toISOString() };
    registry.profiles.push(profile);
    registry.activeProfileId = profile.id;
    saveRegistry(registry);
    return { ok: true, profile, existing: false };
  }

  function setActiveProfile(id) {
    const registry = getRegistry();
    const profile = registry.profiles.find(p => p.id === String(id || '')) || null;
    if (!profile) return null;
    registry.activeProfileId = profile.id;
    saveRegistry(registry);
    return profile;
  }

  function clearActiveProfile() {
    const registry = getRegistry();
    registry.activeProfileId = null;
    saveRegistry(registry);
  }

  function recordsByProfile() {
    const value = readJson(RECORD_KEY, {});
    return value && typeof value === 'object' ? value : {};
  }

  function getRecords(profileIdValue) {
    const profileIdValueResolved = profileIdValue || getActiveProfile()?.id;
    if (!profileIdValueResolved) return {};
    const all = recordsByProfile();
    const value = all[profileIdValueResolved];
    return value && typeof value === 'object' ? { ...value } : {};
  }

  function getRecord(gameId, profileIdValue) { return Number(getRecords(profileIdValue)[gameId] || 0); }

  function saveRecord(gameId, score, profileIdValue) {
    const profileIdValueResolved = profileIdValue || getActiveProfile()?.id;
    if (!profileIdValueResolved) return { isNew: false, previous: 0, value: 0 };
    const all = recordsByProfile();
    const records = all[profileIdValueResolved] && typeof all[profileIdValueResolved] === 'object' ? { ...all[profileIdValueResolved] } : {};
    const value = Math.max(0, Math.floor(Number(score) || 0));
    const previous = Number(records[gameId] || 0);
    if (value > previous) {
      records[gameId] = value;
      all[profileIdValueResolved] = records;
      writeJson(RECORD_KEY, all);
      return { isNew: true, previous, value };
    }
    return { isNew: false, previous, value: previous };
  }

  function localLeaderboard(gameId) {
    return getProfiles()
      .map(profile => ({ profile, score: getRecord(gameId, profile.id) }))
      .filter(row => row.score > 0)
      .sort((a, b) => b.score - a.score || a.profile.alias.localeCompare(b.profile.alias, 'es'));
  }

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
    storage,
    normalizeAlias,
    getProfiles,
    getActiveProfile,
    createProfile,
    setActiveProfile,
    clearActiveProfile,
    getRecords,
    getRecord,
    saveRecord,
    localLeaderboard,
    haptic,
    clamp,
    roundedRect,
    bindSwipe,
    icon,
    memorySymbol,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.shared;
})(typeof window !== 'undefined' ? window : globalThis);
