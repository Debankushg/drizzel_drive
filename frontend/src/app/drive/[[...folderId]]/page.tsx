import { Suspense } from 'react';
import { DriveView } from '@/components/drive/DriveView';
import { AppShell } from '@/components/layout/AppShell';

export default function DrivePage() {
  return (
    <Suspense fallback={null}>
      <AppShell showSearch>
        <DriveView />
      </AppShell>
    </Suspense>
  );
}
