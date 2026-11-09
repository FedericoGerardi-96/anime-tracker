import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function load(path, imports) {
  const exports = {};
  const { outputText } = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  new Function('require', 'exports', outputText)(name => {
    assert.ok(name in imports, name);
    return imports[name];
  }, exports);
  return exports;
}

function fixture({ marker = 'session-one', session = 'session-one', redirectType = 'PASSWORD_RECOVERY', sendError = null } = {}) {
  const calls = [];
  const origin = 'http://localhost:3000';
  const supabase = { auth: {
    getClaims: async () => ({ data: { claims: { session_id: session } }, error: null }),
    exchangeCodeForSession: async () => ({ data: { session: { access_token: 'fixture' }, redirectType }, error: null }),
    resetPasswordForEmail: async (_email, options) => {
      calls.push(['request', options.redirectTo]);
      return { error: sendError };
    },
    updateUser: async () => { calls.push(['update']); return { error: null }; },
    signOut: async options => { calls.push(['sign-out', options.scope]); },
  } };
  const imports = {
    'server-only': {},
    'next/headers': {
      headers: async () => new Headers({ origin }),
      cookies: async () => ({
        get: () => marker ? { value: marker } : undefined,
        set: (name, value, options) => calls.push(['cookie', name, value, options]),
      }),
    },
    'next/navigation': { redirect: path => { throw new Error(path); } },
    '@/lib/supabase/server': { createClient: async () => supabase },
  };
  imports['@/lib/password-recovery'] = load('src/lib/password-recovery.ts', imports);
  const action = load('src/lib/actions/password-recovery.ts', imports);
  const route = load('src/app/auth/recovery/route.ts', imports);
  const callback = async code => {
    const nextUrl = new URL('/auth/recovery?code=' + code, origin);
    const response = await route.GET({ nextUrl, headers: new Headers() });
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    return response.headers.get('location');
  };
  return { ...action, callback, calls };
}

const form = (password = 'new-password', confirmation = password) => {
  const data = new FormData();
  data.set('email', 'example@example.test');
  data.set('password', password);
  data.set('confirmation', confirmation);
  return data;
};

test('recovery request uses the current origin and does not disclose a rejected address', async () => {
  for (const sendError of [null, { code: 'email_address_not_authorized' }]) {
    const f = fixture({ sendError });
    await assert.rejects(f.requestPasswordRecovery(form()), { message: '/forgot-password?requested=1' });
    assert.deepEqual(f.calls, [['request', 'http://localhost:3000/auth/recovery']]);
  }
});

test('callback authorizes only a recovery exchange and records a short-lived session marker', async () => {
  const oauth = fixture({ redirectType: 'oauth' });
  assert.equal(await oauth.callback('fixture-code'), '/forgot-password?error=expired');
  assert.equal(oauth.calls.length, 0);
  const f = fixture();
  assert.equal(await f.callback(''), '/forgot-password?error=expired');
  assert.equal(await f.callback('fixture-code'), '/reset-password');
  const [[operation, , sessionId, options]] = f.calls;
  assert.equal(operation, 'cookie');
  assert.equal(sessionId, 'session-one');
  assert.equal(options.httpOnly, true);
  assert.equal(options.path, '/reset-password');
  assert.equal(options.maxAge, 900);
});

test('a normal session or a changed account cannot submit a recovery password', async () => {
  for (const marker of [null, 'another-session']) {
    const f = fixture({ marker });
    await assert.rejects(f.updateRecoveredPassword(form()), { message: '/forgot-password?error=expired' });
    assert.deepEqual(f.calls, []);
  }
});

test('checks confirmation, updates only the recovered session and clears the marker', async () => {
  const f = fixture();
  await assert.rejects(f.updateRecoveredPassword(form('new-password', 'different-password')), { message: '/reset-password?error=match' });
  assert.deepEqual(f.calls, []);
  await assert.rejects(f.updateRecoveredPassword(form()), { message: '/login?reset=1' });
  assert.deepEqual(f.calls.map(call => call[0]), ['update', 'cookie', 'sign-out']);
  assert.equal(f.calls[1][3].maxAge, 0);
  assert.equal(f.calls[2][1], 'local');
});
