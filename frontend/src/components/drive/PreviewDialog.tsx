'use client';

import { useEffect, useState } from 'react';
import { FormError } from '@/components/auth/FormError';
import { driveApi } from '@/lib/driveApi';
import { formatBytes } from '@/lib/format';
import type { FileItem } from '@/types/drive.types';
import { FileIcon, fileKind } from './Icons';
import { Modal } from './Modal';

/** Shows images and videos inline; PDFs open in a new tab and Office files download. */
export function PreviewDialog({ file, onClose }: { file: FileItem; onClose: () => void }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    driveApi
      .getFileUrl(file.id)
      .then((u) => !cancelled && setUrl(u))
      .catch(() => !cancelled && setError('Could not load this file'));
    return () => {
      cancelled = true;
    };
  }, [file.id]);

  const kind = fileKind(file.name);
  const downloadUrl = url && `${url}&download=1`;

  return (
    <Modal title={file.name} onClose={onClose} wide>
      <FormError message={error} />
      {!url && !error && <p className="text-muted py-10 text-center">Loading...</p>}

      {url && kind === 'image' && (
        // eslint-disable-next-line @next/next/no-img-element -- temporary signed URL from the API
        <img src={url} alt={file.name} className="mx-auto max-h-[60vh] rounded-lg object-contain" />
      )}
      {url && kind === 'video' && <video src={url} controls autoPlay className="mx-auto max-h-[60vh] w-full rounded-lg bg-black" />}
      {url && kind !== 'image' && kind !== 'video' && (
        <div className="flex flex-col items-center gap-2 py-8">
          <FileIcon name={file.name} size={72} />
          <p className="text-muted text-sm">No inline preview for this file type.</p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <span className="text-muted text-sm">{formatBytes(file.size)}</span>
        <div className="flex gap-3">
          {url && kind === 'pdf' && (
            <a href={url} target="_blank" rel="noreferrer" className="btn-ghost rounded-lg px-4 py-2.5">
              Open in new tab
            </a>
          )}
          {url && (
            <a href={downloadUrl} className="btn-gold rounded-lg px-4 py-2.5">
              Download
            </a>
          )}
          <button type="button" onClick={onClose} className="btn-ghost rounded-lg px-4 py-2.5">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
