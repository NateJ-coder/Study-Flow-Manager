// Local-only reminder store + helpers
(() => {
  const STORAGE_KEY = 'sf_reminders_v1'; // bump if you ever change schema

  /** Schema
   * { events: [{id, title, startISO, endISO, allDay, reminders:[minutes], notes}], lastSaved: ISOString }
   */
  function loadAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { events: [], lastSaved: new Date().toISOString() };
      const data = JSON.parse(raw);
      if (!Array.isArray(data.events)) data.events = [];
      return data;
    } catch {
      return { events: [], lastSaved: new Date().toISOString() };
    }
  }

  function saveAll(data) {
    const payload = {
      events: Array.isArray(data.events) ? data.events : [],
      lastSaved: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return payload;
  }

  function uid() {
    return 'ev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  // CRUD
  function list() {
    return loadAll().events.slice().sort((a,b) => (a.startISO || '').localeCompare(b.startISO));
  }

  function get(id) {
    return loadAll().events.find(e => e.id === id) || null;
  }

  function upsert(evt) {
    const store = loadAll();
    if (!evt.id) evt.id = uid();
    const i = store.events.findIndex(e => e.id === evt.id);
    if (i >= 0) store.events[i] = evt; else store.events.push(evt);
    saveAll(store);
    return evt.id;
  }

  function remove(id) {
    const store = loadAll();
    const before = store.events.length;
    store.events = store.events.filter(e => e.id !== id);
    saveAll(store);
    return before !== store.events.length;
  }

  // Backup / Restore
  function exportJSON() {
    const blob = new Blob([localStorage.getItem(STORAGE_KEY) || '{"events":[]}'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: 'studyflow-reminders.json' });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  async function importJSON(file) {
    const txt = await file.text();
    const obj = JSON.parse(txt);
    saveAll(obj);
    return list();
  }

  // Notifications (when page is open)
  async function ensureNotificationPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const r = await Notification.requestPermission();
      return r === 'granted';
    }
    return false;
  }

  function scheduleDueNotifications() {
    // Call on page load; re-schedules on every visit
    const ok = 'Notification' in window && Notification.permission === 'granted';
    const now = Date.now();
    list().forEach(evt => {
      const when = new Date(evt.startISO).getTime();
      if (!Number.isFinite(when)) return;
      (evt.reminders || []).forEach(mins => {
        const fireAt = when - (Number(mins) * 60 * 1000);
        if (fireAt <= now) return; // already passed
        const delay = fireAt - now;
        setTimeout(() => {
          if (ok) {
            new Notification(evt.title || 'Reminder', {
              body: formatWhen(evt),
              tag: evt.id, // de-dupe
            });
          }
        }, Math.min(delay, 2_147_000_000)); // cap ~24 days to avoid setTimeout limit
      });
    });
  }

  function pad(n){ return (n<10?'0':'') + n; }
  function formatWhen(evt) {
    if (evt.allDay) return 'All day: ' + (evt.startISO || '').slice(0,10);
    const d = new Date(evt.startISO);
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // ICS + Google Calendar helpers
  function toICS(evt) {
    const uid = evt.id || uid();
    const dt = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const escape = s => String(s||'').replace(/([,;])/g,'\\$1').replace(/\n/g,'\\n');

    let ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//StudyFlow//Calendar//EN
BEGIN:VEVENT
UID:${uid}
SUMMARY:${escape(evt.title||'(no title)')}
DESCRIPTION:${escape(evt.notes||'')}
`;
    if (evt.allDay) {
      const start = (evt.startISO||'').slice(0,10).replace(/-/g,'');
      const end   = (evt.endISO  ||evt.startISO||'').slice(0,10).replace(/-/g,'');
      ics += `DTSTART;VALUE=DATE:${start}
DTEND;VALUE=DATE:${end||start}
`;
    } else {
      ics += `DTSTART:${dt(evt.startISO)}
DTEND:${dt(evt.endISO||evt.startISO)}
`;
    }
    (evt.reminders||[]).forEach(m => {
      const mins = Number(m)|0;
      ics += `BEGIN:VALARM
TRIGGER:-PT${mins}M
ACTION:DISPLAY
DESCRIPTION:Reminder
END:VALARM
`;
    });
    ics += 'END:VEVENT\nEND:VCALENDAR\n';
    return ics;
  }

  function downloadICS(evt) {
    const blob = new Blob([toICS(evt)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: (evt.title||'event') + '.ics' });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function googleCalendarLink(evt) {
    const u = new URL('https://calendar.google.com/calendar/render');
    u.searchParams.set('action', 'TEMPLATE');
    u.searchParams.set('text', evt.title || '(no title)');
    if (evt.notes) u.searchParams.set('details', evt.notes);
    if (evt.allDay) {
      const start = (evt.startISO||'').slice(0,10).replace(/-/g,'');
      const end   = (evt.endISO  ||evt.startISO||'').slice(0,10).replace(/-/g,'');
      u.searchParams.set('dates', `${start}/${end||start}`);
    } else {
      const toG = (iso) => new Date(iso).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
      u.searchParams.set('dates', `${toG(evt.startISO)}/${toG(evt.endISO||evt.startISO)}`);
    }
    return u.toString();
  }

  // expose
  window.SF_LOCAL = {
    list, get, upsert, remove,
    exportJSON, importJSON,
    ensureNotificationPermission, scheduleDueNotifications,
    downloadICS, googleCalendarLink
  };
})();
