'use client';

import Link from 'next/link';
import { useState, type DragEvent, type ReactNode } from 'react';
import type { ViewMode } from '@/store/uiStore';
import { FileIcon, FolderIcon } from './Icons';
import { ItemMenu, type MenuAction } from './ItemMenu';

export const DRAG_TYPE = 'application/x-drive-item';

export interface DragPayload {
  kind: 'folder' | 'file';
  id: number;
}

/** One row/card in a folder listing. Every view (drive, shared, trash, search) maps its data to this. */
export interface DriveEntry {
  key: string;
  kind: 'folder' | 'file';
  name: string;
  /** Second line, e.g. "2.1 MB · 12 Oct 2026". */
  meta: string;
  /** Extra line, e.g. the location of a search hit. */
  hint?: string;
  /** Folders navigate here. */
  href?: string;
  /** Preview image for image and PDF files. */
  thumbnailUrl?: string | null;
  /** Files open a preview. */
  onOpen?: () => void;
  actions: MenuAction[];
  /** Makes the entry draggable (to move it into a folder). */
  drag?: DragPayload;
  /** Makes a folder entry accept dropped entries. */
  onDropItem?: (item: DragPayload) => void;
}

/** Folder icon, file-type icon, or - for images and PDFs - the actual preview. Falls back to the icon if the preview fails. */
function Visual({ entry, grid }: { entry: DriveEntry; grid: boolean }) {
  const [failed, setFailed] = useState(false);

  if (entry.kind === 'file' && entry.thumbnailUrl && !failed) {
    return grid ? (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element -- signed URL from our API, already resized */}
        <img src={entry.thumbnailUrl} alt="" loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover" />
        <span className="thumb-badge absolute bottom-2 left-2 flex rounded-md p-0.5">
          <FileIcon name={entry.name} size={22} />
        </span>
      </>
    ) : (
      // eslint-disable-next-line @next/next/no-img-element -- signed URL from our API, already resized
      <img src={entry.thumbnailUrl} alt="" loading="lazy" onError={() => setFailed(true)} className="h-[34px] w-[34px] rounded-md object-cover" />
    );
  }
  const size = grid ? 64 : 34;
  return entry.kind === 'folder' ? <FolderIcon size={size} /> : <FileIcon name={entry.name} size={size} />;
}

function Main({ entry, className, children }: { entry: DriveEntry; className: string; children: ReactNode }) {
  const dragProps = entry.drag
    ? {
        draggable: true,
        onDragStart: (e: DragEvent) => {
          e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(entry.drag));
          e.dataTransfer.effectAllowed = 'move';
        },
      }
    : {};
  if (entry.href) {
    return (
      <Link href={entry.href} className={className} {...dragProps}>
        {children}
      </Link>
    );
  }
  if (entry.onOpen) {
    return (
      <button type="button" onClick={entry.onOpen} className={`${className} text-left`} {...dragProps}>
        {children}
      </button>
    );
  }
  return <div className={className}>{children}</div>;
}

function EntryItem({ entry, view }: { entry: DriveEntry; view: ViewMode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropActive, setDropActive] = useState(false);

  const dropProps = entry.onDropItem
    ? {
        onDragOver: (e: DragEvent) => {
          if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setDropActive(true);
        },
        onDragLeave: () => setDropActive(false),
        onDrop: (e: DragEvent) => {
          setDropActive(false);
          const raw = e.dataTransfer.getData(DRAG_TYPE);
          if (!raw) return;
          e.preventDefault();
          entry.onDropItem?.(JSON.parse(raw) as DragPayload);
        },
      }
    : {};

  const icon = <Visual key={entry.thumbnailUrl ?? 'icon'} entry={entry} grid={view === 'grid'} />;
  const menu = (
    <ItemMenu label={entry.name} actions={entry.actions} onOpenChange={setMenuOpen} />
  );
  const state = `${menuOpen ? 'z-30' : ''} ${dropActive ? 'drop-active' : ''}`;

  if (view === 'list') {
    return (
      <div className={`drive-row relative flex items-center gap-3 rounded-xl px-3 py-2 ${state}`} {...dropProps}>
        <Main entry={entry} className="flex min-w-0 flex-1 items-center gap-3">
          {icon}
          <span className="min-w-0">
            <span className="text-body block truncate font-semibold" title={entry.name}>
              {entry.name}
            </span>
            {entry.hint && <span className="text-muted block truncate text-xs">{entry.hint}</span>}
          </span>
        </Main>
        <span className="text-muted hidden w-52 shrink-0 text-sm sm:block">{entry.meta}</span>
        {menu}
      </div>
    );
  }

  return (
    <div className={`drive-card relative rounded-2xl ${state}`} {...dropProps}>
      <Main entry={entry} className="entry-thumb relative flex h-32 w-full items-center justify-center overflow-hidden rounded-t-2xl">
        {icon}
      </Main>
      <div className="flex items-start gap-1 p-3 pr-2">
        <Main entry={entry} className="min-w-0 flex-1">
          <span className="text-body block truncate font-semibold" title={entry.name}>
            {entry.name}
          </span>
          <span className="text-muted block truncate text-xs">{entry.meta}</span>
          {entry.hint && <span className="text-muted block truncate text-xs italic">{entry.hint}</span>}
        </Main>
        {menu}
      </div>
    </div>
  );
}

export function EntryList({ entries, view }: { entries: DriveEntry[]; view: ViewMode }) {
  if (view === 'list') {
    return (
      <div className="flex flex-col gap-1">
        {entries.map((e) => (
          <EntryItem key={e.key} entry={e} view="list" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {entries.map((e) => (
        <EntryItem key={e.key} entry={e} view="grid" />
      ))}
    </div>
  );
}
