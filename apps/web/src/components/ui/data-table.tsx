import * as React from 'react'
import { motion } from 'motion/react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Skeleton } from './skeleton'

export interface Column<T> {
  key: string
  header: React.ReactNode
  render: (row: T) => React.ReactNode
  /** Cung cấp để cho phép sắp xếp cột phía client. */
  sortValue?: (row: T) => string | number
  align?: 'left' | 'center' | 'right'
  className?: string
  headerClassName?: string
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowKey: (row: T) => string | number
  loading?: boolean
  skeletonRows?: number
  /** Hiển thị khi không có dòng nào (và không trong trạng thái loading). */
  empty?: React.ReactNode
  onRowClick?: (row: T) => void
  className?: string
}

const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' } as const

/**
 * Bảng dùng chung với header dính (sticky), sắp xếp phía client, skeleton shimmer
 * và trạng thái rỗng. Các dòng vào màn hình theo nhịp stagger ~40ms (tối đa 0.4s),
 * hover làm sáng nền dòng bằng tông primary rất nhạt.
 */
export function DataTable<T>({
  columns, data, rowKey, loading = false, skeletonRows = 5, empty, onRowClick, className,
}: DataTableProps<T>) {
  const [sort, setSort] = React.useState<{ key: string; dir: 'asc' | 'desc' } | null>(null)

  const sorted = React.useMemo(() => {
    if (!sort) return data
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sortValue) return data
    const accessor = col.sortValue
    const factor = sort.dir === 'asc' ? 1 : -1
    return [...data].sort((a, b) => {
      const av = accessor(a)
      const bv = accessor(b)
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv))
      return cmp * factor
    })
  }, [data, sort, columns])

  function toggleSort(col: Column<T>) {
    if (!col.sortValue) return
    setSort((prev) =>
      prev?.key === col.key
        ? { key: col.key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key: col.key, dir: 'asc' },
    )
  }

  return (
    <div className={cn('overflow-hidden rounded-2xl border border-border bg-white shadow-card', className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500',
                    alignClass[col.align ?? 'left'],
                    col.sortValue && 'cursor-pointer select-none transition-colors hover:text-primary-600',
                    col.headerClassName,
                  )}
                  onClick={() => toggleSort(col)}
                  aria-sort={
                    sort?.key === col.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortValue && sort?.key === col.key &&
                      (sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-b border-border last:border-0">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <Skeleton className="h-4 w-full max-w-[160px]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  {empty}
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => (
                <motion.tr
                  key={rowKey(row)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut', delay: Math.min(i * 0.04, 0.4) }}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'border-b border-border last:border-0 transition-colors duration-150 hover:bg-primary-50/40',
                    onRowClick &&
                      'cursor-pointer focus-visible:outline-none focus-visible:bg-primary-50/60',
                  )}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === 'Enter') onRowClick(row)
                        }
                      : undefined
                  }
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn('px-4 py-3 text-gray-700', alignClass[col.align ?? 'left'], col.className)}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
