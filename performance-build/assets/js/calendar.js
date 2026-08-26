// StudyFlow Calendar — local-only deadline/task calendar.
// No Google Calendar / Netlify proxy / server sync of any kind: everything
// here lives in localStorage on this device. (A "connect your calendar app"
// style integration can come later via a mobile companion — see project notes.)

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

/* ====== CALENDAR SETTINGS STATE ====== */
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

/* ====== MONTH GRID RENDER ====== */
const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const dow = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function ymd(d){ return d.toISOString().slice(0,10); }
function firstDayOfMonth(y,m){ return new Date(y, m, 1); }
function lastDayOfMonth(y,m){ return new Date(y, m+1, 0); }

function buildMonthGrid(){
  const y = calState.view.year, m = calState.view.month;
  const first = firstDayOfMonth(y,m);
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
    // Add small container for task dots; rendering of dots happens below
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
    // Left-click opens the tasks/deadlines drawer for the date; right-click toggles crossed
    el.addEventListener('click', () => {
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

  // Render a dot per pending task/deadline for each day, from the local task store.
  try {
    const dotTask = () => {
      try {
        const map = tasksStore.all();
        for (const date in map) {
          const list = map[date] || [];
          if (!list.length) continue;
          const container = document.querySelector(`.day[data-date="${date}"] .ev-dots`);
          if (!container) continue;
          const frag = document.createDocumentFragment();
          list.slice(0,3).forEach(t => {
            const dot = document.createElement('span');
            dot.className = 'ev-dot' + (t.done ? ' is-done' : '');
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

/* ===== TASKS / DEADLINES (per-day, local only) ===== */
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
  const input = document.getElementById('taskInput'); if (input) setTimeout(() => input.focus(), 50);
}
function closeTasksDrawer(){ const d = document.getElementById('taskDrawer'); if (d) d.hidden = true; }

function renderTasks(dateISO){
  const list = tasksStore.byDate(dateISO);
  const active = list.filter(t => !t.done);
  const done = list.filter(t => t.done);
  document.getElementById('tasksActive').innerHTML = active.map(t => li(t,false)).join('') || `<li class="sf-muted">No deadlines yet.</li>`;
  document.getElementById('tasksDone').innerHTML = done.map(t => li(t,true)).join('') || `<li class="sf-muted">—</li>`;
  function li(t,isDone){
    return `<li class="sf-taskitem ${isDone?'done':''}" data-id="${t.id}">
      <input type="checkbox" ${isDone?'checked':''} class="js-t-toggle" />
      <div class="t">${escapeHtml(t.text)}</div>
      <button class="sf-btn sf-btn--ghost js-t-del" aria-label="Delete">🗑</button>
    </li>`;
  }
  // Keep the month grid's dots in sync (a toggle/delete changes pending-count per day)
  try {
    const container = document.querySelector(`.day[data-date="${dateISO}"] .ev-dots`);
    if (container) {
      container.innerHTML = '';
      list.slice(0,3).forEach(t => {
        const dot = document.createElement('span');
        dot.className = 'ev-dot' + (t.done ? ' is-done' : '');
        container.appendChild(dot);
      });
    }
  } catch (e) {}
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

/* ====== SETTINGS UI WIRING ====== */
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

/* ====== INIT ====== */
function init() {
  applyCalendarTheme();
  loadSettingsUI();
  buildMonthGrid();

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

  // Close settings on overlay click and Escape
  const modal = document.getElementById('calendarSettings');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeCalSettings();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hidden) closeCalSettings();
    });
  }

  // Tasks/deadlines drawer wiring
  const openTasksBtn = document.getElementById('openTasks'); if (openTasksBtn) openTasksBtn.addEventListener('click', () => {
    const now = new Date(); const iso = now.toISOString().slice(0,10);
    openTasksDrawer(selectedDateISO || iso);
  });
  const closeTasksBtn = document.getElementById('closeTasks'); if (closeTasksBtn) closeTasksBtn.addEventListener('click', closeTasksDrawer);

  const taskForm = document.getElementById('taskForm'); if (taskForm) taskForm.addEventListener('submit', (e) => {
    e.preventDefault(); const input = document.getElementById('taskInput'); if (!input) return;
    const v = input.value.trim(); if (!v || !selectedDateISO) return;
    tasksStore.add(selectedDateISO, v); input.value = ''; renderTasks(selectedDateISO);
  });

  // Delegated controls inside drawer (toggle/delete)
  const drawer = document.getElementById('taskDrawer'); if (drawer) {
    drawer.addEventListener('click', (e) => {
      const li = e.target.closest('.sf-taskitem'); if (!li || !selectedDateISO) return;
      const id = li.getAttribute('data-id');
      if (e.target.classList.contains('js-t-del')) { tasksStore.remove(selectedDateISO, id); renderTasks(selectedDateISO); }
    });
    drawer.addEventListener('change', (e) => {
      if (!e.target.classList.contains('js-t-toggle')) return;
      const li = e.target.closest('.sf-taskitem'); if (!li || !selectedDateISO) return;
      tasksStore.toggle(selectedDateISO, li.getAttribute('data-id'));
      renderTasks(selectedDateISO);
    });
  }

  // --- Today button (jump to today) + keyboard nav ---
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
    if (document.getElementById('taskDrawer') && !document.getElementById('taskDrawer').hidden) return; // don't hijack typing in the drawer
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
      // Enter on a focused day opens its deadlines drawer
      openTasksDrawer(selectedDateISO || new Date().toISOString().slice(0,10));
    }
    if (e.key === 't' || e.key === 'T') jumpToday();
  });
}
document.addEventListener("DOMContentLoaded", init);

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
