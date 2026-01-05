'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function SMSConfigPage() {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [testPhone, setTestPhone] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState('')

  useEffect(() => {
    fetchSMSStatus()
  }, [])

  const fetchSMSStatus = async () => {
    try {
      const response = await fetch('/api/sms/status')
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error('Failed to fetch SMS status:', error)
    } finally {
      setLoading(false)
    }
  }

  const testSMS = async () => {
    if (!testPhone) {
      setTestResult('Please enter a phone number')
      return
    }

    setTestLoading(true)
    setTestResult('')

    try {
      const response = await fetch('/api/auth/otp/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: testPhone,
          purpose: 'LOGIN'
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setTestResult(`✅ Test successful! SMS Status: ${data.smsStatus}`)
        if (data.otp) {
          setTestResult(prev => prev + ` | OTP: ${data.otp}`)
        }
      } else {
        setTestResult(`❌ Test failed: ${data.error}`)
      }
    } catch (error) {
      setTestResult('❌ Network error during test')
    } finally {
      setTestLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading SMS configuration...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">SMS Configuration</h1>
          <Link 
            href="/"
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Current Status */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Status</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg ${status?.smsService?.enabled ? 'bg-green-50' : 'bg-yellow-50'}`}>
              <h3 className="font-medium text-gray-900">SMS Service</h3>
              <p className={`text-sm ${status?.smsService?.enabled ? 'text-green-700' : 'text-yellow-700'}`}>
                {status?.smsService?.enabled ? '✅ Enabled (Production)' : '⚠️ Disabled (Development)'}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Mode: {status?.smsService?.mode}
              </p>
            </div>

            <div className={`p-4 rounded-lg ${status?.twilioConfigured ? 'bg-green-50' : 'bg-red-50'}`}>
              <h3 className="font-medium text-gray-900">Twilio Configuration</h3>
              <p className={`text-sm ${status?.twilioConfigured ? 'text-green-700' : 'text-red-700'}`}>
                {status?.twilioConfigured ? '✅ Configured' : '❌ Not Configured'}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Account SID & Auth Token: {status?.twilioConfigured ? 'Set' : 'Missing'}
              </p>
            </div>

            <div className={`p-4 rounded-lg ${status?.phoneNumberConfigured ? 'bg-green-50' : 'bg-red-50'}`}>
              <h3 className="font-medium text-gray-900">Phone Number</h3>
              <p className={`text-sm ${status?.phoneNumberConfigured ? 'text-green-700' : 'text-red-700'}`}>
                {status?.phoneNumberConfigured ? '✅ Configured' : '❌ Not Configured'}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Twilio Phone Number: {status?.phoneNumberConfigured ? 'Set' : 'Missing'}
              </p>
            </div>

            <div className={`p-4 rounded-lg ${status?.smsEnabled ? 'bg-green-50' : 'bg-blue-50'}`}>
              <h3 className="font-medium text-gray-900">SMS Enabled</h3>
              <p className={`text-sm ${status?.smsEnabled ? 'text-green-700' : 'text-blue-700'}`}>
                {status?.smsEnabled ? '✅ Enabled' : 'ℹ️ Disabled'}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Environment: {status?.environment}
              </p>
            </div>
          </div>
        </div>

        {/* Configuration Instructions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Setup Instructions</h2>
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">To enable real SMS OTP:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Sign up for a Twilio account at <a href="https://www.twilio.com" target="_blank" className="text-blue-600 hover:underline">twilio.com</a></li>
              <li>Get your Account SID and Auth Token from the Twilio Console</li>
              <li>Purchase a phone number from Twilio (SMS-enabled)</li>
              <li>Update your <code className="bg-gray-200 px-1 rounded">.env</code> file:</li>
            </ol>
            
            <div className="mt-4 bg-gray-800 text-green-400 p-4 rounded text-sm font-mono">
              <div>TWILIO_ACCOUNT_SID="your_account_sid_here"</div>
              <div>TWILIO_AUTH_TOKEN="your_auth_token_here"</div>
              <div>TWILIO_PHONE_NUMBER="+1234567890"</div>
              <div>SMS_ENABLED="true"</div>
            </div>
            
            <p className="text-xs text-gray-600 mt-2">
              Restart the application after updating the .env file
            </p>
          </div>
        </div>

        {/* Test SMS */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Test SMS</h2>
          <div className="bg-blue-50 p-6 rounded-lg">
            <p className="text-sm text-blue-700 mb-4">
              Test the SMS functionality by generating an OTP for a phone number
            </p>
            
            <div className="flex space-x-4">
              <input
                type="tel"
                placeholder="Enter phone number (e.g., +919876543210)"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={testSMS}
                disabled={testLoading}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {testLoading ? 'Testing...' : 'Test SMS'}
              </button>
            </div>
            
            {testResult && (
              <div className="mt-4 p-3 bg-white rounded border">
                <p className="text-sm">{testResult}</p>
              </div>
            )}
          </div>
        </div>

        {/* Current Environment Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Environment Information</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Environment: <span className="font-mono">{status?.environment}</span></p>
            <p>SMS Service Mode: <span className="font-mono">{status?.smsService?.mode}</span></p>
            <p>Development Mode: {status?.environment === 'development' ? 'Yes (OTP shown in UI)' : 'No'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}