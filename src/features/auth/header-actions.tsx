'use client';

import { LayoutDashboard, LogIn, LogOut } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/button';
import { withBasePath } from '@/config/brand';
import { useAuth } from './auth-context';

/** Pulsanti account nell'header. Disconnesso: Login. Connesso: Logout, Dashboard (poi il link GitHub). */
export function HeaderActions({ locale }: { locale: string }) {
  const { status, openLogin, signOut } = useAuth();
  if (status === 'loading') return <span className="h-9 w-24" aria-hidden />;
  if (status === 'in') {
    return (
      <>
        {/* su smartphone e tablet solo icone: il logo non si schiaccia */}
        <Button variant="ghost" onClick={() => void signOut()} aria-label="Logout" title="Logout" icon={<LogOut />} className="px-3 font-normal"><span className="hidden lg:inline">Logout</span></Button>
        <ButtonLink variant="outline" href={withBasePath(`/${locale}/dashboard/`)} aria-label="Dashboard" title="Dashboard" icon={<LayoutDashboard />} className="px-2.5 lg:px-3.5">
          <span className="hidden lg:inline">Dashboard</span>
        </ButtonLink>
      </>
    );
  }
  return (
    <Button onClick={() => openLogin('login')} icon={<LogIn />}>Login</Button>
  );
}
