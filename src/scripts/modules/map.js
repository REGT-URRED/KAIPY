/* ============================================
   MODULES / map
   Mapa real con Leaflet + OpenStreetMap.
   Tecnologia estandar adaptada a kaipy (ver
   docs/INVESTIGACION_PLATAFORMAS.md): sin API
   key, con marcadores propios y geolocalizacion
   del navegador (GPS).
   GRASP: information expert — este modulo es
   el unico que sabe de mapas.
   ============================================ */
window.KAIPY = window.KAIPY || {};

(function () {
  var config = window.KAIPY.config;
  var utils = window.KAIPY.utils;
  var maps = {};

  // Marcador de reporte (pin naranja de kaipy)
  function reportIcon() {
    return L.divIcon({
      className: "kaipy-marker",
      html: '<div class="kaipy-marker__pin"></div>',
      iconSize: [28, 40],
      iconAnchor: [14, 38],
      popupAnchor: [0, -36]
    });
  }

  // Marcador de usuario (azul con pulso)
  function userIcon() {
    return L.divIcon({
      className: "kaipy-marker kaipy-marker--user",
      html: '<div class="kaipy-marker__user"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });
  }

  // Pin de seleccion (ubicacion al reportar)
  function pinIcon() {
    return L.divIcon({
      className: "kaipy-marker kaipy-marker--pin",
      html: '<div class="kaipy-marker__pin kaipy-marker__pin--select"></div>',
      iconSize: [28, 40],
      iconAnchor: [14, 38]
    });
  }

  function popupHtml(r) {
    var stateLabel = config.states[r.state] || r.state;
    var photo = utils.safePhoto(r.photo);
    var thumb = photo
      ? '<img class="kaipy-popup__thumb" src="' + photo + '" alt="" loading="lazy" decoding="async">'
      : "";
    return (
      '<div class="kaipy-popup">' +
        thumb +
        '<strong class="kaipy-popup__title">' + utils.escapeHtml(r.title || r.category) + '</strong>' +
        '<div class="kaipy-popup__meta">' +
          '<span class="badge badge--category">' + utils.escapeHtml(r.category) + '</span> ' +
          '<span class="badge badge--' + utils.escapeHtml(r.state) + '">' + utils.escapeHtml(stateLabel) + '</span>' +
        '</div>' +
        '<a class="kaipy-popup__link" href="reporte.html?id=' + encodeURIComponent(r.id) + '">Ver detalle</a>' +
      '</div>'
    );
  }

  window.KAIPY.map = {
    // Inicializa un mapa en un contenedor. opts: {center, zoom, clickable, onPin}
    init: function (containerId, opts) {
      opts = opts || {};
      var el = utils.el(containerId);
      if (!el) { return null; }

      var map = L.map(containerId, {
        scrollWheelZoom: false,
        attributionControl: true,
        zoomControl: false
      }).setView(opts.center || config.mapCenter, opts.zoom || config.mapZoom);

      // Control de zoom con tooltips en español
      L.control.zoom({
        zoomInTitle: "Acercar",
        zoomOutTitle: "Alejar"
      }).addTo(map);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);

      // Atribución en español: sin el prefijo "Leaflet"
      map.attributionControl.setPrefix(false);

      var state = {
        map: map,
        reportMarkers: L.layerGroup().addTo(map),
        userMarker: null,
        selectMarker: null,
        clickable: !!opts.clickable,
        onPin: opts.onPin || null
      };

      if (state.clickable) {
        map.on("click", function (e) {
          window.KAIPY.map.setPin(containerId, e.latlng.lat, e.latlng.lng);
        });
      }

      maps[containerId] = state;
      return state;
    },

    // Pinta los reportes como pins con popup
    showReports: function (containerId, reports) {
      var state = maps[containerId];
      if (!state) { return; }
      state.reportMarkers.clearLayers();
      reports.forEach(function (r) {
        if (r.lat == null || r.lon == null) { return; }
        L.marker([r.lat, r.lon], { icon: reportIcon() })
          .bindPopup(popupHtml(r))
          .addTo(state.reportMarkers);
      });
    },

    // Ajusta el encuadre a los reportes visibles
    fit: function (containerId, reports) {
      var state = maps[containerId];
      if (!state) { return; }
      var pts = reports.filter(function (r) { return r.lat != null && r.lon != null; })
        .map(function (r) { return [r.lat, r.lon]; });
      if (pts.length > 0) {
        state.map.fitBounds(pts, { padding: [40, 40], maxZoom: 15 });
      }
    },

    // Pin de seleccion (reportar). Devuelve {lat, lon} o null
    setPin: function (containerId, lat, lon) {
      var state = maps[containerId];
      if (!state) { return; }
      if (!state.selectMarker) {
        state.selectMarker = L.marker([lat, lon], { icon: pinIcon() }).addTo(state.map);
      } else {
        state.selectMarker.setLatLng([lat, lon]);
      }
      if (state.onPin) { state.onPin(lat, lon); }
    },

    // GPS del navegador: marca al usuario y devuelve posicion
    locate: function (containerId) {
      var state = maps[containerId];
      if (!state) { return Promise.resolve(null); }
      return window.KAIPY.geolocation.getPosition().then(function (pos) {
        if (!pos) { return null; }
        if (!state.userMarker) {
          state.userMarker = L.marker([pos.lat, pos.lon], { icon: userIcon() }).addTo(state.map);
        } else {
          state.userMarker.setLatLng([pos.lat, pos.lon]);
        }
        state.map.flyTo([pos.lat, pos.lon], Math.max(state.map.getZoom(), 15), { duration: 1 });
        return pos;
      });
    },

    // Recalcula el tamano (necesario al mostrar/ocultar pestanas)
    invalidate: function (containerId) {
      var state = maps[containerId];
      if (state) { state.map.invalidateSize(); }
    }
  };
})();
