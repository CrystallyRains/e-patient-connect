'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function DoctorEmergencyPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [generatedOTP, setGeneratedOTP] = useState('')

  const [formData, setFormData] = useState({
    doctorMobile: '',
    patientIdentifier: '',
    reason: '',
    hospitalName: '',
    authMethod: 'OTP' as 'OTP' | 'FINGERPRINT' | 'IRIS',
    otp: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const generateOTP = async () => {
    if (!formData.doctorMobile) {
      setError('Please enter your mobile number first')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/otp/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: formData.doctorMobile,
          purpose: 'EMERGENCY_ACCESS'
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('OTP sent successfully!')
        if (data.otp) {
          setGeneratedOTP(data.otp) // Show OTP in development mode
        }
      } else {
        setError(data.error || 'Failed to generate OTP')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBiometricAuth = async (type: 'FINGERPRINT' | 'IRIS') => {
    setLoading(true)
    setError('')
    setSuccess(`Scanning ${type.toLowerCase()}...`)

    // Simulate biometric scanning
    setTimeout(async () => {
      setSuccess(`${type.toLowerCase()} verified successfully! Requesting emergency access...`)
      
      // Directly request emergency access after biometric verification
      try {
        const emergencyResponse = await fetch('/api/emergency/biometric-access', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            doctorMobile: formData.doctorMobile,
            patientIdentifier: formData.patientIdentifier,
            reason: formData.reason,
            hospitalName: formData.hospitalName,
            biometricType: type,
            biometricData: `${type.toLowerCase()}_verified_${Date.now()}`
          }),
        })

        const emergencyData = await emergencyResponse.json()

        if (emergencyResponse.ok) {
          setSuccess('Emergency access granted! Redirecting to patient records...')
          localStorage.setItem('emergencyToken', emergencyData.sessionToken)
          setTimeout(() => {
            // Redirect to doctor session page for read-only access
            window.location.href = `/doctor/session/${emergencyData.sessionId}`
          }, 1500)
        } else {
          setError(emergencyData.error || 'Emergency access request failed')
          setStep(3) // Go to confirmation step for manual retry
        }
      } catch (error) {
        setError('Network error. Please try again.')
        setStep(3)
      } finally {
        setLoading(false)
      }
    }, 2000)
  }

  const requestEmergencyAccess = async () => {
    setLoading(true)
    setError('')

    try {
      // For OTP authentication, use the biometric-access API which handles auth + emergency access in one step
      if (formData.authMethod === 'OTP') {
        const emergencyResponse = await fetch('/api/emergency/biometric-access', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            doctorMobile: formData.doctorMobile,
            patientIdentifier: formData.patientIdentifier,
            reason: formData.reason,
            hospitalName: formData.hospitalName,
            biometricType: 'OTP',
            biometricData: formData.otp
          }),
        })

        const emergencyData = await emergencyResponse.json()

        if (emergencyResponse.ok) {
          setSuccess('Emergency access granted! Redirecting to patient records...')
          localStorage.setItem('emergencyToken', emergencyData.sessionToken)
          setTimeout(() => {
            // Redirect to doctor session page for read-only access
            window.location.href = `/doctor/session/${emergencyData.sessionId}`
          }, 1500)
        } else {
          setError(emergencyData.error || 'Emergency access request failed')
        }
      } else {
        // For biometric authentication, use the existing flow
        const emergencyResponse = await fetch('/api/emergency/biometric-access', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            doctorMobile: formData.doctorMobile,
            patientIdentifier: formData.patientIdentifier,
            reason: formData.reason,
            hospitalName: formData.hospitalName,
            biometricType: formData.authMethod,
            biometricData: 'placeholder_biometric_data'
          }),
        })

        const emergencyData = await emergencyResponse.json()

        if (emergencyResponse.ok) {
          setSuccess('Emergency access granted! Redirecting to patient records...')
          localStorage.setItem('emergencyToken', emergencyData.sessionToken)
          setTimeout(() => {
            // Redirect to doctor session page for read-only access
            window.location.href = `/doctor/session/${emergencyData.sessionId}`
          }, 1500)
        } else {
          setError(emergencyData.error || 'Emergency access request failed')
        }
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-red-50 py-12">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🚨</div>
          <h1 className="text-3xl font-bold text-red-900">Emergency Access</h1>
          <p className="text-red-700 mt-2">Request time-bound access to patient records</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 1 ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-800'
            }`}>
              1
            </div>
            <div className={`w-16 h-1 ${step >= 2 ? 'bg-red-600' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 2 ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-800'
            }`}>
              2
            </div>
            <div className={`w-16 h-1 ${step >= 3 ? 'bg-red-600' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 3 ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-800'
            }`}>
              3
            </div>
          </div>
        </div>

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

        {generatedOTP && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
            <strong>Development Mode - Your OTP: {generatedOTP}</strong>
          </div>
        )}

        {/* Step 1: Patient Information */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Patient Information</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Your Mobile Number (Doctor)
              </label>
              <input
                type="tel"
                name="doctorMobile"
                value={formData.doctorMobile}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                placeholder="Enter your mobile number"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Patient Identifier (Optional for Biometric Scan)
              </label>
              <input
                type="text"
                name="patientIdentifier"
                value={formData.patientIdentifier}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                placeholder="Patient mobile, email, or ID (optional)"
              />
              <p className="text-sm text-gray-800 mt-1">
                <strong>Optional:</strong> Leave empty if patient is unconscious or unable to provide ID. 
                Biometric scanning will identify the patient automatically.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Reason for Emergency Access
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                placeholder="Describe the medical emergency and why you need access to patient records"
                required
              />
              <p className="text-sm text-gray-800 mt-1">
                Minimum 10 characters required. Be specific about the emergency.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Hospital Name (Optional)
              </label>
              <input
                type="text"
                name="hospitalName"
                value={formData.hospitalName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                placeholder="Enter hospital name"
              />
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!formData.doctorMobile || !formData.reason || formData.reason.length < 10}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next: Authentication
            </button>
          </div>
        )}

        {/* Step 2: Authentication Method */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Doctor Authentication</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-3">
                Choose Authentication Method
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, authMethod: 'OTP' })}
                  className={`p-4 rounded-lg border-2 text-center ${
                    formData.authMethod === 'OTP'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 text-gray-800 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">📱</div>
                  <div className="text-sm font-medium">OTP</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, authMethod: 'FINGERPRINT' })}
                  className={`p-4 rounded-lg border-2 text-center ${
                    formData.authMethod === 'FINGERPRINT'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 text-gray-800 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">👆</div>
                  <div className="text-sm font-medium">Fingerprint</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, authMethod: 'IRIS' })}
                  className={`p-4 rounded-lg border-2 text-center ${
                    formData.authMethod === 'IRIS'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 text-gray-800 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">👁️</div>
                  <div className="text-sm font-medium">Iris</div>
                </button>
              </div>
            </div>

            {formData.authMethod === 'OTP' && (
              <div className="space-y-4">
                <div>
                  <button
                    type="button"
                    onClick={generateOTP}
                    disabled={loading}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Generating...' : 'Generate OTP'}
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Enter OTP</label>
                  <input
                    type="text"
                    name="otp"
                    value={formData.otp}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!formData.otp}
                  className="w-full bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  Next: Request Access
                </button>
              </div>
            )}

            {formData.authMethod !== 'OTP' && (
              <div>
                <button
                  type="button"
                  onClick={() => handleBiometricAuth(formData.authMethod as 'FINGERPRINT' | 'IRIS')}
                  disabled={loading}
                  className="w-full bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? `Scanning ${formData.authMethod.toLowerCase()}...` : `Scan ${formData.authMethod.toLowerCase()}`}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400"
            >
              Back
            </button>
          </div>
        )}

        {/* Step 3: Request Confirmation */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Confirm Emergency Access Request</h2>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h3 className="font-medium text-yellow-800 mb-2">⚠️ Important Notice</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Emergency access will be granted for 30 minutes</li>
                <li>• All access will be logged and visible to the patient</li>
                <li>• You will have read-only access to patient records</li>
                <li>• Session will automatically expire after 30 minutes</li>
                <li>• Biometric authentication provides instant access</li>
              </ul>
            </div>

            <div className="bg-gray-50 rounded-md p-4">
              <h3 className="font-medium text-gray-900 mb-3">Request Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="text-gray-900"><strong>Doctor:</strong> {formData.doctorMobile}</div>
                <div className="text-gray-900"><strong>Patient:</strong> {formData.patientIdentifier}</div>
                <div className="text-gray-900"><strong>Hospital:</strong> {formData.hospitalName || 'Not specified'}</div>
                <div className="text-gray-900"><strong>Authentication:</strong> {formData.authMethod}</div>
                <div className="text-gray-900"><strong>Reason:</strong> {formData.reason}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={requestEmergencyAccess}
              disabled={loading}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Requesting Access...' : 'Request Emergency Access'}
            </button>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400"
            >
              Back
            </button>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="text-gray-700 hover:text-gray-900">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}