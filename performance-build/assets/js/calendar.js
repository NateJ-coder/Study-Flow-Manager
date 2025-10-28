// ---- CONFIG ----
const CFG = window.SF_CONFIG || {};
const GAS_URL = CFG?.INTEGRATIONS?.GAS_CALENDAR_URL;
const GAS_KEY = CFG?.INTEGRATIONS?.GAS_SHARED_KEY;

// Runtime verification log
try {
  console.log('[StudyFlow] GAS URL at runtime:', SF_CONFIG?.INTEGRATIONS?.GAS_CALENDAR_URL, 'origin:', location.origin);
} catch (e) { /* ignore */ }

// ---- STORAGE (local list so the page is instant, even offline) ----
const STORE_KEY = "sf_events_v1";
// store wrapper: prefers SF_LOCAL API when available, falls back to localStorage shape used by the page
const store = {
  all() {
    try {
      if (window.SF_LOCAL?.list) {
        return window.SF_LOCAL.list().map(e => {
          const startISO = e.startISO || '';
          const endISO = e.endISO || '';
          const date = startISO.slice(0,10) || (endISO.slice(0,10) || '');
          const startTime = startISO ? startISO.slice(11,16) : '';
          const endTime = endISO ? endISO.slice(11,16) : '';
          return {
            local_id: e.id,
            event_id: e.event_id || null,
            title: e.title,
            date,
            startTime,
            endTime,
            all_day: !!e.allDay || !!e.all_day,
            reminders: e.reminders || []
          };
        });
      }
      return JSON.parse(localStorage.getItem(STORE_KEY)) || [];
    } catch { return []; }
  },
  save(list) {
    if (window.SF_LOCAL?.upsert) {
      // Persist each item into SF_LOCAL (best-effort)
      list.forEach(item => {
        try {
          const evt = {
            id: item.local_id,
            title: item.title,
            startISO: item.date ? (item.startTime ? `${item.date}T${item.startTime}:00${tzOffset()}` : `${item.date}T00:00:00${tzOffset()}`) : undefined,
            endISO: item.date ? (item.endTime ? `${item.date}T${item.endTime}:00${tzOffset()}` : `${item.date}T23:59:00${tzOffset()}`) : undefined,
            allDay: !!item.all_day,
            reminders: item.reminders || [],
            notes: ''
          };
          window.SF_LOCAL.upsert(evt);
        } catch (e) { /* ignore individual failures */ }
      });
      return;
    }
    try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch (e) {}
    invalidateEventsCache();
  },
  upsert(evt) {
    if (window.SF_LOCAL?.upsert) {
      const mapped = {
        id: evt.local_id || undefined,
        title: evt.title,
        startISO: evt.date ? (evt.startTime ? `${evt.date}T${evt.startTime}:00${tzOffset()}` : `${evt.date}T00:00:00${tzOffset()}`) : undefined,
        endISO: evt.date ? (evt.endTime ? `${evt.date}T${evt.endTime}:00${tzOffset()}` : `${evt.date}T23:59:00${tzOffset()}`) : undefined,
        allDay: !!evt.all_day,
        reminders: evt.reminders || [],
        notes: ''
      };
  const id = window.SF_LOCAL.upsert(mapped);
  evt.local_id = id || evt.local_id;
  invalidateEventsCache();
      return;
    }
    const list = store.all();
    const i = list.findIndex(x => x.local_id === evt.local_id);
    if (i === -1) list.unshift(evt); else list[i] = evt;
    store.save(list);
    invalidateEventsCache();
  },
  remove(local_id) {
    if (window.SF_LOCAL?.remove) {
      try { const r = window.SF_LOCAL.remove(local_id); invalidateEventsCache(); return r; } catch (e) { /* ignore */ }
      return;
    }
    store.save(store.all().filter(x => x.local_id !== local_id));
    invalidateEventsCache();
  }
};

// ---- UTIL ----
const $ = sel => document.querySelector(sel);
// schedule work during idle time when possible to keep first paint fast
const scheduleIdle = (fn, opts) => {
  if (typeof window.requestIdleCallback === 'function') return window.requestIdleCallback(fn, opts);
  return setTimeout(fn, opts && opts.timeout ? opts.timeout : 200);
};
const tzOffset = () => {
  const d = new Date(); const off = -d.getTimezoneOffset(); // minutes east
  const sign = off >= 0 ? "+" : "-";
  const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0");
  const mm = String(Math.abs(off) % 60).padStart(2, "0");
  return `${sign}${hh}:${mm}`;
};

// ---- FAST EVENTS CACHE ----
let _eventsCache = null, _eventsCacheAt = 0;
function eventsCached(ttlMs = 1000) {
  const now = Date.now();
  if (_eventsCache && now - _eventsCacheAt < ttlMs) return _eventsCache;
  _eventsCache = store.all();
  _eventsCacheAt = now;
  return _eventsCache;
}
function invalidateEventsCache(){ _eventsCache = null; }

// Global delegated submit: never miss "Save reminder"
document.addEventListener('submit', (e) => {
  const form = e.target;
  if (form && form.id === 'eventForm') {
    // delegate to the existing handler; it will call preventDefault()
    try { createFromForm(e); } catch (err) { console.error('Delegated submit failed', err); }
  }
}, true);

function toISO(dateStr, timeStr) {
  const t = (timeStr || "00:00").split(":");
  const d = new Date(dateStr);
  d.setHours(Number(t[0]||0), Number(t[1]||0), 0, 0);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  const hh = String(d.getHours()).padStart(2,"0");
  const mi = String(d.getMinutes()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:00${tzOffset()}`;
}

function parseReminders(str) {
  if (!str) return [];
  return str.split(",").map(s => Number(s.trim())).filter(n => Number.isFinite(n) && n >= 0);
}

function rruleFromSelect(sel, advanced) {
  if (!sel) return "";
  const base = `FREQ=${sel}`;
  return advanced ? `RRULE:${base};${advanced}` : `RRULE:${base}`;
}

// ---- GAS BRIDGE ----
function gasUrl() {
  const o = encodeURIComponent(location.origin);
  return `${GAS_URL}?key=${encodeURIComponent(GAS_KEY)}&origin=${o}`;
}
async function gasPost(payload) {
  const res = await fetch(gasUrl(), {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ---- RENDER ----
function render() {
  const tbody = $("#eventsTbody");
  const list = eventsCached(); // use cache
  const rows = list.map(evt => {
    const when = evt.all_day
      ? `${evt.date}`
      : `${evt.date} ${evt.startTime}–${evt.endTime}`;
    const reminders = (evt.reminders && evt.reminders.length)
      ? evt.reminders.join(", ") + "m"
      : "—";
    const status = evt.event_id
      ? `<span class="tag ok">Synced</span>`
      : `<span class="tag">Local</span>`;
    const gcal = window.SF_LOCAL?.googleCalendarLink ?
      `<a class="sf-btn sf-btn--ghost" href="${SF_LOCAL.googleCalendarLink({ id: evt.local_id, title: evt.title, notes: '', allDay: evt.all_day, startISO: evt.date + 'T' + (evt.startTime||'00:00') + ':00' + tzOffset(), endISO: evt.date + 'T' + (evt.endTime||'23:59') + ':00' + tzOffset(), reminders: evt.reminders||[] })}" target="_blank" rel="noopener">GCal</a>` : '';

    const ics = window.SF_LOCAL?.downloadICS ? `<button class="sf-btn sf-btn--ghost js-ics">ICS</button>` : '';

    return `<tr data-id="${evt.local_id}">
      <td>${evt.title || "(no title)"}</td>
      <td>${when}</td>
      <td>${reminders}</td>
      <td>${status}</td>
      <td class="right">
        ${gcal} ${ics}
        <button class="btn secondary js-edit">Edit</button>
        <button class="btn js-delete" style="margin-left:6px;background:#ef4444">Delete</button>
      </td>
    </tr>`;
  }).join("");
  const html = rows || `<tr><td colspan="5" class="muted">No reminders yet.</td></tr>`;
  // batch DOM update to next paint
  requestAnimationFrame(() => { tbody.innerHTML = html; });
}

// --- Seasonal Ribbon (Southern Hemisphere seasons) ---
(function seasonalRibbon(){
  try {
    const el = document.getElementById('seasonalRibbon');
    if (!el) return;
    function pickSeasonalMessage(){
      const m = new Date().getMonth();
      if (m===11 || m<=1) return { emoji:'☀️', text:'Summer vibes! Light days, light workload.' };
      if (m>=2 && m<=4) return { emoji:'🍂', text:'Autumn focus—tidy schedules, tidy mind.' };
      if (m>=5 && m<=7) return { emoji:'❄️', text:'Winter calm—perfect time to plan ahead.' };
      return { emoji:'🌸', text:'Spring refresh—clear out old tasks!' };
    }
    const msg = pickSeasonalMessage();
    el.querySelector('#seasonalEmoji').textContent = msg.emoji;
    el.querySelector('#seasonalText').textContent = msg.text;

    // show after first render-frame to keep TTI smooth
    requestAnimationFrame(() => { el.hidden = false; el.setAttribute('aria-live','polite'); });

    el.querySelector('#seasonalClose')?.addEventListener('click', () => el.remove());
  } catch (e) { /* non-blocking */ }
})();

// ---- ACTIONS ----
async function createFromForm(e) {
  e.preventDefault();
  const f = e.target;

  const allDay = f.allDay && f.allDay.value === "true";
  const date = (f.date && f.date.value) || new Date().toISOString().slice(0,10);
  const startISO = allDay ? `${date}T00:00:00${tzOffset()}` : toISO(date, (f.startTime && f.startTime.value) || "00:00");
  const endISO   = allDay ? `${date}T23:59:00${tzOffset()}` : toISO(date, (f.endTime && f.endTime.value) || "00:00");

  // Guard optional repeat fields which may not exist in the modal
  const repeatSel = f.repeat ? f.repeat.value : "";
  const adv = (f.repeatDetails && f.repeatDetails.value) ? f.repeatDetails.value.trim() : "";
  const rrule = repeatSel ? rruleFromSelect(repeatSel, adv) : "";

  const payload = {
    action: "create",
    title: (f.title && f.title.value || "").trim(),
    description: (f.description && f.description.value || "").trim(),
    location: (f.location && f.location.value || "").trim(),
    start: startISO,
    end:   endISO,
    all_day: allDay,
    reminders: parseReminders((f.reminders && f.reminders.value) || ""),
    recurrence: rrule || null
  };

  const local = {
    local_id: crypto.randomUUID(),
    title: payload.title,
    date, startTime: (f.startTime && f.startTime.value) || "",
    endTime: (f.endTime && f.endTime.value) || "",
    all_day: allDay,
    reminders: payload.reminders
  };
  store.upsert(local);
  render();
  // Close modal immediately after local save so the UI feels responsive
  try { f.reset(); } catch (e) {}
  const modal = document.getElementById('reminderModal');
  if (modal) modal.hidden = true;

  // Local-first: if SF_LOCAL is present we keep reminders local-only.
  // If GAS is configured, leave optional background sync logic commented out for now.
  // (Background sync removed to make calendar fully local-first)
}

function onTableClick(e) {
  const row = e.target.closest("tr[data-id]");
  if (!row) return;
  const id = row.getAttribute("data-id");
  const evt = eventsCached().find(x => x.local_id === id);
  if (!evt) return;

  if (e.target.classList.contains("js-delete")) {
    return deleteEvent(evt);
  }
  if (e.target.classList.contains("js-edit")) {
    return editPrompt(evt);
  }
  if (e.target.classList.contains('js-ics')) {
    const evtFull = {
      id: evt.local_id,
      title: evt.title,
      allDay: evt.all_day,
      startISO: evt.date + 'T' + (evt.startTime||'00:00') + ':00' + tzOffset(),
      endISO:   evt.date + 'T' + (evt.endTime  ||'23:59') + ':00' + tzOffset(),
      reminders: evt.reminders || []
    };
    try { window.SF_LOCAL?.downloadICS(evtFull); } catch {}
    return;
  }
}

async function deleteEvent(evt) {
  store.remove(evt.local_id); render();

  // Remote delete disabled in local-first mode. If you re-enable GAS, implement remote delete here.
}

async function editPrompt(evt) {
  const newTitle = prompt("Title:", evt.title || "");
  if (newTitle == null) return;
  evt.title = newTitle.trim();
  store.upsert(evt); render();

  // Remote update disabled in local-first mode. Change is saved locally.
}

function downloadICSFromForm() {
  const f = $("#eventForm");
  const allDay = f.allDay.value === "true";
  const date = f.date.value;
  const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const dtStart = allDay
    ? `${date.replace(/-/g,"")}T000000`
    : `${date.replace(/-/g,"")}T${f.startTime.value.replace(":","")}00`;
  const dtEnd = allDay
    ? `${date.replace(/-/g,"")}T235900`
    : `${date.replace(/-/g,"")}T${f.endTime.value.replace(":","")}00`;

  const ics = [
    "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//StudyFlow//Calendar//EN","CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@studyflow.local`,
    `DTSTAMP:${dtstamp}`,
    `SUMMARY:${(f.title.value||"(no title)").replace(/\n/g," ")}`,
    `DESCRIPTION:${(f.description.value||"").replace(/\n/g," ")}`,
    f.location.value ? `LOCATION:${f.location.value}` : "",
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    "END:VEVENT","END:VCALENDAR"
  ].filter(Boolean).join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "event.ics";
  a.click();
  URL.revokeObjectURL(a.href);
}

function init() {
  const form = $("#eventForm");
  if (form) {
    form.addEventListener("submit", createFromForm);
    if (form.allDay) {
      form.allDay.addEventListener("change", () => {
        const isAllDay = form.allDay.value === "true";
        document.querySelectorAll(".time-start, .time-end").forEach(el => {
          el.classList.toggle("hidden", isAllDay);
        });
        if (form.startTime) form.startTime.required = !isAllDay;
        if (form.endTime) form.endTime.required = !isAllDay;
      });
    }
  }

  const tbody = $("#eventsTbody"); if (tbody) tbody.addEventListener("click", onTableClick);
  const dl = $("#downloadICS"); if (dl) dl.addEventListener("click", downloadICSFromForm);

  render();
  // Request notification permission and schedule reminders during idle time
  try {
    scheduleIdle(() => {
      if (window.SF_LOCAL?.ensureNotificationPermission) {
        window.SF_LOCAL.ensureNotificationPermission().then(() => {
          if (window.SF_LOCAL?.scheduleDueNotifications) window.SF_LOCAL.scheduleDueNotifications();
        });
      }
      // build month grid (visual heavy) during idle
      try { buildMonthGrid(); } catch (e) { console.warn('buildMonthGrid failed', e); }
    }, { timeout: 1000 });
  } catch (e) { /* ignore */ }

  // pull remote upcoming (non-blocking) — preserved but optional
  if (GAS_URL && GAS_KEY) {
    try { syncUpcoming(); } catch (e) { console.warn('syncUpcoming failed', e); }
  }
}
document.addEventListener("DOMContentLoaded", init);

// Background parallax (lightweight) — register once app is ready
(function registerParallaxCalendar(){
  let raf = 0; const bg = document.getElementById('background-image');
  function onMove(e){
    if (!bg) return;
    const { innerWidth: w, innerHeight: h } = window;
    const x = (e.clientX - w/2) / w, y = (e.clientY - h/2) / h;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(()=> bg.style.transform = `translate(${x*6}px, ${y*6}px) scale(1.03)`);
  }
  function register(){
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
        window.addEventListener('mousemove', onMove);
      }
    } catch (e) {}
  }
  if (document.body.classList.contains('ready')) register();
  else window.addEventListener('studyflow:readyToAnimate', register, { once: true });
})();

// Fetch upcoming events from GAS and merge with local store
async function syncUpcoming() {
  const now = new Date().toISOString();
  const in30 = new Date(Date.now() + 30*24*60*60*1000).toISOString();
  try {
    const r = await gasPost({ action: 'listUpcoming', timeMin: now, timeMax: in30, maxResults: 25 });
    const remote = Array.isArray(r.events) ? r.events : [];
    const mapped = remote.map(ev => {
      const allDay = !!ev.start?.date;
      const startISO = ev.start?.dateTime || (ev.start?.date ? `${ev.start.date}T00:00:00${tzOffset()}` : '');
      const endISO = ev.end?.dateTime || (ev.end?.date ? `${ev.end.date}T23:59:00${tzOffset()}` : '');
      const date = ev.start?.date || (startISO ? startISO.slice(0,10) : '');
      return {
        local_id: ev.id || crypto.randomUUID(),
        event_id: ev.id,
        title: ev.summary || '(no title)',
        date,
        startTime: startISO ? startISO.slice(11,16) : '',
        endTime: endISO ? endISO.slice(11,16) : '',
        all_day: allDay,
        reminders: []
      };
    });

    const existing = store.all();
    const byId = new Map(existing.filter(x=>x.event_id).map(x=>[x.event_id,x]));
    const merged = [
      ...existing.filter(x=>!x.event_id),
      ...mapped.map(m => Object.assign(byId.get(m.event_id) || {}, m))
    ].sort((a,b)=> (a.date + (a.startTime||'')) < (b.date + (b.startTime||'')) ? -1 : 1);

    // Save merged list
    try { localStorage.setItem(STORE_KEY, JSON.stringify(merged)); } catch(e) { console.warn('Failed to save merged events', e); }
    render();
  } catch (e) { console.warn('Upcoming fetch failed; showing local only', e); }
}

/* ====== ADD: SETTINGS STATE ====== */
const CAL_STORE = "sf_calendar_settings_v1";
const calState = {
  view: { year: new Date().getFullYear(), month: new Date().getMonth() }, // 0-11
  crossed: JSON.parse(localStorage.getItem("sf_crossed_days") || "{}"),    // {"2025-10-15": true}
  settings: Object.assign({ theme: (localStorage.getItem('sf_theme')||'autumn'),
                          crossColor: '#f59e0b',
                          weekStart: 1 },  // 0=Sun,1=Mon
           JSON.parse(localStorage.getItem(CAL_STORE) || "{}"))
};

function persistCalendar(){ localStorage.setItem(CAL_STORE, JSON.stringify(calState.settings)); }
function saveCrossed(){ localStorage.setItem("sf_crossed_days", JSON.stringify(calState.crossed)); }

function applyCalendarTheme(){
  document.body.classList.remove('autumn-theme','summer-theme','winter-theme');
  document.body.classList.add(`${calState.settings.theme}-theme`);
  // fix: CSS uses --sf-line; set that so cross-out color updates
  document.documentElement.style.setProperty('--sf-line', calState.settings.crossColor);
  try { localStorage.setItem('sf_theme', calState.settings.theme); } catch{}
}

/* ====== ADD: MONTH GRID RENDER ====== */
const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const dow = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function ymd(d){ return d.toISOString().slice(0,10); }
function firstDayOfMonth(y,m){ return new Date(y, m, 1); }
function lastDayOfMonth(y,m){ return new Date(y, m+1, 0); }

function buildMonthGrid(){
  const y = calState.view.year, m = calState.view.month;
  const first = firstDayOfMonth(y,m);
  const last  = lastDayOfMonth(y,m);
  const startOffset = (first.getDay() - calState.settings.weekStart + 7) % 7;

  const startDate = new Date(y, m, 1 - startOffset);
  const cells = [];
  for (let i=0;i<42;i++){
    const d = new Date(startDate);
    d.setDate(startDate.getDate()+i);
    const iso = ymd(new Date(d.getTime() - d.getTimezoneOffset()*60000));
    const isOther = d.getMonth() !== m;
    const isToday = iso === ymd(new Date());
    const crossed = !!calState.crossed[iso];
    // Add small container for event dots; rendering of dots happens below
    cells.push(`<div class="day${isOther?' other':''}${isToday?' today':''}${crossed?' crossed':''}" data-date="${iso}">
      <div class="num" title="${dow[d.getDay()]}">${d.getDate()}</div>
      <div class="ev-dots" aria-hidden="true"></div>
    </div>`);
  }
  document.getElementById('calendarGrid').innerHTML =
    `<div class="dow" style="grid-column:1 / -1;display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-bottom:4px">
      ${[...Array(7)].map((_,i)=>`<div class="muted" style="text-align:center;font-size:12px">${dow[(i+calState.settings.weekStart)%7]}</div>`).join('')}
     </div>` + cells.join('');

  document.getElementById('monthLabel').textContent = `${monthNames[m]} ${y}`;

  document.querySelectorAll('.day').forEach(el=>{
    // Left-click opens tasks drawer for the date; right-click toggles crossed
    el.addEventListener('click', async (e) => {
      const date = el.getAttribute('data-date');
      openTasksDrawer(date);
    });
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const date = el.getAttribute('data-date');
      el.classList.toggle('crossed');
      const nowCrossed = el.classList.contains('crossed');
      calState.crossed[date] = nowCrossed; if (!nowCrossed) delete calState.crossed[date];
      saveCrossed();
      try { window.AudioManager?.play('drawing', 0.35); } catch {}
    });
  });

  // Render per-day dots from the store during idle to keep TTI snappy
  try {
    const dotTask = () => {
      try {
        const events = eventsCached();
        const byDate = events.reduce((acc, ev) => { (acc[ev.date] = acc[ev.date] || []).push(ev); return acc; }, {});
        for (const date in byDate) {
          const container = document.querySelector(`.day[data-date="${date}"] .ev-dots`);
          if (!container) continue;
          const frag = document.createDocumentFragment();
          byDate[date].slice(0,3).forEach(it => {
            const dot = document.createElement('span');
            dot.className = 'ev-dot' + (it.all_day ? ' is-all-day' : '');
            frag.appendChild(dot);
          });
          container.appendChild(frag);
        }
      } catch (e) {}
    };
    if (window.requestIdleCallback) requestIdleCallback(dotTask, { timeout: 300 }); else setTimeout(dotTask, 50);
  } catch (e) { /* non-blocking */ }

  // make days focusable for keyboard a11y
  document.dispatchEvent(new CustomEvent('sf:makeDaysFocusable'));
}

/* ===== TASKS (per-day) ===== */
const TASKS_KEY = 'sf_tasks_v1';
const tasksStore = {
  all() { try { return JSON.parse(localStorage.getItem(TASKS_KEY)) || {}; } catch { return {}; } },
  save(map) { localStorage.setItem(TASKS_KEY, JSON.stringify(map)); },
  add(dateISO, text) {
    const map = tasksStore.all();
    const list = map[dateISO] || [];
    list.unshift({ id: crypto.randomUUID(), text: text.trim(), done: false });
    map[dateISO] = list; tasksStore.save(map);
  },
  toggle(dateISO, id) {
    const map = tasksStore.all(); const list = map[dateISO] || [];
    const t = list.find(x => x.id === id); if (t) t.done = !t.done;
    tasksStore.save(map);
  },
  remove(dateISO, id) {
    const map = tasksStore.all(); const list = map[dateISO] || [];
    map[dateISO] = list.filter(x => x.id !== id); tasksStore.save(map);
  },
  byDate(dateISO) { return (tasksStore.all()[dateISO] || []); }
};

let selectedDateISO = null;

function openTasksDrawer(dateISO){
  selectedDateISO = dateISO;
  const label = document.getElementById('taskDateLabel'); if (label) label.textContent = new Date(dateISO).toDateString();
  renderTasks(dateISO);
  const d = document.getElementById('taskDrawer'); if (d) d.hidden = false;
}
function closeTasksDrawer(){ const d = document.getElementById('taskDrawer'); if (d) d.hidden = true; }

function renderTasks(dateISO){
  const list = tasksStore.byDate(dateISO);
  const active = list.filter(t => !t.done);
  const done = list.filter(t => t.done);
  document.getElementById('tasksActive').innerHTML = active.map(t => li(t,false)).join('') || `<li class="sf-muted">No tasks yet.</li>`;
  document.getElementById('tasksDone').innerHTML = done.map(t => li(t,true)).join('') || `<li class="sf-muted">—</li>`;
  function li(t,isDone){
    return `<li class="sf-taskitem ${isDone?'done':''}" data-id="${t.id}">
      <input type="checkbox" ${isDone?'checked':''} class="js-t-toggle" />
      <div class="t">${escapeHtml(t.text)}</div>
      <button class="sf-btn sf-btn--ghost js-t-del" aria-label="Delete">🗑</button>
    </li>`;
  }
}
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }

/* ===== Background + particles (reuse timer setup) ===== */
(function initCalendarBackground(){
  try {
    const BASE = (window.SF_CONFIG && window.SF_CONFIG.BASE) || '/Study-Flow-Manager/performance-build/assets';
    const theme = (localStorage.getItem('sf_theme') || calState.settings.theme || 'autumn');
    const hour = new Date().getHours();
    const night = (hour >= 18 || hour < 6);
    const pick = (map) => map[`${theme.toUpperCase()}_${night ? 'NIGHT' : 'DAY'}`];

    const src = pick(window.SF_CONFIG?.BACKGROUNDS || {});
    const img = document.getElementById('background-image');
    if (img && src) img.src = src;

    // Particle start is deferred until the app signals ready to animate
    // (bootstrap will listen for 'studyflow:readyToAnimate').
  } catch(e) { console.warn('Calendar bg bootstrap failed', e); }
})();

// Particle autostart bootstrap for calendar (respects reduced-motion)
(function calendarParticleBootstrap(){
  let started = false;
  const startParticles = () => {
    if (started) return; started = true;
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    } catch (e) {}
    try { if (window.ParticleSystem && typeof window.ParticleSystem.start === 'function') window.ParticleSystem.start(); } catch(e){}
  };
  if (window._appReadyShown) startParticles(); else window.addEventListener('studyflow:readyToAnimate', startParticles, { once: true });
})();

/* ====== ADD: SETTINGS UI WIRING ====== */
function openCalSettings(){
  const m = document.getElementById('calendarSettings');
  if (!m) return;
  m.hidden = false;
  m.style.display = 'grid';
  m.setAttribute('aria-hidden', 'false');
  // Prevent background scroll while modal open
  try { document.body.style.overflow = 'hidden'; } catch(e){}
}

function closeCalSettings(){
  const m = document.getElementById('calendarSettings');
  if (!m) return;
  m.hidden = true;
  m.style.display = 'none';
  m.setAttribute('aria-hidden', 'true');
  try { document.body.style.overflow = ''; } catch(e){}
}
function loadSettingsUI(){
  const elTheme = document.getElementById('calTheme');
  if (elTheme) elTheme.value = calState.settings.theme;
  const elCross = document.getElementById('crossColor'); if (elCross) elCross.value = calState.settings.crossColor;
  const elWeek = document.getElementById('weekStart'); if (elWeek) elWeek.value = String(calState.settings.weekStart);
}

function saveSettings(){
  const themeEl = document.getElementById('calTheme');
  const colorEl = document.getElementById('crossColor');
  const weekEl = document.getElementById('weekStart');
  if (themeEl) calState.settings.theme = themeEl.value;
  if (colorEl) calState.settings.crossColor = colorEl.value;
  if (weekEl) calState.settings.weekStart = Number(weekEl.value);
  persistCalendar(); applyCalendarTheme(); buildMonthGrid(); closeCalSettings();
}

/* ====== PATCH: init() — extend existing DOMContentLoaded init ====== */
const _origInit = init; // keep the existing init (form, table, ICS)
try { document.removeEventListener("DOMContentLoaded", init); } catch(e){}

document.addEventListener("DOMContentLoaded", () => {
  try { _origInit(); } catch(e) { console.warn('Calendar original init failed', e); }
  applyCalendarTheme(); loadSettingsUI(); buildMonthGrid();

  const openBtn = document.getElementById('openCalendarSettings'); if (openBtn) openBtn.addEventListener('click', openCalSettings);
  const closeBtn = document.getElementById('closeCalendarSettings'); if (closeBtn) closeBtn.addEventListener('click', closeCalSettings);
  const saveBtn = document.getElementById('saveCalendarSettings'); if (saveBtn) saveBtn.addEventListener('click', saveSettings);

  const prev = document.getElementById('prevMonth'); if (prev) prev.addEventListener('click', () => { if(--calState.view.month < 0){ calState.view.month = 11; calState.view.year--; } buildMonthGrid(); });
  const next = document.getElementById('nextMonth'); if (next) next.addEventListener('click', () => { if(++calState.view.month > 11){ calState.view.month = 0; calState.view.year++; } buildMonthGrid(); });

  // Back to timer (uses history if available, else falls back to configured or default path)
  const backBtn = document.getElementById('backToTimer');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      const fallback = (window.SF_CONFIG?.ROUTES?.TIMER) || '/Study-Flow-Manager/performance-build/index.html#timer';
      if (history.length > 1) history.back();
      else location.href = fallback;
    });
  }

  // Close on overlay click and Escape
  const modal = document.getElementById('calendarSettings');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeCalSettings();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hidden) closeCalSettings();
    });
  }

  // Tasks drawer wiring
  const openTasksBtn = document.getElementById('openTasks'); if (openTasksBtn) openTasksBtn.addEventListener('click', () => {
    const now = new Date(); const iso = now.toISOString().slice(0,10);
    openTasksDrawer(selectedDateISO || iso);
  });
  const closeTasksBtn = document.getElementById('closeTasks'); if (closeTasksBtn) closeTasksBtn.addEventListener('click', closeTasksDrawer);

  const taskForm = document.getElementById('taskForm'); if (taskForm) taskForm.addEventListener('submit', (e) => {
    e.preventDefault(); const input = document.getElementById('taskInput'); if (!input) return;
    const v = input.value.trim(); if (!v || !selectedDateISO) return; tasksStore.add(selectedDateISO, v); input.value = ''; renderTasks(selectedDateISO);
  });

  // Delegated controls inside drawer (toggle/delete)
  const drawer = document.getElementById('taskDrawer'); if (drawer) {
    drawer.addEventListener('click', (e) => {
      const li = e.target.closest('.sf-taskitem'); if (!li || !selectedDateISO) return;
      const id = li.getAttribute('data-id');
      if (e.target.classList.contains('js-t-del')) { tasksStore.remove(selectedDateISO, id); renderTasks(selectedDateISO); }
    });
    drawer.addEventListener('change', (e) => {
      if (!e.target.classList.contains('js-t-toggle')) return; const li = e.target.closest('.sf-taskitem'); if (!li || !selectedDateISO) return; tasksStore.toggle(selectedDateISO, li.getAttribute('data-id')); renderTasks(selectedDateISO);
    });
  }

  // Set reminder button wiring: open the modal pre-filled with the selected day
  const setRemBtn = document.getElementById('openReminderForSelected');
  if (setRemBtn) setRemBtn.addEventListener('click', () => {
    const iso = selectedDateISO || new Date().toISOString().slice(0,10);
    const f = document.getElementById('eventForm');
    if (f && f.date) f.date.value = iso;
    const modal = document.getElementById('reminderModal'); if (modal) modal.hidden = false;
    setTimeout(() => document.querySelector('#eventForm input[name="title"]')?.focus(), 50);
  });

  // Reminder modal close/backdrop/Escape
  const reminderModal = document.getElementById('reminderModal');
  const closeReminderBtn = document.getElementById('closeReminder');
  if (closeReminderBtn) closeReminderBtn.addEventListener('click', () => { if (reminderModal) reminderModal.hidden = true; });
  if (reminderModal) {
    reminderModal.addEventListener('click', (e) => { if (e.target === reminderModal) reminderModal.hidden = true; });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !reminderModal.hidden) reminderModal.hidden = true; });
  }

  // --- Today button (jump to today) + keyboard nav + upcoming filter ---
  const jumpBtn = document.getElementById('jumpToday');
  function selectDate(iso) {
    selectedDateISO = iso;
    document.querySelectorAll('.day[aria-selected="true"]').forEach(el => el.setAttribute('aria-selected','false'));
    const el = document.querySelector(`.day[data-date="${iso}"]`);
    if (el) { el.setAttribute('aria-selected','true'); el.focus({preventScroll:true}); el.scrollIntoView({block:'nearest', inline:'nearest'}); }
  }
  function jumpToday() {
    const iso = new Date().toISOString().slice(0,10);
    const d = new Date(); calState.view.year = d.getFullYear(); calState.view.month = d.getMonth();
    buildMonthGrid(); selectDate(iso);
  }
  jumpBtn?.addEventListener('click', jumpToday);

  document.addEventListener('sf:makeDaysFocusable', () => {
    document.querySelectorAll('.day').forEach(el => el.setAttribute('tabindex','0'));
    selectDate(selectedDateISO || new Date().toISOString().slice(0,10));
  });

  document.addEventListener('keydown', (e) => {
    if (document.getElementById('reminderModal')?.hidden === false) return;
    const navKeys = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter','t','T'];
    if (!navKeys.includes(e.key)) return;
    e.preventDefault();
    const current = selectedDateISO ? new Date(selectedDateISO) : new Date();
    if (e.key === 'ArrowLeft') current.setDate(current.getDate()-1);
    if (e.key === 'ArrowRight') current.setDate(current.getDate()+1);
    if (e.key === 'ArrowUp') current.setDate(current.getDate()-7);
    if (e.key === 'ArrowDown') current.setDate(current.getDate()+7);
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
      const iso = current.toISOString().slice(0,10);
      calState.view.year = current.getFullYear(); calState.view.month = current.getMonth();
      buildMonthGrid(); selectDate(iso);
    }
    if (e.key === 'Enter') {
      const iso = (selectedDateISO || new Date().toISOString().slice(0,10));
      const f = document.getElementById('eventForm'); if (f?.date) f.date.value = iso;
      const modal = document.getElementById('reminderModal'); if (modal) modal.hidden = false;
      setTimeout(() => document.querySelector('#eventForm input[name="title"]')?.focus(), 50);
    }
    if (e.key === 't' || e.key === 'T') jumpToday();
  });

  const filterInput = document.getElementById('upcomingFilter');
  if (filterInput) {
    const apply = () => {
      const q = filterInput.value.trim().toLowerCase();
      const rows = document.querySelectorAll('#eventsTbody tr[data-id]');
      rows.forEach(tr => { const title = tr.children[0]?.textContent?.toLowerCase() || ''; tr.style.display = q && !title.includes(q) ? 'none' : ''; });
    };
    filterInput.addEventListener('input', apply, { passive: true });
  }
});

// --- Seasonal Particles (low-cost DOM version) ---
(function seasonalParticles(){
  try{
    const root = document.getElementById('seasonalParticles'); if (!root) return;
    const month = new Date().getMonth();
    const palette = month===11||month<=1 ? ['☀️','✨','🌞']
                  : month>=2 && month<=4 ? ['🍂','🍁','🌾']
                  : month>=5 && month<=7 ? ['❄️','❅','☃️']
                  : /* spring */           ['🌸','🌼','🦋'];

    const MAX = 16; const nodes = []; let raf = null; let stopped = false;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    for (let i=0;i<MAX;i++){
      const n = document.createElement('span'); n.className='particle';
      n.textContent = palette[(Math.random()*palette.length)|0];
      n.style.left = (Math.random()*100)+'vw'; n.style.top = (Math.random()*-15)+'vh';
      n._vx = (Math.random()-.5)*0.05; n._vy = (0.02 + Math.random()*0.08); n._rot = (Math.random()-.5)*0.02; n._a = 0.6 + Math.random()*0.4;
      root.appendChild(n); nodes.push(n);
    }

    function tick(){ if (stopped) return; const W=innerWidth,H=innerHeight; for(const n of nodes){ const r=n.getBoundingClientRect(); let x=r.left,y=r.top; x += n._vx*W; y += n._vy*H*0.016; if (y>H+20){ x = Math.random()*W; y = -20; } const rot = (parseFloat(n._rotAngle||0)+n._rot); n._rotAngle = rot; n.style.transform = `translate(${x}px, ${y}px) rotate(${rot}turn)`; n.style.opacity = n._a.toFixed(2); } raf = requestAnimationFrame(tick); }

    const vis = ()=>{ if (document.hidden){ stopped=true; if(raf) cancelAnimationFrame(raf); } else { if (stopped){ stopped=false; raf=requestAnimationFrame(tick); } } };
    document.addEventListener('visibilitychange', vis, {passive:true}); raf = requestAnimationFrame(tick);
    setTimeout(()=>{ stopped=true; if(raf) cancelAnimationFrame(raf); root.remove(); }, 25000);
  }catch(e){}
})();

// --- Toast helper ---
function toast(msg, kind='ok', ms=2600){ try{ const host=document.getElementById('toasts'); if(!host) return; const t=document.createElement('div'); t.className=`toast ${kind}`; t.textContent=msg; host.appendChild(t); requestAnimationFrame(()=>t.classList.add('show')); setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(),250); }, ms); }catch(e){} }

// --- Micro confetti burst (DOM, 2 seconds) ---
function microConfetti(){ try{ const layer=document.createElement('div'); layer.style.position='fixed'; layer.style.inset='0'; layer.style.pointerEvents='none'; layer.style.zIndex='60'; document.body.appendChild(layer); const COLORS=['#F87171','#60A5FA','#34D399','#FBBF24','#A78BFA','#F472B6']; const N=60; for(let i=0;i<N;i++){ const s=document.createElement('i'); s.style.position='absolute'; s.style.left=(Math.random()*100)+'vw'; s.style.top='-2vh'; s.style.width=s.style.height=(6+Math.random()*6)+'px'; s.style.background=COLORS[(Math.random()*COLORS.length)|0]; s.style.opacity='0.9'; s.style.willChange='transform'; layer.appendChild(s); const dx=(Math.random()-.5)*40; const dy=100+Math.random()*40; const rot=200+Math.random()*360; const dur=1200+Math.random()*800; const start=performance.now(); (function anim(t0){ const p=Math.min(1,(t0-start)/dur); const ease=p*p*(3-2*p); const x=dx*ease,y=dy*ease; s.style.transform=`translate(${x}px, ${y}vh) rotate(${rot*ease}deg)`; s.style.opacity=String(0.9*(1-p)); if(p<1) requestAnimationFrame(anim); else s.remove(); })(start); } setTimeout(()=>layer.remove(),2200); }catch(e){} }

// Holiday auto-trigger
(function holidayConfetti(){ try{ const d=new Date(); const md=`${d.getMonth()+1}-${d.getDate()}`; if (['1-1','12-25'].includes(md)) setTimeout(microConfetti, 600); }catch(e){} })();

// --- Season switcher (dev/test) ---
(function seasonPreview(){ try{ const btn=document.getElementById('seasonSwitcher'); if(!btn) return; btn.addEventListener('click', ()=>{ const host=document.getElementById('seasonalParticles'); if(!host) return; const sets=[['☀️','✨','🌞'],['🍂','🍁','🌾'],['❄️','❅','☃️'],['🌸','🌼','🦋']]; const idx=Number(host.dataset.idx||'0'); const next=(idx+1)%sets.length; host.dataset.idx=String(next); host.querySelectorAll('.particle').forEach(p=>{ p.textContent = sets[next][Math.floor(Math.random()*sets[next].length)]; }); toast('Season preview changed','ok',1600); }); }catch(e){} })();
