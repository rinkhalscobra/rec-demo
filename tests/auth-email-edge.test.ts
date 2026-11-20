// @vitest-environment node
import { beforeAll, beforeEach, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
  handlers: [] as Array<(req: Request) => Promise<Response>>,
  from: vi.fn(), rpc: vi.fn(), createUser: vi.fn(), deleteUser: vi.fn(),
  queries: [] as Array<{ table: string; filters: Record<string, unknown> }>,
  mutations: [] as Array<{ table: string; kind: string; values: unknown }>,
  emailExists: false, displayExists: false, lookupFails: false,
  profileFails: false, roleFails: false, role: 'admin',
}));
vi.mock('https://deno.land/std@0.168.0/http/server.ts', () => ({ serve: (handler: (req: Request) => Promise<Response>) => mock.handlers.push(handler) }));
vi.mock('https://esm.sh/@supabase/supabase-js@2', () => ({ createClient: () => ({ from: mock.from, rpc: mock.rpc, auth: { admin: { createUser: mock.createUser, deleteUser: mock.deleteUser } } }) }));

beforeAll(async () => {
  vi.stubGlobal('Deno', { env: { get: () => 'test' } });
  await import('../supabase/functions/create-user/index');
  await import('../supabase/functions/mfa-check/index');
  await import('../supabase/functions/mfa-validate/index');
});
beforeEach(() => {
  vi.clearAllMocks(); mock.queries = []; mock.emailExists = false; mock.displayExists = false; mock.lookupFails = false;
  mock.mutations = []; mock.profileFails = false; mock.roleFails = false;
  mock.role = 'admin'; mock.rpc.mockResolvedValue({ data: 'group', error: null });
  mock.deleteUser.mockResolvedValue({ error: null });
  mock.createUser.mockResolvedValue({ data: { user: { id: 'new-user' } }, error: null });
  mock.from.mockImplementation((table: string) => {
    const filters: Record<string, unknown> = {}; mock.queries.push({ table, filters });
    let kind = '';
    const result = () => {
      if (table === 'profiles' && kind === 'update' && mock.profileFails) return { data: null, error: new Error('Profile update failed') };
      if (table === 'user_roles' && kind === 'insert' && mock.roleFails) return { data: null, error: new Error('Role insert failed') };
      if (table === 'user_roles') return { data: { role: mock.role }, error: null };
      if (table === 'groups') return { data: { name: 'Other brand', platform: 'chargeback' }, error: null };
      if (table === 'user_mfa') return { data: { is_enabled: false }, error: null };
      if (table === 'profiles' && ('email' in filters || 'display_email' in filters)) {
        return { data: mock.lookupFails ? null : ('email' in filters ? (mock.emailExists ? [{ id: 'existing' }] : []) : (mock.displayExists ? [{ id: 'existing' }] : [])), error: mock.lookupFails ? new Error('Unavailable') : null };
      }
      return { data: { id: 'profile', platform: 'brightfund', group_id: 'group' }, error: null };
    };
    const query = {
      select: () => query, eq: (key: string, value: unknown) => { filters[key] = value; return query; }, limit: () => query,
      update: (values: unknown) => { kind = 'update'; mock.mutations.push({ table, kind, values }); return query; },
      insert: (values: unknown) => { kind = 'insert'; mock.mutations.push({ table, kind, values }); return query; },
      single: async () => result(),
      maybeSingle: async () => { const r = result(); return { ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data }; },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return query;
  });
});

const jwt = () => 'header.' + Buffer.from(JSON.stringify({ sub: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.signature';
const request = (body: unknown) => new Request('http://localhost/function', { method: 'POST', headers: { Authorization: 'Bearer ' + jwt() }, body: JSON.stringify(body) });
const createBody = { email: '  CLIENT@EXAMPLE.COM ', password: 'password', firstName: 'Client', lastName: 'Example', role: 'user' };

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

it('persists agent details and assigns the agent role', async () => {
  const response = await mock.handlers[0](request({ ...createBody, role: 'agent', username: ' agent.name ', phone: ' +1 555 0100 ' }));
  expect(await response.json()).toMatchObject({ success: true, role: 'agent' });
  expect(mock.mutations).toContainEqual({ table: 'profiles', kind: 'update', values: expect.objectContaining({ username: 'agent.name', phone: '+1 555 0100', group_id: 'group' }) });
  expect(mock.mutations).toContainEqual({ table: 'user_roles', kind: 'insert', values: { user_id: 'new-user', role: 'agent' } });
});

it.each(['profile', 'role'])('removes the new auth account if %s setup fails', async failure => {
  mock.profileFails = failure === 'profile'; mock.roleFails = failure === 'role';
  const response = await mock.handlers[0](request({ ...createBody, role: 'agent' }));
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ error: expect.stringContaining('Account was not created') });
  expect(mock.deleteUser).toHaveBeenCalledOnce();
  expect(mock.deleteUser).toHaveBeenCalledWith('new-user');
});

it.each(['admin', 'group_admin', 'supervisor', 'agent'])('automatically assigns the workspace when %s creates a client', async role => {
  mock.role = role;
  expect(await (await mock.handlers[0](request(createBody))).json()).toMatchObject({ success: true });
  expect(mock.rpc).toHaveBeenCalledWith('get_default_group_id', { _platform: 'brightfund' });
  expect(mock.mutations).toContainEqual({ table: 'profiles', kind: 'update', values: expect.objectContaining({ group_id: 'group', platform: 'brightfund' }) });
});

it('ignores a legacy group choice and uses the workspace belonging to the creator platform', async () => {
  expect(await (await mock.handlers[0](request({ ...createBody, groupId: 'another-workspace' }))).json()).toMatchObject({ success: true, platform: 'brightfund' });
  expect(mock.mutations).toContainEqual({ table: 'profiles', kind: 'update', values: expect.objectContaining({ group_id: 'group' }) });
});

it('fails before creating an auth account when the workspace is unavailable', async () => {
  mock.rpc.mockResolvedValue({ data: null, error: new Error('Unavailable') });
  expect((await mock.handlers[0](request(createBody))).status).toBe(400);
  expect(mock.createUser).not.toHaveBeenCalled();
});

it.each([['agent', 'agent'], ['supervisor', 'supervisor'], ['group_admin', 'admin'], ['user', 'user']])('preserves role restrictions for %s creating %s', async (role, target) => {
  mock.role = role;
  expect((await mock.handlers[0](request({ ...createBody, role: target }))).status).toBe(400);
  expect(mock.createUser).not.toHaveBeenCalled();
});
