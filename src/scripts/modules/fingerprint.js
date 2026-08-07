/* ============================================
   MODULES / fingerprint
   Identificador de dispositivo para anti-abuso.
   Envuelve FingerprintJS v5 (vendor local) y
   devuelve un ID estable y anonimo por
   dispositivo. Si la huella falla (ad blocker,
   navegador de privacidad) usa un ID de respaldo
   persistente.
   GRASP: indirection — el resto de la app pide
   window.KAIPY.fingerprint.getId() y no sabe
   como se calcula.
   NOTA: es una senal suave, no una frontera de
   seguridad. Ver docs/ANTIABUSO.md.
   ============================================ */
window.KAIPY = window.KAIPY || {};

(function () {
  var config = window.KAIPY.config;
  var pending = null; // promesa de huella en curso
  var cached = null;  // visitorId ya calculado (memoria)

  // ID de respaldo estable: persiste en localStorage
  function fallbackId() {
    var key = config.abuse.fallbackKey;
    try {
      var id = localStorage.getItem(key);
      if (!id) {
        id = "dev-" + (window.crypto && window.crypto.randomUUID
          ? window.crypto.randomUUID()
          : Date.now().toString(36) + Math.random().toString(36).slice(2));
        localStorage.setItem(key, id);
      }
      return id;
    } catch (e) {
      // localStorage bloqueado: id por sesion
      return "dev-" + Date.now().toString(36) + Math.random().toString(36).slice(2);
    }
  }

  function compute() {
    if (config.abuse.fingerprintEnabled === false) {
      return Promise.resolve(fallbackId());
    }
    if (cached) { return Promise.resolve(cached); }
    if (!window.FingerprintJS) {
      // vendor ausente: nunca romper la app por el filtro
      return Promise.resolve(fallbackId());
    }
    if (!pending) {
      pending = window.FingerprintJS.load()
        .then(function (fp) { return fp.get(); })
        .then(function (result) {
          cached = result.visitorId || fallbackId();
          pending = null;
          return cached;
        })
        .catch(function () {
          pending = null;
          return fallbackId();
        });
    }
    return pending;
  }

  window.KAIPY.fingerprint = {
    // Devuelve una promesa con el ID de dispositivo (estable)
    getId: function () { return compute(); }
  };
})();
