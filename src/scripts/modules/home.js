/* ============================================
   MODULES / home
   Controller de la vista principal (index.html).
   Doble vista: movil (mapa + deck Tinder) y
   desktop (mapa grande + panel con filtros y
   grilla). "Ver cercanos" pide GPS solo al
   interactuar. GRASP: controller.
   ============================================ */
window.KAIPY = window.KAIPY || {};

(function () {
  var config = window.KAIPY.config;
  var utils = window.KAIPY.utils;
  var storage = window.KAIPY.storage;

  var state = {
    reports: [],
    index: 0,
    userPos: null,
    cat: "Todas",
    estado: "Todos",
    query: "",
    swipe: { startX: 0, startY: 0, dx: 0 }
  };

  /* Desktop = ancho >= 900px CON puntero fino (mouse/trackpad).
     Un telefono en landscape (~932px) no activa la vista desktop. */
  var mqDesktop = window.matchMedia("(min-width: 900px) and (pointer: fine)");

  function isDesktop() { return mqDesktop.matches; }

  /* --- Datos --- */
  function sorted() {
    var list = filtered();
    if (state.userPos) {
      return list.sort(function (a, b) { return distTo(a) - distTo(b); });
    }
    return list.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  }

  function filtered() {
    return state.reports.filter(function (r) {
      if (state.cat !== "Todas" && r.category !== state.cat) { return false; }
      if (state.estado !== "Todos" && r.state !== state.estado) { return false; }
      if (state.query) {
        var q = state.query.toLowerCase();
        if ((r.title || "").toLowerCase().indexOf(q) === -1 &&
            (r.description || "").toLowerCase().indexOf(q) === -1) { return false; }
      }
      return true;
    });
  }

  function distTo(r) {
    if (!state.userPos || r.lat == null || r.lon == null) { return Infinity; }
    return utils.distanceMeters(state.userPos.lat, state.userPos.lon, r.lat, r.lon);
  }

  function distLabel(r) {
    if (!state.userPos || r.lat == null || r.lon == null) { return null; }
    return utils.formatDistance(distTo(r));
  }

  /* --- Mapa --- */
  function refreshMap() {
    window.KAIPY.map.showReports("map-home", sorted());
    window.KAIPY.map.fit("map-home", sorted());
  }

  /* --- Deck (movil) --- */
  function cardHtml(r) {
    var stateLabel = config.states[r.state] || r.state;
    var photo = utils.safePhoto(r.photo);
    var media;
    if (photo) {
      media = '<img class="deck__img" src="' + photo + '" alt="' + utils.escapeHtml(r.title) + '" loading="lazy" decoding="async">';
    } else {
      media = '<div class="deck__placeholder" style="' + utils.placeholderStyle(r.category) + '">' +
        utils.escapeHtml(r.category.charAt(0)) + '</div>';
    }
    var d = distLabel(r);
    return (
      '<div class="deck__media">' + media +
        '<div class="deck__stamp deck__stamp--pass">Pasar</div>' +
        '<div class="deck__stamp deck__stamp--view">Ver</div>' +
        '<div class="deck__badges">' +
          '<span class="badge badge--category">' + utils.escapeHtml(r.category) + '</span>' +
          '<span class="badge badge--' + utils.escapeHtml(r.state) + '">' + utils.escapeHtml(stateLabel) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="deck__body">' +
        '<h2 class="deck__title">' + utils.escapeHtml(r.title) + '</h2>' +
        '<div class="deck__meta">' +
          (d ? '<span class="deck__distance">' + utils.escapeHtml(d) + '</span>' : '') +
          '<span>' + (r.votes || 0) + ' lo vieron</span>' +
          '<span>' + utils.escapeHtml(utils.formatDate(r.createdAt)) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="deck__actions">' +
        '<button type="button" class="deck__action deck__action--pass" data-pass>Pasar</button>' +
      '</div>'
    );
  }

  function renderDeck() {
    var wrap = utils.el("deck");
    if (!wrap) { return; }
    var list = sorted();

    if (list.length === 0) {
      wrap.innerHTML = '<div class="deck__empty">No hay reportes con estos filtros.<br>Se el primero en reportar.</div>';
      utils.el("deck-counter").textContent = "";
      return;
    }

    state.index = Math.min(state.index, list.length - 1);
    var current = list[state.index];
    var prev = list[state.index - 1];
    var prev2 = list[state.index - 2];
    var html = "";
    if (prev2) { html += '<div class="deck__card deck__card--behind2">' + cardHtml(prev2) + '</div>'; }
    if (prev) { html += '<div class="deck__card deck__card--behind">' + cardHtml(prev) + '</div>'; }
    html += '<div class="deck__card" id="deck-current">' + cardHtml(current) + '</div>';
    wrap.innerHTML = html;
    utils.el("deck-counter").textContent = (state.index + 1) + " de " + list.length;
    bindSwipe();
  }

  function pass() {
    var list = sorted();
    if (state.index < list.length - 1) {
      state.index++;
      renderDeck();
    } else {
      utils.el("deck").innerHTML =
        '<div class="deck__empty">Viste todos los reportes.<br>Agrega uno nuevo o toca "Ver cercanos".</div>';
      utils.el("deck-counter").textContent = "";
    }
  }

  function bindSwipe() {
    var card = utils.el("deck-current");
    if (!card) { return; }

    // La card completa lleva al detalle (menos botones)
    card.addEventListener("click", function (e) {
      if (e.target.closest("[data-pass]")) { return; }
      var list = sorted();
      var r = list[state.index];
      if (r) { window.location.href = "reporte.html?id=" + encodeURIComponent(r.id); }
    });

    function onDown(e) {
      state.swipe.startX = e.clientX;
      state.swipe.startY = e.clientY;
      state.swipe.dx = 0;
      // Quita la animacion de entrada para que el
      // transform inline del swipe tenga efecto
      card.style.animation = "none";
      card.style.transition = "none";
      card.addEventListener("pointermove", onMove);
      card.addEventListener("pointerup", onUp);
      card.addEventListener("pointercancel", onUp);
    }
    function onMove(e) {
      var dx = e.clientX - state.swipe.startX;
      var dy = e.clientY - state.swipe.startY;
      if (Math.abs(dx) > Math.abs(dy)) {
        card.style.transform = "translateX(" + dx + "px) rotate(" + (dx * 0.06) + "deg)";
        state.swipe.dx = dx;
        card.classList.toggle("is-swiping-left", dx < -24);
        card.classList.toggle("is-swiping-right", dx > 24);
      }
    }
    function onUp(e) {
      card.removeEventListener("pointermove", onMove);
      card.removeEventListener("pointerup", onUp);
      card.removeEventListener("pointercancel", onUp);
      card.classList.remove("is-swiping-left", "is-swiping-right");
      if (Math.abs(state.swipe.dx) > 90) {
        e.stopPropagation();
        var goingRight = state.swipe.dx > 0;
        var list = sorted();
        var r = list[state.index];
        card.style.transition = "transform 0.3s ease, opacity 0.3s ease";
        card.style.transform = "translateX(" + (goingRight ? 480 : -480) + "px) rotate(" + (goingRight ? 20 : -20) + "deg)";
        card.style.opacity = "0";
        if (goingRight && r) {
          // Swipe a la derecha: abrir detalle
          setTimeout(function () {
            window.location.href = "reporte.html?id=" + encodeURIComponent(r.id);
          }, 180);
        } else {
          setTimeout(pass, 260);
        }
      } else {
        card.style.transition = "";
        card.style.transform = "";
      }
    }
    card.addEventListener("pointerdown", onDown);
    card.querySelectorAll("[data-pass]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        pass();
      });
    });
  }

  /* --- Grilla (desktop) --- */
  function desktopCardHtml(r) {
    var stateLabel = config.states[r.state] || r.state;
    var photo = utils.safePhoto(r.photo);
    var media;
    if (photo) {
      media = '<img class="d-card__img" src="' + photo + '" alt="' + utils.escapeHtml(r.title) + '" loading="lazy" decoding="async">';
    } else {
      media = '<div class="d-card__placeholder" style="' + utils.placeholderStyle(r.category) + '">' +
        utils.escapeHtml(r.category.charAt(0)) + '</div>';
    }
    var d = distLabel(r);
    return (
      '<a class="d-card" href="reporte.html?id=' + encodeURIComponent(r.id) + '">' +
        '<div class="d-card__media">' + media +
          '<div class="d-card__badges">' +
            '<span class="badge badge--category">' + utils.escapeHtml(r.category) + '</span>' +
            '<span class="badge badge--' + utils.escapeHtml(r.state) + '">' + utils.escapeHtml(stateLabel) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="d-card__body">' +
          '<span class="d-card__title">' + utils.escapeHtml(r.title) + '</span>' +
          '<div class="d-card__meta">' +
            (d ? '<span class="d-card__distance">' + utils.escapeHtml(d) + '</span>' : '') +
            '<span>' + (r.votes || 0) + ' lo vieron</span>' +
            '<span>' + utils.escapeHtml(utils.formatDate(r.createdAt)) + '</span>' +
          '</div>' +
        '</div>' +
      '</a>'
    );
  }

  function renderGrid() {
    var grid = utils.el("d-grid");
    if (!grid) { return; }
    var list = sorted();
    var count = utils.el("d-count");
    if (count) {
      count.textContent = list.length === 1 ? "1 reporte" : list.length + " reportes";
    }
    if (list.length === 0) {
      grid.innerHTML = '<p class="d-grid__empty">No hay reportes con estos filtros.</p>';
      return;
    }
    grid.innerHTML = list.map(desktopCardHtml).join("");
  }

  /* --- Render segun viewport --- */
  function render() {
    updateClearButton();
    if (isDesktop()) {
      renderGrid();
    } else {
      renderDeck();
    }
    refreshMap();
  }

  /* --- Controles desktop --- */
  function hasFilters() {
    return state.cat !== "Todas" || state.estado !== "Todos" || state.query !== "";
  }

  function updateClearButton() {
    var clearBtn = utils.el("d-clear");
    if (!clearBtn) { return; }
    clearBtn.hidden = !hasFilters();
  }

  function clearFilters() {
    state.cat = "Todas";
    state.estado = "Todos";
    state.query = "";
    state.index = 0;
    var catSel = utils.el("d-category");
    var stateSel = utils.el("d-state");
    var search = utils.el("d-search");
    if (catSel) { catSel.value = "Todas"; }
    if (stateSel) { stateSel.value = "Todos"; }
    if (search) { search.value = ""; }
    render();
  }

  function initDesktopControls() {
    var catSel = utils.el("d-category");
    var stateSel = utils.el("d-state");
    var search = utils.el("d-search");
    var clearBtn = utils.el("d-clear");
    if (!catSel || !stateSel) { return; }

    catSel.innerHTML = '<option value="Todas">Todas las categorias</option>' +
      config.categories.map(function (c) { return '<option value="' + c + '">' + c + "</option>"; }).join("");
    stateSel.innerHTML = '<option value="Todos">Todos los estados</option>' +
      Object.keys(config.states).map(function (k) {
        return '<option value="' + k + '">' + config.states[k] + "</option>";
      }).join("");

    catSel.addEventListener("change", function () { state.cat = catSel.value; state.index = 0; render(); });
    stateSel.addEventListener("change", function () { state.estado = stateSel.value; state.index = 0; render(); });
    search.addEventListener("input", function () { state.query = search.value.trim(); state.index = 0; render(); });
    if (clearBtn) { clearBtn.addEventListener("click", clearFilters); }
    updateClearButton();
  }

  /* --- Ver cercanos (pide GPS solo aqui) --- */
  function initNearby() {
    document.querySelectorAll(".nearby-trigger, #nearby-btn").forEach(function (btn) {
      var original = btn.innerHTML;
      btn.addEventListener("click", function () {
        btn.disabled = true;
        btn.classList.add("is-loading");
        btn.innerHTML = "Buscando...";
        window.KAIPY.geolocation.getPosition().then(function (pos) {
          btn.disabled = false;
          btn.classList.remove("is-loading");
          btn.innerHTML = original;
          if (!pos) {
            utils.toast("Sin permiso de ubicacion. Mostrando todos.");
            return;
          }
          state.userPos = pos;
          state.index = 0;
          render();
          utils.el("nearby-hint").textContent = "Reportes ordenados desde tu ubicacion.";
          utils.toast("Mostrando reportes cercanos a ti");
        });
      });
    });
  }

  // API first: si el servidor responde, el feed real reemplaza
  // al demo local y se suscribe a eventos en vivo (SSE).
  function loadFromApi() {
    var services = window.KAIPY.services;
    services.isUp().then(function (up) {
      if (!up) { return; }
      services.list().then(function (reports) {
        if (!reports) { return; }
        state.reports = reports;
        state.index = 0;
        render(); // render() tambien pinta el mapa

        // Tiempo real multiusuario: reporte nuevo y votos
        services.subscribe(function (ev) {
          if (ev.type === "report:new" && ev.report) {
            state.reports.unshift(ev.report);
            render();
          } else if (ev.type === "report:vote") {
            for (var i = 0; i < state.reports.length; i++) {
              if (state.reports[i].id === ev.id) {
                state.reports[i].votes = ev.votes;
                break;
              }
            }
            render();
          }
        });
      });
    });
  }

  function init() {
    window.KAIPY.storage.seed(window.KAIPY.demoData);
    state.reports = storage.all();

    window.KAIPY.map.init("map-home", {});
    initDesktopControls();
    initNearby();
    render();
    loadFromApi();

    // Cambio de viewport (movil <-> desktop)
    mqDesktop.addEventListener("change", function () {
      state.index = 0;
      render();
      window.KAIPY.map.invalidate("map-home");
    });

    // Tiempo real entre pestanas
    window.addEventListener("storage", function (e) {
      if (e.key === config.storageKey) {
        state.reports = storage.all();
        render();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
