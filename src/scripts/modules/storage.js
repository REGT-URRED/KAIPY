/* ============================================
   MODULES / storage
   Persistencia local de reportes (demo).
   Cuando exista el backend, este modulo se
   reemplaza por la capa de servicios HTTP.
   GRASP: indirection — la UI no sabe de donde
   vienen los datos.
   ============================================ */
window.KAIPY = window.KAIPY || {};

(function () {
  var KEY = window.KAIPY.config.storageKey;

  function read() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function write(reports) {
    localStorage.setItem(KEY, JSON.stringify(reports));
  }

  window.KAIPY.storage = {
    // Reportes ordenados por fecha descendente
    all: function () {
      return read().sort(function (a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    },

    get: function (id) {
      var list = read();
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) { return list[i]; }
      }
      return null;
    },

    add: function (report) {
      var list = read();
      report.id = report.id || "r" + Date.now();
      report.createdAt = report.createdAt || new Date().toISOString();
      report.votes = report.votes || 0;
      report.state = report.state || "open";
      report.voters = report.voters || []; // deviceIds que apoyaron
      list.push(report);
      write(list);
      return report;
    },

    vote: function (id, deviceId) {
      var list = read();
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) {
          // El mismo dispositivo solo cuenta un apoyo
          if (deviceId && list[i].voters.indexOf(deviceId) === -1) {
            list[i].voters.push(deviceId);
          }
          list[i].votes = (list[i].votes || 0) + 1;
          write(list);
          return list[i].votes;
        }
      }
      return null;
    },

    // ---- Anti-abuso (capa cliente, best-effort) ----

    // Devuelve true si el dispositivo puede subir otro reporte
    // (rate-limit por ventana configurada en config.abuse).
    submitAllowed: function (deviceId) {
      var cfg = window.KAIPY.config.abuse;
      var now = Date.now();
      var stamps = [];
      try {
        stamps = JSON.parse(localStorage.getItem(cfg.submissionKey) || "[]");
      } catch (e) { stamps = []; }
      stamps = stamps.filter(function (s) {
        return s.deviceId === deviceId && now - s.at < cfg.rateLimitWindowMs;
      });
      return stamps.length < cfg.rateLimitMax;
    },

    // Registra una subida de reporte del dispositivo
    recordSubmission: function (deviceId) {
      var cfg = window.KAIPY.config.abuse;
      var now = Date.now();
      var stamps = [];
      try {
        stamps = JSON.parse(localStorage.getItem(cfg.submissionKey) || "[]");
      } catch (e) { stamps = []; }
      stamps.push({ deviceId: deviceId, at: now });
      stamps = stamps.filter(function (s) {
        return now - s.at < cfg.rateLimitWindowMs;
      });
      try {
        localStorage.setItem(cfg.submissionKey, JSON.stringify(stamps));
      } catch (e) { /* almacen lleno: se ignora */ }
    },

    // Reporte del MISMO dispositivo que sea duplicado casi exacto
    // (misma categoria + radio + ventana de tiempo).
    findDuplicate: function (candidate) {
      var cfg = window.KAIPY.config.abuse;
      var utils = window.KAIPY.utils;
      var now = Date.now();
      var list = read();
      for (var i = 0; i < list.length; i++) {
        var r = list[i];
        if (r.deviceId !== candidate.deviceId) { continue; }
        if (r.category !== candidate.category) { continue; }
        var age = now - new Date(r.createdAt).getTime();
        if (age > cfg.duplicateWindowMs) { continue; }
        if (r.lat != null && r.lon != null &&
            candidate.lat != null && candidate.lon != null) {
          if (utils.distanceMeters(r.lat, r.lon,
              candidate.lat, candidate.lon) > cfg.duplicateRadiusM) { continue; }
        }
        return r;
      }
      return null;
    },

    seed: function (reports) {
      if (read().length === 0) { write(reports); }
    }
  };
})();
