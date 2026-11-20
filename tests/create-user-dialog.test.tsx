import { act } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { renderHook, flush } from './renderHook';

const mock = vi.hoisted(() => ({ invoke: vi.fn(), toast: vi.fn(), onSuccess: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: mock.invoke } } }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mock.toast }) }));

import { CreateUserDialog } from '@/components/admin/CreateUserDialog';
import { LanguageProvider } from '@/contexts/LanguageContext';

beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  mock.invoke.mockResolvedValue({ data: { success: true, userId: 'new-user' }, error: null });
});
async function mount(roleType: 'agent' | 'supervisor' = 'agent') {
  renderHook(() => null, () => <LanguageProvider><CreateUserDialog roleType={roleType} onSuccess={mock.onSuccess} /></LanguageProvider>);
  act(() => document.querySelector<HTMLButtonElement>('button')!.click()); await flush();
}
function fill(suffix: string, value: string) {
  act(() => {
    const input = document.querySelector<HTMLInputElement>(`input[id$="-${suffix}"]`)!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
function submit() { act(() => document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); }
function complete() {
  fill('firstName', ' Alex '); fill('lastName', ' Smith '); fill('email', ' AGENT@EXAMPLE.COM ');
  fill('password', 'InitialPass123!'); fill('username', ' alex.smith '); fill('phone', ' +1 555 0100 ');
}

it.each(['agent', 'supervisor'] as const)('creates an actual %s account and refreshes the list after success', async role => {
  await mount(role); complete(); submit(); await flush();
  expect(mock.invoke).toHaveBeenCalledWith('create-user', { body: {
    email: 'agent@example.com', password: 'InitialPass123!', firstName: 'Alex', lastName: 'Smith',
    username: 'alex.smith', phone: '+1 555 0100', role,
  } });
  expect(mock.onSuccess).toHaveBeenCalledOnce();
  expect(document.querySelector('[role=dialog]')).toBeNull();
  expect(mock.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Account created' }));
});

it('keeps the form open and preserves details when the server rejects the email', async () => {
  mock.invoke.mockResolvedValue({ data: { error: 'This email already exists' }, error: null });
  await mount(); complete(); submit(); await flush();
  expect(mock.onSuccess).not.toHaveBeenCalled();
  expect(document.querySelector<HTMLInputElement>('input[type=email]')!.value.trim()).toBe('AGENT@EXAMPLE.COM');
  expect(mock.toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'This email already exists', variant: 'destructive' }));
});

it('shows the server message from an HTTP error response', async () => {
  mock.invoke.mockResolvedValue({ data: null, error: { message: 'Non-2xx response', context: new Response(JSON.stringify({ error: 'Only staff members can create users' })) } });
  await mount(); complete(); submit(); await flush();
  expect(mock.toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Only staff members can create users' }));
  expect(mock.onSuccess).not.toHaveBeenCalled();
});

it('does not submit without a password', async () => {
  await mount(); fill('email', 'agent@example.com'); submit(); await flush();
  expect(mock.invoke).not.toHaveBeenCalled();
  expect(document.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(true);
});

it('prevents duplicate requests while account creation is pending', async () => {
  let finish: (value: unknown) => void;
  mock.invoke.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await mount(); complete(); submit(); await flush();
  expect(document.querySelector('form')!.getAttribute('aria-busy')).toBe('true');
  expect(document.querySelector<HTMLInputElement>('input[type=password]')!.disabled).toBe(true);
  submit(); expect(mock.invoke).toHaveBeenCalledOnce();
  await act(async () => finish({ data: { success: true, userId: 'new-user' }, error: null })); await flush();
});

it('needs no group setup or selection to submit', async () => {
  await mount(); complete();
  expect(document.querySelector('[role=combobox]')).toBeNull();
  expect(document.body.textContent).not.toContain('group');
  expect(document.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(false);
  submit(); await flush();
  expect(mock.invoke).toHaveBeenCalledOnce();
});
