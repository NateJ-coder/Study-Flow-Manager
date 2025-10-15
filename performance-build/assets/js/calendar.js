// ---- CONFIG ----
const CFG = window.SF_CONFIG || {};
const GAS_URL = CFG?.INTEGRATIONS?.GAS_CALENDAR_URL;
const GAS_KEY = CFG?.INTEGRATIONS?.GAS_SHARED_KEY;

// ---- STORAGE (local list so the page is instant, even offline) ----
const STORE_KEY = "sf_events_v1";
const store = {
  all() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; } },
  save(list) { localStorage.setItem(STORE_KEY, JSON.stringify(list)); },
  upsert(evt) {
    const list = store.all();
    const i = list.findIndex(x => x.local_id === evt.local_id);
    if (i === -1) list.unshift(evt); else list[i] = evt;
    store.save(list);
  },
  remove(local_id) {
    store.save(store.all().filter(x => x.local_id !== local_id));
  }
};

// ---- UTIL ----
const $ = sel => document.querySelector(sel);
const tzOffset = () => {
  const d = new Date(); const off = -d.getTimezoneOffset(); // minutes east
  const sign = off >= 0 ? "+" : "-";
  const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0");
  const mm = String(Math.abs(off) % 60).padStart(2, "0");
  return `${sign}${hh}:${mm}`;
};

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
  const rows = store.all().map(evt => {
    const when = evt.all_day
      ? `${evt.date}`
      : `${evt.date} ${evt.startTime}–${evt.endTime}`;
    const reminders = (evt.reminders && evt.reminders.length)
      ? evt.reminders.join(", ") + "m"
      : "—";
    const status = evt.event_id
      ? `<span class="tag ok">Synced</span>`
      : `<span class="tag">Local</span>`;
    return `<tr data-id="${evt.local_id}">
      <td>${evt.title || "(no title)"}</td>
      <td>${when}</td>
      <td>${reminders}</td>
      <td>${status}</td>
      <td class="right">
        <button class="btn secondary js-edit">Edit</button>
        <button class="btn js-delete" style="margin-left:6px;background:#ef4444">Delete</button>
      </td>
    </tr>`;
  }).join("");
  tbody.innerHTML = rows || `<tr><td colspan="5" class="muted">No reminders yet.</td></tr>`;
}

// ---- ACTIONS ----
async function createFromForm(e) {
  e.preventDefault();
  const f = e.target;

  const allDay = f.allDay && f.allDay.value === "true";
  const date = (f.date && f.date.value) || new Date().toISOString().slice(0,10);
  const startISO = allDay ? `${date}T00:00:00${tzOffset()}` : toISO(date, (f.startTime && f.startTime.value) || "00:00");
  const endISO   = allDay ? `${date}T00:00:00${tzOffset()}` : toISO(date, (f.endTime && f.endTime.value) || "00:00");

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

  try {
    const r = await gasPost(payload);
    local.event_id = r.event_id;
    store.upsert(local);
    render();
    f.reset();
    // close the reminder modal after successful save
    const modal = document.getElementById('reminderModal');
    if (modal) modal.hidden = true;
  } catch (err) {
    console.error(err);
    alert("Failed to sync to Google Calendar (kept locally). You can retry from Edit.");
  }
}

function onTableClick(e) {
  const row = e.target.closest("tr[data-id]");
  if (!row) return;
  const id = row.getAttribute("data-id");
  const evt = store.all().find(x => x.local_id === id);
  if (!evt) return;

  if (e.target.classList.contains("js-delete")) {
    return deleteEvent(evt);
  }
  if (e.target.classList.contains("js-edit")) {
    return editPrompt(evt);
  }
}

async function deleteEvent(evt) {
  store.remove(evt.local_id); render();

  if (evt.event_id) {
    try {
      await gasPost({ action: "delete", event_id: evt.event_id });
    } catch (err) {
      alert("Delete failed on Google; restoring locally.");
      store.upsert(evt); render();
    }
  }
}

async function editPrompt(evt) {
  const newTitle = prompt("Title:", evt.title || "");
  if (newTitle == null) return;
  evt.title = newTitle.trim();
  store.upsert(evt); render();

  if (evt.event_id) {
    try {
      await gasPost({ action: "update", event_id: evt.event_id, title: evt.title });
    } catch (err) {
      alert("Update failed on Google (change kept locally).");
    }
  }
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
}
document.addEventListener("DOMContentLoaded", init);

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
    cells.push(`<div class="day${isOther?' other':''}${isToday?' today':''}${crossed?' crossed':''}" data-date="${iso}">
      <div class="num" title="${dow[d.getDay()]}">${d.getDate()}</div>
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
      try {
        const src = (window.SF_CONFIG?.AUDIO?.DRAWING) || (window.SF_CONFIG?.AUDIO?.CLICK);
        if (src) { const a = new Audio(src); a.volume = 0.35; a.play().catch(()=>{}); }
      } catch {}
    });
  });
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

    // Start particle system if available
    if (window.ParticleSystem && typeof window.ParticleSystem.start === 'function') {
      window.ParticleSystem.start();
    }
  } catch(e) { console.warn('Calendar bg bootstrap failed', e); }
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
});
