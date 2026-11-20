import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ShieldCheck } from 'lucide-react';

interface WindowChromeProps {
  title?: string;
  children: ReactNode;
  className?: string;
  effects?: boolean;
}

/**
 * Shared account workspace with a clear title and an opaque content surface.
 */
export const WindowChrome = ({ title = 'Financial Recovery', children, className }: WindowChromeProps) => {
  return (
    <div
      className={cn(
        'relative rounded-2xl border border-border bg-card shadow-card',
        'overflow-hidden',
        className,
      )}
    >
      {/* Title bar */}
      <div className="flex min-h-12 items-center gap-2.5 border-b border-border bg-muted/60 px-4 sm:px-6">
        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="truncate text-sm font-semibold tracking-tight text-foreground">{title}</span>
      </div>
      {children}
    </div>
  );
};

export default WindowChrome;
