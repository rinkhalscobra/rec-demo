// @vitest-environment node
import { beforeAll, beforeEach, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
  handlers: [] as Array<(req: Request) => Promise<Response>>,
  from: vi.fn(), createUser: vi.fn(),
  queries: [] as Array<{ table: string; filters: Record<string, unknown> }>,
  emailExists: false, displayExists: false, lookupFails: false,
}));
vi.mock('https://deno.land/std@0.168.0/http/server.ts', () => ({ serve: (handler: (req: Request) => Promise<Response>) => mock.handlers.push(handler) }));
vi.mock('https://esm.sh/@supabase/supabase-js@2', () => ({ createClient: () => ({ from: mock.from, auth: { admin: { createUser: mock.createUser } } }) }));

beforeAll(async () => {
  vi.stubGlobal('Deno', { env: { get: () => 'test' } });
  await import('../supabase/functions/create-user/index');
  await import('../supabase/functions/mfa-check/index');
  await import('../supabase/functions/mfa-validate/index');
});
beforeEach(() => {
  vi.clearAllMocks(); mock.queries = []; mock.emailExists = false; mock.displayExists = false; mock.lookupFails = false;
  mock.createUser.mockResolvedValue({ data: { user: { id: 'new-user' } }, error: null });
  mock.from.mockImplementation((table: string) => {
    const filters: Record<string, unknown> = {}; mock.queries.push({ table, filters });
    const result = () => {
      if (table === 'user_roles') return { data: { role: 'admin' }, error: null };
      if (table === 'groups') return { data: { name: 'Other brand', platform: 'chargeback' }, error: null };
      if (table === 'user_mfa') return { data: { is_enabled: false }, error: null };
      if (table === 'profiles' && ('email' in filters || 'display_email' in filters)) {
        return { data: mock.lookupFails ? null : ('email' in filters ? (mock.emailExists ? [{ id: 'existing' }] : []) : (mock.displayExists ? [{ id: 'existing' }] : [])), error: mock.lookupFails ? new Error('Unavailable') : null };
      }
      return { data: { id: 'profile', platform: 'brightfund', group_id: 'group' }, error: null };
    };
    const query = {
      select: () => query, eq: (key: string, value: unknown) => { filters[key] = value; return query; }, limit: () => query,
      update: () => query, insert: () => query,
      single: async () => result(),
      maybeSingle: async () => { const r = result(); return { ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data }; },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return query;
  });
});

const jwt = () => 'header.' + Buffer.from(JSON.stringify({ sub: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.signature';
const request = (body: unknown) => new Request('http://localhost/function', { method: 'POST', headers: { Authorization: 'Bearer ' + jwt() }, body: JSON.stringify(body) });
const createBody = { email: '  CLIENT@EXAMPLE.COM ', password: 'password', firstName: 'Client', lastName: 'Example', role: 'user', groupId: 'group' };

it('blocks duplicate clients globally even when the target platform differs', async () => {
  mock.emailExists = true;
  const response = await mock.handlers[0](request(createBody));
  expect(await response.json()).toMatchObject({ code: 'email_exists' });
  expect(mock.createUser).not.toHaveBeenCalled();
  expect(mock.queries.filter(q => q.table === 'profiles' && 'email' in q.filters)[0].filters).toEqual({ email: 'client@example.com' });
});
it('blocks a previously aliased account with the same display email', async () => {
  mock.displayExists = true;
  expect(await (await mock.handlers[0](request(createBody))).json()).toMatchObject({ code: 'email_exists' });
  expect(mock.createUser).not.toHaveBeenCalled();
});
it('fails closed when duplicate detection is unavailable', async () => {
  mock.lookupFails = true;
  expect((await mock.handlers[0](request(createBody))).status).toBe(400);
  expect(mock.createUser).not.toHaveBeenCalled();
});
it('creates a new client with the raw normalized email and no case identifier or alias', async () => {
  expect(await (await mock.handlers[0](request(createBody))).json()).toMatchObject({ success: true });
  expect(mock.createUser).toHaveBeenCalledWith(expect.objectContaining({ email: 'client@example.com', user_metadata: expect.objectContaining({ display_email: 'client@example.com' }) }));
});
it.each([1, 2])('resolves MFA handler %s using only the exact normalized email', async index => {
  mock.emailExists = true;
  await mock.handlers[index](request({ email: '  CLIENT@EXAMPLE.COM ', code: '123456' }));
  expect(mock.queries.filter(q => q.table === 'profiles')).toEqual([{ table: 'profiles', filters: { email: 'client@example.com' } }]);
});
