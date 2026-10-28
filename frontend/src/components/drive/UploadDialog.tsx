'use client';

import { useEffect, useRef, useState, type DragEvent, type InputHTMLAttributes } from 'react';
import { FormError } from '@/components/auth/FormError';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE_MB } from '@/lib/constants';
import { formatBytes, getExtension, stripExtension } from '@/lib/format';
import { readDropped } from '@/lib/readDropped';
import { allDirs, buildItems, runUploads, selectionFromInput, type UploadItem, type UploadSelection } from '@/lib/uploader';
import { useDriveStore } from '@/store/driveStore';
import { toast } from '@/store/toastStore';
import { Modal } from './Modal';

/** `webkitdirectory` makes the picker choose a whole folder; React's types don't know it. */
const folderInputProps = { webkitdirectory: '', directory: '' } as InputHTMLAttributes<HTMLInputElement>;

/** Long uploads (thousands of files) would make the list huge, so only the first rows are drawn. */
const MAX_ROWS = 100;

type Phase = 'select' | 'ready' | 'running' | 'done';

interface UploadDialogProps {
  /** Files/folders dropped onto the page before the dialog opened. */
  initial?: UploadSelection;
  onClose: () => void;
}

const statusLabel = (item: UploadItem) => {
  switch (item.status) {
    case 'uploading':
      return `${item.progress}%`;
    case 'done':
      return '✓ Uploaded';
    case 'skipped':
      return item.message ?? 'Skipped';
    case 'failed':
      return item.message ?? 'Failed';
    default:
      return 'Waiting';
  }
};

const statusClass = (item: UploadItem) =>
  item.status === 'failed' ? 'error-text' : item.status === 'done' ? 'text-label' : 'text-muted';

export function UploadDialog({ initial, onClose }: UploadDialogProps) {
  const filesInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);

  const breadcrumbs = useDriveStore((s) => s.contents?.breadcrumbs ?? []);

  const [selection, setSelection] = useState<UploadSelection | null>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [phase, setPhase] = useState<Phase>('select');
  const [customName, setCustomName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const apply = (picked: UploadSelection) => {
    if (!picked.files.length && !picked.dirs.length) return setError('Nothing was selected');
    const built = buildItems(picked.files);
    setSelection(picked);
    setItems(built);
    setError('');
    setPhase('ready');
    // A single file can be given a name of your choice
    setCustomName(built.length === 1 && !picked.dirs.length ? stripExtension(built[0]!.name) : '');
  };

  // Files dropped on the page before the dialog opened
  const [appliedInitial, setAppliedInitial] = useState(false);
  if (initial && !appliedInitial) {
    setAppliedInitial(true);
    apply(initial);
  }

  const update = (id: number, patch: Partial<UploadItem>) =>
    setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const pickFromInput = (list: FileList | null) => {
    if (list?.length) apply(selectionFromInput(list));
  };

  const onDrop = async (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (phase === 'running') return;
    apply(await readDropped(e.dataTransfer));
  };

  const start = async (list: UploadItem[]) => {
    if (!selection) return;
    setPhase('running');
    setError('');
    controller.current = new AbortController();

    await runUploads({
      items: list,
      rootFolderId: useDriveStore.getState().folderId,
      dirs: allDirs(selection),
      signal: controller.current.signal,
      update,
    });

    await useDriveStore.getState().refresh();
    setPhase('done');
  };

  const begin = () => {
    // Apply the chosen name to a single file
    const prepared =
      items.length === 1 && customName.trim() && !selection?.dirs.length
        ? items.map((i) => ({ ...i, name: customName.trim() + getExtension(i.file.name) }))
        : items;
    setItems(prepared);
    void start(prepared);
  };

  const retryFailed = () => {
    const reset = items.map((i) => (i.status === 'failed' ? { ...i, status: 'pending' as const, progress: 0, message: undefined } : i));
    setItems(reset);
    void start(reset);
  };

  const count = (status: UploadItem['status']) => items.filter((i) => i.status === status).length;
  const uploadable = items.filter((i) => i.status !== 'skipped');
  const totalBytes = uploadable.reduce((sum, i) => sum + i.file.size, 0);
  const doneBytes = uploadable.reduce((sum, i) => sum + (i.status === 'done' || i.status === 'failed' ? i.file.size : (i.file.size * i.progress) / 100), 0);
  const percent = totalBytes ? Math.round((doneBytes / totalBytes) * 100) : 0;

  const folderCount = selection ? allDirs(selection).length : 0;
  const isSingle = items.length === 1 && !selection?.dirs.length;
  const target = ['My Drive', ...breadcrumbs.map((b) => b.name)].join(' / ');

  // When everything went through, just say so and close; otherwise stay open to show what went wrong
  const doneCount = count('done');
  const allGood = phase === 'done' && doneCount > 0 && count('failed') === 0 && count('skipped') === 0;
  const closed = useRef(false);
  useEffect(() => {
    if (!allGood || closed.current) return;
    closed.current = true;
    toast.success(`${doneCount} file${doneCount === 1 ? '' : 's'} uploaded`);
    onClose();
  }, [allGood, doneCount, onClose]);

  return (
    <Modal title="Upload" onClose={onClose} busy={phase === 'running'} wide={phase !== 'select'}>
      <div className="space-y-4">
        <FormError message={error} />

        {phase === 'select' && (
          <>
            <div
              className="dropzone rounded-xl p-8 text-center"
              data-active={dragging}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <p className="text-body font-semibold">Drop files or a whole folder here</p>
              <p className="text-muted mt-1 text-xs">
                Images, PDF, Word, Excel, MP4 · up to {MAX_FILE_SIZE_MB} MB each · folders keep their structure
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Button fullWidth={false} onClick={() => filesInput.current?.click()}>
                  Choose files
                </Button>
                <Button variant="ghost" fullWidth={false} onClick={() => folderInput.current?.click()}>
                  Choose folder
                </Button>
              </div>
            </div>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </>
        )}

        {phase !== 'select' && (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <p className="text-body">
                <span className="font-semibold">
                  {items.length} file{items.length === 1 ? '' : 's'}
                </span>
                {folderCount > 0 && (
                  <span className="text-muted">
                    {' '}
                    · {folderCount} folder{folderCount === 1 ? '' : 's'}
                  </span>
                )}
                <span className="text-muted"> · {formatBytes(items.reduce((s, i) => s + i.file.size, 0))}</span>
              </p>
              <p className="text-muted truncate">
                to <span className="text-body font-semibold">{target}</span>
              </p>
            </div>

            {phase === 'ready' && isSingle && items[0]?.status === 'pending' && (
              <>
                <Input label="File name" name="name" value={customName} onChange={(e) => setCustomName(e.target.value)} />
                <p className="text-muted -mt-2 text-xs">The extension ({getExtension(items[0].file.name)}) is added automatically.</p>
              </>
            )}

            {!isSingle && (
              <ul className="move-list max-h-64 overflow-y-auto rounded-xl p-1" aria-label="Files to upload">
                {items.slice(0, MAX_ROWS).map((item) => (
                  <li key={item.id} className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm">
                    <span className="text-body min-w-0 flex-1 truncate" title={[...item.dirs, item.name].join(' / ')}>
                      {item.dirs.length > 0 && <span className="text-muted">{item.dirs.join(' / ')} / </span>}
                      {item.name}
                    </span>
                    <span className="text-muted hidden shrink-0 text-xs sm:block">{formatBytes(item.file.size)}</span>
                    <span className={`${statusClass(item)} w-32 shrink-0 truncate text-right text-xs`} title={statusLabel(item)}>
                      {statusLabel(item)}
                    </span>
                  </li>
                ))}
                {items.length > MAX_ROWS && <li className="text-muted px-3 py-2 text-center text-xs">…and {items.length - MAX_ROWS} more</li>}
              </ul>
            )}

            {(phase === 'running' || phase === 'done') && (
              <div>
                <div className="progress-track h-2 overflow-hidden rounded-full" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
                  <div className="progress-bar h-full" style={{ width: `${percent}%` }} />
                </div>
                <p className="text-muted mt-1 text-xs">
                  {phase === 'running'
                    ? `Uploading… ${count('done')} of ${uploadable.length} done`
                    : `${count('done')} uploaded${count('failed') ? ` · ${count('failed')} failed` : ''}${count('skipped') ? ` · ${count('skipped')} skipped` : ''}`}
                </p>
              </div>
            )}

            {phase === 'ready' && count('skipped') > 0 && (
              <p className="error-text text-xs">
                {count('skipped')} file{count('skipped') === 1 ? ' is' : 's are'} not uploadable (allowed: {ALLOWED_EXTENSIONS.join(', ')}). They will be skipped.
              </p>
            )}

            <div className="flex gap-3">
              {phase === 'ready' && (
                <>
                  <Button variant="ghost" onClick={() => setPhase('select')}>
                    Change selection
                  </Button>
                  <Button onClick={begin} disabled={uploadable.length === 0}>
                    Upload {uploadable.length} file{uploadable.length === 1 ? '' : 's'}
                  </Button>
                </>
              )}
              {phase === 'running' && (
                <Button variant="ghost" onClick={() => controller.current?.abort()}>
                  Cancel upload
                </Button>
              )}
              {phase === 'done' && (
                <>
                  {count('failed') > 0 && (
                    <Button variant="ghost" onClick={retryFailed}>
                      Retry {count('failed')} failed
                    </Button>
                  )}
                  <Button onClick={onClose}>Done</Button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <input
        ref={filesInput}
        type="file"
        multiple
        hidden
        accept={ALLOWED_EXTENSIONS.join(',')}
        onChange={(e) => {
          pickFromInput(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={folderInput}
        type="file"
        multiple
        hidden
        {...folderInputProps}
        onChange={(e) => {
          pickFromInput(e.target.files);
          e.target.value = '';
        }}
      />
    </Modal>
  );
}
