import { Suspense } from 'react';
import { TrashView } from '@/components/drive/TrashView';
import { AppShell } from '@/components/layout/AppShell';

export default function TrashPage() {
  return (
    <Suspense fallback={null}>
      <AppShell>
        <TrashView />
      </AppShell>
    </Suspense>
  );
}
