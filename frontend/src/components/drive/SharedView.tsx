'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { driveApi } from '@/lib/driveApi';
import { errorMessage } from '@/lib/errors';
import { formatBytes, formatDate } from '@/lib/format';
import { toast } from '@/store/toastStore';
import { useSharedStore } from '@/store/sharedStore';
import { useUiStore } from '@/store/uiStore';
import type { FileItem } from '@/types/drive.types';
import { Breadcrumbs } from './Breadcrumbs';
import { EmptyState, SkeletonGrid } from './EmptyState';
import { EntryList, type DriveEntry } from './EntryList';
import { SharedIcon } from './Icons';
import { PreviewDialog } from './PreviewDialog';
import { ViewToggle } from './ViewToggle';

/** "Shared with me": read-only browsing of what other people shared. */
export function SharedView() {
  const router = useRouter();
  const params = useParams<{ folderId?: string[] }>();
  const rawId = params.folderId?.[0];
  const folderId = rawId === undefined ? null : Number(rawId);
  const invalidFolder = folderId !== null && !Number.isInteger(folderId);

  const { contents, isLoading, error, removeShare } = useSharedStore();
  const viewMode = useUiStore((s) => s.viewMode);
  const [preview, setPreview] = useState<FileItem | null>(null);

  useEffect(() => {
    if (!invalidFolder) void useSharedStore.getState().load(folderId);
  }, [folderId, invalidFolder]);

  const download = async (file: FileItem) => {
    try {
      const a = document.createElement('a');
      a.href = `${await driveApi.getFileUrl(file.id)}&download=1`;
      a.click();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not download this file'));
    }
  };

  const remove = async (shareId: number, name: string) => {
    try {
      await removeShare(shareId);
      toast.success(`"${name}" removed from Shared with me`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const topLevel = folderId === null;
  const entries: DriveEntry[] = [
    ...(contents?.folders ?? []).map(
      (f): DriveEntry => ({
        key: `folder-${f.id}`,
        kind: 'folder',
        name: f.name,
        meta: f.sharedBy ? `Shared by ${f.sharedBy.name}` : `Modified ${formatDate(f.updatedAt)}`,
        href: `/shared/${f.id}`,
        actions: f.shareId ? [{ label: 'Remove from list', danger: true, onSelect: () => remove(f.shareId!, f.name) }] : [{ label: 'Open', onSelect: () => router.push(`/shared/${f.id}`) }],
      }),
    ),
    ...(contents?.files ?? []).map(
      (f): DriveEntry => ({
        key: `file-${f.id}`,
        kind: 'file',
        name: f.name,
        meta: f.sharedBy ? `${formatBytes(f.size)} · by ${f.sharedBy.name}` : `${formatBytes(f.size)} · ${formatDate(f.updatedAt)}`,
        thumbnailUrl: f.thumbnailUrl,
        onOpen: () => setPreview(f),
        actions: [
          { label: 'Open', onSelect: () => setPreview(f) },
          { label: 'Download', onSelect: () => download(f) },
          ...(f.shareId ? [{ label: 'Remove from list', danger: true, onSelect: () => remove(f.shareId!, f.name) }] : []),
        ],
      }),
    ),
  ];

  return (
    <div className="min-h-[70vh]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Breadcrumbs items={contents?.breadcrumbs ?? []} rootLabel="Shared with me" rootHref="/shared" />
          {contents?.owner && (
            <p className="text-muted mt-1 text-xs">
              Owned by {contents.owner.name} ({contents.owner.email}) · view only
            </p>
          )}
        </div>
        <ViewToggle />
      </div>

      {(error || invalidFolder) && (
        <EmptyState
          title="We couldn't open that folder"
          text={invalidFolder ? 'Folder not found' : error}
          action={
            <Link href="/shared" className="btn-gold inline-block rounded-lg px-4 py-2.5">
              Back to Shared with me
            </Link>
          }
        />
      )}

      {!error && !invalidFolder && (
        <>
          {isLoading && !contents && <SkeletonGrid />}
          {contents && entries.length === 0 && (
            <EmptyState
              icon={<SharedIcon size={56} />}
              title={topLevel ? 'Nothing has been shared with you' : 'This folder is empty'}
              text={topLevel ? 'When someone shares a file or folder with your email address, it will show up here.' : 'There are no files in this shared folder.'}
            />
          )}
          {entries.length > 0 && (
            <div className={isLoading ? 'opacity-60 transition' : 'transition'}>
              <EntryList entries={entries} view={viewMode} />
            </div>
          )}
        </>
      )}

      {preview && <PreviewDialog file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
