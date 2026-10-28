'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState, type DragEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { driveApi } from '@/lib/driveApi';
import { errorMessage } from '@/lib/errors';
import { formatBytes, formatDate, getExtension, stripExtension } from '@/lib/format';
import { toast } from '@/store/toastStore';
import { useDriveStore } from '@/store/driveStore';
import { useUiStore } from '@/store/uiStore';
import type { FileItem, FolderItem } from '@/types/drive.types';
import { Breadcrumbs } from './Breadcrumbs';
import { EmptyState, SkeletonGrid } from './EmptyState';
import { EntryList, type DragPayload, type DriveEntry } from './EntryList';
import { MoveDialog } from './MoveDialog';
import { NameDialog } from './NameDialog';
import { PreviewDialog } from './PreviewDialog';
import { ShareDialog } from './ShareDialog';
import { UploadDialog } from './UploadDialog';
import { readDropped } from '@/lib/readDropped';
import type { UploadSelection } from '@/lib/uploader';
import { ViewToggle } from './ViewToggle';

type Dialog =
  | { type: 'newFolder' }
  | { type: 'upload'; initial?: UploadSelection }
  | { type: 'renameFolder'; folder: FolderItem }
  | { type: 'renameFile'; file: FileItem }
  | { type: 'moveFolder'; folder: FolderItem }
  | { type: 'moveFile'; file: FileItem }
  | { type: 'shareFolder'; folder: FolderItem }
  | { type: 'shareFile'; file: FileItem }
  | { type: 'preview'; file: FileItem };

export function DriveView() {
  const params = useParams<{ folderId?: string[] }>();
  const rawId = params.folderId?.[0];
  const folderId = rawId === undefined ? null : Number(rawId);
  const invalidFolder = folderId !== null && !Number.isInteger(folderId);

  const store = useDriveStore();
  const { contents, isLoading, error, query, results, isSearching } = store;
  const viewMode = useUiStore((s) => s.viewMode);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [fileDragging, setFileDragging] = useState(false);

  useEffect(() => {
    // Opening a folder ends any search
    useDriveStore.getState().setQuery('');
    if (!invalidFolder) void useDriveStore.getState().load(folderId);
  }, [folderId, invalidFolder]);

  const close = () => setDialog(null);
  const searching = query.trim().length > 0;

  const download = async (file: FileItem) => {
    try {
      const a = document.createElement('a');
      a.href = `${await driveApi.getFileUrl(file.id)}&download=1`;
      a.click();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not download this file'));
    }
  };

  const trash = async (kind: 'file' | 'folder', id: number, name: string) => {
    try {
      await (kind === 'folder' ? store.trashFolder(id) : store.trashFile(id));
      toast.success(`"${name}" moved to trash`, {
        label: 'Undo',
        onClick: async () => {
          try {
            await (kind === 'folder' ? driveApi.restoreFolder(id) : driveApi.restoreFile(id));
            await useDriveStore.getState().refresh();
          } catch (err) {
            toast.error(errorMessage(err, 'Could not undo'));
          }
        },
      });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  /** Drag a card onto a folder card. */
  const dropInto = async (target: FolderItem, item: DragPayload) => {
    if (item.kind === 'folder' && item.id === target.id) return;
    try {
      await (item.kind === 'folder' ? store.moveFolder(item.id, target.id) : store.moveFile(item.id, target.id));
      toast.success(`Moved to "${target.name}"`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const folderEntry = (f: FolderItem, hint?: string): DriveEntry => ({
    key: `folder-${f.id}`,
    kind: 'folder',
    name: f.name,
    meta: `Modified ${formatDate(f.updatedAt)}`,
    hint,
    href: `/drive/${f.id}`,
    drag: { kind: 'folder', id: f.id },
    onDropItem: (item) => dropInto(f, item),
    actions: [
      { label: 'Rename', onSelect: () => setDialog({ type: 'renameFolder', folder: f }) },
      { label: 'Move to...', onSelect: () => setDialog({ type: 'moveFolder', folder: f }) },
      { label: 'Share', onSelect: () => setDialog({ type: 'shareFolder', folder: f }) },
      { label: 'Move to trash', danger: true, onSelect: () => trash('folder', f.id, f.name) },
    ],
  });

  const fileEntry = (f: FileItem, hint?: string): DriveEntry => ({
    key: `file-${f.id}`,
    kind: 'file',
    name: f.name,
    meta: `${formatBytes(f.size)} · ${formatDate(f.updatedAt)}`,
    hint,
    thumbnailUrl: f.thumbnailUrl,
    onOpen: () => setDialog({ type: 'preview', file: f }),
    drag: { kind: 'file', id: f.id },
    actions: [
      { label: 'Open', onSelect: () => setDialog({ type: 'preview', file: f }) },
      { label: 'Download', onSelect: () => download(f) },
      { label: 'Rename', onSelect: () => setDialog({ type: 'renameFile', file: f }) },
      { label: 'Move to...', onSelect: () => setDialog({ type: 'moveFile', file: f }) },
      { label: 'Share', onSelect: () => setDialog({ type: 'shareFile', file: f }) },
      { label: 'Move to trash', danger: true, onSelect: () => trash('file', f.id, f.name) },
    ],
  });

  const pathOf = (item: object) => ('path' in item ? String(item.path) : undefined);
  const folderEntries = (searching ? results?.folders : contents?.folders)?.map((f) => folderEntry(f, pathOf(f))) ?? [];
  const fileEntries = (searching ? results?.files : contents?.files)?.map((f) => fileEntry(f, pathOf(f))) ?? [];
  const entries = [...folderEntries, ...fileEntries];

  // Dropping files from the computer opens the upload dialog
  const hasOsFiles = (e: DragEvent) => e.dataTransfer.types.includes('Files');
  const onDragOver = (e: DragEvent) => {
    if (!hasOsFiles(e) || searching) return;
    e.preventDefault();
    setFileDragging(true);
  };
  const onDrop = (e: DragEvent) => {
    if (!hasOsFiles(e) || searching) return;
    e.preventDefault();
    setFileDragging(false);
    if (!contents) return;
    // readDropped copies the dropped items straight away, then walks any folders
    void readDropped(e.dataTransfer).then((initial) => {
      if (initial.files.length || initial.dirs.length) setDialog({ type: 'upload', initial });
    });
  };

  const emptyFolder = !isLoading && contents && entries.length === 0 && !searching;
  const noResults = searching && !isSearching && results && entries.length === 0;

  return (
    <div className="relative min-h-[70vh]" onDragOver={onDragOver} onDragLeave={() => setFileDragging(false)} onDrop={onDrop}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {searching ? (
          <h1 className="text-gold text-2xl font-extrabold">Search results</h1>
        ) : (
          <Breadcrumbs items={contents?.breadcrumbs ?? []} />
        )}
        <div className="flex items-center gap-3">
          <ViewToggle />
          <Button variant="ghost" fullWidth={false} onClick={() => setDialog({ type: 'newFolder' })} disabled={!contents}>
            + New folder
          </Button>
          <Button fullWidth={false} onClick={() => setDialog({ type: 'upload' })} disabled={!contents}>
            Upload
          </Button>
        </div>
      </div>

      {(error || invalidFolder) && (
        <EmptyState
          title="We couldn't open that folder"
          text={invalidFolder ? 'Folder not found' : error}
          action={
            <Link href="/drive" className="btn-gold inline-block rounded-lg px-4 py-2.5">
              Go to My Drive
            </Link>
          }
        />
      )}

      {!error && !invalidFolder && (
        <>
          {((isLoading && !contents) || (searching && isSearching && !results)) && <SkeletonGrid />}

          {emptyFolder && (
            <EmptyState
              title="This folder is empty"
              text="Drag files here, or use the buttons above to upload a file or create a folder."
              action={
                <Button fullWidth={false} onClick={() => setDialog({ type: 'upload' })}>
                  Upload your first file
                </Button>
              }
            />
          )}
          {noResults && <EmptyState title="No matches" text={`Nothing in your drive matches "${query.trim()}".`} />}

          {entries.length > 0 && (
            <div className={isLoading || isSearching ? 'opacity-60 transition' : 'transition'}>
              {!searching && folderEntries.length > 0 && fileEntries.length > 0 && (
                <>
                  <h2 className="text-label mb-2 text-xs font-semibold tracking-wider uppercase">Folders</h2>
                  <div className="mb-6">
                    <EntryList entries={folderEntries} view={viewMode} />
                  </div>
                  <h2 className="text-label mb-2 text-xs font-semibold tracking-wider uppercase">Files</h2>
                  <EntryList entries={fileEntries} view={viewMode} />
                </>
              )}
              {(searching || folderEntries.length === 0 || fileEntries.length === 0) && <EntryList entries={entries} view={viewMode} />}
            </div>
          )}
        </>
      )}

      {fileDragging && (
        <div className="drop-overlay pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl">
          <p className="text-gold text-2xl font-extrabold">Drop files or folders to upload</p>
        </div>
      )}

      {dialog?.type === 'newFolder' && <NameDialog title="New folder" label="Folder name" submitLabel="Create" onSubmit={store.createFolder} onClose={close} />}
      {dialog?.type === 'upload' && <UploadDialog initial={dialog.initial} onClose={close} />}
      {dialog?.type === 'renameFolder' && (
        <NameDialog title="Rename folder" label="Folder name" initialValue={dialog.folder.name} submitLabel="Save" onSubmit={(name) => store.renameFolder(dialog.folder.id, name)} onClose={close} />
      )}
      {dialog?.type === 'renameFile' && (
        <NameDialog
          title="Rename file"
          label="File name"
          initialValue={stripExtension(dialog.file.name)}
          hint={`The extension (${getExtension(dialog.file.name)}) stays the same.`}
          submitLabel="Save"
          onSubmit={(name) => store.renameFile(dialog.file.id, name)}
          onClose={close}
        />
      )}
      {dialog?.type === 'moveFolder' && (
        <MoveDialog
          kind="folder"
          itemId={dialog.folder.id}
          itemName={dialog.folder.name}
          currentParentId={dialog.folder.parentId}
          onMove={async (dest) => {
            await store.moveFolder(dialog.folder.id, dest);
            toast.success(`"${dialog.folder.name}" moved`);
          }}
          onClose={close}
        />
      )}
      {dialog?.type === 'moveFile' && (
        <MoveDialog
          kind="file"
          itemId={dialog.file.id}
          itemName={dialog.file.name}
          currentParentId={dialog.file.folderId}
          onMove={async (dest) => {
            await store.moveFile(dialog.file.id, dest);
            toast.success(`"${dialog.file.name}" moved`);
          }}
          onClose={close}
        />
      )}
      {dialog?.type === 'shareFolder' && <ShareDialog type="folder" itemId={dialog.folder.id} itemName={dialog.folder.name} onClose={close} />}
      {dialog?.type === 'shareFile' && <ShareDialog type="file" itemId={dialog.file.id} itemName={dialog.file.name} onClose={close} />}
      {dialog?.type === 'preview' && <PreviewDialog file={dialog.file} onClose={close} />}
    </div>
  );
}

