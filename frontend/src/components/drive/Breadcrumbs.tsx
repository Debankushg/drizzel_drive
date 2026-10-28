import Link from 'next/link';
import type { Breadcrumb } from '@/types/drive.types';

interface BreadcrumbsProps {
  items: Breadcrumb[];
  rootLabel?: string;
  /** Where the root link goes, e.g. "/drive". Folder links are `${rootHref}/${id}`. */
  rootHref?: string;
}

export function Breadcrumbs({ items, rootLabel = 'My Drive', rootHref = '/drive' }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-1 text-lg">
      <Link href={rootHref} className={items.length ? 'link-gold' : 'text-gold font-extrabold'}>
        {rootLabel}
      </Link>
      {items.map((b, i) => (
        <span key={b.id} className="flex items-center gap-1">
          <span className="text-muted">›</span>
          {i === items.length - 1 ? (
            <span className="text-body max-w-[16rem] truncate font-bold">{b.name}</span>
          ) : (
            <Link href={`${rootHref}/${b.id}`} className="link-gold max-w-[10rem] truncate">
              {b.name}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
