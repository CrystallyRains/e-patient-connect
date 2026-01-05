'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AccessLogsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState<any>(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchAccessLogs()
    fetchStats()
  }, [filter])

  const fetchAccessLogs = async () => {
    try {
      const response = await fetch(`/api/user/audit-logs?filter=${filter}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs)
      } else {
        router.push('/patient/login')
      }
    } catch (error) {
      console.error('Failed to fetch access logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/user/audit-logs/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const exportLogs = async () => {
    try {
      setExporting(true)
      const response = await fetch('/api/audit/export', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `access-logs-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        // Show success message
        alert('Access logs exported successfully!')
      } else {
        alert('Failed to export access logs. Please try again.')
      }
    } catch (error) {
      console.error('Failed to export logs:', error)
      alert('Failed to export access logs. Please check your connection and try again.')
    } finally {
      setExporting(false)
    }
  }

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'PATIENT_LOGIN': return '🔐'
      case 'EMERGENCY_ACCESS': return '🚨'
      case 'DOCUMENT_UPLOAD': return '📄'
      case 'DOCUMENT_VIEW': return '👁️'
      case 'PROFILE_UPDATE': return '✏️'
      case 'ENCOUNTER_CREATE': return '🏥'
      default: return '📝'
    }
  }

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'EMERGENCY_ACCESS': return 'text-red-600 bg-red-50'
      case 'PATIENT_LOGIN': return 'text-green-600 bg-green-50'
      case 'DOCUMENT_VIEW': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading access logs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Access Logs</h1>
          <Link 
            href="/patient/dashboard"
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-600">Total Access Events</h3>
              <p className="text-2xl font-bold text-blue-900">{stats.totalAccess}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-red-600">Emergency Access</h3>
              <p className="text-2xl font-bold text-red-900">{stats.emergencyAccess}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-green-600">Document Views</h3>
              <p className="text-2xl font-bold text-green-900">{stats.documentViews}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-purple-600">Profile Updates</h3>
              <p className="text-2xl font-bold text-purple-900">{stats.profileUpdates}</p>
            </div>
          </div>
        )}

        {/* Filter and Export */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Activities</option>
              <option value="emergency">Emergency Access</option>
              <option value="documents">Document Access</option>
              <option value="profile">Profile Changes</option>
            </select>
          </div>
          <button
            onClick={exportLogs}
            disabled={exporting}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? '⏳ Exporting...' : '📥 Export CSV'}
          </button>
        </div>

        {/* Access Logs Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{getActionIcon(log.actionType)}</span>
                      <div>
                        <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.actionType)}`}>
                          {log.actionType.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{log.actorRole}</div>
                    <div className="text-sm text-gray-500">{log.actorName || 'System'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {log.details?.action || log.details?.description || 'No details available'}
                    </div>
                    {log.details?.filename && (
                      <div className="text-sm text-gray-500">File: {log.details.filename}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No access logs found</h3>
            <p className="text-gray-500">Your medical record access history will appear here.</p>
          </div>
        )}

        <div className="mt-8 bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">🔒 Your Privacy & Transparency</h3>
          <p className="text-sm text-blue-700">
            This log shows every time someone accesses your medical records, including emergency access by doctors. 
            You have complete visibility into who viewed your data and when. All access is logged for your security and peace of mind.
          </p>
        </div>
      </div>
    </div>
  )
}