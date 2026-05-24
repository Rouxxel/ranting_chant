import { useState } from 'react'
import { Search, Wrench, Play, History } from 'lucide-react'

interface MCPTool {
  name: string
  description: string
  category: string
}

interface MCPToolsBrowserProps {
  className?: string
}

export function MCPToolsBrowser({ className = '' }: MCPToolsBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const tools: MCPTool[] = [
    { name: 'lookup_tenant', description: 'Look up a tenant record by ID', category: 'Tenants' },
    { name: 'get_tenant_by_name_and_unit', description: 'Find a tenant by name and address unit', category: 'Tenants' },
    { name: 'get_tenant_property', description: 'Return the property record associated with a tenant', category: 'Tenants' },
    { name: 'lookup_property', description: 'Look up a property record by ID', category: 'Properties' },
    { name: 'get_property_manager', description: 'Return the manager record for a property', category: 'Properties' },
    { name: 'get_property_owner', description: 'Return the owner record for a property', category: 'Properties' },
    { name: 'find_vendors_by_service', description: 'Return all vendors offering a given service category', category: 'Vendors' },
    { name: 'get_emergency_vendors', description: 'Return emergency-available vendors for a service category', category: 'Vendors' },
    { name: 'get_vendor', description: 'Look up a vendor record by ID', category: 'Vendors' },
    { name: 'create_request', description: 'Create a new service/maintenance request record', category: 'Requests' },
    { name: 'update_request', description: 'Merge updates into an existing request record', category: 'Requests' },
    { name: 'get_request', description: 'Look up a request record by ID', category: 'Requests' },
    { name: 'list_requests_by_tenant', description: 'Return all requests submitted by a specific tenant', category: 'Requests' },
    { name: 'list_all_requests', description: 'Return all request records', category: 'Requests' },
    { name: 'escalate_request', description: 'Escalate a request and append the reason to its history', category: 'Requests' },
    { name: 'append_conversation_turn', description: 'Append a conversation message to a request\'s history', category: 'Requests' }
  ]

  const categories = ['all', 'Tenants', 'Properties', 'Vendors', 'Requests']

  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tool.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className={`glass-panel p-6 rounded-lg ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-ranting-ice text-xl font-semibold flex items-center gap-2">
          <Wrench className="w-6 h-6" />
          MCP Tools
        </h2>
        <button className="glossy-btn-ghost flex items-center gap-2 px-4 py-2 rounded-full">
          <History className="w-4 h-4" />
          Tool History
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ranting-muted" />
          <input
            type="text"
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="aero-input w-full pl-10 pr-4 py-2"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="aero-input px-4 py-2"
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category === 'all' ? 'All Categories' : category}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tools List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredTools.map(tool => (
            <button
              key={tool.name}
              onClick={() => setSelectedTool(tool)}
              className={`w-full text-left p-4 rounded-lg transition-colors ${
                selectedTool?.name === tool.name
                  ? 'bg-ranting-sky/20 border border-ranting-sky/50'
                  : 'bg-ranting-deep/20 hover:bg-ranting-deep/30 border border-transparent'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-ranting-ice font-medium text-sm">{tool.name}</p>
                  <p className="text-ranting-muted text-xs mt-1 line-clamp-2">{tool.description}</p>
                  <span className="inline-block mt-2 text-xs px-2 py-1 rounded-full bg-ranting-accent/20 text-ranting-sky">
                    {tool.category}
                  </span>
                </div>
                <Play className="w-4 h-4 text-ranting-muted shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>

        {/* Tool Details */}
        <div className="glass-panel-strong p-6 rounded-lg">
          {selectedTool ? (
            <div>
              <h3 className="text-ranting-ice font-semibold text-lg mb-2">{selectedTool.name}</h3>
              <span className="inline-block mb-4 text-xs px-2 py-1 rounded-full bg-ranting-accent/20 text-ranting-sky">
                {selectedTool.category}
              </span>
              <p className="text-ranting-muted text-sm mb-6">{selectedTool.description}</p>

              <div className="space-y-3">
                <button className="glossy-btn w-full flex items-center justify-center gap-2 px-4 py-2 rounded-full">
                  <Play className="w-4 h-4" />
                  Invoke Tool
                </button>
                <button className="glossy-btn-ghost w-full flex items-center justify-center gap-2 px-4 py-2 rounded-full">
                  View Documentation
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-ranting-muted">
              <Wrench className="w-12 h-12 mb-3 opacity-50" />
              <p>Select a tool to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
