import { getExtension } from '@/lib/format';

export function FolderIcon({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <defs>
        <linearGradient id="folderGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe58a" />
          <stop offset="0.55" stopColor="#e8b923" />
          <stop offset="1" stopColor="#b8860b" />
        </linearGradient>
      </defs>
      <path d="M4 12a4 4 0 0 1 4-4h10l4 5h18a4 4 0 0 1 4 4v21a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" fill="url(#folderGold)" />
      <path d="M4 20h40v1H4z" fill="#fff" opacity=".35" />
    </svg>
  );
}

const FILE_STYLES: Record<string, { color: string; label: string }> = {
  pdf: { color: '#dc2626', label: 'PDF' },
  doc: { color: '#2563eb', label: 'DOC' },
  xls: { color: '#16a34a', label: 'XLS' },
  video: { color: '#9333ea', label: 'MP4' },
  image: { color: '#0891b2', label: 'IMG' },
};

export function fileKind(name: string): keyof typeof FILE_STYLES | 'other' {
  const ext = getExtension(name);
  if (ext === '.pdf') return 'pdf';
  if (ext === '.doc' || ext === '.docx') return 'doc';
  if (ext === '.xls' || ext === '.xlsx') return 'xls';
  if (ext === '.mp4') return 'video';
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return 'image';
  return 'other';
}

export function FileIcon({ name, size = 44 }: { name: string; size?: number }) {
  const kind = fileKind(name);
  const style = FILE_STYLES[kind] ?? { color: '#6b7280', label: 'FILE' };
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path d="M10 4h20l10 10v28a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="#fff" />
      <path d="M30 4l10 10H32a2 2 0 0 1-2-2z" fill={style.color} opacity=".35" />
      <rect x="8" y="26" width="32" height="12" rx="2" fill={style.color} />
      <text x="24" y="35.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff" fontFamily="sans-serif">
        {style.label}
      </text>
    </svg>
  );
}

const iconProps = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'url(#iconGold)',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

const GoldDefs = () => (
  <defs>
    <linearGradient id="iconGold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#fff1b8" />
      <stop offset="0.5" stopColor="#e8b923" />
      <stop offset="1" stopColor="#b8860b" />
    </linearGradient>
  </defs>
);

export function TrashIcon({ size = 44 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <GoldDefs />
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  );
}

export function SharedIcon({ size = 44 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <GoldDefs />
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 19a6.5 6.5 0 0 1 13 0" />
      <circle cx="17.5" cy="9" r="2.4" />
      <path d="M17 14.2a5 5 0 0 1 4.5 4.8" />
    </svg>
  );
}
