// Calendar API proxy -> Netlify Function
// Set this once in the page (see calendar.html edit) via window.SF_NETLIFY_BASE
window.SF_NETLIFY_BASE = window.SF_NETLIFY_BASE || '';

const _endpoint = () => {
  const base = window.SF_NETLIFY_BASE || '';
  return `${base}/.netlify/functions/calendar`;
};

async function _call(action, payload) {
  const res = await fetch(_endpoint(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, ...payload })
  });
  if (!res.ok) throw new Error(`Calendar proxy failed: ${res.status}`);
  const json = await res.json();
  if (!json || json.ok === false) throw new Error(`Calendar proxy error: ${json?.error || 'unknown'}`);
  return json;
}

window.CalendarAPI = {
  async listUpcoming({ timeMin, timeMax, maxResults = 25 } = {}) {
    const { events = [] } = await _call('listUpcoming', { timeMin, timeMax, maxResults });
    return events;
  },
  async create({ title, start, end, all_day = false, location, description, reminders } = {}) {
    const { event_id } = await _call('create', { title, start, end, all_day, location, description, reminders });
    return event_id;
  },
  async update({ event_id, title, start, end, all_day = false, location, description, reminders } = {}) {
    await _call('update', { event_id, title, start, end, all_day, location, description, reminders });
    return true;
  },
  async delete({ event_id } = {}) {
    await _call('delete', { event_id });
    return true;
  }
};

// Optional shims for existing calendar.js call names
window.fetchEvents = (range) => window.CalendarAPI.listUpcoming(range);
window.createEvent = (p) => window.CalendarAPI.create(p);
window.updateEvent = (p) => window.CalendarAPI.update(p);
window.deleteEventById = (id) => window.CalendarAPI.delete({ event_id: id });
