import { ReactNode } from 'react';

interface BackdropProps {
  /** Retained for compatibility; video backgrounds are no longer rendered. */
  video?: boolean;
  /** Extra classes on the wrapper. */
  className?: string;
  children?: ReactNode;
}

/**
 * Shared page backdrop that mirrors the /showcase visual language.
 * Static gradient + soft monochrome glows.
 * Sits behind app content with pointer-events disabled.
 */
export const Backdrop = ({ className = "", children }: BackdropProps) => {
  return (
    <>
      <div className={`pointer-events-none fixed inset-0 -z-10 ${className}`} aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/70 to-background" />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              'radial-gradient(600px 300px at 10% 0%, hsl(var(--primary) / 0.05), transparent 60%),' +
              'radial-gradient(500px 260px at 90% 20%, hsl(216 70% 40% / 0.04), transparent 60%)',
          }}
        />
      </div>
      {children}
    </>
  );
};

export default Backdrop;
