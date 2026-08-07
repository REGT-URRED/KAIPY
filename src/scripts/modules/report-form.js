/* ============================================
   MODULES / report-form
   Controller del formulario compacto de reporte
   anonimo (reportar.html): foto destacada,
   categorias, detalles opcionales plegados,
   ubicacion (GPS + toque en mapa).
   GRASP: controller + high cohesion.
   ============================================ */
window.KAIPY = window.KAIPY || {};

(function () {
  var config = window.KAIPY.config;
  var utils = window.KAIPY.utils;

  var state = {
    category: null,
    photo: null,
    lat: null,
    lon: null
  };

  function initCategories() {
    var wrap = utils.el("categories");
    if (!wrap) { return; }
    config.categories.forEach(function (cat) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "category-pills__item";
      btn.textContent = cat;
      btn.addEventListener("click", function () {
        wrap.querySelectorAll(".category-pills__item").forEach(function (el) {
          el.classList.remove("is-selected");
        });
        btn.classList.add("is-selected");
        state.category = cat;
        utils.el("category-error").textContent = "";
      });
      wrap.appendChild(btn);
    });
  }

  function initPhoto() {
    var input = utils.el("photo-input");
    var zone = utils.el("photo-zone");
    var preview = utils.el("photo-preview");
    if (!input) { return; }
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file) { return; }
      window.KAIPY.image.readCompressed(file).then(function (dataUrl) {
        state.photo = dataUrl;
        preview.src = dataUrl;
        zone.classList.add("photo--has-image");
        utils.el("photo-error").textContent = "";
      }).catch(function (err) {
        utils.el("photo-error").textContent = err.message;
      });
    });
  }

  function initOptional() {
    var toggle = utils.el("optional-toggle");
    var box = utils.el("optional-box");
    if (!toggle || !box) { return; }
    toggle.addEventListener("click", function () {
      var open = box.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.querySelector(".report-page__optional-caret").textContent = open ? "-" : "+";
    });
  }

  function updateCoords() {
    utils.el("locate-coords").textContent =
      utils.formatCoords(state.lat, state.lon);
    utils.el("locate-status").textContent =
      state.lat == null
        ? "La web pedira acceso a tu GPS. Tambien puedes tocar el mapa."
        : "Ubicacion capturada. Toca el mapa para ajustar.";
  }

  function initLocation() {
    window.KAIPY.map.init("map-report", {
      clickable: true,
      onPin: function (lat, lon) {
        state.lat = lat;
        state.lon = lon;
        updateCoords();
      }
    });

    var btn = utils.el("locate-btn");
    if (btn) {
      btn.addEventListener("click", function () {
        btn.disabled = true;
        btn.classList.add("is-loading");
        btn.textContent = "Buscando GPS...";
        window.KAIPY.map.locate("map-report").then(function (pos) {
          btn.disabled = false;
          btn.classList.remove("is-loading");
          btn.textContent = "Usar mi ubicacion";
          if (pos) {
            window.KAIPY.map.setPin("map-report", pos.lat, pos.lon);
          } else {
            utils.el("locate-status").textContent =
              "No se pudo obtener el GPS. Toca el mapa para fijar el punto.";
          }
        });
      });
    }
  }

  function validate() {
    var ok = true;
    if (!state.category) {
      utils.el("category-error").textContent = "Elige una categoria.";
      ok = false;
    }
    if (!state.photo) {
      utils.el("photo-error").textContent = "Agrega una foto.";
      ok = false;
    }
    // Limites de texto: espejo del maxlength del HTML (defensa doble)
    var title = utils.el("title").value;
    var desc = utils.el("description").value;
    if (title && title.trim().length > 120) {
      utils.el("title").value = title.trim().slice(0, 120);
    }
    if (desc && desc.trim().length > 1000) {
      utils.el("description").value = desc.trim().slice(0, 1000);
    }
    return ok;
  }

  function initSubmit() {
    var form = utils.el("report-form");
    if (!form) { return; }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      utils.el("category-error").textContent = "";
      utils.el("photo-error").textContent = "";
      if (!validate()) {
        utils.toast("Falta la foto o la categoria");
        return;
      }

      // Filtro anti-abuso: identidad de dispositivo primero.
      // Best-effort en cliente; el backend (FASE 2) revalida.
      var btn = form.querySelector("[type=submit]");
      btn.disabled = true;
      window.KAIPY.fingerprint.getId().then(function (deviceId) {
        var storage = window.KAIPY.storage;

        // 1. Rate-limit: demasiados reportes en poco tiempo
        if (!storage.submitAllowed(deviceId)) {
          btn.disabled = false;
          utils.toast("Demasiados reportes en poco tiempo. Espera unos minutos.");
          return;
        }

        // 2. Duplicado casi exacto del mismo dispositivo
        var dup = storage.findDuplicate({
          deviceId: deviceId,
          category: state.category,
          lat: state.lat,
          lon: state.lon
        });
        if (dup) {
          btn.disabled = false;
          utils.toast("Ya publicaste un reporte similar en esta zona.");
          return;
        }

        var title = utils.sanitizeText(utils.el("title").value, 120);
        var description = utils.sanitizeText(utils.el("description").value, 1000);
        var report = storage.add({
          title: title || (state.category + " (sin titulo)"),
          description: description || "Reporte anonimo sin descripcion.",
          category: state.category,
          photo: state.photo,
          lat: state.lat,
          lon: state.lon,
          deviceId: deviceId
        });
        storage.recordSubmission(deviceId);

        window.location.href = "reporte.html?id=" + encodeURIComponent(report.id);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initCategories();
    initPhoto();
    initOptional();
    initLocation();
    initSubmit();
  });
})();
