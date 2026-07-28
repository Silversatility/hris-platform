import { useCallback, useEffect, useState } from 'react'
import SaleFormModal from '../../components/SaleFormModal'
import { ChevronDownIcon, PlusIcon } from '../../components/icons'
import Spinner from '../../components/Spinner'
import { apiClient } from '../../lib/apiClient'
import type { PaginatedResponse, SaleRecord, SalesAgentRecord } from '../../types'

function salesUrl(agentId: string) {
  return agentId ? `/api/sales/?agent=${agentId}` : '/api/sales/'
}

function SalesTab() {
  const [agentFilter, setAgentFilter] = useState('')
  const [agents, setAgents] = useState<SalesAgentRecord[]>([])
  const [url, setUrl] = useState(() => salesUrl(''))
  const [data, setData] = useState<PaginatedResponse<SaleRecord> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const loadSales = useCallback(() => {
    setIsLoading(true)
    setError(null)
    apiClient
      .get<PaginatedResponse<SaleRecord>>(url)
      .then((response) => setData(response.data))
      .catch(() => setError('Failed to load sales.'))
      .finally(() => setIsLoading(false))
  }, [url])

  useEffect(() => {
    apiClient
      .get<PaginatedResponse<SalesAgentRecord>>('/api/sales-agents/')
      .then((response) => setAgents(response.data.results))
      .catch(() => setAgents([]))
  }, [])

  useEffect(() => {
    setUrl(salesUrl(agentFilter))
  }, [agentFilter])

  useEffect(() => {
    loadSales()
  }, [loadSales])

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="relative">
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="appearance-none rounded-full bg-white py-2 pr-11 pl-4 text-sm text-[#111827] shadow-sm ring-1 ring-[#e5e7eb] outline-none focus:ring-2 focus:ring-[#4f46e5]"
          >
            <option value="">All Agents</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.full_name}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#4338ca] px-4 py-2 text-sm font-bold text-[#f8fafc] shadow-sm"
        >
          <PlusIcon className="h-4 w-4" />
          Log a Sale
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        {isLoading ? (
          <div className="flex items-center justify-center p-16">
            <Spinner className="h-8 w-8 text-[#111827]" />
          </div>
        ) : error ? (
          <p className="p-8 text-center text-sm text-red-500">{error}</p>
        ) : data && data.results.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#e5e7eb] text-xs font-semibold text-[#9ca3af] uppercase">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Agent</th>
                    <th className="px-6 py-3">Vehicle</th>
                    <th className="px-6 py-3">Sale Amount</th>
                    <th className="px-6 py-3">Rate</th>
                    <th className="px-6 py-3">Commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e7eb]">
                  {data.results.map((sale) => (
                    <tr key={sale.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-[#111827]">
                        {sale.sale_date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#6b7280]">
                        {sale.agent_display_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-[#111827]">{sale.vehicle_description}</p>
                        {sale.customer_name && (
                          <p className="text-xs text-[#9ca3af]">{sale.customer_name}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#6b7280]">
                        {sale.sale_amount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#6b7280]">
                        {sale.commission_rate}%
                      </td>
                      <td className="px-6 py-4 font-medium whitespace-nowrap text-[#111827]">
                        {sale.commission_amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-[#e5e7eb] px-6 py-4 text-sm text-[#6b7280]">
              <span>
                {data.count} sale{data.count === 1 ? '' : 's'}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => data.previous && setUrl(data.previous)}
                  disabled={!data.previous}
                  className="rounded-full px-3 py-1.5 font-medium text-[#111827] ring-1 ring-[#e5e7eb] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => data.next && setUrl(data.next)}
                  disabled={!data.next}
                  className="rounded-full px-3 py-1.5 font-medium text-[#111827] ring-1 ring-[#e5e7eb] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="p-8 text-center text-sm text-[#6b7280]">No sales found.</p>
        )}
      </div>

      <SaleFormModal
        isOpen={isModalOpen}
        agents={agents}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadSales}
      />
    </div>
  )
}

export default SalesTab
