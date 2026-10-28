'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { errorMessage } from '@/lib/errors';
import { formatBytes, formatDate } from '@/lib/format';
import { toast } from '@/store/toastStore';
import { useTrashStore } from '@/store/trashStore';
import { useUiStore } from '@/store/uiStore';
import { ConfirmDialog } from './ConfirmDialog';
import { EmptyState, SkeletonGrid } from './EmptyState';
import { EntryList, type DriveEntry } from './EntryList';
import { TrashIcon } from './Icons';
import { ViewToggle } from './ViewToggle';

type Confirm =
  | { type: 'empty' }
  | { type: 'folder' | 'file'; id: number; name: string };

export function TrashView() {
  const { contents, isLoading, error, restoreFolder, restoreFile, deleteFolderForever, deleteFileForever, empty } = useTrashStore();
  const viewMode = useUiStore((s) => s.viewMode);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  useEffect(() => {
    void useTrashStore.getState().load();
  }, []);

  const restore = async (kind: 'file' | 'folder', id: number, name: string) => {
    try {
      await (kind === 'folder' ? restoreFolder(id) : restoreFile(id));
      toast.success(`"${name}" restored`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const entries: DriveEntry[] = [
    ...(contents?.folders ?? []).map(
      (f): DriveEntry => ({
        key: `folder-${f.id}`,
        kind: 'folder',
        name: f.name,
        meta: `Deleted ${formatDate(f.deletedAt ?? f.updatedAt)}`,
        actions: [
          { label: 'Restore', onSelect: () => restore('folder', f.id, f.name) },
          { label: 'Delete forever', danger: true, onSelect: () => setConfirm({ type: 'folder', id: f.id, name: f.name }) },
        ],
      }),
    ),
    ...(contents?.files ?? []).map(
      (f): DriveEntry => ({
        key: `file-${f.id}`,
        kind: 'file',
        name: f.name,
        meta: `${formatBytes(f.size)} · deleted ${formatDate(f.deletedAt ?? f.updatedAt)}`,
        actions: [
          { label: 'Restore', onSelect: () => restore('file', f.id, f.name) },
          { label: 'Delete forever', danger: true, onSelect: () => setConfirm({ type: 'file', id: f.id, name: f.name }) },
        ],
      }),
    ),
  ];

  return (
    <div className="min-h-[70vh]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-gold text-2xl font-extrabold">Trash</h1>
        <div className="flex items-center gap-3">
          <ViewToggle />
          <Button variant="danger" fullWidth={false} disabled={entries.length === 0} onClick={() => setConfirm({ type: 'empty' })}>
            Empty trash
          </Button>
        </div>
      </div>
      <p className="text-muted mb-5 text-sm">Items in the trash still count toward your storage until you delete them forever.</p>

      {error && <EmptyState icon={<TrashIcon size={56} />} title="Couldn't load the trash" text={error} />}
      {!error && isLoading && !contents && <SkeletonGrid />}
      {!error && contents && entries.length === 0 && (
        <EmptyState icon={<TrashIcon size={56} />} title="Trash is empty" text="Files and folders you delete will wait here, so you can restore them." />
      )}
      {!error && entries.length > 0 && (
        <div className={isLoading ? 'opacity-60 transition' : 'transition'}>
          <EntryList entries={entries} view={viewMode} />
        </div>
      )}

      {confirm?.type === 'empty' && (
        <ConfirmDialog
          title="Empty trash?"
          message="Everything in the trash will be permanently deleted. This can't be undone."
          confirmLabel="Empty trash"
          onConfirm={async () => {
            await empty();
            toast.success('Trash emptied');
          }}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm && confirm.type !== 'empty' && (
        <ConfirmDialog
          title="Delete forever?"
          message={`"${confirm.name}" will be permanently deleted${confirm.type === 'folder' ? ', along with everything inside it' : ''}. This can't be undone.`}
          confirmLabel="Delete forever"
          onConfirm={async () => {
            await (confirm.type === 'folder' ? deleteFolderForever(confirm.id) : deleteFileForever(confirm.id));
            toast.success(`"${confirm.name}" permanently deleted`);
          }}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
