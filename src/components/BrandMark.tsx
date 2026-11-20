import { COMPANY } from '@/config/company';

interface BrandMarkProps {
  className?: string;
}

/** Shared text identity for public pages and account layouts. */
const BrandMark = ({ className = "text-base sm:text-xl" }: BrandMarkProps) => (
  <span
    data-brand-name
    className={`inline-block max-w-[7rem] font-display font-bold leading-tight tracking-tight text-foreground sm:max-w-none ${className}`}
  >
    {COMPANY.brand}
  </span>
);

export default BrandMark;
