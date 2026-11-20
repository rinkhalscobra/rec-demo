import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { act } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { renderHook, flush } from './renderHook';

const mock = vi.hoisted(() => ({
  user: { id: 'admin' } as { id: string } | null,
  loading: false,
  role: 'admin' as 'admin' | 'user' | null,
  roleLoading: false,
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mock.user, loading: mock.loading }) }));
vi.mock('@/hooks/useUserRole', () => ({ useUserRole: () => ({ role: mock.role, isLoading: mock.roleLoading }) }));
import { RequireAuth } from '@/components/auth/RequireAuth';

function Location() {
  const navigate = useNavigate();
  return <><output data-location>{useLocation().pathname}</output><button onClick={() => navigate(-1)}>Back</button></>;
}
function mount(path: string) {
  return renderHook(() => null, () => <MemoryRouter initialEntries={['/', path]}>
    <Location />
    <Routes>
      <Route path="/" element={<h1>Public home</h1>} />
      <Route element={<RequireAuth />}>
        <Route path="/admin" element={<RequireAuth roles={['admin']}><h1>Admin content</h1></RequireAuth>} />
        <Route path="/dashboard" element={<h1>Customer content</h1>} />
      </Route>
    </Routes>
  </MemoryRouter>);
}

beforeEach(() => { mock.user = { id: 'admin' }; mock.loading = false; mock.role = 'admin'; mock.roleLoading = false; });

it('leaves /admin immediately when signing out and replaces the protected history entry', async () => {
  const page = mount('/admin');
  expect(document.body.textContent).toContain('Admin content');
  mock.user = null; mock.role = null;
  page.rerender(); await flush();
  expect(document.querySelector('[data-location]')?.textContent).toBe('/');
  expect(document.body.textContent).toContain('Public home');
  act(() => (document.querySelector('button') as HTMLButtonElement).click());
  await flush();
  expect(document.querySelector('[data-location]')?.textContent).toBe('/');
});

it('redirects a signed-out customer away from dashboard routes', async () => {
  mock.user = null; mock.role = null;
  mount('/dashboard'); await flush();
  expect(document.body.textContent).toContain('Public home');
  expect(document.querySelector('[data-location]')?.textContent).toBe('/');
});

it('waits for session initialization without redirecting a valid returning user', async () => {
  mock.user = null; mock.loading = true;
  const page = mount('/admin');
  expect(document.querySelector('[role=status]')).not.toBeNull();
  expect(document.querySelector('[data-location]')?.textContent).toBe('/admin');
  mock.user = { id: 'admin' }; mock.loading = false; mock.roleLoading = true;
  page.rerender();
  expect(document.querySelector('[role=status]')).not.toBeNull();
  mock.roleLoading = false; page.rerender(); await flush();
  expect(document.body.textContent).toContain('Admin content');
});

it('redirects a customer who visits an admin-only route instead of showing a blank page', async () => {
  mock.role = 'user';
  mount('/admin'); await flush();
  expect(document.body.textContent).toContain('Public home');
  expect(document.querySelector('[data-location]')?.textContent).toBe('/');
});
