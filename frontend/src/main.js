import './style.css';

const mock = import.meta.env.VITE_MOCK_MODE === 'true' || !import.meta.env.VITE_API_URL;
const API = import.meta.env.VITE_API_URL || '';
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID || '';
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID || '';
const cognitoRegion = userPoolId.split('_')[0];
const cognitoUrl = cognitoRegion ? `https://cognito-idp.${cognitoRegion}.amazonaws.com/` : '';
const state = { eventId: 'demo', events: [{ id: 'demo', name: 'Demo networking event', routingEnabled: true, tableCount: 12, tableCapacity: 8, staff: ['Красен Станев', 'Елена Петрова'] }], attendees: [], selected: null, query: '', filter: 'all', currentStaff: 'Красен Станев' };

const demoAttendees = [
  { id: 'a1', accessCode: '4821', name: 'Анна Георгиева', email: 'anna@example.com', company: 'Alpha Studio', role: 'Основател', industry: 'SaaS', interests: ['автоматизация', 'инвестиции'], goals: ['партньори'], needs: ['продажби'], offers: ['технологии'], formData: { 'Предпочитан тип контакт': 'Стратегически партньор', 'Град': 'София' } },
  { id: 'a2', accessCode: '7354', name: 'Николай Иванов', email: 'nikolay@example.com', company: 'Beta Labs', role: 'CEO', industry: 'SaaS', interests: ['автоматизация', 'продажби'], goals: ['партньори'], needs: ['технологии'], offers: ['продажби'], formData: { 'Предпочитан тип контакт': 'Нови клиенти', 'Град': 'София' } },
  { id: 'a3', accessCode: '1906', name: 'Мария Петрова', email: 'maria@example.com', company: 'People Co', role: 'HR директор', industry: 'HR Tech', interests: ['автоматизация'], goals: ['нови решения'], needs: ['технологии'], offers: ['HR експертиза'], formData: { 'Предпочитан тип контакт': 'Иновации', 'Град': 'Пловдив' } }
];

function el(selector) { return document.querySelector(selector); }
function text(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function list(value) { return Array.isArray(value) ? value.join(', ') : value || '—'; }
function currentEvent() { return state.events.find(event => event.id === state.eventId) || {}; }
function tableStats(event = currentEvent()) {
  const total = Number(event.tableCount || event.tables?.length || 0);
  const capacity = Number(event.tableCapacity || event.tables?.reduce((sum, table) => sum + Number(table.capacity || 0), 0) || 0);
  const usedTables = new Set(state.attendees.filter(attendee => attendee.checkedInAt && attendee.routingTarget).map(attendee => attendee.routingTarget)).size;
  return { total, capacity, usedTables, usedSeats: state.attendees.filter(attendee => attendee.checkedInAt).length };
}
function profileRows(attendee) {
  const fields = { 'Имейл': attendee.email, 'Компания': attendee.company, 'Длъжност': attendee.role, 'Индустрия': attendee.industry, 'Интереси': list(attendee.interests), 'Цели': list(attendee.goals), 'Търси': list(attendee.needs), 'Предлага': list(attendee.offers), ...(attendee.formData || {}) };
  return Object.entries(fields).filter(([, value]) => value !== undefined && value !== null && value !== '').map(([label, value]) => `<div class="profile-field"><span>${text(label)}</span><strong>${text(list(value))}</strong></div>`).join('');
}
function render() {
  const event = currentEvent(); const tables = tableStats(event);
  document.querySelector('#app').innerHTML = `
    <section class="app-shell shell">
      <header class="topbar"><div><small>EVENT CHECK-IN</small><h1>${text(event.name || 'Събитие')}</h1></div><div class="topbar-meta"><span class="status status-success">Онлайн</span><span class="staff-name">Работи: ${text(state.currentStaff)}</span></div></header>
      <main class="workspace">
        <section class="toolbar"><select id="eventSelect">${state.events.map(e => `<option value="${e.id}" ${e.id === state.eventId ? 'selected' : ''}>${e.name}</option>`).join('')}</select><button class="btn btn-primary" id="sync">Синхронизирай</button><button class="btn" id="logout">Изход</button></section>
        <section class="stats-grid"><div class="stat-card"><span>Записани гости</span><strong id="registeredStat">0</strong></div><div class="stat-card stat-success"><span>Дошли гости</span><strong id="checkedInStat">0</strong></div><div class="stat-card"><span>Остават</span><strong id="remainingStat">0</strong></div><div class="stat-card"><span>Заети маси</span><strong id="usedTablesStat">${tables.usedTables}/${tables.total || '—'}</strong></div></section>
        <section class="event-meta card"><div><small>КАПАЦИТЕТ НА СЪБИТИЕТО</small><strong id="capacityStat">${tables.usedSeats}/${tables.capacity || '—'} места</strong><span>${tables.total || '—'} маси · ${event.tableCapacity || '—'} места на маса</span></div><div><small>ЕКИП НА СЪБИТИЕТО</small><strong>${text((event.staff || [state.currentStaff]).join(', '))}</strong><span>Текущ потребител: ${text(state.currentStaff)}</span></div></section>
        <section class="scanner card reveal"><div class="section-heading"><div><small>ВХОД</small><h2>Въведи код за достъп</h2></div><span class="status status-neutral">Готово</span></div><p class="muted">Четирицифреният код е в имейла с билета на участника.</p><div class="manual access-code"><input id="accessCode" inputmode="numeric" autocomplete="one-time-code" maxlength="4" pattern="[0-9]{4}" placeholder="0000" aria-label="Четирицифрен код" /><button class="btn btn-primary" id="checkCode">Провери</button></div><p id="status" class="muted">Готово за проверка.</p></section>
        <section id="result" class="card result-card hidden"></section>
        <section class="card reveal"><div class="row"><div><small>LIVE ROSTER</small><h2>Присъстващи</h2></div><span id="count" class="status status-neutral"></span></div><div class="roster-tools"><input id="attendeeSearch" placeholder="Търси име или компания" /><select id="attendeeFilter"><option value="all">Всички</option><option value="checked">Дошли</option><option value="pending">Чакаме</option></select></div><div id="attendees"></div></section>
      </main>
    </section>`;
  updateList(); bind();
}
function renderLogin() {
  document.querySelector('#app').innerHTML = `<section class="app-shell shell"><main class="workspace login"><section class="card"><small>EVENT CHECK-IN</small><h1>Вход за екипа</h1><p class="muted">Достъпът е само за предварително създадени Cognito потребители.</p><input id="email" type="email" placeholder="Имейл" autocomplete="username" /><input id="password" type="password" placeholder="Парола" autocomplete="current-password" /><button class="btn btn-primary" id="login">Вход</button><p id="loginStatus" class="muted"></p></section></main></section>`;
  el('#login').onclick = () => login(el('#email').value.trim(), el('#password').value);
}
function session() {
  const stored = localStorage.getItem('event-checkin-session');
  if (!stored) return Promise.resolve(null);
  try { const current = JSON.parse(stored); return Promise.resolve(current.expiresAt > Date.now() ? current : null); } catch { return Promise.resolve(null); }
}
function login(email, password) {
  const status = el('#loginStatus');
  fetch(cognitoUrl, { method: 'POST', headers: { 'content-type': 'application/x-amz-json-1.1', 'x-amz-target': 'AWSCognitoIdentityProviderService.InitiateAuth' }, body: JSON.stringify({ AuthFlow: 'USER_PASSWORD_AUTH', ClientId: clientId, AuthParameters: { USERNAME: email, PASSWORD: password } }) })
    .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Входът не успя.'); localStorage.setItem('event-checkin-session', JSON.stringify({ accessToken: data.AuthenticationResult.AccessToken, idToken: data.AuthenticationResult.IdToken, expiresAt: Date.now() + (data.AuthenticationResult.ExpiresIn * 1000) })); boot(); })
    .catch(error => { status.textContent = error.message; status.className = 'error'; });
}
function updateList() {
  const checked = state.attendees.filter(a => a.checkedInAt).length;
  const registered = el('#registeredStat'); if (registered) registered.textContent = state.attendees.length;
  const checkedIn = el('#checkedInStat'); if (checkedIn) checkedIn.textContent = checked;
  const remaining = el('#remainingStat'); if (remaining) remaining.textContent = state.attendees.length - checked;
  el('#count').textContent = `${checked}/${state.attendees.length} дошли`;
  const tables = tableStats(); const usedTables = el('#usedTablesStat'); if (usedTables) usedTables.textContent = `${tables.usedTables}/${tables.total || '—'}`;
  const capacity = el('#capacityStat'); if (capacity) capacity.textContent = `${tables.usedSeats}/${tables.capacity || '—'} места`;
  const query = state.query.toLowerCase();
  const visible = state.attendees.filter(a => {
    const matchesQuery = !query || `${a.name} ${a.company || ''} ${a.email || ''}`.toLowerCase().includes(query);
    const matchesFilter = state.filter === 'all' || (state.filter === 'checked' ? a.checkedInAt : !a.checkedInAt);
    return matchesQuery && matchesFilter;
  });
  el('#attendees').innerHTML = visible.length ? visible.map(a => `<div class="attendee-row ${state.selected?.id === a.id ? 'selected-row' : ''}"><div><strong>${text(a.name)}</strong><span>${text(a.company || '')} · ${text(a.role || '')}</span></div><b class="status ${a.checkedInAt ? 'status-success' : 'status-warning'}">${a.checkedInAt ? 'Дошъл' : 'Чакаме'}</b></div>`).join('') : '<p class="muted">Няма съвпадения.</p>';
}
function bind() {
  el('#eventSelect').onchange = e => { state.eventId = e.target.value; loadAttendees(); };
  el('#sync').onclick = sync;
  el('#logout').onclick = () => { localStorage.removeItem('event-checkin-session'); boot(); };
  el('#attendeeSearch').oninput = e => { state.query = e.target.value; updateList(); };
  el('#attendeeFilter').onchange = e => { state.filter = e.target.value; updateList(); };
  el('#checkCode').onclick = () => scan(el('#accessCode').value.trim());
  el('#accessCode').onkeydown = e => { if (e.key === 'Enter') scan(e.target.value.trim()); };
}
async function request(path, options = {}) {
  const current = await session();
  const headers = { 'content-type': 'application/json', ...(options.headers || {}) };
  if (current) headers.Authorization = current.accessToken;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Заявката не успя'); return data;
}
async function loadAttendees() {
  if (mock) { state.attendees = demoAttendees; updateList(); return; }
  try { state.attendees = (await request(`/events/${state.eventId}/attendees`)).attendees; updateList(); } catch (e) { showStatus(e.message, true); }
}
async function sync() {
  if (mock) { state.attendees = demoAttendees; updateList(); showStatus('Заредени са demo участници.'); return; }
  try { const result = await request(`/events/${state.eventId}/sync`, { method: 'POST', body: '{}' }); await loadAttendees(); showStatus(`Синхронизирани: ${result.imported}`); } catch (e) { showStatus(e.message, true); }
}
function showStatus(message, error = false) { const node = el('#status'); if (node) { node.textContent = message; node.className = error ? 'error' : 'muted'; } }
function showResult(attendee, recommendations = []) {
  const result = el('#result'); result.classList.remove('hidden');
  result.innerHTML = `<div class="result-banner"><span class="result-icon">✓</span><div><small>УСПЕШЕН CHECK-IN</small><h2>${text(attendee.name)}</h2></div><b class="status status-success">Дошъл</b></div><p>${text(attendee.company || '')} · ${text(attendee.role || '')}</p><p class="muted"><strong>Код:</strong> ${text(attendee.accessCode)}</p><div class="profile-grid">${profileRows(attendee)}</div><label>Маса/зона <input id="route" value="${text(attendee.routingTarget || '')}" placeholder="например Маса 7" /></label><button class="btn btn-primary" id="saveRoute">Запази насочване</button><h3>Препоръчани контакти</h3>${recommendations.length ? recommendations.map(r => `<div class="recommendation"><strong>${text(r.name)}</strong><span>${text(r.company || '')} · ${text(r.reason || '')} (${r.score || 0}%)</span></div>`).join('') : '<p class="muted">Няма достатъчно присъстващи за препоръка.</p>'}`;
  el('#saveRoute').onclick = async () => { const target = el('#route').value.trim(); if (!mock) await request(`/events/${state.eventId}/attendees/${attendee.id}/routing`, { method: 'PATCH', body: JSON.stringify({ target }) }); attendee.routingTarget = target; showStatus('Насочването е запазено.'); };
}
async function scan(accessCode) {
  if (!/^\d{4}$/.test(accessCode)) return showStatus('Въведи точно 4 цифри.', true);
  try {
    const result = mock ? (() => { const attendee = state.attendees.find(a => a.accessCode === accessCode); if (!attendee) throw new Error('Кодът не е регистриран за това събитие.'); attendee.checkedInAt ||= new Date().toISOString(); return { attendee, recommendations: state.attendees.filter(a => a.checkedInAt && a.id !== attendee.id).slice(0, 5).map(a => ({ ...a, score: 80, reason: 'demo общи интереси' })) }; })() : await request(`/events/${state.eventId}/scan`, { method: 'POST', body: JSON.stringify({ accessCode }) });
    state.selected = result.attendee; updateList(); showResult(result.attendee, result.recommendations); showStatus('Кодът е проверен успешно.');
  } catch (e) { showStatus(e.message, true); }
}

async function boot() {
  if (!mock && (!userPoolId || !clientId)) { renderLogin(); return; }
  if (!mock && !(await session())) { renderLogin(); return; }
  render();
  if (mock) { state.attendees = demoAttendees; updateList(); return; }
  try { state.events = (await request('/events')).events; state.eventId = state.events[0]?.id; render(); await loadAttendees(); } catch (e) { showStatus(e.message, true); }
}
boot();
