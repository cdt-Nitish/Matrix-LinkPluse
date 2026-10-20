/**
 * LinkPulse Theme Manager
 * Strict visual system: Dark mode default with persistent Light mode toggle.
 * Uses localStorage key: 'linkpulse-theme'
 */
(function () {
  'use strict';

  var THEME_KEY = 'linkpulse-theme';

  function getSavedTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (e) {
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      // Storage unavailable or disabled in browser security settings
    }
  }

  var sunSvg = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  var moonSvg = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  function updateToggleButtons(theme) {
    var isDark = theme === 'dark';
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    buttons.forEach(function (btn) {
      // In dark mode: indicate clicking switches to light mode (show sun)
      // In light mode: indicate clicking switches to dark mode (show moon)
      var label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
      btn.innerHTML = isDark ? sunSvg : moonSvg;
    });
  }

  function applyTheme(theme) {
    var effectiveTheme = (theme === 'light') ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    updateToggleButtons(effectiveTheme);
    try {
      window.dispatchEvent(new CustomEvent('linkpulse-theme-changed', { detail: { theme: effectiveTheme } }));
    } catch (e) {}
    return effectiveTheme;
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') || 'dark';
    var next = current === 'dark' ? 'light' : 'dark';
    saveTheme(next);
    applyTheme(next);
  }

  // Initialize theme on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    var saved = getSavedTheme();
    // Default to dark mode if no saved preference
    var activeTheme = applyTheme(saved || 'dark');

    // Attach click listeners to all theme toggle buttons
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-theme-toggle]');
      if (btn) {
        e.preventDefault();
        toggleTheme();
      }
    });

    updateToggleButtons(activeTheme);
  }

  // Public API
  window.LinkPulseTheme = {
    toggle: toggleTheme,
    apply: applyTheme,
    get: function () {
      return document.documentElement.getAttribute('data-theme') || 'dark';
    }
  };
})();
