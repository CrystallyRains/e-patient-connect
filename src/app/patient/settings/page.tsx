'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function PatientSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [user, setUser] = useState<any>(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    emergencyContact: '',
    profilePhoto: null as File | null
  })

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setFormData({
          name: data.user.name || '',
          email: data.user.email || '',
          emergencyContact: data.user.profile?.emergencyContact || '',
          profilePhoto: null
        })
      } else {
        router.push('/patient/login')
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      router.push('/patient/login')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.type === 'file') {
      const file = e.target.files?.[0] || null
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      formDataToSend.append('email', formData.email)
      formDataToSend.append('emergencyContact', formData.emergencyContact)
      
      if (formData.profilePhoto) {
        formDataToSend.append('profilePhoto', formData.profilePhoto)
        console.log('Uploading photo:', formData.profilePhoto.name, formData.profilePhoto.size)
      }

      console.log('Sending update request...')
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formDataToSend
      })

      const data = await response.json()
      console.log('Update response:', response.status, data)

      if (response.ok) {
        setSuccess('Profile updated successfully!')
        // Clear the file input
        setFormData(prev => ({ ...prev, profilePhoto: null }))
        // Refresh profile data
        setTimeout(() => {
          fetchUserProfile()
        }, 500)
      } else {
        setError(data.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Update error:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    router.push('/patient/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <Link 
            href="/patient/dashboard"
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Dashboard
          </Link>
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center space-x-6">
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
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Update Profile Photo
              </label>
              <input
                type="file"
                name="profilePhoto"
                accept="image/*"
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                key={user?.profile?.profilePhotoPath || 'no-photo'} // Reset input when photo changes
              />
              {formData.profilePhoto && (
                <div className="mt-2">
                  <img 
                    src={URL.createObjectURL(formData.profilePhoto)}
                    alt="Preview"
                    className="h-16 w-16 object-cover rounded-full border-2 border-blue-300"
                  />
                  <p className="text-xs text-gray-600 mt-1">New photo preview</p>
                </div>
              )}
            </div>
          </div>

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

          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="font-medium text-gray-900 mb-2">Account Information</h3>
            <p className="text-sm text-gray-700">Mobile: {user?.mobile}</p>
            <p className="text-sm text-gray-700">ID Proof: {user?.profile?.idProofType} - {user?.profile?.idProofNumber}</p>
            <p className="text-sm text-gray-700">Member since: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}