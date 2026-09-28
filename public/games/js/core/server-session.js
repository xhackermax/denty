(function (global) {
  'use strict';

  const root = global.DentyGames = global.DentyGames || { games: {} };
  const BFF_PREFIX = '/api/denty';
  let patientId = '';
  let cachedDashboard = null;
  const activePlays = new Map();

  function proxyPath(path) {
    return `${BFF_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;
  }

  async function request(path, options) {
    const response = await fetch(proxyPath(path), {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
      ...options,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw Object.assign(
        new Error(payload?.error?.message || 'No se pudo conectar con Denty.'),
        { status: response.status, payload },
      );
    }
    return payload;
  }

  function recordLabel(value) {
    const normalized = String(value || '').replace(/\D/g, '');
    return normalized ? `Ficha ••${normalized.slice(-4).padStart(4, '0')}` : 'Ficha ••----';
  }

  async function canonicalPatientLabel() {
    const patient = await request(`/api/patients/${encodeURIComponent(patientId)}`);
    return recordLabel(patient?.recordNumber);
  }

  function init(id) {
    patientId = String(id || '').trim();
    cachedDashboard = null;
    activePlays.clear();
  }

  async function dashboard() {
    if (!patientId) throw new Error('No se ha identificado al paciente.');
    const dashboardData = await request(`/api/patient/${encodeURIComponent(patientId)}/games/dashboard`);
    let canonicalLabel = '';
    try {
      canonicalLabel = await canonicalPatientLabel();
    } catch (_) {
      canonicalLabel = '';
    }
    const serverLabel = String(dashboardData?.profile?.label || '').trim();
    cachedDashboard = {
      ...dashboardData,
      patientId: dashboardData?.patientId || patientId,
      profile: {
        ...(dashboardData?.profile || {}),
        label: canonicalLabel || serverLabel || 'Ficha ••----',
      },
    };
    return cachedDashboard;
  }

  async function start(gameId) {
    if (!patientId) throw new Error('No se ha identificado al paciente.');
    const result = await request(
      `/api/patient/${encodeURIComponent(patientId)}/games/plays/start`,
      { method: 'POST', body: JSON.stringify({ gameId }) },
    );
    activePlays.set(gameId, result.playId);
    return result;
  }

  async function finish(gameId, score) {
    const playId = activePlays.get(gameId);
    if (!playId) throw new Error('No hay una partida activa para finalizar.');
    const result = await request(
      `/api/patient/${encodeURIComponent(patientId)}/games/plays/${encodeURIComponent(playId)}/finish`,
      { method: 'POST', body: JSON.stringify(score == null ? {} : { score }) },
    );
    activePlays.delete(gameId);
    return result;
  }

  async function generateVoucher() {
    if (!patientId) throw new Error('No se ha identificado al paciente.');
    return request(`/api/patient/${encodeURIComponent(patientId)}/games/voucher`, {
      method: 'POST',
      body: '{}',
    });
  }

  function profileLabel() {
    return String(cachedDashboard?.profile?.label || 'Ficha ••----');
  }

  root.serverSession = {
    init,
    dashboard,
    start,
    finish,
    generateVoucher,
    cached: () => cachedDashboard,
    profileLabel,
  };
})(window);
