/* ============================================
   MODULES / theme
   Tema claro/oscuro. Preferencia guardada en
   localStorage. DEFAULT: OSCURO (por decision
   de producto). Al cambiar de tema se anade
   una clase transitoria para animar colores.
   GRASP: information expert — unico modulo
   que sabe del tema.
   ============================================ */
window.KAIPY = window.KAIPY || {};

(function () {
  var KEY = "kaipy.theme";
  var DEFAULT_THEME = "dark";

  function apply(theme, animate) {
    var root = document.documentElement;
    if (animate) {
      root.classList.add("theme-anim");
      clearTimeout(root._themeTimer);
      root._themeTimer = setTimeout(function () {
        root.classList.remove("theme-anim");
      }, 400);
    }
    root.setAttribute("data-theme", theme);
    updateIcons(theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) { meta.setAttribute("content", theme === "dark" ? "#0c0a09" : "#ffffff"); }
  }

  function updateIcons(theme) {
    var sun = document.getElementById("icon-sun");
    var moon = document.getElementById("icon-moon");
    if (sun) { sun.style.display = theme === "dark" ? "none" : "block"; }
    if (moon) { moon.style.display = theme === "dark" ? "block" : "none"; }
  }

  function current() {
    return document.documentElement.getAttribute("data-theme") || DEFAULT_THEME;
  }

  window.KAIPY.theme = {
    init: function () {
      var saved = null;
      try { saved = localStorage.getItem(KEY); } catch (e) { /* sin storage */ }
      var theme = (saved === "dark" || saved === "light") ? saved : DEFAULT_THEME;
      apply(theme, false);

      var btn = document.getElementById("theme-toggle");
      if (btn) {
        btn.addEventListener("click", function () {
          var next = current() === "dark" ? "light" : "dark";
          btn.classList.remove("is-spinning");
          // Fuerza reflow para reiniciar la animacion del icono
          void btn.offsetWidth;
          btn.classList.add("is-spinning");
          apply(next, true);
          try { localStorage.setItem(KEY, next); } catch (e) { /* sin storage */ }
        });
      }
    }
  };
})();

window.KAIPY.theme.init();
