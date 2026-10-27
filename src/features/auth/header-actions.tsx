'use client';

import { LayoutDashboard, LogIn, LogOut } from 'lucide-react';
import { withBasePath } from '@/config/brand';
import { useAuth } from './auth-context';

const ghost = 'flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:text-fg';

/** Pulsanti account nell'header. Disconnesso: Login. Connesso: Logout, Dashboard (poi il link GitHub). */
export function HeaderActions({ locale }: { locale: string }) {
  const { status, openLogin, signOut } = useAuth();
  if (status === 'loading') return <span className="h-9 w-24" aria-hidden />;
  if (status === 'in') {
    return (
      <>
        {/* su smartphone e tablet solo icone: il logo non si schiaccia */}
        <button type="button" onClick={() => void signOut()} aria-label="Logout" title="Logout" className={ghost}><LogOut className="size-4" aria-hidden /> <span className="hidden lg:inline">Logout</span></button>
        <a href={withBasePath(`/${locale}/dashboard/`)} aria-label="Dashboard" title="Dashboard"
           className="flex items-center gap-2 rounded-lg border border-accent/60 px-2.5 py-2 text-sm font-semibold text-accent-text transition-colors hover:bg-accent hover:text-accent-fg lg:px-3.5">
          <LayoutDashboard className="size-4" aria-hidden /> <span className="hidden lg:inline">Dashboard</span>
        </a>
      </>
    );
  }
  return (
    <button type="button" onClick={() => openLogin('login')}
      className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90">
      <LogIn className="size-4" aria-hidden /> Login
    </button>
  );
}
