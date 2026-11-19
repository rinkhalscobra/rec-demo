import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  FileSearch,
  FileText,
  Fingerprint,
  FolderOpen,
  GitBranch,
  Layers3,
  ListChecks,
  Route,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { recoveryHeroCopy } from '@/i18n/recoveryHero';
import { cn } from '@/lib/utils';

const stageIcons = [FolderOpen, GitBranch, Route];
const documentIcons = [FileText, FileSearch, ListChecks];
const itemIcons = [FileText, Wallet, Layers3];

const RecoveryHero = () => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const copy = recoveryHeroCopy[language];
  const [activeStage, setActiveStage] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const id = useId();
  const stage = copy.stages[activeStage];
  const DocumentIcon = documentIcons[activeStage];

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % copy.stages.length;
    else if (event.key === 'ArrowLeft') next = (index + copy.stages.length - 1) % copy.stages.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = copy.stages.length - 1;
    else return;

    event.preventDefault();
    setActiveStage(next);
    tabs.current[next]?.focus();
  };

  return (
    <section id="recovery" aria-labelledby="recovery-title" className="showcase-anchor recovery-hero w-full px-4 pb-4 pt-24 sm:px-6 sm:pt-36 lg:px-8 lg:pt-40">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border pb-5 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        <span className="inline-flex items-center gap-2.5 text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-200" aria-hidden="true" />
          {copy.eyebrow}
        </span>
        <span className="inline-flex items-center gap-2.5">
          <Fingerprint className="h-4 w-4" aria-hidden="true" />
          {copy.service}
        </span>
      </div>

      <div className="grid items-stretch gap-8 py-8 sm:py-10 lg:grid-cols-[minmax(0,.82fr)_minmax(520px,1.18fr)] lg:gap-10 xl:py-12">
        <div className="flex min-w-0 flex-col justify-center">
          <h1 id="recovery-title" className="showcase-display-title recovery-hero-title min-w-0">
            <span className="block text-foreground">{copy.title[0]}</span>
            <span className="recovery-hero-accent block">{copy.title[1]}</span>
          </h1>

          <p className="text-base leading-relaxed text-muted-foreground lg:text-lg">{copy.description}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to={user ? '/dashboard' : '/auth'}
              className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
            >
              {user ? t('hero.goToDashboard') : copy.start}
            </Link>
            <a
              href="#recovery-process"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {copy.explore}
            </a>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{copy.note}</p>
        </div>

        <figure className="public-editorial-image aspect-[16/10] min-h-72 lg:min-h-[440px]">
          <img
            src="/images/approach-investigation-daylight.jpg"
            alt="An analyst reviewing case evidence beside a transaction network on a sunlit desk"
            width="1586"
            height="992"
            className="absolute inset-0 h-full w-full object-cover object-center"
            fetchPriority="high"
          />

          <figcaption className="image-caption absolute bottom-4 left-4 right-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] sm:bottom-6 sm:left-6 sm:right-auto">
            <Fingerprint className="h-4 w-4 text-emerald-800" aria-hidden="true" />
            {copy.service}
          </figcaption>
        </figure>
      </div>

      <div id="recovery-process" className="showcase-anchor overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-end justify-between gap-3 px-5 pb-5 pt-6 sm:px-7">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-800">{copy.process}</p>
            <h2 className="mt-2 text-lg font-medium tracking-tight text-foreground sm:text-xl">{copy.processTitle}</h2>
          </div>
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Layers3 className="h-3.5 w-3.5" aria-hidden="true" />
            {copy.overview}
          </span>
        </div>

        <div role="tablist" aria-label={copy.process} className="grid grid-cols-3 border-y border-border">
          {copy.stages.map((item, index) => {
            const Icon = stageIcons[index];
            const selected = activeStage === index;

            return (
              <button
                key={index}
                ref={(element) => { tabs.current[index] = element; }}
                id={`${id}-tab-${index}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`${id}-panel-${index}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveStage(index)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={cn(
                  'relative flex min-w-0 flex-col items-start justify-center gap-2 px-3 py-4 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:px-7 sm:py-5',
                  index > 0 && 'border-l border-border',
                  selected ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <span className={cn('text-xs tabular-nums', selected ? 'text-emerald-800' : 'text-muted-foreground')}>0{index + 1}</span>
                <Icon className="hidden h-4 w-4 shrink-0 lg:block" aria-hidden="true" />
                <span className="min-w-0 break-words text-xs font-medium leading-snug sm:text-sm lg:text-base">{item.label}</span>
                {selected && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-200" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        {copy.stages.map((item, index) => (
          <div
            key={index}
            role="tabpanel"
            id={`${id}-panel-${index}`}
            aria-labelledby={`${id}-tab-${index}`}
            hidden={activeStage !== index}
            tabIndex={0}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            {activeStage === index && (
              <div
                className="recovery-panel-enter grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
              >
                <div className="flex min-w-0 flex-col justify-between gap-6 p-5 sm:p-7">
                  <div>
                    <h3 className="text-2xl font-medium tracking-tight text-foreground">{item.title}</h3>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{item.description}</p>
                  </div>
                  <div className="flex items-start gap-3 border-t border-border pt-5">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{copy.outcome}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.outcome}</p>
                    </div>
                  </div>
                </div>

                <div className="relative min-w-0 border-t border-border bg-secondary p-5 sm:p-7 lg:border-l lg:border-t-0">
                  <div className="recovery-brief relative rounded-xl bg-accent p-5 text-primary sm:p-6">
                    <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <DocumentIcon className="h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                        <h4 className="text-sm font-semibold">{stage.document}</h4>
                      </div>
                      <span className="text-xs tabular-nums text-primary" aria-hidden="true">0{activeStage + 1} / 03</span>
                    </div>
                    <ul className="mt-4 space-y-3">
                      {stage.items.map((label, itemIndex) => {
                        const ItemIcon = itemIcons[itemIndex];
                        return (
                          <li key={label} className="flex items-start gap-3 text-sm leading-relaxed">
                            <ItemIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} aria-hidden="true" />
                            {label}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default RecoveryHero;
