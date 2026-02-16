import React from 'react';
import { RotateCw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface TablePaginationProps {
  /** Current 1-based page */
  currentPage: number;
  /** Items per page */
  pageSize: number;
  /** Total number of items across all pages */
  total: number;
  /** Callback when page or page size changes */
  onPageChange: (page: number, pageSize?: number) => void;
  /** Optional: callback when refresh is clicked (re-fetch current page) */
  onRefresh?: () => void;
  /** Optional: allow changing page size (show size selector) */
  pageSizeOptions?: number[];
  /** Optional: label for the list (e.g. "ambassadors") */
  itemLabel?: string;
}

export function TablePagination({
  currentPage,
  pageSize,
  total,
  onPageChange,
  onRefresh,
  pageSizeOptions = [10, 20, 50],
  itemLabel = 'items',
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);

  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  const handleRefresh = () => {
    if (onRefresh) onRefresh();
    else onPageChange(currentPage);
  };

  const handleSizeChange = (value: string) => {
    const newSize = Number(value);
    onPageChange(1, newSize);
  };

  // Build page numbers to show (current, neighbours, first, last)
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | 'ellipsis')[] = [];
    if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, 'ellipsis', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages);
    }
    return pages;
  };

  if (total === 0) return null;

  const segmentBase =
    'flex items-center justify-center h-9 px-3 text-sm font-medium bg-background text-foreground hover:bg-muted transition-colors';
  const segmentActive =
    'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground';
  const segmentDisabled = 'pointer-events-none opacity-50';

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-1">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          Showing {start}–{end} of {total} {itemLabel}
        </span>
        {pageSizeOptions.length > 1 && (
          <div className="flex items-center gap-2">
            <span>Per page</span>
            <Select value={String(pageSize)} onValueChange={handleSizeChange}>
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <nav
        role="navigation"
        aria-label="pagination"
        className="flex items-center overflow-hidden rounded-md border border-input divide-x divide-input"
      >
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentPage <= 1}
          aria-label="Go to previous page"
          className={cn(segmentBase, 'rounded-l-md', currentPage <= 1 && segmentDisabled)}
        >
          Prev
        </button>
        <button
          type="button"
          onClick={handleRefresh}
          aria-label="Refresh"
          className={cn(segmentBase, 'w-9 px-0')}
        >
          <RotateCw className="h-4 w-4" />
        </button>
        {getPageNumbers().map((p, i) =>
          p === 'ellipsis' ? (
            <span
              key={`ellipsis-${i}`}
              className={cn(segmentBase, 'w-9 px-0 cursor-default text-muted-foreground')}
              aria-hidden
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={currentPage === p ? 'page' : undefined}
              aria-label={`Go to page ${p}`}
              className={cn(segmentBase, 'min-w-[2.25rem]', currentPage === p && segmentActive)}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          onClick={handleNext}
          disabled={currentPage >= totalPages}
          aria-label="Go to next page"
          className={cn(segmentBase, 'rounded-r-md', currentPage >= totalPages && segmentDisabled)}
        >
          Next
        </button>
      </nav>
    </div>
  );
}
