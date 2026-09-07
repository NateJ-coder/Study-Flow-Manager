// StudyFlow local preferences.
//
// A thin, consistent wrapper around the small set of purely-cosmetic,
// per-browser localStorage flags: debug mode, and each ambient feature's
// on/off switch (rain mode, corner companion, ...). This is deliberately
// a separate, smaller tier from:
//   - appSettings (timer.js): the REAL settings — theme, durations, sleep
//     timeout, etc. — synced to Firestore so they follow you across devices.
//   - calendar.js's own localStorage use for tasks / crossed-off days /
//     calendar theme: that's calendar DATA, not a cosmetic toggle, and is
//     deliberately local to the calendar page (no account needed to use it).
// Everything read/written through THIS file is a same-browser-only
// cosmetic switch with no server sync, which is exactly why plain
// localStorage — rather than the Firestore settings path — is the right
// place for it.
//
// Not used for the very first paint of theme / ticking-glow: those two
// reads have to run synchronously in <head>, before any deferred script
// (including this one) has executed, to avoid a flash of the wrong theme.
// They intentionally stay as small inline scripts rather than going
// through SF_PREFS — see the comment beside them in timer.html.
(function () {
  function get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }

  function getBool(key, fallback) {
    const v = get(key, null);
    if (v === null) return fallback;
    return v === '1';
  }

  function setBool(key, value) {
    try {
      if (value) localStorage.setItem(key, '1');
      else localStorage.removeItem(key);
    } catch (e) {
      /* localStorage unavailable (private mode, quota, etc.) — the
         preference just won't persist across reloads. Non-fatal. */
    }
  }

  function isDebug() {
    try {
      if (new URLSearchParams(location.search).get('debug') === '1') return true;
    } catch (e) { /* ignore */ }
    return getBool('sf_debug', false);
  }

  window.SF_PREFS = { get, getBool, setBool, isDebug };
})();
