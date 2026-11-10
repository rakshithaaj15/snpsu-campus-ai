'use strict';

// Portable, credential-free demo transport. Never implies live Gemini access.
// The browser's existing, role-aware guide engine generates the sample answer.
const ROLES = new Set(['student', 'newstudent', 'parent', 'faculty', 'organizer', 'admin']);
const SAFE_ROUTE = /^\/(portal(?:\/(?:map|find-student|discovery|events|event-management|lost-found|investigation|report-issue|intelligence|predictions|notifications|settings))?|onboarding|explore|demo|login|register)(?:\?[^#]*)?$/;
const stringWithin = (value, max) => typeof value === 'string' && value.length <= max;
const validAction = (action) => action && stringWithin(action.label, 120) && stringWithin(action.href, 220);

function send(res, status, data) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).json(data);
}
function requireMethod(req, res, method) {
  if (req.method === method) return true;
  res.setHeader('Allow', method);
  send(res, 405, { error: `Use ${method} for this endpoint.` });
  return false;
}
function status(req, res) {
  if (!requireMethod(req, res, 'GET')) return;
  return send(res, 200, {
    mode: 'demo',
    model: null,
    reason: 'This Vercel build uses the local sample-data campus guide. Live Gemini is not configured. Replit-managed credentials are not automatically available on Vercel; no billed AI has been enabled.',
  });
}
function chat(req, res) {
  if (!requireMethod(req, res, 'POST')) return;
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (Buffer.byteLength(JSON.stringify(body) || '') > 120000) {
      return send(res, 413, { error: 'Guide request is too large.' });
    }
  } catch {
    return send(res, 400, { error: 'Request body must be valid JSON.' });
  }
  const context = body?.context;
  const reply = context?.demoReply;
  if (!stringWithin(body?.message, 1200) || !body.message.trim()
      || !Array.isArray(body.history) || body.history.length > 12
      || !body.history.every((entry) => entry && ['user', 'assistant'].includes(entry.role) && stringWithin(entry.text, 6000))
      || !ROLES.has(context?.role) || !stringWithin(context?.page, 100)
      || !stringWithin(context?.facts, 16000) || !stringWithin(reply?.text, 6000)
      || !Array.isArray(reply?.actions) || reply.actions.length > 5
      || !reply.actions.every(validAction)) {
    return send(res, 400, { error: 'Message or campus context is invalid.' });
  }
  const actions = reply.actions
    .filter((action) => SAFE_ROUTE.test(action.href) && !/\/\/|\\|[\r\n]/.test(action.href))
    .map(({ label, href }) => ({ label, href }));
  return send(res, 200, {
    text: reply.text,
    actions,
    source: 'demo',
    model: null,
    notice: 'Local sample-data guidance, not a live Gemini reply. Nothing was registered, reported, or changed by this API.',
  });
}

module.exports = { status, chat, send };
