import { Suspense } from 'react';
import { SharedView } from '@/components/drive/SharedView';
import { AppShell } from '@/components/layout/AppShell';

export default function SharedPage() {
  return (
    <Suspense fallback={null}>
      <AppShell>
        <SharedView />
      </AppShell>
    </Suspense>
  );
}
