const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TableName = process.env.TABLE_NAME;

const weights = { complementary: 0.30, goals: 0.25, interests: 0.25, industry: 0.15, differentCompany: 0.05 };

function json(statusCode, body, origin = process.env.ALLOWED_ORIGIN || '*') {
  return { statusCode, headers: { 'content-type': 'application/json', 'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS', 'access-control-allow-headers': 'content-type,authorization' }, body: JSON.stringify(body) };
}

function body(event) {
  try { return event.body ? JSON.parse(event.body) : {}; } catch { throw new Error('Invalid JSON body'); }
}

function key(eventId, sortKey) { return { PK: `EVENT#${eventId}`, SK: sortKey }; }

function isAdmin(event) {
  const groups = event.requestContext?.authorizer?.claims?.['cognito:groups'] || '';
  return String(groups).split(',').includes('Admins');
}

function isAuthenticated(event) {
  return Boolean(event.requestContext?.authorizer?.claims?.sub || event.requestContext?.authorizer?.jwt?.claims?.sub);
}

function asSet(value) {
  return new Set((Array.isArray(value) ? value : String(value || '').split(',')).map(x => String(x).trim().toLowerCase()).filter(Boolean));
}

function overlap(a, b) {
  const left = asSet(a); const right = asSet(b);
  if (!left.size || !right.size) return 0;
  return [...left].filter(value => right.has(value)).length / Math.max(left.size, right.size);
}

function score(current, candidate) {
  const sameCompany = current.company && candidate.company && current.company.toLowerCase() === candidate.company.toLowerCase();
  const complementary = Math.max(overlap(current.offers, candidate.needs), overlap(candidate.offers, current.needs));
  const total = complementary * weights.complementary
    + overlap(current.goals, candidate.goals) * weights.goals
    + overlap(current.interests, candidate.interests) * weights.interests
    + (current.industry && candidate.industry && current.industry.toLowerCase() === candidate.industry.toLowerCase() ? 1 : 0) * weights.industry
    + (!sameCompany ? weights.differentCompany : 0);
  return Math.round(total * 100);
}

function reason(current, candidate) {
  const reasons = [];
  if (overlap(current.interests, candidate.interests)) reasons.push('общи интереси');
  if (overlap(current.goals, candidate.goals)) reasons.push('общи цели');
  if (overlap(current.offers, candidate.needs) || overlap(candidate.offers, current.needs)) reasons.push('допълващи се нужди и предложения');
  if (!reasons.length) reasons.push('различна професионална перспектива');
  return reasons.join(', ');
}

async function eventItems(eventId, begins = 'ATTENDEE#') {
  const result = await db.send(new QueryCommand({ TableName, KeyConditionExpression: 'PK = :pk AND begins_with(SK, :begins)', ExpressionAttributeValues: { ':pk': `EVENT#${eventId}`, ':begins': begins } }));
  return result.Items || [];
}

async function recommendations(eventId, attendeeId) {
  const currentResult = await db.send(new GetCommand({ TableName, Key: key(eventId, `ATTENDEE#${attendeeId}`) }));
  if (!currentResult.Item) return [];
  const attendees = await eventItems(eventId);
  return attendees.filter(item => item.id !== attendeeId && item.checkedInAt)
    .map(item => ({ ...item, score: score(currentResult.Item, item), reason: reason(currentResult.Item, item) }))
    .sort((a, b) => b.score - a.score).slice(0, 5);
}

async function syncEvent(eventId) {
  if (!process.env.REGISTRATION_API_URL) return { imported: 0, mode: 'mock', message: 'Registration API is not configured.' };
  const response = await fetch(`${process.env.REGISTRATION_API_URL}/events/${encodeURIComponent(eventId)}/attendees`, { headers: { authorization: `Bearer ${process.env.REGISTRATION_API_TOKEN}` } });
  if (!response.ok) throw new Error(`Registration API returned ${response.status}`);
  const payload = await response.json();
  const attendees = payload.attendees || payload;
  if (!Array.isArray(attendees)) throw new Error('Registration API must return an attendees array');
  for (const attendee of attendees) {
    const id = attendee.id;
    const accessCode = String(attendee.access_code || attendee.accessCode || attendee.ticket_code || attendee.ticketCode || attendee.code || '').trim();
    if (!id || !/^\d{4}$/.test(accessCode) || !attendee.name) continue;
    const formData = attendee.formData || attendee.form_data || attendee.answers || attendee.responses || {};
    await db.send(new PutCommand({ TableName, Item: { ...key(eventId, `ATTENDEE#${id}`), entity: 'ATTENDEE', id, accessCode, name: attendee.name, email: attendee.email, company: attendee.company, role: attendee.role, industry: attendee.industry, interests: attendee.interests || [], goals: attendee.goals || [], needs: attendee.needs || [], offers: attendee.offers || [], formData, type: attendee.type, updatedAt: new Date().toISOString() } }));
  }
  return { imported: attendees.length, mode: 'api' };
}

exports.handler = async (event) => {
  try {
    const method = event.httpMethod;
    if (method === 'OPTIONS') return json(204, {});
    if (!isAuthenticated(event)) return json(401, { error: 'Authentication required' });
    const path = event.resource || event.path || '';
    const eventId = event.pathParameters?.eventId;
    if (method === 'GET' && path === '/events') {
      const result = await db.send(new ScanCommand({ TableName, FilterExpression: 'entity = :entity', ExpressionAttributeValues: { ':entity': 'EVENT' } }));
      return json(200, { events: result.Items || [] });
    }
    if (method === 'POST' && path === '/events') {
      if (!isAdmin(event)) return json(403, { error: 'Admin access required' });
      const input = body(event); if (!input.id || !input.name) return json(400, { error: 'id and name are required' });
      const item = { ...key(input.id, 'META'), entity: 'EVENT', id: input.id, name: input.name, routingEnabled: Boolean(input.routingEnabled), tableCount: Number(input.tableCount || 0), tableCapacity: Number(input.tableCapacity || 0), staff: Array.isArray(input.staff) ? input.staff : [], settings: input.settings || {}, createdAt: new Date().toISOString() };
      await db.send(new PutCommand({ TableName, Item: item })); return json(201, { event: item });
    }
    if (method === 'POST' && path.endsWith('/sync')) {
      if (!isAdmin(event)) return json(403, { error: 'Admin access required' });
      return json(200, await syncEvent(eventId));
    }
    if (method === 'GET' && path.endsWith('/attendees')) return json(200, { attendees: await eventItems(eventId) });
    if (method === 'GET' && path.endsWith('/dashboard')) {
      const attendees = await eventItems(eventId); return json(200, { registered: attendees.length, checkedIn: attendees.filter(x => x.checkedInAt).length, attendees });
    }
    if (method === 'POST' && path.endsWith('/scan')) {
      const { accessCode } = body(event); if (!/^\d{4}$/.test(String(accessCode || ''))) return json(400, { error: 'A 4-digit accessCode is required' });
      const attendees = await eventItems(eventId); const attendee = attendees.find(x => x.accessCode === accessCode);
      if (!attendee) return json(404, { error: 'Access code is not registered for this event' });
      if (!attendee.checkedInAt) {
        const now = new Date().toISOString();
        try {
          await db.send(new UpdateCommand({
            TableName,
            Key: key(eventId, `ATTENDEE#${attendee.id}`),
            UpdateExpression: 'SET checkedInAt = :now, checkedInBy = :by',
            ConditionExpression: 'attribute_not_exists(checkedInAt)',
            ExpressionAttributeValues: { ':now': now, ':by': event.requestContext?.authorizer?.claims?.email || 'staff' }
          }));
          attendee.checkedInAt = now;
        } catch (error) {
          if (error.name !== 'ConditionalCheckFailedException') throw error;
          const current = await db.send(new GetCommand({ TableName, Key: key(eventId, `ATTENDEE#${attendee.id}`) }));
          return json(200, { attendee: current.Item, alreadyCheckedIn: true, recommendations: await recommendations(eventId, attendee.id) });
        }
      }
      return json(200, { attendee, recommendations: await recommendations(eventId, attendee.id) });
    }
    const attendeeId = event.pathParameters?.attendeeId;
    if (method === 'GET' && path.endsWith('/recommendations')) return json(200, { recommendations: await recommendations(eventId, attendeeId) });
    if (method === 'PATCH' && path.endsWith('/routing')) {
      const { target, instruction } = body(event);
      await db.send(new UpdateCommand({ TableName, Key: key(eventId, `ATTENDEE#${attendeeId}`), UpdateExpression: 'SET routingTarget = :target, routingInstruction = :instruction', ExpressionAttributeValues: { ':target': target || null, ':instruction': instruction || null } }));
      return json(200, { ok: true });
    }
    if (method === 'POST' && path.endsWith('/complete')) {
      const { attendeeId, note } = body(event);
      if (!attendeeId) return json(400, { error: 'attendeeId is required' });
      const matchId = event.pathParameters?.matchId;
      if (!matchId) return json(400, { error: 'matchId is required' });
      const action = { ...key(eventId, `MATCH#${matchId}`), entity: 'MATCH_ACTION', id: matchId, attendeeId, note: note || null, completedBy: event.requestContext?.authorizer?.claims?.email || 'staff', completedAt: new Date().toISOString() };
      await db.send(new PutCommand({ TableName, Item: action }));
      return json(201, { action });
    }
    return json(404, { error: 'Not found' });
  } catch (error) {
    console.error(error);
    return json(500, { error: error.message || 'Internal server error' });
  }
};

if (require.main === module) {
  console.log('backend loaded');
}
