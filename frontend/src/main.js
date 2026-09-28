import './style.css';

const mock = import.meta.env.VITE_MOCK_MODE === 'true' || !import.meta.env.VITE_API_URL;
const API = import.meta.env.VITE_API_URL || '';
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID || '';
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID || '';
const cognitoRegion = userPoolId.split('_')[0];
const cognitoUrl = cognitoRegion ? `https://cognito-idp.${cognitoRegion}.amazonaws.com/` : '';
const state = { eventId: 'demo', events: [{ id: 'demo', name: 'Demo networking event', routingEnabled: true }], attendees: [], selected: null, query: '', filter: 'all' };

const demoAttendees = [
  { id: 'a1', qrId: 'DEMO-001', name: 'Анна Георгиева', company: 'Alpha Studio', role: 'Основател', industry: 'SaaS', interests: ['автоматизация', 'инвестиции'], goals: ['партньори'], needs: ['продажби'], offers: ['технологии'] },
  { id: 'a2', qrId: 'DEMO-002', name: 'Николай Иванов', company: 'Beta Labs', role: 'CEO', industry: 'SaaS', interests: ['автоматизация', 'продажби'], goals: ['партньори'], needs: ['технологии'], offers: ['продажби'] },
  { id: 'a3', qrId: 'DEMO-003', name: 'Мария Петрова', company: 'People Co', role: 'HR директор', industry: 'HR Tech', interests: ['автоматизация'], goals: ['нови решения'], needs: ['технологии'], offers: ['HR експертиза'] }
];

function el(selector) { return document.querySelector(selector); }
function render() {
  document.querySelector('#app').innerHTML = `
    <section class="app-shell shell">
      <header class="topbar"><div><small>EVENT CHECK-IN</small><h1>${state.events.find(e => e.id === state.eventId)?.name || 'Събитие'}</h1></div><div class="topbar-meta"><span class="status status-success">Онлайн</span><span class="staff-name">Екип</span></div></header>
      <main class="workspace">
        <section class="toolbar"><select id="eventSelect">${state.events.map(e => `<option value="${e.id}" ${e.id === state.eventId ? 'selected' : ''}>${e.name}</option>`).join('')}</select><button class="btn btn-primary" id="sync">Синхронизирай</button><button class="btn" id="logout">Изход</button></section>
        <section class="stats-grid"><div class="stat-card"><span>Регистрирани</span><strong id="registeredStat">0</strong></div><div class="stat-card stat-success"><span>Дошли</span><strong id="checkedInStat">0</strong></div><div class="stat-card"><span>Остават</span><strong id="remainingStat">0</strong></div></section>
        <section class="scanner card reveal"><div class="section-heading"><div><small>ВХОД</small><h2>Сканирай QR код</h2></div><span class="status status-neutral">Готово</span></div><div class="scanner-viewport"><video class="scanner-frame" id="preview" playsinline></video><span class="scan-guide">Постави QR кода в рамката</span></div><button class="btn btn-primary btn-wide" id="start">Стартирай камерата</button><div class="manual"><input id="manualQr" placeholder="или въведи QR ID за тест" /><button class="btn" id="manualScan">Провери</button></div><p id="status" class="muted">Готово за сканиране.</p></section>
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
  const query = state.query.toLowerCase();
  const visible = state.attendees.filter(a => {
    const matchesQuery = !query || `${a.name} ${a.company || ''} ${a.email || ''}`.toLowerCase().includes(query);
    const matchesFilter = state.filter === 'all' || (state.filter === 'checked' ? a.checkedInAt : !a.checkedInAt);
    return matchesQuery && matchesFilter;
  });
  el('#attendees').innerHTML = visible.length ? visible.map(a => `<div class="attendee-row ${state.selected?.id === a.id ? 'selected-row' : ''}"><div><strong>${a.name}</strong><span>${a.company || ''} · ${a.role || ''}</span></div><b class="status ${a.checkedInAt ? 'status-success' : 'status-warning'}">${a.checkedInAt ? 'Дошъл' : 'Чакаме'}</b></div>`).join('') : '<p class="muted">Няма съвпадения.</p>';
}
function bind() {
  el('#eventSelect').onchange = e => { state.eventId = e.target.value; loadAttendees(); };
  el('#sync').onclick = sync;
  el('#logout').onclick = () => { localStorage.removeItem('event-checkin-session'); boot(); };
  el('#attendeeSearch').oninput = e => { state.query = e.target.value; updateList(); };
  el('#attendeeFilter').onchange = e => { state.filter = e.target.value; updateList(); };
  el('#manualScan').onclick = () => scan(el('#manualQr').value.trim());
  el('#start').onclick = startCamera;
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
  result.innerHTML = `<div class="result-banner"><span class="result-icon">✓</span><div><small>УСПЕШЕН CHECK-IN</small><h2>${attendee.name}</h2></div><b class="status status-success">Дошъл</b></div><p>${attendee.company || ''} · ${attendee.role || ''}</p><p class="muted"><strong>QR:</strong> ${attendee.qrId}</p><label>Маса/зона <input id="route" value="${attendee.routingTarget || ''}" placeholder="например Маса 7" /></label><button class="btn btn-primary" id="saveRoute">Запази насочване</button><h3>Препоръчани контакти</h3>${recommendations.length ? recommendations.map(r => `<div class="recommendation"><strong>${r.name}</strong><span>${r.company || ''} · ${r.reason || ''} (${r.score || 0}%)</span></div>`).join('') : '<p class="muted">Няма достатъчно присъстващи за препоръка.</p>'}`;
  el('#saveRoute').onclick = async () => { const target = el('#route').value.trim(); if (!mock) await request(`/events/${state.eventId}/attendees/${attendee.id}/routing`, { method: 'PATCH', body: JSON.stringify({ target }) }); attendee.routingTarget = target; showStatus('Насочването е запазено.'); };
}
async function scan(qrId) {
  if (!qrId) return showStatus('Въведи QR ID.', true);
  try {
    const result = mock ? (() => { const attendee = state.attendees.find(a => a.qrId === qrId || a.id === qrId); if (!attendee) throw new Error('QR кодът не е регистриран за това събитие.'); attendee.checkedInAt ||= new Date().toISOString(); return { attendee, recommendations: state.attendees.filter(a => a.checkedInAt && a.id !== attendee.id).slice(0, 5).map(a => ({ ...a, score: 80, reason: 'demo общи интереси' })) }; })() : await request(`/events/${state.eventId}/scan`, { method: 'POST', body: JSON.stringify({ qrId }) });
    state.selected = result.attendee; updateList(); showResult(result.attendee, result.recommendations); showStatus('QR кодът е проверен успешно.');
  } catch (e) { showStatus(e.message, true); }
}
async function startCamera() {
  const video = el('#preview');
  if (!('BarcodeDetector' in window)) return showStatus('Този браузър не поддържа QR сканиране. Използвай Chrome или въведи QR ID ръчно.', true);
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = stream; await video.play(); el('#start').textContent = 'Камерата работи';
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    const detect = async () => {
      if (!video.srcObject) return;
      try { const codes = await detector.detect(video); if (codes[0]?.rawValue) { stream.getTracks().forEach(track => track.stop()); video.srcObject = null; scan(codes[0].rawValue); return; } } catch { /* camera frame not ready */ }
      requestAnimationFrame(detect);
    };
    detect();
  } catch (e) { showStatus('Камерата не може да бъде стартирана. Провери HTTPS и разрешенията.', true); }
}

async function boot() {
  if (!mock && (!userPoolId || !clientId)) { renderLogin(); return; }
  if (!mock && !(await session())) { renderLogin(); return; }
  render();
  if (mock) { state.attendees = demoAttendees; updateList(); return; }
  try { state.events = (await request('/events')).events; state.eventId = state.events[0]?.id; render(); await loadAttendees(); } catch (e) { showStatus(e.message, true); }
}
boot();
