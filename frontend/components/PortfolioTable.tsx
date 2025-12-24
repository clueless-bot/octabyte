'use client'
import { memo, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { Stock } from '../models/portfolio'
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatPrice,
} from '../utils/formatters'

function PortfolioTableInner({ data }: { data: Stock[] }) {
  const columns = useMemo<ColumnDef<Stock>[]>(
    () => [
      {
        accessorKey: 'particulars',
        header: 'Particulars',
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: 'purchasePrice',
        header: 'Purchase Price',
        cell: (info) => formatPrice(info.getValue() as number),
      },
      {
        accessorKey: 'quantity',
        header: 'Quantity',
        cell: (info) => formatNumber(info.getValue() as number),
      },
      {
        accessorKey: 'investment',
        header: 'Investment',
        cell: (info) => formatCurrency(info.getValue() as number),
      },
      {
        accessorKey: 'portfolioPercent',
        header: 'Portfolio %',
        cell: (info) => formatPercentage(info.getValue() as number),
      },
      {
        accessorKey: 'exchange',
        header: 'NSE/BSE',
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: 'cmp',
        header: 'CMP',
        cell: (info) => formatPrice(info.getValue() as number),
      },
      {
        accessorKey: 'presentValue',
        header: 'Present Value',
        cell: (info) => formatCurrency(info.getValue() as number),
      },
      {
        accessorKey: 'gainLoss',
        header: 'Gain/Loss',
        cell: (info) => {
          const value = info.getValue() as number
          const formatted = formatCurrency(value)
          return (
            <span
              className={value >= 0 ? 'text-green-600' : 'text-red-600'}
            >
              {formatted}
            </span>
          )
        },
      },
      {
        accessorKey: 'peRatio',
        header: 'P/E Ratio',
        cell: (info) => {
          const value = info.getValue()
          return typeof value === 'string' ? value : formatNumber(value as number)
        },
      },
      {
        accessorKey: 'latestEarnings',
        header: 'Latest Earnings',
        cell: (info) => {
          const value = info.getValue()
          return typeof value === 'string' ? value : formatNumber(value as number)
        },
      },
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="w-full overflow-x-auto -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <table className="min-w-full table-auto border-collapse overflow-hidden rounded-lg border border-gray-300 bg-white text-sm shadow-sm">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2 text-left font-semibold text-gray-800 whitespace-nowrap"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-gray-200 hover:bg-gray-50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2 text-gray-700 whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const PortfolioTable = memo(PortfolioTableInner)

export default PortfolioTable
