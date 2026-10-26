import { use } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { Dashboard } from '@/features/dashboard/dashboard';

export default function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return <Dashboard locale={locale} />;
}
