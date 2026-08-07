/* ============================================
   MODULES / geolocation
   Ubicacion en tiempo real via Geolocation API.
   GRASP: information expert — este modulo es
   el unico que sabe de GPS.
   ============================================ */
window.KAIPY = window.KAIPY || {};

window.KAIPY.geolocation = {
  supported: function () {
    return "geolocation" in navigator;
  },

  // Devuelve una promesa con {lat, lon} o null si se deniega/falla
  getPosition: function () {
    var self = this;
    return new Promise(function (resolve) {
      if (!self.supported()) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          resolve({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude
          });
        },
        function () {
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    });
  }
};
