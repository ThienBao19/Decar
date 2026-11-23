import Link from 'next/link'

export function SearchForm({ q, placeholder }: { q: string; placeholder: string }) {
  return (
    <form className="flex gap-2">
      <input
        name="q"
        defaultValue={q}
        placeholder={placeholder}
        className="w-72 rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm outline-none focus:border-gray-500"
      />
      <button type="submit" className="rounded-md bg-gray-800 px-3 py-1.5 text-sm hover:bg-gray-700">
        Search
      </button>
    </form>
  )
}

interface PaginationProps {
  page: number
  total: number
  pageSize: number
  basePath: string
  q: string
}

export function Pagination({ page, total, pageSize, basePath, q }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const href = (p: number) => `${basePath}?${new URLSearchParams({ ...(q && { q }), page: String(p) }).toString()}`
  return (
    <div className="flex items-center justify-between text-sm text-gray-400">
      <span>{total} total · page {page} of {pages}</span>
      <div className="flex gap-2">
        {page > 1 && <Link href={href(page - 1)} className="rounded-md bg-gray-800 px-3 py-1 hover:bg-gray-700">Previous</Link>}
        {page < pages && <Link href={href(page + 1)} className="rounded-md bg-gray-800 px-3 py-1 hover:bg-gray-700">Next</Link>}
      </div>
    </div>
  )
}

export const TH = 'px-4 py-3 text-left font-medium'
export const TD = 'px-4 py-3'
export const SMALL_BTN = 'rounded-md border border-gray-700 px-2 py-1 text-xs hover:bg-gray-800'
export const DANGER_BTN = 'rounded-md border border-red-900 px-2 py-1 text-xs text-red-300 hover:bg-red-950'
