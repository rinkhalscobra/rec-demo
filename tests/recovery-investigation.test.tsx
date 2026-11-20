import { act } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RecoveryInvestigationPanel, type RecoveryInvestigationData } from '@/components/dashboard/RecoveryInvestigationPanel';
import { renderHook } from './renderHook';

const start = '2026-11-20T12:00:00Z';
let visibility: 'visible' | 'hidden';
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(start); visibility = 'visible';
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
function mount(extra: Partial<RecoveryInvestigationData> = {}, initialPhase = 'review') {
  let phase = initialPhase;
  const view = renderHook(() => null, () => <RecoveryInvestigationPanel phase={phase} searchStartedAt={start} searchDurationMinutes={10} {...extra} />);
  return { phase: (next: string) => { phase = next; view.rerender(); } };
}
const progress = () => document.querySelector('[role="progressbar"]')!;

it('shows actual elapsed time and updates only once per minute', () => {
  vi.setSystemTime(new Date(start).getTime() + 5 * 60000); mount();
  expect(progress().getAttribute('aria-valuenow')).toBe('50');
  expect(document.body.textContent).toContain('5m remaining');
  act(() => vi.advanceTimersByTime(59000));
  expect(progress().getAttribute('aria-valuenow')).toBe('50');
  act(() => vi.advanceTimersByTime(1000));
  expect(progress().getAttribute('aria-valuenow')).toBe('60');
  expect(document.body.textContent).toContain('4m remaining');
});

it('pauses hidden-tab work and catches up when the case becomes visible again', () => {
  mount();
  act(() => { visibility = 'hidden'; document.dispatchEvent(new Event('visibilitychange')); });
  expect(vi.getTimerCount()).toBe(0);
  act(() => vi.advanceTimersByTime(2 * 60000));
  expect(progress().getAttribute('aria-valuenow')).toBe('0');
  act(() => { visibility = 'visible'; document.dispatchEvent(new Event('visibilitychange')); });
  expect(progress().getAttribute('aria-valuenow')).toBe('20');
  expect(document.body.textContent).toContain('8m remaining');
});

it('stops exactly at the deadline and waits for analyst publication', () => {
  mount({ searchDurationMinutes: 0.1 });
  act(() => vi.advanceTimersByTime(6000));
  expect(progress().getAttribute('aria-valuenow')).toBe('100');
  expect(document.body.textContent).toContain('Awaiting analyst verification');
  expect(document.body.textContent).not.toContain('Findings published');
  expect(vi.getTimerCount()).toBe(0);
});

it.each([null, 'invalid-date'])('handles an unavailable start time (%s) without running a clock', searchStartedAt => {
  mount({ searchStartedAt });
  expect(document.body.textContent).toContain('Start time pending');
  expect(document.body.textContent).not.toContain('NaN');
  expect(vi.getTimerCount()).toBe(0);
});

it('clears the timer when the case leaves review', () => {
  const view = mount(); expect(vi.getTimerCount()).toBe(1);
  view.phase('submitted');
  expect(vi.getTimerCount()).toBe(0);
  expect(document.querySelector('[aria-label="Case investigation"]')).toBeNull();
});

it('keeps the published transaction details without background scanning', () => {
  mount({ resultType: 'crypto_transaction', resultDetails: { amount: '1250', currency: 'EUR', wallet_address: '0xverified-wallet', summary: 'Analyst verified transaction path' } }, 'completed');
  expect(document.body.textContent).toContain('Findings published');
  expect(document.body.textContent).toContain('0xverified-wallet');
  expect(document.body.textContent).toContain('Analyst verified transaction path');
  expect(vi.getTimerCount()).toBe(0);
});
