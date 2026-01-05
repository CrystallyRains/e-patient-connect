'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function PatientRegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [generatedOTP, setGeneratedOTP] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    idProofType: 'Aadhaar',
    idProofNumber: '',
    emergencyContact: '',
    familyMemberId: '',
    otp: '',
    fingerprintCaptured: false,
    irisCaptured: false,
    profilePhoto: null as File | null
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.target.type === 'file') {
      const fileInput = e.target as HTMLInputElement
      const file = fileInput.files?.[0] || null
      setFormData({
        ...formData,
        profilePhoto: file
      })
    } else {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value
      })
    }
    setError('')
  }

  const generateOTP = async () => {
    if (!formData.mobile) {
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
          identifier: formData.mobile,
          purpose: 'REGISTRATION'
        }),
      })

      const data = await response.json()

      if (response.ok) {
        let successMessage = data.message
        
        // Add SMS status information
        if (data.smsStatus === 'sent') {
          successMessage += ' 📱 SMS delivered successfully!'
        } else if (data.smsStatus === 'failed') {
          successMessage += ' ⚠️ SMS delivery failed, but OTP is still valid.'
        } else if (!data.smsEnabled) {
          successMessage += ' (Development mode - SMS disabled)'
        }
        
        setSuccess(successMessage)
        
        if (data.otp && data.developmentMode) {
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

  const simulateBiometricCapture = (type: 'fingerprint' | 'iris') => {
    setLoading(true)
    
    // Simulate biometric capture process
    setTimeout(() => {
      if (type === 'fingerprint') {
        setFormData({ ...formData, fingerprintCaptured: true })
        setSuccess('Fingerprint captured successfully!')
      } else {
        setFormData({ ...formData, irisCaptured: true })
        setSuccess('Iris pattern captured successfully!')
      }
      setLoading(false)
    }, 2000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Create FormData for file upload
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      formDataToSend.append('mobile', formData.mobile)
      formDataToSend.append('email', formData.email)
      formDataToSend.append('idProofType', formData.idProofType)
      formDataToSend.append('idProofNumber', formData.idProofNumber)
      formDataToSend.append('emergencyContact', formData.emergencyContact)
      formDataToSend.append('otp', formData.otp)
      
      if (formData.familyMemberId) {
        formDataToSend.append('familyMemberId', formData.familyMemberId)
      }
      
      if (formData.fingerprintCaptured) {
        formDataToSend.append('fingerprintData', 'placeholder_fingerprint_data')
      }
      
      if (formData.irisCaptured) {
        formDataToSend.append('irisData', 'placeholder_iris_data')
      }
      
      if (formData.profilePhoto) {
        formDataToSend.append('profilePhoto', formData.profilePhoto)
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        body: formDataToSend
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Registration successful! Redirecting to login...')
        setTimeout(() => {
          router.push('/patient/login')
        }, 2000)
      } else {
        setError(data.error || 'Registration failed')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Patient Registration</h1>
          <p className="text-gray-700 mt-2">Create your secure medical profile</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              1
            </div>
            <div className={`w-16 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              2
            </div>
            <div className={`w-16 h-1 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
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

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">ID Proof Type</label>
                <select
                  name="idProofType"
                  value={formData.idProofType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="Aadhaar">Aadhaar</option>
                  <option value="PAN">PAN</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">ID Proof Number</label>
                <input
                  type="text"
                  name="idProofNumber"
                  value={formData.idProofNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Emergency Contact</label>
                <input
                  type="tel"
                  name="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Family Member ID (Optional)</label>
                <input
                  type="text"
                  name="familyMemberId"
                  value={formData.familyMemberId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Profile Photo (Optional)</label>
                <input
                  type="file"
                  name="profilePhoto"
                  accept="image/*"
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {formData.profilePhoto && (
                  <div className="mt-2">
                    <img 
                      src={URL.createObjectURL(formData.profilePhoto)}
                      alt="Preview"
                      className="h-20 w-20 object-cover rounded-full border-2 border-gray-300"
                    />
                    <p className="text-xs text-gray-800 mt-1">Preview of selected photo</p>
                  </div>
                )}
                <p className="text-xs text-gray-800 mt-1">Upload a clear photo for easy identification</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStep(2)
                  setSuccess('') // Clear success message
                  setError('') // Clear error message
                }}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Next: Biometric Setup
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Biometric Setup (Optional)</h2>
              
              <div className="bg-blue-50 p-4 rounded-md">
                <p className="text-sm text-blue-700">
                  Set up biometric authentication for secure, password-free access to your medical records.
                </p>
              </div>

              <div className="space-y-4">
                <div className="border border-gray-200 rounded-md p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">👆 Fingerprint</h3>
                      <p className="text-sm text-gray-700">Secure fingerprint authentication</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => simulateBiometricCapture('fingerprint')}
                      disabled={loading || formData.fingerprintCaptured}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        formData.fingerprintCaptured
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {formData.fingerprintCaptured ? 'Captured ✓' : 'Scan Fingerprint'}
                    </button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-md p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">👁️ Iris</h3>
                      <p className="text-sm text-gray-700">Secure iris pattern authentication</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => simulateBiometricCapture('iris')}
                      disabled={loading || formData.irisCaptured}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        formData.irisCaptured
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {formData.irisCaptured ? 'Captured ✓' : 'Scan Iris'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1)
                    setSuccess('') // Clear success message
                    setError('') // Clear error message
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep(3)
                    setSuccess('') // Clear success message
                    setError('') // Clear error message
                  }}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                  Next: Verify OTP
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">OTP Verification</h2>
              
              <div className="bg-yellow-50 p-4 rounded-md">
                <p className="text-sm text-yellow-700">
                  We'll send an OTP to your mobile number for verification.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Mobile Number: {formData.mobile}
                </label>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  required
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setStep(2)
                    setSuccess('') // Clear success message
                    setError('') // Clear error message
                  }}
                  className="flex-1 bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.otp}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Registering...' : 'Complete Registration'}
                </button>
              </div>
            </div>
          )}
        </form>

        <div className="mt-6 text-center">
          <Link href="/patient/login" className="text-blue-600 hover:text-blue-800">
            Already have an account? Login here
          </Link>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-gray-700 hover:text-gray-900">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}