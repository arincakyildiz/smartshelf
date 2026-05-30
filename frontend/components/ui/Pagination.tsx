'use client';

import { useT } from '@/lib/i18n';

interface Props {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (p: number) => void;
}

export default function Pagination({ page, totalPages, total, limit, onPageChange }: Props) {
  const t = useT();
  if (totalPages <= 1) {
    return (
      <p className="text-sm text-gray-500 mt-4">{t('pagination.totalRecords', { total })}</p>
    );
  }

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  // Compact page numbers: 1 … (p-1) p (p+1) … N
  const pages: (number | '…')[] = [];
  const add = (n: number | '…') => pages.push(n);
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) add(i);
  } else {
    add(1);
    if (page > 3) add('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) add(i);
    if (page < totalPages - 2) add('…');
    add(totalPages);
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-4 border-t border-gray-100">
      <p className="text-sm text-gray-500">{t('pagination.range', { from, to, total })}</p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-2.5 py-1.5 text-sm rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >‹</button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`d${i}`} className="px-2 text-gray-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`px-3 py-1.5 text-sm rounded-md ${
                p === page
                  ? 'bg-navy-800 text-white'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >{p}</button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-2.5 py-1.5 text-sm rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >›</button>
      </div>
    </div>
  );
}
