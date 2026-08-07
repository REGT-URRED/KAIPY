/* ============================================
   MODULES / report-detail
   Controller del detalle de reporte anonimo
   (reporte.html?id=...): hero, datos, mapa,
   voto "Yo tambien lo vi" con toast.
   GRASP: controller.
   ============================================ */
window.KAIPY = window.KAIPY || {};

(function () {
  var utils = window.KAIPY.utils;
  var storage = window.KAIPY.storage;

  function getId() {
    var m = window.location.search.match(/[?&]id=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function render(r) {
    utils.el("detail-title").textContent = r.title;
    document.title = r.title + " - kaipy";

    utils.el("detail-category").textContent = r.category;
    utils.el("detail-state").textContent = window.KAIPY.config.states[r.state] || r.state;
    utils.el("detail-state").className = "badge badge--" + r.state;

    utils.el("detail-date").textContent = utils.formatDate(r.createdAt);
    utils.el("detail-coords").textContent = utils.formatCoords(r.lat, r.lon);
    utils.el("detail-description").textContent = r.description;
    utils.el("detail-votes").textContent = (r.votes || 0) + " lo vieron";

    var hero = utils.el("detail-hero");
    if (r.photo) {
      var img = document.createElement("img");
      img.className = "detail-page__img";
      img.src = r.photo;
      img.alt = r.title;
      hero.appendChild(img);
    } else {
      var ph = document.createElement("div");
      ph.className = "detail-page__placeholder";
      ph.style.background = utils.placeholderStyle(r.category).replace("background:", "");
      ph.textContent = "Sin foto";
      hero.appendChild(ph);
    }

    if (r.lat != null && r.lon != null) {
      window.KAIPY.map.init("map-detail", {
        center: [r.lat, r.lon],
        zoom: 16
      });
      window.KAIPY.map.showReports("map-detail", [r]);
    }

    var voteBtn = utils.el("vote-btn");
    if (utils.hasVoted(r.id)) {
      voteBtn.disabled = true;
      voteBtn.textContent = "Ya lo registraste";
    }
    voteBtn.addEventListener("click", function () {
      // Voto con identidad de dispositivo (anti-abuso).
      // Un dispositivo cuenta un solo apoyo; el backend (FASE 2)
      // revalidara por huella. Ver docs/ANTIABUSO.md.
      voteBtn.disabled = true;
      window.KAIPY.fingerprint.getId().then(function (deviceId) {
        storage.vote(r.id, deviceId);
        utils.markVoted(r.id);
        voteBtn.classList.add("is-done");
        voteBtn.textContent = "Registrado";
        utils.el("detail-votes").textContent = storage.get(r.id).votes + " lo vieron";
        utils.toast("Gracias. Tu apoyo le da visibilidad al reporte.");
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var r = storage.get(getId());
    if (!r) {
      utils.el("detail-title").textContent = "Reporte no encontrado";
      return;
    }
    render(r);
  });
})();
