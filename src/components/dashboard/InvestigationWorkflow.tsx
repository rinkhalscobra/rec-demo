import { useState, type CSSProperties } from 'react';
import { Blocks, FileSearch2, Fingerprint, Landmark, Link2, ListChecks, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import './recovery-investigation.css';

interface InvestigationWorkflowProps {
  scopeLabel: string;
  scope: 'both' | 'crypto' | 'bank';
  running: boolean;
  awaitingVerification: boolean;
}

const sourceContent = {
  bank: {
    icon: Landmark,
    title: 'Bank transactions',
    subtitle: 'Accounts · transfers · beneficiaries',
    records: ['Payment references', 'Sender & beneficiary', 'Dates & settlement records'],
  },
  crypto: {
    icon: Blocks,
    title: 'Blockchain transactions',
    subtitle: 'Wallets · transfers · exchanges',
    records: ['Wallet addresses', 'Transaction hashes', 'Networks & asset movements'],
  },
};

const waveform = [4, 8, 11, 6, 17, 12, 21, 26, 16, 11, 19, 9, 16];
const stages = ['Review records', 'Trace transfers', 'Cross-check links', 'Analyst review'];

function SourceCard({ kind }: { kind: 'bank' | 'crypto' }) {
  const { icon: Icon, title, subtitle, records } = sourceContent[kind];
  return (
    <article className={`investigation-source investigation-source-${kind}`} aria-label={title}>
      <div className="investigation-source-heading">
        <span className="investigation-source-icon" aria-hidden="true"><Icon size={17} strokeWidth={1.7} /></span>
        <div><h5>{title}</h5><p>{subtitle}</p></div>
      </div>
      <ul className="investigation-records">
        {records.map(record => <li key={record}><span aria-hidden="true" />{record}</li>)}
      </ul>
    </article>
  );
}

function Connectors({ scope }: { scope: InvestigationWorkflowProps['scope'] }) {
  const paths = scope === 'both' ? [
    { kind: 'bank', path: 'M 256 100 H 288 Q 307 100 307 120 V 168 Q 307 188 327 188 H 363' },
    { kind: 'crypto', path: 'M 256 320 H 287 Q 307 320 307 300 V 252 Q 307 232 327 232 H 363' },
  ] : [{ kind: scope, path: 'M 256 210 H 363' }];
  paths.push({ kind: 'evidence', path: 'M 575 210 H 668' });

  return (
    <svg className="investigation-connectors" viewBox="0 0 900 420" preserveAspectRatio="none" aria-hidden="true">
      {paths.map(({ kind, path }, index) => <g key={kind} className={`investigation-link investigation-link-${kind}`}>
        <path className="investigation-link-track" d={path} vectorEffect="non-scaling-stroke" />
        <path className="investigation-signal" d={path} pathLength="100" vectorEffect="non-scaling-stroke" style={{ '--signal-delay': `${index * -.8}s` } as CSSProperties} />
      </g>)}
      {scope === 'both' && <g className="investigation-junction"><circle cx="307" cy="210" r="5" /><circle cx="307" cy="210" r="1.8" /></g>}
    </svg>
  );
}

export function InvestigationWorkflow({ scopeLabel, scope, running, awaitingVerification }: InvestigationWorkflowProps) {
  const [paused, setPaused] = useState(false);
  const activeStage = awaitingVerification ? 3 : running ? 2 : 0;

  return (
    <figure className="investigation-workflow" data-running={running} data-paused={paused} aria-label={`Investigation workflow: ${scopeLabel}`}>
      <figcaption className="sr-only">Illustration of available transaction records flowing into analysis and case evidence for analyst review.</figcaption>
      {running && <button
        type="button"
        className="investigation-motion-control"
        onClick={() => setPaused(value => !value)}
        aria-label={paused ? 'Play workflow animation' : 'Pause workflow animation'}
        aria-pressed={paused}
        title={paused ? 'Play animation' : 'Pause animation'}
      >{paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}</button>}

      <div className="investigation-diagram">
        <Connectors scope={scope} />
        <div className="investigation-source-group" data-single={scope !== 'both'}>
          {scope !== 'crypto' && <SourceCard kind="bank" />}
          {scope !== 'bank' && <SourceCard kind="crypto" />}
        </div>

        <div className="investigation-analysis">
          <div className="investigation-radar" aria-hidden="true">
            <span className="investigation-radar-axis investigation-radar-axis-x" />
            <span className="investigation-radar-axis investigation-radar-axis-y" />
            <span className="investigation-radar-ring" />
            <span className="investigation-radar-sweep" />
            {[0, 1, 2].map(index => <span className={`investigation-radar-blip investigation-radar-blip-${index}`} key={index} />)}
            <span className="investigation-fingerprint"><Fingerprint size={29} strokeWidth={1.8} /></span>
          </div>
          <h5>{awaitingVerification ? 'Analyst verification' : 'Transaction analysis'}</h5>
          <p>{awaitingVerification ? 'Evidence ready for review' : running ? 'Trace · compare · connect' : 'Review scheduled'}</p>
          <div className="investigation-waveform" aria-hidden="true">
            {waveform.map((height, index) => <span key={index} style={{ height, '--bar-delay': `${index * -.13}s` } as CSSProperties} />)}
          </div>
        </div>

        <article className="investigation-evidence">
          <span className="investigation-evidence-icon" aria-hidden="true"><FileSearch2 size={21} strokeWidth={1.7} /></span>
          <h5>Case evidence</h5>
          <p>Linked records for analyst review</p>
          <ul>
            <li><Link2 size={15} aria-hidden="true" />Transfer relationships</li>
            <li><ListChecks size={15} aria-hidden="true" />Supporting references</li>
          </ul>
        </article>
      </div>

      <ol className="investigation-stages" aria-label="Investigation stages">
        {stages.map((title, index) => <li key={title} className={cn(index === activeStage && 'investigation-stage-active', index < activeStage && 'investigation-stage-previous')} aria-current={index === activeStage ? 'step' : undefined}>
          <div className="investigation-stage-label"><span className="investigation-stage-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span>{title}</span></div>
          <span className="investigation-stage-track" aria-hidden="true"><span /></span>
        </li>)}
      </ol>
    </figure>
  );
}
