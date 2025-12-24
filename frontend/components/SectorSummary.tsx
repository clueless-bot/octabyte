import { useMemo } from 'react'
import { Stock } from '../models/portfolio'
import { formatCurrency } from '../utils/formatters'

export default function SectorSummary({ data }: { data: Stock[] }) {
  const sectors = useMemo(
    () =>
      data.reduce((acc: any, s) => {
        acc[s.sector] = acc[s.sector] || { inv: 0, pv: 0 }
        acc[s.sector].inv += s.investment
        acc[s.sector].pv += s.presentValue
        return acc
      }, {}),
    [data]
  )

  return (
    <div className="mb-4 rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-gray-800">Sector Summary</h2>
      <div className="space-y-2">
        {Object.entries(sectors).map(([sector, v]: any) => {
          const gainLoss = v.pv - v.inv
          const gainLossFormatted = formatCurrency(gainLoss)
          return (
            <div
              key={sector}
              className="flex flex-col gap-1 rounded border border-gray-200 bg-gray-50 p-3 sm:flex-row sm:justify-between sm:items-center"
            >
              <span className="font-medium text-gray-800">{sector}</span>
              <div className="flex flex-wrap gap-3 text-sm text-gray-700">
                <span>
                  <span className="font-medium">Investment:</span>{' '}
                  {formatCurrency(v.inv)}
                </span>
                <span>
                  <span className="font-medium">Present Value:</span>{' '}
                  {formatCurrency(v.pv)}
                </span>
                <span>
                  <span className="font-medium">Gain/Loss:</span>{' '}
                  <span
                    className={
                      gainLoss >= 0 ? 'font-semibold text-green-600' : 'font-semibold text-red-600'
                    }
                  >
                    {gainLossFormatted}
                  </span>
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
