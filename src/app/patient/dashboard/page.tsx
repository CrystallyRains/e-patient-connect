'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  name: string
  mobile: string
  email: string
  role: string
  profile?: {
    profilePhotoPath?: string
    emergencyContact?: string
    idProofType?: string
  }
}

interface CriticalInfo {
  allergies: string
  chronicConditions: string
  bloodGroup: string
  recentSurgery: string
}

interface Encounter {
  id: string
  occurredAt: string
  type: string
  reasonDiagnosis: string
  prescriptionsNotes: string
  allergiesSnapshot?: string
  chronicSnapshot?: string
  bloodGroup?: string
  recentSurgery?: string
  hospitalName?: string
  createdByName?: string
  documentCount: number
}

interface Document {
  id: string
  filename: string
  mimetype: string
  uploadedAt: string
  encounterType?: string
  encounterDate?: string
}

export default function PatientDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [criticalInfo, setCriticalInfo] = useState<CriticalInfo | null>(null)
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [allEncounters, setAllEncounters] = useState<Encounter[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showFullTimeline, setShowFullTimeline] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if (!token) {
      router.push('/patient/login')
      return
    }

    fetchDashboardData(token)
  }, [router])

  const fetchDashboardData = async (token: string) => {
    try {
      // Fetch user profile
      const profileResponse = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        setUser(profileData.user)
      }

      // Fetch critical medical info
      const criticalResponse = await fetch('/api/patient/critical-info', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (criticalResponse.ok) {
        const criticalData = await criticalResponse.json()
        setCriticalInfo(criticalData.criticalInfo)
      }

      // Fetch recent encounters (5 for preview)
      const encountersResponse = await fetch('/api/encounters?limit=5', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (encountersResponse.ok) {
        const encountersData = await encountersResponse.json()
        setEncounters(encountersData.encounters)
      }

      // Fetch all encounters for full timeline
      const allEncountersResponse = await fetch('/api/encounters', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (allEncountersResponse.ok) {
        const allEncountersData = await allEncountersResponse.json()
        setAllEncounters(allEncountersData.encounters)
      }

      // Fetch documents
      const documentsResponse = await fetch('/api/patient/documents', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (documentsResponse.ok) {
        const documentsData = await documentsResponse.json()
        setDocuments(documentsData.documents || [])
      }

    } catch (error) {
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    router.push('/')
  }

  const downloadDocument = async (documentId: string, filename: string) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/documents/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        console.error('Download failed:', response.status)
        setError('Failed to download document')
      }
    } catch (error) {
      console.error('Failed to download document:', error)
      setError('Failed to download document')
    }
  }

  const deleteDocument = async (documentId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
      return
    }

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        // Refresh documents list
        fetchDashboardData(token)
      } else {
        console.error('Delete failed:', response.status)
        setError('Failed to delete document')
      }
    } catch (error) {
      console.error('Failed to delete document:', error)
      setError('Failed to delete document')
    }
  }

  const deleteEncounter = async (encounterId: string, encounterType: string) => {
    if (!confirm(`Are you sure you want to delete this ${encounterType} encounter? This will also delete all associated documents.`)) {
      return
    }

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/patient/encounters?id=${encounterId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        // Refresh dashboard data
        fetchDashboardData(token)
      } else {
        console.error('Delete encounter failed:', response.status)
        setError('Failed to delete encounter')
      }
    } catch (error) {
      console.error('Failed to delete encounter:', error)
      setError('Failed to delete encounter')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-800">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/patient/login')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  const displayEncounters = showFullTimeline ? allEncounters : encounters

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Patient Dashboard</h1>
              <p className="text-gray-700">Welcome back, {user?.name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/patient/add-encounter"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Add Encounter
              </Link>
              <button
                onClick={handleLogout}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Summary */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Summary</h2>
          <div className="flex items-start space-x-6">
            {/* Profile Photo */}
            <div className="shrink-0">
              {user?.profile?.profilePhotoPath ? (
                <img 
                  className="h-20 w-20 object-cover rounded-full border-2 border-gray-300"
                  src={`/api${user.profile.profilePhotoPath}`}
                  alt="Profile"
                />
              ) : (
                <div className="h-20 w-20 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-2xl">👤</span>
                </div>
              )}
            </div>
            
            {/* Profile Info */}
            <div className="flex-1">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Name</p>
                  <p className="text-gray-900 font-medium">{user?.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Mobile</p>
                  <p className="text-gray-900 font-medium">{user?.mobile}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Email</p>
                  <p className="text-gray-900 font-medium">{user?.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Emergency Contact</p>
                  <p className="text-gray-900 font-medium">{user?.profile?.emergencyContact || 'Not provided'}</p>
                </div>
              </div>
              <div className="mt-4">
                <Link
                  href="/patient/settings"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Edit Profile →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Critical Medical Information */}
        {criticalInfo && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Critical Medical Information</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="text-sm text-red-700 font-medium">Allergies</p>
                <p className="text-red-900 font-semibold">{criticalInfo.allergies || 'None recorded'}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-700 font-medium">Chronic Conditions</p>
                <p className="text-yellow-900 font-semibold">{criticalInfo.chronicConditions || 'None recorded'}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700 font-medium">Blood Group</p>
                <p className="text-blue-900 font-semibold">{criticalInfo.bloodGroup || 'Not recorded'}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-700 font-medium">Recent Surgery</p>
                <p className="text-purple-900 font-semibold">{criticalInfo.recentSurgery || 'None recorded'}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Complete Medical Timeline */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Complete Medical History</h2>
              <button
                onClick={() => setShowFullTimeline(!showFullTimeline)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {showFullTimeline ? 'Show Recent Only' : 'Show All Records'}
              </button>
            </div>
            
            {displayEncounters.length > 0 ? (
              <div className="space-y-6 max-h-96 overflow-y-auto">
                {displayEncounters.map((encounter, index) => (
                  <div key={encounter.id} className="relative">
                    {/* Timeline line */}
                    {index < displayEncounters.length - 1 && (
                      <div className="absolute left-6 top-12 w-0.5 h-full bg-gray-200"></div>
                    )}
                    
                    <div className="flex items-start space-x-4">
                      {/* Timeline dot */}
                      <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-lg">
                          {encounter.type === 'Emergency' ? '🚨' : 
                           encounter.type === 'Surgery' ? '🏥' :
                           encounter.type === 'Consultation' ? '👩‍⚕️' :
                           encounter.type === 'Lab Test' ? '🧪' :
                           encounter.type === 'Imaging' ? '📷' :
                           encounter.type === 'Vaccination' ? '💉' : '📋'}
                        </span>
                      </div>
                      
                      {/* Encounter details */}
                      <div className="flex-1 bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-gray-900 text-lg">{encounter.type}</h4>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded">
                              {new Date(encounter.occurredAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <button
                              onClick={() => deleteEncounter(encounter.id, encounter.type)}
                              className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                              title="Delete encounter"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <h5 className="font-medium text-gray-800 mb-1">Diagnosis & Reason:</h5>
                            <p className="text-gray-700 text-sm">{encounter.reasonDiagnosis}</p>
                          </div>
                          
                          <div>
                            <h5 className="font-medium text-gray-800 mb-1">Prescriptions & Notes:</h5>
                            <p className="text-gray-700 text-sm">{encounter.prescriptionsNotes}</p>
                          </div>
                          
                          {/* Medical details grid */}
                          <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-200">
                            {encounter.bloodGroup && (
                              <div>
                                <span className="text-xs font-medium text-gray-600">Blood Group:</span>
                                <p className="text-sm text-red-700 font-medium">{encounter.bloodGroup}</p>
                              </div>
                            )}
                            
                            {encounter.recentSurgery && (
                              <div>
                                <span className="text-xs font-medium text-gray-600">Recent Surgery:</span>
                                <p className="text-sm text-orange-700">{encounter.recentSurgery}</p>
                              </div>
                            )}
                            
                            {encounter.allergiesSnapshot && (
                              <div className="col-span-2">
                                <span className="text-xs font-medium text-gray-600">Allergies at time:</span>
                                <p className="text-sm text-red-700">{encounter.allergiesSnapshot}</p>
                              </div>
                            )}
                            
                            {encounter.chronicSnapshot && (
                              <div className="col-span-2">
                                <span className="text-xs font-medium text-gray-600">Chronic conditions at time:</span>
                                <p className="text-sm text-orange-700">{encounter.chronicSnapshot}</p>
                              </div>
                            )}
                          </div>

                          {encounter.documentCount > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {encounter.documentCount} document{encounter.documentCount > 1 ? 's' : ''} attached
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📋</div>
                <p className="text-gray-600 text-lg mb-4">No medical encounters recorded yet.</p>
                <Link
                  href="/patient/add-encounter"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Add Your First Encounter
                </Link>
              </div>
            )}
          </div>

          {/* Documents & Quick Actions */}
          <div className="space-y-6">
            {/* Medical Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">🩺 Medical Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Total Encounters:</span>
                  <span className="text-sm text-blue-700 font-medium">{allEncounters.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Documents:</span>
                  <span className="text-sm text-green-700 font-medium">{documents.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Blood Group:</span>
                  <span className="text-sm text-red-700 font-medium">
                    {criticalInfo?.bloodGroup || 'Not recorded'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">ID Proof:</span>
                  <span className="text-sm text-gray-800">
                    {user?.profile?.idProofType || 'Not provided'}
                  </span>
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">📄 Medical Documents</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {documents.map((document) => (
                  <div key={document.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm truncate">
                        {document.filename}
                      </h4>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => downloadDocument(document.id, document.filename)}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 flex-shrink-0"
                        >
                          📥 Download
                        </button>
                        <button
                          onClick={() => deleteDocument(document.id, document.filename)}
                          className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 flex-shrink-0"
                          title="Delete document"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>Uploaded: {new Date(document.uploadedAt).toLocaleDateString()}</div>
                      {document.encounterType && (
                        <div>Related to: {document.encounterType} 
                          {document.encounterDate && ` (${new Date(document.encounterDate).toLocaleDateString()})`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {documents.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-3xl mb-2">📄</div>
                    <p className="text-gray-600 text-sm">No documents available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              <Link
                href="/patient/add-encounter"
                className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">📋</div>
                  <h3 className="font-medium text-gray-900 mb-1">Add Encounter</h3>
                  <p className="text-sm text-gray-700">Record a new medical encounter</p>
                </div>
              </Link>

              <Link
                href="/patient/access-logs"
                className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">👀</div>
                  <h3 className="font-medium text-gray-900 mb-1">Access Logs</h3>
                  <p className="text-sm text-gray-700">See who accessed your data</p>
                </div>
              </Link>

              <Link
                href="/patient/settings"
                className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">⚙️</div>
                  <h3 className="font-medium text-gray-900 mb-1">Settings</h3>
                  <p className="text-sm text-gray-700">Manage your profile</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}