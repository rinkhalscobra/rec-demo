import { act } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { renderHook, flush } from './renderHook';

const mock = vi.hoisted(() => ({
  getSession: vi.fn(), signInWithPassword: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), validateStaffIP: vi.fn(), toast: vi.fn(),
  listener: undefined as ((event: string, session: unknown) => void) | undefined,
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: mock.getSession,
      onAuthStateChange: (listener: typeof mock.listener) => {
        mock.listener = listener;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      signInWithPassword: mock.signInWithPassword,
      signUp: mock.signUp,
      signOut: mock.signOut,
    },
    from: () => ({ update: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
  },
}));
vi.mock('@/utils/validateStaffIP', () => ({ validateStaffIP: mock.validateStaffIP }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mock.toast }) }));
import { AuthProvider, useAuth } from '@/hooks/useAuth';

const user = { id: 'staff', email: 'staff@example.com' };
const session = { user, access_token: 'token' };

beforeEach(() => {
  vi.clearAllMocks();
  mock.listener = undefined;
  mock.getSession.mockResolvedValue({ data: { session: null } });
  mock.signInWithPassword.mockImplementation(async () => {
    mock.listener?.('SIGNED_IN', session);
    return { data: { user, session }, error: null };
  });
  mock.signOut.mockImplementation(async () => {
    mock.listener?.('SIGNED_OUT', null);
    return { error: null };
  });
  mock.validateStaffIP.mockResolvedValue(undefined);
  mock.signUp.mockResolvedValue({ data: { user, session }, error: null });
});

const mount = () => renderHook(useAuth, children => <AuthProvider>{children}</AuthProvider>);

it('keeps staff out of authenticated routes until IP validation succeeds', async () => {
  let allow: () => void;
  mock.validateStaffIP.mockImplementation(() => new Promise<void>(resolve => { allow = resolve; }));
  const result = mount();
  await flush();
  let pending: ReturnType<typeof result.current.signIn>;
  act(() => { pending = result.current.signIn(user.email, 'password'); });
  await flush();
  expect(result.current.user).toBeNull();
  expect(result.current.session).toBeNull();
  // A token event during the pending check must not publish the session either.
  act(() => mock.listener?.('TOKEN_REFRESHED', session));
  expect(result.current.user).toBeNull();
  await act(async () => { allow(); await pending; });
  expect(result.current.user).toEqual(user);
  expect(mock.signOut).not.toHaveBeenCalled();
});

it('clears the session and returns the denial when validation rejects access', async () => {
  mock.validateStaffIP.mockRejectedValue(new Error('IP address is not in the whitelist'));
  const result = mount();
  await flush();
  let error: Error | null;
  await act(async () => { ({ error } = await result.current.signIn(user.email, 'password')); });
  expect(error.message).toBe('IP address is not in the whitelist');
  expect(mock.signOut).toHaveBeenCalledOnce();
  expect(result.current.user).toBeNull();
  expect(result.current.session).toBeNull();
  expect(mock.toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Welcome back!' }));
});

it('does not let a delayed initial session read bypass a pending IP check', async () => {
  let finishSessionRead: (value: unknown) => void;
  let deny: (reason: Error) => void;
  mock.getSession.mockImplementation(() => new Promise(resolve => { finishSessionRead = resolve; }));
  mock.validateStaffIP.mockImplementation(() => new Promise<void>((_resolve, reject) => { deny = reject; }));
  const result = mount();
  let pending: ReturnType<typeof result.current.signIn>;
  act(() => { pending = result.current.signIn(user.email, 'password'); });
  await flush();
  await act(async () => { finishSessionRead({ data: { session } }); });
  expect(result.current.user).toBeNull();
  await act(async () => { deny(new Error('Denied')); await pending; });
  expect(result.current.user).toBeNull();
});

it('does not run IP validation when the password is invalid', async () => {
  mock.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: new Error('Invalid credentials') });
  const result = mount();
  await flush();
  await act(async () => {
    expect((await result.current.signIn(user.email, 'wrong-password')).error.message).toBe('Invalid credentials');
  });
  expect(mock.validateStaffIP).not.toHaveBeenCalled();
  expect(mock.signOut).not.toHaveBeenCalled();
});

it('signs in with only the normalized email and password, without a case number', async () => {
  const result = mount(); await flush();
  await act(async () => { await result.current.signIn('  STAFF@EXAMPLE.COM  ', 'password'); });
  expect(mock.signInWithPassword).toHaveBeenCalledOnce();
  expect(mock.signInWithPassword).toHaveBeenCalledWith({ email: 'staff@example.com', password: 'password' });
});

it('uses the same normalized email for signup and profile metadata', async () => {
  const result = mount(); await flush();
  await act(async () => { await result.current.signUp('  CLIENT@EXAMPLE.COM  ', 'password', 'Client', 'Example'); });
  expect(mock.signUp).toHaveBeenCalledWith({ email: 'client@example.com', password: 'password', options: { data: {
    first_name: 'Client', last_name: 'Example', platform: 'brightfund', display_email: 'client@example.com',
  } } });
});

it('does not show a successful registration for an obfuscated duplicate-email response', async () => {
  mock.signUp.mockResolvedValue({ data: { user: { ...user, identities: [] }, session: null }, error: null });
  const result = mount(); await flush();
  await act(async () => {
    const response = await result.current.signUp(user.email, 'password', 'Client', 'Example');
    expect(response.error?.message).toContain('already exists'); expect(response.session).toBeNull();
  });
  expect(mock.toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Success!' }));
});

it('clears the local account after sign-out even if the auth event is delayed', async () => {
  const result = mount(); await flush();
  await act(async () => { await result.current.signIn(user.email, 'password'); });
  mock.signOut.mockResolvedValue({ error: null });
  await act(async () => { await result.current.signOut(); });
  expect(result.current.user).toBeNull(); expect(result.current.session).toBeNull();
});
