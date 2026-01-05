'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface PatientInfo {
  id: string
  name: string
  mobile: string
  email: string
}

export default function OperatorUploadPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true) // Add page loading state
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null)
  const [files, setFiles] = useState<FileList | null>(null)
  const [encounterData, setEncounterData] = useState({
    type: 'PRESCRIPTION',
    reason_diagnosis: '',
    prescriptions_notes: '',
    allergies_snapshot: '',
    chronic_snapshot: '',
    blood_group: '',
    recent_surgery: ''
  })

  useEffect(() => {
    console.log('🔍 Operator upload page loaded')
    
    // Check localStorage immediately and then again after a short delay
    const checkPatientInfo = () => {
      const patientData = localStorage.getItem('operatorPatientInfo')
      const authToken = localStorage.getItem('authToken')
      
      console.log('📋 Patient data from localStorage:', patientData)
      console.log('🔑 Auth token from localStorage:', authToken ? 'Present' : 'Missing')
      
      if (patientData && authToken) {
        try {
          const parsedData = JSON.parse(patientData)
          console.log('✅ Patient info found:', parsedData)
          setPatientInfo(parsedData)
          setPageLoading(false)
        } catch (error) {
          console.error('❌ Error parsing patient data:', error)
          setPageLoading(false)
        }
      } else {
        console.log('❌ No patient info or auth token found')
        setPageLoading(false)
        // Don't redirect automatically - let user see the page
      }
    }
    
    // Check immediately
    checkPatientInfo()
    
    // Check again after a short delay in case localStorage is still being set
    setTimeout(checkPatientInfo, 200)
  }, [router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setEncounterData({
      ...encounterData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!patientInfo) {
      setError('Patient information not found. Please login again.')
      return
    }

    if (!encounterData.reason_diagnosis.trim()) {
      setError('Please provide a reason/diagnosis')
      return
    }

    if (!files || files.length === 0) {
      setError('Please select at least one file to upload')
      return
    }

    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      
      // Add encounter data
      formData.append('patient_user_id', patientInfo.id)
      formData.append('type', encounterData.type)
      formData.append('reason_diagnosis', encounterData.reason_diagnosis)
      formData.append('prescriptions_notes', encounterData.prescriptions_notes)
      formData.append('allergies_snapshot', encounterData.allergies_snapshot)
      formData.append('chronic_snapshot', encounterData.chronic_snapshot)
      formData.append('blood_group', encounterData.blood_group)
      formData.append('recent_surgery', encounterData.recent_surgery)
      
      // Add files
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i])
      }

      const token = localStorage.getItem('authToken')
      console.log('🎫 Using token for upload:', token ? token.substring(0, 50) + '...' : 'Missing')
      
      const response = await fetch('/api/operator/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()
      console.log('📤 Upload response:', response.status, data)

      if (response.ok) {
        setSuccess(`Successfully uploaded ${files.length} document(s) for ${patientInfo.name}`)
        // Reset form
        setEncounterData({
          type: 'PRESCRIPTION',
          reason_diagnosis: '',
          prescriptions_notes: '',
          allergies_snapshot: '',
          chronic_snapshot: '',
          blood_group: '',
          recent_surgery: ''
        })
        setFiles(null)
        // Reset file input
        const fileInput = document.getElementById('files') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        setError(data.error || 'Failed to upload documents')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('operatorPatientInfo')
    router.push('/operator/login')
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-800">Loading operator portal...</p>
        </div>
      </div>
    )
  }

  if (!patientInfo) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md">
          <div className="text-4xl mb-4">🔐</div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-800 mb-6">Please login as an operator to access the document upload portal.</p>
          
          {/* Debug info */}
          <div className="mb-4 p-3 bg-gray-100 rounded text-left text-sm">
            <p><strong>Debug Info:</strong></p>
            <p>Patient Data: {localStorage.getItem('operatorPatientInfo') ? 'Found' : 'Missing'}</p>
            <p>Auth Token: {localStorage.getItem('authToken') ? 'Found' : 'Missing'}</p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => {
                // Try to check localStorage one more time with multiple attempts
                let attempts = 0
                const maxAttempts = 3
                
                const checkAuth = () => {
                  attempts++
                  const patientData = localStorage.getItem('operatorPatientInfo')
                  const authToken = localStorage.getItem('authToken')
                  console.log(`🔄 Manual check attempt ${attempts} - Patient data:`, patientData ? 'Found' : 'Missing')
                  console.log(`🔄 Manual check attempt ${attempts} - Auth token:`, authToken ? 'Present' : 'Missing')
                  
                  if (patientData && authToken) {
                    try {
                      const parsedData = JSON.parse(patientData)
                      setPatientInfo(parsedData)
                      return true
                    } catch (error) {
                      console.error('❌ Error parsing patient data:', error)
                    }
                  }
                  
                  if (attempts < maxAttempts) {
                    setTimeout(checkAuth, 500)
                  } else {
                    console.log('❌ Max attempts reached, redirecting to login')
                    router.push('/operator/login')
                  }
                  return false
                }
                
                checkAuth()
              }}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
            >
              Check Authentication (Retry)
            </button>
            
            <button
              onClick={() => {
                // Set test data for debugging with a proper JWT token
                const testPatientInfo = {
                  id: "865140A4B21048AD71C5BE2CB8D4B4FD",
                  name: "Snigdha",
                  mobile: "1234567890",
                  email: "snigdhachaudhari@gmail.com"
                }
                
                // Create a proper JWT token for testing (this matches the format from the login API)
                const testToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJvcGVyYXRvci1zZXNzaW9uIiwicGF0aWVudElkIjoiODY1MTQwQTRCMjEwNDhBRDcxQzVCRTJDQjhENEI0RkQiLCJyb2xlIjoiT1BFUkFUT1IiLCJwdXJwb3NlIjoiRE9DVU1FTlRfVVBMT0FEIiwiaWF0IjoxNzY3NjEwNjY4LCJleHAiOjE3Njc2Mzk0Njh9.OOlY9PHaOrdzz4MGfnY3AYlBLapLX9XOdMned16YRwY"
                
                localStorage.setItem('operatorPatientInfo', JSON.stringify(testPatientInfo))
                localStorage.setItem('authToken', testToken)
                
                console.log('🧪 Test data set with real token:', testPatientInfo)
                setPatientInfo(testPatientInfo)
              }}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              🧪 Set Test Data (with Real Token)
            </button>
            
            <button
              onClick={() => router.push('/operator/login')}
              className="w-full border border-green-600 text-green-600 py-2 px-4 rounded-md hover:bg-green-50"
            >
              Go to Login Page
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-green-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-green-900 mb-2">Document Upload Portal</h1>
              <p className="text-gray-800">Upload medical documents for patient</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Patient Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Patient Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Name</label>
              <p className="text-gray-900 font-medium">{patientInfo.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Mobile</label>
              <p className="text-gray-900 font-medium">{patientInfo.mobile}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Email</label>
              <p className="text-gray-900 font-medium">{patientInfo.email}</p>
            </div>
          </div>
        </div>

        {/* Upload Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Upload Medical Documents</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Document Type */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">Document Type</label>
              <select
                name="type"
                value={encounterData.type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                required
              >
                <option value="PRESCRIPTION">Prescription</option>
                <option value="LAB_REPORT">Lab Report</option>
                <option value="IMAGING">Medical Imaging</option>
                <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
                <option value="CONSULTATION">Consultation Notes</option>
                <option value="OTHER">Other Medical Document</option>
              </select>
            </div>

            {/* Reason/Diagnosis */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Reason/Diagnosis *
              </label>
              <textarea
                name="reason_diagnosis"
                value={encounterData.reason_diagnosis}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                rows={3}
                placeholder="Enter the medical reason or diagnosis for this document"
                required
              />
            </div>

            {/* Prescriptions/Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Prescriptions/Notes
              </label>
              <textarea
                name="prescriptions_notes"
                value={encounterData.prescriptions_notes}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                rows={3}
                placeholder="Enter any prescriptions or additional notes"
              />
            </div>

            {/* Additional Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">Allergies</label>
                <input
                  type="text"
                  name="allergies_snapshot"
                  value={encounterData.allergies_snapshot}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                  placeholder="Any known allergies"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">Chronic Conditions</label>
                <input
                  type="text"
                  name="chronic_snapshot"
                  value={encounterData.chronic_snapshot}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                  placeholder="Any chronic conditions"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">Blood Group</label>
                <input
                  type="text"
                  name="blood_group"
                  value={encounterData.blood_group}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                  placeholder="e.g., A+, B-, O+"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">Recent Surgery</label>
                <input
                  type="text"
                  name="recent_surgery"
                  value={encounterData.recent_surgery}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                  placeholder="Any recent surgeries"
                />
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Select Documents *
              </label>
              <input
                type="file"
                id="files"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                required
              />
              <p className="text-sm text-gray-700 mt-1">
                Supported formats: PDF, JPG, PNG, DOC, DOCX. You can select multiple files.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Link
                href="/operator/login"
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-800 hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Uploading...' : 'Upload Documents'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}