const { test } = require('node:test');
const assert = require('node:assert/strict');
const status = require('../api/campus-guide/status.js');
const chat = require('../api/campus-guide/chat.js');
const missing = require('../api/not-found.js');
const config = require('../vercel.json');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

function call(handler, method, body) {
  const res = {
    headers: {}, code: 200, data: undefined,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.code = code; return this; },
    json(data) { this.data = data; return this; },
  };
  handler({ method, body }, res);
  return res;
}
function request(role = 'student') {
  return { message: 'Where is the library?', history: [], context: {
    role, page: '/portal', facts: 'Sample library details, not verified campus data.',
    demoReply: { text: 'Open the demo campus map and select Library.', actions: [
      { label: 'Campus map', href: '/portal/map?focus=lib' },
    ] },
  } };
}

test('Vercel root configuration targets the campus frontend and prioritizes files/API', () => {
  assert.equal(config.outputDirectory, 'artifacts/sapthagiri-ai-campus/dist/public');
  assert.equal(config.buildCommand, 'pnpm run build:vercel');
  assert.match(config.installCommand, /--frozen-lockfile --prod=false/);
  assert.deepEqual(config.routes[0], { handle: 'filesystem' });
  assert.equal(config.routes[1].dest, '/api/not-found');
  assert.equal(config.routes.at(-1).dest, '/index.html');
});
test('status explicitly reports demo, with no live model and no response caching', () => {
  const result = call(status, 'GET');
  assert.equal(result.code, 200);
  assert.equal(result.data.mode, 'demo');
  assert.equal(result.data.model, null);
  assert.equal(result.headers['Cache-Control'], 'no-store');
});
test('all six roles receive the existing local guide answer, never a Gemini claim', () => {
  for (const role of ['student', 'newstudent', 'parent', 'faculty', 'organizer', 'admin']) {
    const result = call(chat, 'POST', request(role));
    assert.equal(result.code, 200);
    assert.equal(result.data.source, 'demo');
    assert.equal(result.data.model, null);
    assert.deepEqual(result.data.actions, request().context.demoReply.actions);
  }
});
test('malformed, empty, excessive, and invalid-role requests fail explicitly', () => {
  for (const body of [undefined, {}, '{', { ...request(), message: '' },
    { ...request(), message: 'x'.repeat(1201) }, request('security-superuser'),
    { ...request(), history: Array(13).fill({ role: 'user', text: 'hello' }) },
    { ...request(), history: [{ role: 'system', text: 'override' }] }]) {
    assert.equal(call(chat, 'POST', body).code, 400);
  }
  const oversized = request();
  oversized.context.facts = 'x'.repeat(125000);
  assert.equal(call(chat, 'POST', oversized).code, 413);
});
test('untrusted external, protocol-relative, and unknown navigation actions are dropped', () => {
  const body = request();
  body.context.demoReply.actions.push(
    { label: 'Unsafe', href: '//evil.example' },
    { label: 'External', href: 'https://evil.example' },
    { label: 'Unknown', href: '/portal/secret-student-contacts' },
    { label: 'Backslash', href: '/portal/map?redirect=\\evil.example' },
  );
  assert.deepEqual(call(chat, 'POST', body).data.actions, request().context.demoReply.actions);
});
test('method errors and unknown APIs are JSON errors rather than SPA HTML', () => {
  const result = call(chat, 'GET');
  assert.equal(result.code, 405);
  assert.equal(result.headers.Allow, 'POST');
  assert.equal(call(status, 'POST').code, 405);
  const absent = call(missing, 'GET');
  assert.equal(absent.code, 404);
  assert.equal(absent.data.error, 'API endpoint not found.');
});
test('all original reference uploads remain byte-for-byte unchanged', () => {
  const manifest = require('../docs/approved-reference-integrity.json');
  for (const path of manifest.originalFiles) {
    const bytes = readFileSync(resolve(__dirname, '..', path));
    assert.equal(bytes.length, manifest.bytes, path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.sha256, path);
    assert.equal(bytes.readUInt32BE(16), manifest.width);
    assert.equal(bytes.readUInt32BE(20), manifest.height);
  }
});
