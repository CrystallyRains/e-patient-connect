'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function DoctorSessionPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.sessionId as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [session, setSession] = useState<any>(null)
  const [patient, setPatient] = useState<any>(null)
  const [encounters, setEncounters] = useState([])
  const [documents, setDocuments] = useState([])
  const [timeRemaining, setTimeRemaining] = useState('')

  useEffect(() => {
    if (sessionId) {
      fetchSessionData()
    }
  }, [sessionId])

  useEffect(() => {
    if (session) {
      updateTimeRemaining()
      const timer = setInterval(updateTimeRemaining, 1000)
      return () => clearInterval(timer)
    }
  }, [session])

  const fetchSessionData = async () => {
    try {
      const token = localStorage.getItem('emergencyToken')
      if (!token) {
        router.push('/doctor/emergency')
        return
      }

      const response = await fetch(`/api/emergency/session/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSession(data.session)
        setPatient(data.patient)
        setEncounters(data.encounters)
        setDocuments(data.documents)
      } else {
        setError('Session expired or invalid')
        setTimeout(() => router.push('/doctor/emergency'), 2000)
      }
    } catch (error) {
      setError('Failed to load session data')
    } finally {
      setLoading(false)
    }
  }

  const updateTimeRemaining = () => {
    if (!session) return

    const now = new Date()
    const expires = new Date(session.expiresAt)
    const diff = expires.getTime() - now.getTime()

    if (diff <= 0) {
      setTimeRemaining('EXPIRED')
      setError('Session has expired')
      setTimeout(() => router.push('/doctor/emergency'), 2000)
    } else {
      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }
  }

  const downloadDocument = async (documentId: string, filename: string) => {
    try {
      const token = localStorage.getItem('emergencyToken')
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
      }
    } catch (error) {
      console.error('Failed to download document:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-800">Loading patient records...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Error</h2>
          <p className="text-gray-800 mb-4">{error}</p>
          <Link href="/doctor/emergency" className="text-red-600 hover:text-red-800">
            ← Back to Emergency Access
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-red-600 text-white p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">🚨 Emergency Access Session</h1>
            <p className="text-red-100">
              Patient: {patient?.name} | Time Remaining: {timeRemaining}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-red-100">Dr. {session?.doctorName}</p>
            <p className="text-sm text-red-100">{session?.hospitalName || 'Emergency Access'}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Patient Overview */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center space-x-6">
            {patient?.profilePhotoPath ? (
              <img 
                className="h-24 w-24 object-cover rounded-full border-4 border-red-200"
                src={`/api${patient.profilePhotoPath}`}
                alt="Patient"
              />
            ) : (
              <div className="h-24 w-24 bg-gray-300 rounded-full flex items-center justify-center border-4 border-red-200">
                <span className="text-gray-800 text-3xl">👤</span>
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{patient?.name}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                <div>
                  <span className="font-medium text-gray-800">Mobile:</span>
                  <p className="text-gray-900">{patient?.mobile}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-800">Email:</span>
                  <p className="text-gray-900">{patient?.email}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-800">Blood Group:</span>
                  <p className="text-gray-900">{patient?.bloodGroup || 'Not specified'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-800">Emergency Contact:</span>
                  <p className="text-gray-900">{patient?.emergencyContact}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Critical Information Alert */}
        {patient?.allergies && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400 text-xl">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Critical Allergies</h3>
                <p className="text-sm text-red-700">{patient.allergies}</p>
              </div>
            </div>
          </div>
        )}

        {/* Chronic Conditions Alert */}
        {patient?.chronicConditions && (
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-orange-400 text-xl">🩺</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-orange-800">Chronic Conditions</h3>
                <p className="text-sm text-orange-700">{patient.chronicConditions}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Medical Timeline */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📋 Complete Medical History</h3>
            <div className="space-y-6 max-h-96 overflow-y-auto">
              {encounters.map((encounter: any, index: number) => (
                <div key={encounter.id} className="relative">
                  {/* Timeline line */}
                  {index < encounters.length - 1 && (
                    <div className="absolute left-6 top-12 w-0.5 h-full bg-gray-200"></div>
                  )}
                  
                  <div className="flex items-start space-x-4">
                    {/* Timeline dot */}
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-lg">
                        {encounter.type === 'EMERGENCY' ? '🚨' : 
                         encounter.type === 'SURGERY' ? '🏥' :
                         encounter.type === 'CONSULTATION' ? '👩‍⚕️' :
                         encounter.type === 'CHECKUP' ? '🩺' : '📋'}
                      </span>
                    </div>
                    
                    {/* Encounter details */}
                    <div className="flex-1 bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900 text-lg">{encounter.type}</h4>
                        <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded">
                          {new Date(encounter.occurredAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <h5 className="font-medium text-gray-700 mb-1">Diagnosis & Reason:</h5>
                          <p className="text-gray-600 text-sm">{encounter.reasonDiagnosis}</p>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-gray-700 mb-1">Prescriptions & Notes:</h5>
                          <p className="text-gray-600 text-sm">{encounter.prescriptionsNotes}</p>
                        </div>
                        
                        {/* Medical details grid */}
                        <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-200">
                          {encounter.bloodGroup && (
                            <div>
                              <span className="text-xs font-medium text-gray-500">Blood Group:</span>
                              <p className="text-sm text-red-600 font-medium">{encounter.bloodGroup}</p>
                            </div>
                          )}
                          
                          {encounter.recentSurgery && (
                            <div>
                              <span className="text-xs font-medium text-gray-500">Recent Surgery:</span>
                              <p className="text-sm text-orange-600">{encounter.recentSurgery}</p>
                            </div>
                          )}
                          
                          {encounter.allergiesSnapshot && (
                            <div className="col-span-2">
                              <span className="text-xs font-medium text-gray-500">Allergies at time:</span>
                              <p className="text-sm text-red-600">{encounter.allergiesSnapshot}</p>
                            </div>
                          )}
                          
                          {encounter.chronicSnapshot && (
                            <div className="col-span-2">
                              <span className="text-xs font-medium text-gray-500">Chronic conditions at time:</span>
                              <p className="text-sm text-orange-600">{encounter.chronicSnapshot}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {encounters.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📋</div>
                  <p className="text-gray-500 text-lg">No medical encounters recorded</p>
                  <p className="text-gray-400 text-sm">Patient has no medical history in the system</p>
                </div>
              )}
            </div>
          </div>

          {/* Documents & Quick Info */}
          <div className="space-y-6">
            {/* Quick Medical Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">🩺 Quick Medical Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Blood Group:</span>
                  <span className="text-sm text-red-600 font-medium">
                    {patient?.bloodGroup || 'Not recorded'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Total Encounters:</span>
                  <span className="text-sm text-blue-600 font-medium">{encounters.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Documents:</span>
                  <span className="text-sm text-green-600 font-medium">{documents.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">ID Proof:</span>
                  <span className="text-sm text-gray-700">
                    {patient?.idProofType || 'Not provided'}
                  </span>
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">📄 Medical Documents</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {documents.map((document: any) => (
                  <div key={document.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm truncate">
                        {document.filename}
                      </h4>
                      <button
                        onClick={() => downloadDocument(document.id, document.filename)}
                        className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 flex-shrink-0"
                      >
                        📥 Download
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
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
                    <p className="text-gray-500 text-sm">No documents available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Session Info */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-800 mb-2">🔒 Emergency Access Information</h3>
          <div className="text-sm text-yellow-700 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <strong>Access Reason:</strong> {session?.reason}
            </div>
            <div>
              <strong>Authentication Method:</strong> {session?.method}
            </div>
            <div>
              <strong>Session Started:</strong> {new Date(session?.grantedAt).toLocaleString()}
            </div>
            <div>
              <strong>Session Expires:</strong> {new Date(session?.expiresAt).toLocaleString()}
            </div>
          </div>
          <p className="text-xs text-yellow-600 mt-2">
            This emergency access session is logged and visible to the patient for transparency.
          </p>
        </div>
      </div>
    </div>
  )
}