'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AddEncounterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    occurredAt: '',
    type: '',
    reasonDiagnosis: '',
    prescriptionsNotes: '',
    allergies: '',
    chronicConditions: '',
    bloodGroup: '',
    recentSurgery: '',
    documents: [] as File[]
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (e.target.type === 'file') {
      const fileInput = e.target as HTMLInputElement
      const files = Array.from(fileInput.files || [])
      setFormData({
        ...formData,
        documents: files
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

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('occurredAt', formData.occurredAt)
      formDataToSend.append('type', formData.type)
      formDataToSend.append('reasonDiagnosis', formData.reasonDiagnosis)
      formDataToSend.append('prescriptionsNotes', formData.prescriptionsNotes)
      formDataToSend.append('allergies', formData.allergies)
      formDataToSend.append('chronicConditions', formData.chronicConditions)
      formDataToSend.append('bloodGroup', formData.bloodGroup)
      formDataToSend.append('recentSurgery', formData.recentSurgery)

      // Add documents
      formData.documents.forEach((file, index) => {
        formDataToSend.append(`document_${index}`, file)
      })

      const response = await fetch('/api/patient/encounters', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formDataToSend
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Medical encounter added successfully!')
        setTimeout(() => {
          router.push('/patient/dashboard')
        }, 2000)
      } else {
        setError(data.error || 'Failed to add encounter')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Add Medical Encounter</h1>
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
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Date & Time</label>
            <input
              type="datetime-local"
              name="occurredAt"
              value={formData.occurredAt}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Type of Encounter</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              required
            >
              <option value="">Select encounter type</option>
              <option value="Consultation">Consultation</option>
              <option value="Emergency">Emergency</option>
              <option value="Surgery">Surgery</option>
              <option value="Lab Test">Lab Test</option>
              <option value="Imaging">Imaging</option>
              <option value="Vaccination">Vaccination</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Reason / Diagnosis</label>
            <textarea
              name="reasonDiagnosis"
              value={formData.reasonDiagnosis}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="Describe the reason for visit or diagnosis"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Prescriptions / Notes</label>
            <textarea
              name="prescriptionsNotes"
              value={formData.prescriptionsNotes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="Medications prescribed, treatment notes, or recommendations"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Allergies</label>
              <input
                type="text"
                name="allergies"
                value={formData.allergies}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="e.g., Peanuts, Shellfish"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Blood Group</label>
              <select
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="">Select blood group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Chronic Conditions</label>
            <input
              type="text"
              name="chronicConditions"
              value={formData.chronicConditions}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="e.g., Diabetes, Hypertension"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Recent Surgery</label>
            <input
              type="text"
              name="recentSurgery"
              value={formData.recentSurgery}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="Describe any recent surgeries"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Upload Documents</label>
            <input
              type="file"
              name="documents"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="text-xs text-gray-800 mt-1">
              Upload prescriptions, reports, or other medical documents (PDF, Images, Word docs)
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Adding Encounter...' : 'Add Medical Encounter'}
          </button>
        </form>
      </div>
    </div>
  )
}