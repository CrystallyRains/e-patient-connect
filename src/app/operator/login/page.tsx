'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function OperatorLoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [generatedOTP, setGeneratedOTP] = useState('')
  const [authMethod, setAuthMethod] = useState<'OTP' | 'BIOMETRIC'>('OTP')
  const [biometricType, setBiometricType] = useState<'FINGERPRINT' | 'IRIS'>('FINGERPRINT')

  const [formData, setFormData] = useState({
    identifier: '',
    otp: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const generateOTP = async () => {
    if (!formData.identifier) {
      setError('Please enter your mobile number or email first')
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
          identifier: formData.identifier,
          purpose: 'LOGIN'
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

  const handleBiometricLogin = async (type: 'FINGERPRINT' | 'IRIS') => {
    if (!formData.identifier) {
      setError('Please enter your mobile number or email first')
      return
    }

    setLoading(true)
    setError('')
    setSuccess(`Scanning ${type.toLowerCase()}...`)

    // Simulate biometric scanning
    setTimeout(async () => {
      try {
        const response = await fetch('/api/auth/biometric/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            identifier: formData.identifier,
            biometricType: type,
            biometricData: 'placeholder_biometric_data'
          }),
        })

        const data = await response.json()

        if (response.ok) {
          setSuccess('Login successful! Redirecting...')
          localStorage.setItem('authToken', data.token)
          setTimeout(() => {
            router.push('/operator/upload')
          }, 1000)
        } else {
          setError(data.error || 'Biometric authentication failed')
        }
      } catch (error) {
        setError('Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    }, 2000)
  }

  const handleOTPLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: formData.identifier,
          method: 'OTP',
          otp: formData.otp
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Login successful! Redirecting...')
        localStorage.setItem('authToken', data.token)
        setTimeout(() => {
          router.push('/operator/upload')
        }, 1000)
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-green-50 py-12">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">👨‍💼</div>
          <h1 className="text-3xl font-bold text-green-900">Operator Login</h1>
          <p className="text-green-700 mt-2">Access hospital document upload portal</p>
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

        {/* Authentication Method Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Choose Authentication Method</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAuthMethod('OTP')}
              className={`p-3 rounded-lg border-2 text-center ${
                authMethod === 'OTP'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-1">📱</div>
              <div className="text-sm font-medium">OTP</div>
            </button>
            <button
              type="button"
              onClick={() => setAuthMethod('BIOMETRIC')}
              className={`p-3 rounded-lg border-2 text-center ${
                authMethod === 'BIOMETRIC'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-1">👆</div>
              <div className="text-sm font-medium">Biometric</div>
            </button>
          </div>
        </div>

        {/* User Identifier Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mobile Number or Email
          </label>
          <input
            type="text"
            name="identifier"
            value={formData.identifier}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Enter mobile number or email"
            required
          />
        </div>

        {/* OTP Authentication */}
        {authMethod === 'OTP' && (
          <form onSubmit={handleOTPLogin} className="space-y-4">
            <div>
              <button
                type="button"
                onClick={generateOTP}
                disabled={loading || !formData.identifier}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate OTP'}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
              <input
                type="text"
                name="otp"
                value={formData.otp}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !formData.otp}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login with OTP'}
            </button>
          </form>
        )}

        {/* Biometric Authentication */}
        {authMethod === 'BIOMETRIC' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Select Biometric Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBiometricType('FINGERPRINT')}
                  className={`p-4 rounded-lg border-2 text-center ${
                    biometricType === 'FINGERPRINT'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="text-3xl mb-2">👆</div>
                  <div className="text-sm font-medium">Fingerprint</div>
                </button>
                <button
                  type="button"
                  onClick={() => setBiometricType('IRIS')}
                  className={`p-4 rounded-lg border-2 text-center ${
                    biometricType === 'IRIS'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="text-3xl mb-2">👁️</div>
                  <div className="text-sm font-medium">Iris</div>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleBiometricLogin(biometricType)}
              disabled={loading || !formData.identifier}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? `Scanning ${biometricType.toLowerCase()}...` : `Login with ${biometricType.toLowerCase()}`}
            </button>
          </div>
        )}

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 className="font-medium text-blue-800 mb-2">Demo Operator Credentials</h3>
          <div className="text-sm text-blue-700">
            <p><strong>Mobile:</strong> +1234567893</p>
            <p><strong>Email:</strong> mike.operator@example.com</p>
            <p><strong>Hospital:</strong> City General Hospital</p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-gray-700 hover:text-gray-900">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}