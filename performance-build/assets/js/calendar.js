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

  const allDay = f.allDay.value === "true";
  const date = f.date.value;
  const startISO = allDay ? `${date}T00:00:00${tzOffset()}` : toISO(date, f.startTime.value);
  const endISO   = allDay ? `${date}T00:00:00${tzOffset()}` : toISO(date, f.endTime.value);

  const repeatSel = f.repeat.value;
  const rrule = repeatSel ? rruleFromSelect(repeatSel, f.repeatDetails.value.trim()) : "";

  const payload = {
    action: "create",
    title: f.title.value.trim(),
    description: f.description.value.trim(),
    location: f.location.value.trim(),
    start: startISO,
    end:   endISO,
    all_day: allDay,
    reminders: parseReminders(f.reminders.value),
    recurrence: rrule || null
  };

  const local = {
    local_id: crypto.randomUUID(),
    title: payload.title,
    date, startTime: f.startTime.value, endTime: f.endTime.value,
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
  form.addEventListener("submit", createFromForm);
  $("#eventsTbody").addEventListener("click", onTableClick);
  $("#downloadICS").addEventListener("click", downloadICSFromForm);

  form.allDay.addEventListener("change", () => {
    const isAllDay = form.allDay.value === "true";
    document.querySelectorAll(".time-start, .time-end").forEach(el => {
      el.classList.toggle("hidden", isAllDay);
    });
    form.startTime.required = !isAllDay;
    form.endTime.required = !isAllDay;
  });

  render();
}
document.addEventListener("DOMContentLoaded", init);
