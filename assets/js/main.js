/* ALGOPLAY — perilaku umum halaman (nav, tautan aktif, teks dari config) */
(function () {
  "use strict";
  window.AlgoPlay = window.AlgoPlay || {};
  var cfg = window.ALGOPLAY_CONFIG || {};

  /** Ambil nilai bertingkat dari config: getConfig("game.platform") */
  function getConfig(path) {
    return String(path)
      .split(".")
      .reduce(function (acc, key) {
        return acc && acc[key] !== undefined ? acc[key] : undefined;
      }, cfg);
  }
  window.AlgoPlay.getConfig = getConfig;

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  window.AlgoPlay.escapeHtml = escapeHtml;

  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("site-nav");
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        var open = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && nav.classList.contains("is-open")) {
          nav.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
          toggle.focus();
        }
      });
    }
    // Tandai tautan aktif berdasarkan nama file.
    var current = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    document.querySelectorAll(".nav a[href]").forEach(function (a) {
      var href = (a.getAttribute("href") || "").split("#")[0].toLowerCase();
      if (href === current || (current === "" && href === "index.html")) {
        a.setAttribute("aria-current", "page");
      }
    });
  }

  /** Isi elemen [data-config="a.b"] dengan nilai config; null → teks fallback. */
  function applyConfigText() {
    document.querySelectorAll("[data-config]").forEach(function (el) {
      var val = getConfig(el.getAttribute("data-config"));
      var fallback = el.getAttribute("data-fallback") || "Belum dikonfirmasi pengelola";
      if (val === null || val === undefined || val === "") {
        el.textContent = fallback;
        el.classList.add("unconfirmed");
      } else {
        el.textContent = String(val);
        el.classList.remove("unconfirmed");
      }
    });
    document.querySelectorAll("[data-config-href]").forEach(function (el) {
      var val = getConfig(el.getAttribute("data-config-href"));
      if (val) {
        el.setAttribute("href", String(val));
      } else {
        el.setAttribute("aria-disabled", "true");
        el.removeAttribute("href");
      }
    });
    document.querySelectorAll("[data-config-show]").forEach(function (el) {
      var val = getConfig(el.getAttribute("data-config-show"));
      if (val === null || val === undefined || val === "") el.classList.add("hidden");
    });
  }

  function initFooterYear() {
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    applyConfigText();
    initFooterYear();
  });
})();
