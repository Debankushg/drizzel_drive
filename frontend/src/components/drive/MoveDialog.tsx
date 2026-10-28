'use client';

import { useEffect, useState } from 'react';
import { FormError } from '@/components/auth/FormError';
import { Button } from '@/components/ui/Button';
import { driveApi } from '@/lib/driveApi';
import { errorMessage } from '@/lib/errors';
import type { DriveContents } from '@/types/drive.types';
import { FolderIcon } from './Icons';
import { Modal } from './Modal';

interface MoveDialogProps {
  itemName: string;
  kind: 'file' | 'folder';
  itemId: number;
  /** Where the item is now (null = top level); "Move here" is disabled for this folder. */
  currentParentId: number | null;
  onMove: (destinationId: number | null) => Promise<void>;
  onClose: () => void;
}

/** Folder picker: browse your folders and choose where the item goes. */
export function MoveDialog({ itemName, kind, itemId, currentParentId, onMove, onClose }: MoveDialogProps) {
  const [browseId, setBrowseId] = useState<number | null>(currentParentId);
  const [contents, setContents] = useState<DriveContents | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    driveApi
      .getContents(browseId)
      .then((c) => {
        if (cancelled) return;
        setContents(c);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(errorMessage(err, 'Could not load folders'));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [browseId]);

  const go = (id: number | null) => {
    setLoading(true);
    setError('');
    setBrowseId(id);
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await onMove(browseId);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  // A folder can't be moved into itself, so hide it from the list
  const folders = (contents?.folders ?? []).filter((f) => !(kind === 'folder' && f.id === itemId));

  return (
    <Modal title="Move to..." onClose={onClose} busy={busy}>
      <p className="text-muted mb-3 truncate text-sm">
        Moving <span className="text-body font-semibold">{itemName}</span>
      </p>

      <nav className="mb-2 flex flex-wrap items-center gap-1 text-sm" aria-label="Destination">
        <button type="button" className="link-gold" onClick={() => go(null)}>
          My Drive
        </button>
        {contents?.breadcrumbs.map((b) => (
          <span key={b.id} className="flex items-center gap-1">
            <span className="text-muted">›</span>
            <button type="button" className="link-gold" onClick={() => go(b.id)}>
              {b.name}
            </button>
          </span>
        ))}
      </nav>

      <div className="move-list mb-4 h-60 overflow-y-auto rounded-xl p-1">
        {loading && <p className="text-muted p-4 text-center text-sm">Loading...</p>}
        {!loading && folders.length === 0 && <p className="text-muted p-4 text-center text-sm">No folders here</p>}
        {!loading &&
          folders.map((f) => (
            <button key={f.id} type="button" onClick={() => go(f.id)} className="menu-item flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left">
              <FolderIcon size={26} />
              <span className="truncate font-medium">{f.name}</span>
            </button>
          ))}
      </div>

      <div className="space-y-3">
        <FormError message={error} />
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} disabled={loading || browseId === currentParentId}>
            Move here
          </Button>
        </div>
      </div>
    </Modal>
  );
}
