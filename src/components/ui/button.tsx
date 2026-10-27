import { Loader2 } from 'lucide-react';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

// Pulsante unico del sito. Stili (hover, pressione, focus, caricamento) in globals.css (.btn*): qui solo varianti e misure.

export type ButtonVariant = 'primary' | 'outline' | 'secondary' | 'ghost' | 'danger' | 'danger-solid';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2.5 px-6 text-base',
  icon: 'size-9 [&>svg]:size-5',
  'icon-sm': 'size-8 [&>svg]:size-4',
};

export function buttonClass({ variant = 'primary', size = 'md', className = '' }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return `btn btn-${variant} ${SIZES[size]} ${className}`.trim();
}

type Common = { variant?: ButtonVariant; size?: ButtonSize; icon?: ReactNode; children?: ReactNode; className?: string };

export function Button({ variant, size, icon, loading = false, children, className, disabled, type = 'button', ...rest }:
  Common & ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button type={type} className={buttonClass({ variant, size, className })} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="btn-spinner" aria-hidden><Loader2 className="size-4" /></span> : null}
      {icon ? <span className="shrink-0 [&>svg]:size-4" aria-hidden>{icon}</span> : null}
      {children}
    </button>
  );
}

/** Link con l'aspetto di un pulsante (navigazione: CTA, Dashboard, New CV). */
export function ButtonLink({ variant, size, icon, children, className, ...rest }: Common & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={buttonClass({ variant, size, className })} {...rest}>
      {icon ? <span className="shrink-0 [&>svg]:size-4" aria-hidden>{icon}</span> : null}
      {children}
    </a>
  );
}
