'use client'

import { useState, useEffect } from 'react'

interface DemoCredentials {
  patients: Array<{ name: string; mobile: string; email: string }>
  doctors: Array<{ name: string; mobile: string; email: string }>
  operators: Array<{ name: string; mobile: string; email: string; hospital: string }>
}

export default function DevCredentialsPage() {
  const [credentials, setCredentials] = useState<DemoCredentials | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCredentials()
  }, [])

  const fetchCredentials = async () => {
    try {
      const response = await fetch('/api/dev/credentials')
      if (!response.ok) {
        throw new Error('Failed to fetch credentials')
      }
      const data = await response.json()
      setCredentials(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading demo credentials...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={fetchCredentials}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!credentials) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">No credentials available</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🚀 E-Patient Connect - Demo Credentials
          </h1>
          <p className="text-gray-600">
            Development mode credentials for testing all user roles
          </p>
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              💡 <strong>Development Mode:</strong> OTPs will be displayed in the browser console. 
              Use any of the credentials below to test different user flows.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Patients */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-blue-600 font-semibold">👤</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Patients</h2>
            </div>
            <div className="space-y-4">
              {credentials.patients.map((patient, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">{patient.name}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Mobile:</span>
                      <button
                        onClick={() => copyToClipboard(patient.mobile)}
                        className="text-blue-600 hover:text-blue-800 font-mono"
                        title="Click to copy"
                      >
                        {patient.mobile}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Email:</span>
                      <button
                        onClick={() => copyToClipboard(patient.email)}
                        className="text-blue-600 hover:text-blue-800 font-mono text-xs"
                        title="Click to copy"
                      >
                        {patient.email}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-blue-800 text-xs">
                <strong>Test Features:</strong> Registration, medical timeline, 
                encounter creation, audit logs, biometric setup
              </p>
            </div>
          </div>

          {/* Doctors */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-green-600 font-semibold">👨‍⚕️</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Doctors</h2>
            </div>
            <div className="space-y-4">
              {credentials.doctors.map((doctor, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">{doctor.name}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Mobile:</span>
                      <button
                        onClick={() => copyToClipboard(doctor.mobile)}
                        className="text-green-600 hover:text-green-800 font-mono"
                        title="Click to copy"
                      >
                        {doctor.mobile}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Email:</span>
                      <button
                        onClick={() => copyToClipboard(doctor.email)}
                        className="text-green-600 hover:text-green-800 font-mono text-xs"
                        title="Click to copy"
                      >
                        {doctor.email}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-green-800 text-xs">
                <strong>Test Features:</strong> Emergency access (30-min sessions), 
                patient data viewing, biometric authentication
              </p>
            </div>
          </div>

          {/* Operators */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-purple-600 font-semibold">👨‍💼</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Operators</h2>
            </div>
            <div className="space-y-4">
              {credentials.operators.map((operator, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">{operator.name}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Mobile:</span>
                      <button
                        onClick={() => copyToClipboard(operator.mobile)}
                        className="text-purple-600 hover:text-purple-800 font-mono"
                        title="Click to copy"
                      >
                        {operator.mobile}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Email:</span>
                      <button
                        onClick={() => copyToClipboard(operator.email)}
                        className="text-purple-600 hover:text-purple-800 font-mono text-xs"
                        title="Click to copy"
                      >
                        {operator.email}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Hospital:</span>
                      <span className="text-gray-900 text-xs font-medium">
                        {operator.hospital}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-purple-50 rounded-lg">
              <p className="text-purple-800 text-xs">
                <strong>Test Features:</strong> Document upload, encounter creation, 
                hospital boundaries, patient data management
              </p>
            </div>
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">🚀 Quick Start Guide</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Testing Patient Flow:</h3>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Visit <code className="bg-gray-100 px-1 rounded">/patient/login</code></li>
                <li>Use any patient mobile/email above</li>
                <li>Check console for OTP (development mode)</li>
                <li>Explore dashboard and medical timeline</li>
                <li>Create new encounters and view audit logs</li>
              </ol>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Testing Emergency Access:</h3>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Login as doctor using credentials above</li>
                <li>Visit <code className="bg-gray-100 px-1 rounded">/doctor/emergency</code></li>
                <li>Enter patient mobile (use demo patient)</li>
                <li>Provide emergency reason</li>
                <li>Access patient data for 30 minutes</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 text-center">
          <div className="space-x-4">
            <a
              href="/"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ← Back to Home
            </a>
            <a
              href="/api/health"
              target="_blank"
              className="inline-block px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              API Health Check
            </a>
            <a
              href="/api/status"
              target="_blank"
              className="inline-block px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              System Status
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}