import { useState, useCallback } from 'react';

export interface PaginationOptions {
  /** Current page (1-indexed) */
  page?: number;
  /** Items per page */
  pageSize?: number;
  /** Total items */
  total: number;
  /** Max page buttons to show (default: 7) */
  maxButtons?: number;
}

export interface PaginationResult {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  range: { start: number; end: number };
  buttons: (number | '...')[];
  next: () => void;
  prev: () => void;
  goTo: (page: number) => void;
  setPageSize: (size: number) => void;
}

export function usePagination(options: PaginationOptions): PaginationResult {
  const { total, pageSize: initialPageSize = 20, maxButtons = 7 } = options;
  const [page, setPage] = useState(options.page ?? 1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  const hasNext = currentPage < totalPages;
  const hasPrev = currentPage > 1;

  const range = {
    start: (currentPage - 1) * pageSize,
    end: Math.min(currentPage * pageSize, total),
  };

  const buttons = generateButtons(currentPage, totalPages, maxButtons);

  const next = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prev = useCallback(() => {
    setPage((p) => Math.max(p - 1, 1));
  }, []);

  const goTo = useCallback((target: number) => {
    setPage(Math.max(1, Math.min(target, totalPages)));
  }, [totalPages]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  return {
    page: currentPage,
    pageSize,
    total,
    totalPages,
    hasNext,
    hasPrev,
    range,
    buttons,
    next,
    prev,
    goTo,
    setPageSize,
  };
}

function generateButtons(current: number, total: number, max: number): (number | '...')[] {
  if (total <= max) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const buttons: (number | '...')[] = [];
  const half = Math.floor(max / 2);
  const start = Math.max(1, current - half);
  const end = Math.min(total, start + max - 1);

  if (start > 1) {
    buttons.push(1);
    if (start > 2) buttons.push('...');
  }

  for (let i = start; i <= end; i++) {
    buttons.push(i);
  }

  if (end < total) {
    if (end < total - 1) buttons.push('...');
    buttons.push(total);
  }

  return buttons;
}

export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export interface CursorPaginationOptions {
  /** Items per page */
  pageSize: number;
  /** Has more items */
  hasMore: boolean;
}

export function useCursorPagination<T>(items: T[], options: CursorPaginationOptions) {
  const { pageSize } = options;
  const [cursor, setCursor] = useState(0);
  const [allItems, setAllItems] = useState<T[]>(items);

  const visibleItems = allItems.slice(0, cursor + pageSize);
  const hasMore = cursor + pageSize < allItems.length;

  const loadMore = useCallback(() => {
    setCursor((c) => c + pageSize);
  }, [pageSize]);

  const reset = useCallback((newItems: T[]) => {
    setAllItems(newItems);
    setCursor(0);
  }, []);

  return { items: visibleItems, hasMore, loadMore, reset };
}
