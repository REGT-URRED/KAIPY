/* ============================================
   MODULES / services
   Capa de datos HTTP (GRASP indirection): el
   unico modulo que habla con el API. Los
   controllers la consumen y, si el API no
   responde, caen a localStorage (storage.js).
   Envia X-Device-Id (huella anonima) en cada
   mutacion; el servidor la usa solo para
   correlacion y limites suaves, nunca como
   credencial.
   ============================================ */
window.KAIPY = window.KAIPY || {};

(function () {
  var config = window.KAIPY.config;
  var base = config.apiBase || "";

  // Health cacheado: 30s positivo, 5s negativo (si esta caido
  // se vuelve a probar pronto, sin pegarle cada segundo).
  var health = null;
  var TTL_UP = 30000;
  var TTL_DOWN = 5000;

  function isUp() {
    if (health && Date.now() - health.at < (health.up ? TTL_UP : TTL_DOWN)) {
      return Promise.resolve(health.up);
    }
    if (!base) { return Promise.resolve(false); }
    return fetch(base + "/api/health", { signal: AbortSignal.timeout(2000) })
      .then(function (r) {
        health = { up: r.ok, at: Date.now() };
        return r.ok;
      })
      .catch(function () {
        health = { up: false, at: Date.now() };
        return false;
      });
  }

  function headers(deviceId) {
    return {
      "Content-Type": "application/json",
      "X-Device-Id": deviceId || ""
    };
  }

  function errBody(r) {
    return r.json().then(function (j) { return j.error || "Error del servidor."; }).catch(function () {
      return "Error del servidor.";
    });
  }

  // Reportes + foto re-encodeada (el listado trae foto, sin
  // internals de auditoria/dedupe).
  function list() {
    return fetch(base + "/api/reports?limit=100", { signal: AbortSignal.timeout(10000) })
      .then(function (r) {
        if (!r.ok) { return null; }
        return r.json().then(function (j) { return j.reports; });
      })
      .catch(function () { return null; });
  }

  function get(id) {
    return fetch(base + "/api/reports/" + encodeURIComponent(id), { signal: AbortSignal.timeout(10000) })
      .then(function (r) {
        if (!r.ok) { return null; }
        return r.json();
      })
      .catch(function () { return null; });
  }

  // Devuelve { ok:true, report } o { ok:false, error, message }.
  // error: "blocked" (422 inapropiado) | "duplicate" (409) |
  //        "ratelimit" (429) | "invalid" (400) | "server" (otro)
  function create(report, deviceId) {
    return fetch(base + "/api/reports", {
      method: "POST",
      headers: headers(deviceId),
      body: JSON.stringify(report)
    }).then(function (r) {
      if (r.status === 201) {
        return r.json().then(function (j) { return { ok: true, report: j }; });
      }
      return errBody(r).then(function (message) {
        var error = r.status === 422 ? "blocked"
          : r.status === 409 ? "duplicate"
          : r.status === 429 ? "ratelimit"
          : r.status === 400 ? "invalid"
          : "server";
        return { ok: false, error: error, message: message };
      });
    }).catch(function () {
      return { ok: false, error: "offline", message: "Sin conexion con el servidor." };
    });
  }

  // { ok, votes, already } — dedupe server: already=true si el
  // dispositivo ya habia votado este reporte.
  function vote(id, deviceId) {
    return fetch(base + "/api/reports/" + encodeURIComponent(id) + "/vote", {
      method: "POST",
      headers: headers(deviceId),
      body: JSON.stringify({ deviceId: deviceId || null })
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) { return { ok: false, votes: null, already: false }; }
        return { ok: true, votes: j.votes, already: !!j.already };
      });
    }).catch(function () {
      return { ok: false, votes: null, already: false };
    });
  }

  function stats() {
    return fetch(base + "/api/stats", { signal: AbortSignal.timeout(10000) })
      .then(function (r) {
        if (!r.ok) { return null; }
        return r.json();
      })
      .catch(function () { return null; });
  }

  // Tiempo real: SSE. cb(payload) con { type: "report:new"|"report:vote", ... }.
  // Devuelve { close }. El servidor envia heartbeat cada 25s.
  function subscribe(cb) {
    var es = new EventSource(base + "/api/events");
    es.onmessage = function (e) {
      try { cb(JSON.parse(e.data)); } catch (err) { /* payload raro: ignorar */ }
    };
    return {
      close: function () { es.close(); }
    };
  }

  window.KAIPY.services = {
    isUp: isUp,
    list: list,
    get: get,
    create: create,
    vote: vote,
    stats: stats,
    subscribe: subscribe
  };
})();
