'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { FormError } from '@/components/auth/FormError';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { driveApi } from '@/lib/driveApi';
import { errorMessage } from '@/lib/errors';
import type { ShareItemType, ShareRecipient } from '@/types/share.types';
import { Modal } from './Modal';

interface ShareDialogProps {
  type: ShareItemType;
  itemId: number;
  itemName: string;
  onClose: () => void;
}

/** Share a file/folder (view-only) with another user by email, and manage who has access. */
export function ShareDialog({ type, itemId, itemName, onClose }: ShareDialogProps) {
  const [recipients, setRecipients] = useState<ShareRecipient[] | null>(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    driveApi
      .getRecipients(type, itemId)
      .then((r) => !cancelled && setRecipients(r))
      .catch((err) => {
        if (cancelled) return;
        setRecipients([]);
        setError(errorMessage(err, 'Could not load who this is shared with'));
      });
    return () => {
      cancelled = true;
    };
  }, [type, itemId]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return setError('Enter an email address');
    setBusy(true);
    setError('');
    try {
      const share = await driveApi.shareItem(type, itemId, email.trim());
      setRecipients((r) => [share, ...(r ?? [])]);
      setEmail('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (shareId: number) => {
    setError('');
    try {
      await driveApi.revokeShare(shareId);
      setRecipients((r) => (r ?? []).filter((x) => x.shareId !== shareId));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Modal title="Share" onClose={onClose} busy={busy}>
      <p className="text-muted mb-4 truncate text-sm">
        Sharing <span className="text-body font-semibold">{itemName}</span>
      </p>

      <form onSubmit={add} noValidate className="mb-4 flex items-end gap-3">
        <div className="flex-1">
          <Input label="Add a person by email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoFocus />
        </div>
        <Button type="submit" fullWidth={false} loading={busy}>
          Share
        </Button>
      </form>

      <div className="mb-4 space-y-3">
        <FormError message={error} />
      </div>

      <h3 className="text-label mb-2 text-xs font-semibold tracking-wider uppercase">People with access</h3>
      <ul className="move-list max-h-48 overflow-y-auto rounded-xl p-1">
        {recipients === null && <li className="text-muted p-3 text-center text-sm">Loading...</li>}
        {recipients?.length === 0 && <li className="text-muted p-3 text-center text-sm">Not shared with anyone yet</li>}
        {recipients?.map((r) => (
          <li key={r.shareId} className="flex items-center gap-3 rounded-lg px-3 py-2">
            <span className="avatar flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">{r.name.charAt(0).toUpperCase()}</span>
            <span className="min-w-0 flex-1">
              <span className="text-body block truncate text-sm font-semibold">{r.name}</span>
              <span className="text-muted block truncate text-xs">{r.email}</span>
            </span>
            <span className="text-muted text-xs">Can view</span>
            <button type="button" onClick={() => remove(r.shareId)} aria-label={`Remove ${r.email}`} className="icon-btn flex h-7 w-7 items-center justify-center rounded-full">
              ✕
            </button>
          </li>
        ))}
      </ul>

      <p className="text-muted mt-3 text-xs">People you share with can view and download, but can&apos;t change anything.</p>

      <div className="mt-5">
        <Button variant="ghost" onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  );
}
