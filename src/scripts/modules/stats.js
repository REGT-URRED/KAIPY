/* ============================================
   MODULES / stats
   Controller de la pagina de estadisticas
   (stats.html): resumen, barras por categoria
   y apoyo colectivo.
   GRASP: controller + information expert.
   ============================================ */
window.KAIPY = window.KAIPY || {};

(function () {
  var config = window.KAIPY.config;
  var utils = window.KAIPY.utils;
  var storage = window.KAIPY.storage;

  function renderBars(counts, max) {
    var wrap = utils.el("stats-categories");
    wrap.innerHTML = "";
    config.categories.forEach(function (cat) {
      var n = counts[cat] || 0;
      var row = document.createElement("div");
      row.className = "stats-bar";
      row.innerHTML =
        '<span class="stats-bar__label">' + utils.escapeHtml(cat) + '</span>' +
        '<span class="stats-bar__track"><span class="stats-bar__fill" style="width:' +
          Math.round((n / max) * 100) + '%"></span></span>' +
        '<span class="stats-bar__value">' + n + '</span>';
      wrap.appendChild(row);
    });
  }

  function render() {
    var list = storage.all();

    // Resumen
    utils.el("s-total").textContent = list.length;
    utils.el("s-open").textContent = list.filter(function (r) { return r.state === "open"; }).length;
    utils.el("s-review").textContent = list.filter(function (r) { return r.state === "review"; }).length;
    utils.el("s-resolved").textContent = list.filter(function (r) { return r.state === "resolved"; }).length;
    utils.el("s-votes").textContent = list.reduce(function (sum, r) { return sum + (r.votes || 0); }, 0);

    // Barras por categoria
    var max = 1;
    var counts = {};
    list.forEach(function (r) {
      counts[r.category] = (counts[r.category] || 0) + 1;
      if (counts[r.category] > max) { max = counts[r.category]; }
    });
    renderBars(counts, max);

    // Reporte con mas apoyo
    var top = list.slice().sort(function (a, b) { return (b.votes || 0) - (a.votes || 0); })[0];
    utils.el("s-top").textContent = top && top.votes
      ? "El reporte mas apoyado: \"" + top.title + "\" con " + top.votes + " confirmaciones."
      : "Aun no hay apoyos registrados.";
  }

  // Estadisticas pre-agregadas del API (GET /api/stats)
  function renderFromServer(s) {
    utils.el("s-total").textContent = s.total;
    utils.el("s-open").textContent = (s.byState && s.byState.open) || 0;
    utils.el("s-review").textContent = (s.byState && s.byState.review) || 0;
    utils.el("s-resolved").textContent = (s.byState && s.byState.resolved) || 0;
    utils.el("s-votes").textContent = s.votes;

    var max = 1;
    var counts = {};
    config.categories.forEach(function (cat) {
      counts[cat] = (s.byCategory && s.byCategory[cat]) || 0;
      if (counts[cat] > max) { max = counts[cat]; }
    });
    renderBars(counts, max);

    var top = s.top;
    utils.el("s-top").textContent = top && top.votes
      ? "El reporte mas apoyado: \"" + top.title + "\" con " + top.votes + " confirmaciones."
      : "Aun no hay apoyos registrados.";
  }

  document.addEventListener("DOMContentLoaded", function () {
    window.KAIPY.storage.seed(window.KAIPY.demoData);
    render();

    // API first: si responde, reemplaza con datos del servidor
    window.KAIPY.services.isUp().then(function (up) {
      if (!up) { return; }
      window.KAIPY.services.stats().then(function (s) {
        if (s) { renderFromServer(s); }
      });
    });

    // Tiempo real entre pestanas
    window.addEventListener("storage", function (e) {
      if (e.key === config.storageKey) { render(); }
    });
  });
})();
