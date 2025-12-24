'use client'
import { useEffect, useState } from 'react'
import { fetchPortfolio } from '../../controllers/portfolioController'
import PortfolioTable from '../../components/PortfolioTable'
import SectorSummary from '../../components/SectorSummary'
import { Stock } from '../../models/portfolio'

export default function Page() {
  const [data, setData] = useState<Stock[]>([])
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)

  const load = async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true)
      } else {
        setIsRefreshing(true)
      }
      setError('')
      const res = await fetchPortfolio()
      setData(res.stocks || [])
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to load portfolio data. Please check if the backend server is running.'
      setError(errorMessage)
      console.error('Portfolio fetch error:', err)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    load(true)
    const id = setInterval(() => load(false), 15000)
    return () => clearInterval(id)
  }, [])

  const handleRetry = () => {
    load(true)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="text-gray-600">Loading portfolio data...</p>
        </div>
      </div>
    )
  }

  if (error && data.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md rounded-lg border border-red-300 bg-red-50 p-6 text-center shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-red-800">Error Loading Portfolio</h2>
          <p className="mb-4 text-sm text-red-600">{error}</p>
          <button
            onClick={handleRetry}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Dynamic Portfolio Dashboard</h1>
          {isRefreshing && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
              <span>Updating...</span>
            </div>
          )}
        </div>
        {error && (
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
            <strong>Warning:</strong> {error}
            {error.includes('backend server') && (
              <div className="mt-2 text-xs">
                <p>To start the backend server:</p>
                <code className="mt-1 block rounded bg-yellow-100 p-2">
                  cd backend && npm start
                </code>
              </div>
            )}
            {!error.includes('backend server') && <span> Data may be outdated.</span>}
          </div>
        )}
        <SectorSummary data={data} />
        <PortfolioTable data={data} />
      </div>
    </div>
  )
}
