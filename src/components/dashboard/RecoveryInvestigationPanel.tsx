import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bitcoin,
  CheckCircle2,
  Clock3,
  Database,
  Hash,
  Landmark,
  MapPin,
  Search,
  Route,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';
import { cn, formatCurrency } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { InvestigationWorkflow } from './InvestigationWorkflow';

export interface RecoveryInvestigationData {
  searchStartedAt?: string | null;
  searchDurationMinutes?: number | null;
  searchScope?: string | null;
  resultType?: string | null;
  resultDetails?: Json | null;
  completedAt?: string | null;
}

interface RecoveryInvestigationPanelProps extends RecoveryInvestigationData {
  phase: string | null | undefined;
}

type DetailRecord = Record<string, string>;

const resultLabels: Record<string, string> = {
  amount: 'Identified amount',
  currency: 'Currency',
  bank_name: 'Financial institution',
  beneficiary_name: 'Beneficiary',
  account_reference: 'Account reference',
  transaction_reference: 'Transaction reference',
  transaction_date: 'Transaction date',
  country: 'Jurisdiction',
  asset: 'Digital asset',
  network: 'Network',
  wallet_address: 'Attributed wallet',
  transaction_hash: 'Transaction hash',
  exchange_name: 'Exchange / service',
  evidence_reference: 'Evidence reference',
  summary: 'Investigation summary',
};

const resultOrder = [
  'amount', 'currency', 'bank_name', 'beneficiary_name', 'account_reference',
  'transaction_reference', 'transaction_date', 'country', 'asset', 'network',
  'wallet_address', 'transaction_hash', 'exchange_name', 'evidence_reference', 'summary',
];

const toDetailRecord = (value: Json | null | undefined): DetailRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, fieldValue]) => fieldValue !== null && fieldValue !== '')
      .map(([key, fieldValue]) => [key, String(fieldValue)]),
  );
};

const formatRemaining = (remainingMs: number) => {
  if (remainingMs <= 0) return 'Analysis window complete';
  const totalMinutes = Math.ceil(remainingMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
};

export const RecoveryInvestigationPanel = ({
  phase,
  searchStartedAt,
  searchDurationMinutes,
  searchScope,
  resultType,
  resultDetails,
  completedAt,
}: RecoveryInvestigationPanelProps) => {
  const [now, setNow] = useState(() => Date.now());
  const scope = searchScope === 'bank' || searchScope === 'crypto' ? searchScope : 'both';
  const details = useMemo(() => toDetailRecord(resultDetails), [resultDetails]);
  const started = searchStartedAt ? Date.parse(searchStartedAt) : NaN;
  const hasStartTime = Number.isFinite(started);
  const durationMinutes = searchDurationMinutes && Number.isFinite(searchDurationMinutes) && searchDurationMinutes > 0
    ? searchDurationMinutes : 4320;
  const endsAt = started + durationMinutes * 60000;

  useEffect(() => {
    if (phase !== 'review' || !hasStartTime) return;
    let timer: number | undefined;
    const refresh = () => {
      window.clearTimeout(timer);
      const current = Date.now();
      setNow(current);
      // Minute-level time estimates need no animation loop or hidden-tab work.
      if (document.visibilityState !== 'hidden' && current < endsAt) {
        timer = window.setTimeout(refresh, Math.min(60000, endsAt - current));
      }
    };
    refresh();
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [phase, hasStartTime, endsAt]);

  if (phase === 'review') {
    const progress = hasStartTime ? Math.min(100, Math.max(0, (now - started) / (durationMinutes * 60000) * 100)) : 0;
    const remaining = endsAt - now;
    const windowComplete = hasStartTime && remaining <= 0;
    const scopeLabel = scope === 'both' ? 'Banking and blockchain' : scope === 'bank' ? 'Banking transactions' : 'Blockchain transactions';

    return (
      <section aria-label="Case investigation" className="rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
              <Search className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Case investigation</p>
              <h3 className="text-lg font-semibold tracking-tight text-foreground">{windowComplete ? 'Awaiting analyst verification' : 'Transaction review in progress'}</h3>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">Your investigation specialist is reviewing the supporting transaction records.</p>
            </div>
          </div>
          <Badge variant="outline" className={cn('w-fit shrink-0 gap-1.5', windowComplete ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-primary/25 bg-primary/5 text-primary')}>
            <span className={cn('h-1.5 w-1.5 rounded-full', windowComplete ? 'bg-amber-700' : 'bg-primary')} aria-hidden="true" />
            {windowComplete ? 'Pending verification' : 'Under review'}
          </Badge>
        </div>

        <div className="space-y-5 p-4 sm:p-6">
          <InvestigationWorkflow scopeLabel={scopeLabel} scope={scope} running={hasStartTime && !windowComplete} awaitingVerification={windowComplete} />
          <div className="space-y-3 rounded-lg bg-muted/50 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Clock3 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                Investigation window
              </div>
              <span className="text-sm font-medium tabular-nums text-primary">{hasStartTime ? formatRemaining(remaining) : 'Start time pending'}</span>
            </div>
            <Progress value={progress} aria-label="Investigation time elapsed" aria-valuetext={hasStartTime ? Math.round(progress) + '% of the review window elapsed' : 'Start time pending'} className="h-1.5 [&>div]:transition-none" />
            <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
              <span>{Math.round(progress)}% of review window elapsed</span>
              <span>{scopeLabel}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <p>{windowComplete ? 'The review window has ended. Findings are awaiting analyst verification before publication.' : 'This bar shows elapsed review time. Verified findings will be published by your investigation specialist.'}</p>
          </div>
        </div>
      </section>
    );
  }

  if (phase !== 'completed') return null;

  const amount = details.amount && details.currency
    ? formatCurrency(Number(details.amount) || 0, details.currency)
    : null;
  const entries = resultOrder.filter((key) => details[key] && !['amount', 'currency'].includes(key));
  const isCrypto = resultType === 'crypto_transaction';

  if (!resultType || Object.keys(details).length === 0) {
    return (
      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />
        <div>
          <h3 className="font-semibold">Findings awaiting publication</h3>
          <p className="mt-1 text-sm text-muted-foreground">Your case is marked complete, but the investigation specialist has not yet published the supporting transaction details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-emerald-200 bg-[radial-gradient(circle_at_top_right,rgb(16_185_129/0.12),transparent_35%),hsl(var(--card))]">
      <div className="border-b border-emerald-500/15 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500/30">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <Badge className="mb-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-50">Findings published</Badge>
              <h3 className="text-xl font-semibold">Transaction path identified</h3>
            </div>
          </div>
          {amount && <div className="text-left sm:text-right"><p className="text-xs text-muted-foreground">Identified value</p><p className="text-2xl font-bold text-emerald-800">{amount}</p></div>}
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {isCrypto ? <Bitcoin className="h-5 w-5" /> : <Landmark className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Finding type</p>
            <p className="font-medium">{isCrypto ? 'Blockchain transaction' : 'Bank transaction'}</p>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
          <ShieldCheck className="h-5 w-5 text-emerald-800" />
        </div>

        {entries.length > 0 && (
          <dl className="grid gap-3 sm:grid-cols-2">
            {entries.map((key) => {
              const fullWidth = ['wallet_address', 'transaction_hash', 'summary'].includes(key);
              const FieldIcon = key === 'wallet_address' ? Wallet : key === 'transaction_hash' ? Hash : key === 'country' ? MapPin : key === 'summary' ? Route : Database;
              return (
                <div key={key} className={cn('min-w-0 rounded-lg border border-border bg-background/35 p-3.5', fullWidth && 'sm:col-span-2')}>
                  <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"><FieldIcon className="h-3.5 w-3.5" />{resultLabels[key] || key.replace(/_/g, ' ')}</dt>
                  <dd className={cn('mt-1 break-all text-sm font-medium', ['wallet_address', 'transaction_hash', 'transaction_reference', 'evidence_reference'].includes(key) && 'font-mono')}>{details[key]}</dd>
                </div>
              );
            })}
          </dl>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <span>Analyst-reported investigation finding</span>
          {completedAt && <span>Published {new Date(completedAt).toLocaleString()}</span>}
        </div>
      </div>
    </div>
  );
};
