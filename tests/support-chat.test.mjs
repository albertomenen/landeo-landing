import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../worker/support.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { support } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const env = { DB: {}, TELEGRAM_BOT_TOKEN: '123:test', TELEGRAM_SUPPORT_CHAT_ID: '456', TELEGRAM_WEBHOOK_SECRET: 'test-secret', NEXT_PUBLIC_SUPABASE_URL: 'https://test.invalid', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public' };
test('requires authentication for customer history', async () => {
  assert.equal((await support(new Request('https://test.invalid/api/support'), env)).status, 401);
});
test('rejects unauthenticated Telegram webhook', async () => {
  assert.equal((await support(new Request('https://test.invalid/api/support/telegram', { method: 'POST', body: '{}' }), env)).status, 401);
});
test('ignores replies from any Telegram user other than the paired owner', async () => {
  const request = new Request('https://test.invalid/api/support/telegram', { method: 'POST', headers: { 'X-Telegram-Bot-Api-Secret-Token': 'test-secret' }, body: JSON.stringify({ message: { from: { id: 999 }, chat: { id: 456, type: 'private' }, text: 'not allowed' } }) });
  assert.equal((await support(request, env)).status, 200);
});
test('ignores owner messages which are not replies to our bot', async () => {
  const request = new Request('https://test.invalid/api/support/telegram', { method: 'POST', headers: { 'X-Telegram-Bot-Api-Secret-Token': 'test-secret' }, body: JSON.stringify({ message: { from: { id: 456 }, chat: { id: 456, type: 'private' }, text: 'not a customer reply', reply_to_message: { from: { id: 999 }, text: '\nRef: 00000000-0000-4000-8000-000000000000' } } }) });
  assert.equal((await support(request, env)).status, 200);
});
test('history is filtered using verified identity, never a supplied query user ID', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ id: 'verified-user' });
  const bindings = [];
  const DB = { prepare(sql) { return { bind(...values) { bindings.push({ sql, values }); return { run: async () => ({}), all: async () => ({ results: [] }) }; } }; } };
  try {
    const response = await support(new Request('https://test.invalid/api/support?user_id=victim', { headers: { authorization: 'Bearer test' } }), { ...env, DB });
    assert.equal(response.status, 200);
    assert.deepEqual(bindings.find(item => item.sql.startsWith('SELECT')).values, ['verified-user']);
  } finally { globalThis.fetch = originalFetch; }
});
test('duplicate Telegram updates use an idempotent insert tied to the original conversation', async () => {
  const recorded = [];
  const DB = { prepare(sql) { return { bind(...values) { recorded.push({ sql, values }); return { first: async () => ({ user_id: 'original-user' }), run: async () => ({}) }; } }; } };
  const body = { message: { message_id: 78, from: { id: 456 }, chat: { id: 456, type: 'private' }, text: 'Support answer', reply_to_message: { from: { id: 123 }, text: 'Message\nRef: 00000000-0000-4000-8000-000000000000' } } };
  const response = await support(new Request('https://test.invalid/api/support/telegram', { method: 'POST', headers: { 'X-Telegram-Bot-Api-Secret-Token': 'test-secret' }, body: JSON.stringify(body) }), { ...env, DB });
  assert.equal(response.status, 200);
  assert.equal(recorded[1].sql.startsWith('INSERT OR IGNORE'), true);
  assert.equal(recorded[1].values[0], 'telegram:78');
  assert.equal(recorded[1].values[1], 'original-user');
});
