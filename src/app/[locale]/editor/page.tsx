import { use } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { DesignLab } from '@/features/editor/design-lab';

export default function SpikePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return <DesignLab />;
}
