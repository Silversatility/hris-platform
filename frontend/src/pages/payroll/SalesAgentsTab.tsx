import { useCallback, useEffect, useState } from 'react'
import SalesAgentFormModal from '../../components/SalesAgentFormModal'
import { PencilIcon, PlusIcon } from '../../components/icons'
import Spinner from '../../components/Spinner'
import { apiClient } from '../../lib/apiClient'
import type { BranchOption, PaginatedResponse, SalesAgentRecord } from '../../types'

function SalesAgentsTab() {
  const [data, setData] = useState<PaginatedResponse<SalesAgentRecord> | null>(null)
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<SalesAgentRecord | null>(null)

  const loadAgents = useCallback(() => {
    setIsLoading(true)
    setError(null)
    apiClient
      .get<PaginatedResponse<SalesAgentRecord>>('/api/sales-agents/')
      .then((response) => setData(response.data))
      .catch(() => setError('Failed to load sales agents.'))
      .finally(() => setIsLoading(false))
  }, [])

  const loadBranches = useCallback(() => {
    apiClient
      .get<PaginatedResponse<BranchOption>>('/api/branches/?page_size=100')
      .then((response) => setBranches(response.data.results))
      .catch(() => setBranches([]))
  }, [])

  useEffect(() => {
    loadAgents()
  }, [loadAgents])

  useEffect(() => {
    loadBranches()
  }, [loadBranches])

  function handleAdd() {
    setEditingAgent(null)
    setIsModalOpen(true)
  }

  function handleEdit(agent: SalesAgentRecord) {
    setEditingAgent(agent)
    setIsModalOpen(true)
  }

  return (
    <div>
      <div className="flex justify-end">
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#4338ca] px-4 py-2 text-sm font-bold text-[#f8fafc] shadow-sm"
        >
          <PlusIcon className="h-4 w-4" />
          Add Agent
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#e5e7eb] text-xs font-semibold text-[#9ca3af] uppercase">
                <tr>
                  <th className="px-6 py-3">Agent</th>
                  <th className="px-6 py-3">Branch</th>
                  <th className="px-6 py-3">Phone</th>
                  <th className="px-6 py-3">Commission Rate</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb]">
                {data.results.map((agent) => (
                  <tr key={agent.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-medium text-[#111827]">{agent.full_name}</p>
                      <p className="text-xs text-[#9ca3af]">{agent.agent_id}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#6b7280]">
                      {agent.branch_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#6b7280]">
                      {agent.phone_number || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#6b7280]">
                      {agent.default_commission_rate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                          agent.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {agent.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleEdit(agent)}
                        title="Edit"
                        className="rounded-full p-1.5 text-[#6b7280] hover:bg-[#f8fafc] hover:text-[#111827]"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-8 text-center text-sm text-[#6b7280]">No sales agents found.</p>
        )}
      </div>

      <SalesAgentFormModal
        isOpen={isModalOpen}
        agent={editingAgent}
        branches={branches}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadAgents}
      />
    </div>
  )
}

export default SalesAgentsTab
