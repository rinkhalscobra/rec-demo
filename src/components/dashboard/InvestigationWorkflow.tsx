import { useLayoutEffect, useRef, useState } from 'react';
import { Bitcoin, Landmark, Search, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import './recovery-investigation.css';

interface InvestigationWorkflowProps {
  sources: ReadonlyArray<ReadonlyArray<string>>;
  scopeLabel: string;
  running: boolean;
  awaitingVerification: boolean;
}

const desktopPaths = [
  'M 170 60 H 230 Q 270 60 270 105 V 120 Q 270 150 320 150 H 360',
  'M 550 60 H 490 Q 450 60 450 105 V 120 Q 450 150 400 150 H 360',
  'M 170 240 H 230 Q 270 240 270 195 V 180 Q 270 150 320 150 H 360',
  'M 550 240 H 490 Q 450 240 450 195 V 180 Q 450 150 400 150 H 360',
];
const mobilePaths = [
  'M 96 32 V 85 Q 96 108 135 108 H 170 Q 200 108 200 170',
  'M 304 32 V 85 Q 304 108 265 108 H 230 Q 200 108 200 170',
  'M 96 308 V 255 Q 96 232 135 232 H 170 Q 200 232 200 170',
  'M 304 308 V 255 Q 304 232 265 232 H 230 Q 200 232 200 170',
];

export function InvestigationWorkflow({ sources, scopeLabel, running, awaitingVerification }: InvestigationWorkflowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const resize = () => setWide(container.clientWidth >= 560);
    resize();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(resize);
      observer.observe(container);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  const activeStep = awaitingVerification ? 2 : running ? 1 : 0;
  const steps = [
    ['Source review', `${scopeLabel} within the case scope.`],
    ['Transaction analysis', 'References and transaction relationships are examined.'],
    ['Analyst verification', 'Findings are reviewed before they are published.'],
  ];

  const paths = (compact: boolean) => (
    <svg className={compact ? 'investigation-flow-compact' : 'investigation-flow-wide'} viewBox={compact ? '0 0 400 340' : '0 0 720 300'} preserveAspectRatio="none" aria-hidden="true">
      {(compact ? mobilePaths : desktopPaths).map((path, index) => (
        <g key={path}>
          <path d={path} fill="none" stroke="hsl(var(--primary) / 0.25)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          {running && (
            <circle className="investigation-flow-packet" style={{ offsetPath: `path('${path}')`, animationDelay: `${-index * 0.8}s` }} r="5.5" fill="hsl(var(--primary))" stroke="hsl(var(--card))" strokeWidth="2" />
          )}
        </g>
      ))}
    </svg>
  );

  return (
    <div className="investigation-workflow overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-col gap-2 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h4 className="text-base font-semibold tracking-tight text-foreground">Investigation workflow</h4>
          <p className="mt-1 text-xs text-muted-foreground">From transaction records to verified findings</p>
        </div>
        <span className="w-fit rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">{scopeLabel}</span>
      </div>

      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.6fr)] lg:gap-8">
        <ol className="order-2 flex flex-col justify-center lg:order-1">
          {steps.map(([title, description], index) => (
            <li key={title} className="relative flex gap-3 pb-6 last:pb-0" aria-current={index === activeStep ? 'step' : undefined}>
              {index < steps.length - 1 && <span className="absolute bottom-0 left-4 top-8 w-px bg-border" aria-hidden="true" />}
              <span className={cn('relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums', index === activeStep ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground')} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <div className="min-w-0 pt-1">
                <p className={cn('text-sm font-semibold', index === activeStep ? 'text-primary' : 'text-foreground')}>{title}</p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">{description}</p>
                {index === activeStep && <span className="mt-2 inline-block rounded-md bg-accent px-2 py-1 text-xs font-medium text-primary">{awaitingVerification ? 'Awaiting verification' : running ? 'In progress' : 'Scheduled'}</span>}
              </div>
            </li>
          ))}
        </ol>

        <div ref={containerRef} className="investigation-flow-container order-1 min-w-0 lg:order-2">
          <div className="investigation-flow-canvas" role="img" aria-label={running ? 'Animated flow of evidence sources into case analysis' : 'Evidence sources connected to case analysis'}>
            {paths(!wide)}
            {sources.map(([title], index) => {
              const banking = /Bank|Institution|Payment|Cross-border/.test(title);
              const SourceIcon = banking ? Landmark : Bitcoin;
              return (
                <div key={title} className={`investigation-flow-source investigation-flow-source-${index}`}>
                  <span className="investigation-flow-source-icon" aria-hidden="true"><SourceIcon className="h-4 w-4" /></span>
                  <span>{title}</span>
                </div>
              );
            })}
            <div className="investigation-flow-hub">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground" aria-hidden="true">{awaitingVerification ? <ShieldCheck className="h-5 w-5" /> : <Search className="h-5 w-5" />}</span>
              <span className="text-sm font-semibold text-foreground">Case analysis</span>
              <span className="text-xs text-primary">{awaitingVerification ? 'Verification pending' : running ? 'Tracing evidence' : 'Review scheduled'}</span>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">Evidence sources connected to your case review</p>
        </div>
      </div>
    </div>
  );
}
