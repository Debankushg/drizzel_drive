'use client';

import { useState, type FormEvent } from 'react';
import { FormError } from '@/components/auth/FormError';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiRequestError } from '@/lib/api';
import { Modal } from './Modal';

interface NameDialogProps {
  title: string;
  label: string;
  initialValue?: string;
  submitLabel: string;
  /** Shown under the field, e.g. the extension that will be kept. */
  hint?: string;
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
}

/** Used to create a folder and to rename folders and files. */
export function NameDialog({ title, label, initialValue = '', submitLabel, hint, onSubmit, onClose }: NameDialogProps) {
  const [name, setName] = useState(initialValue);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError('Name is required');
    setBusy(true);
    setError('');
    try {
      await onSubmit(trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Something went wrong');
      setBusy(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose} busy={busy}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError message={error} />
        <Input label={label} name="name" value={name} onChange={(e) => setName(e.target.value)} autoFocus onFocus={(e) => e.target.select()} />
        {hint && <p className="text-muted -mt-2 text-xs">{hint}</p>}
        <div className="flex gap-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
