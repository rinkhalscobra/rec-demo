import { ChevronRight, ShieldCheck } from "lucide-react";

export const AppleButton = ({ label = "Start your case", full = false }: { label?: string; full?: boolean }) => (
  <button
    className={`group inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground font-medium text-sm px-5 py-3 transition-all hover:bg-primary/90 active:scale-[0.98] ${full ? "w-full" : ""}`}
  >
    <ShieldCheck className="w-4 h-4" />
    <span>{label}</span>
    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-[1px]" />
  </button>
);

export const SectionEyebrow = ({ label, tag }: { label: string; tag?: string }) => (
  <div className="inline-flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
    <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
    <span>{label}</span>
    {tag && (
      <span className="px-2 py-0.5 rounded-full border border-border text-muted-foreground normal-case tracking-normal">
        {tag}
      </span>
    )}
  </div>
);

export const gradientStyle: React.CSSProperties = {
  backgroundImage:
    "var(--gradient-shiny)",
  backgroundSize: "200% auto",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  WebkitTextFillColor: "transparent",
  filter: "url(#c3-noise)",
};
