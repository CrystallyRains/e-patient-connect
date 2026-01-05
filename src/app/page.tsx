import Link from 'next/link'

export default function HomePage() {
  // Updated: 2026 and 30 minutes
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            E-Patient Connect
          </h1>
          <p className="text-xl text-gray-800 max-w-2xl mx-auto">
            Your medical history, secure and portable. Emergency access for healthcare providers when you need it most.
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {/* Patient Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow">
            <div className="text-6xl mb-4">🏥</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Patient</h2>
            <p className="text-gray-800 mb-6">
              Manage your medical timeline, view your complete health history, and control who has access to your data.
            </p>
            <div className="space-y-3">
              <Link
                href="/patient/register"
                className="block w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Register
              </Link>
              <Link
                href="/patient/login"
                className="block w-full border-2 border-blue-600 text-blue-600 py-3 px-6 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Login
              </Link>
            </div>
          </div>

          {/* Doctor Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow">
            <div className="text-6xl mb-4">👨‍⚕️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Doctor</h2>
            <p className="text-gray-800 mb-6">
              Request emergency access to patient records with secure authentication and time-bound sessions.
            </p>
            <div className="space-y-3">
              <Link
                href="/doctor/emergency"
                className="block w-full bg-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Emergency Access
              </Link>
            </div>
          </div>

          {/* Operator Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow">
            <div className="text-6xl mb-4">👨‍💼</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Hospital Operator</h2>
            <p className="text-gray-800 mb-6">
              Upload medical documents, manage patient encounters, and maintain hospital records.
            </p>
            <div className="space-y-3">
              <Link
                href="/operator/login"
                className="block w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Upload Portal
              </Link>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Secure Healthcare Data Management
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">🔐</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure Authentication</h3>
              <p className="text-gray-800">OTP and biometric authentication. No passwords anywhere.</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">⏰</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Time-Bound Access</h3>
              <p className="text-gray-800">Emergency access expires automatically after 30 minutes for security.</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Complete Timeline</h3>
              <p className="text-gray-800">Your complete medical history from birth to present.</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">👀</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Full Transparency</h3>
              <p className="text-gray-800">See exactly who accessed your data and when.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20 text-center text-gray-700">
          <p>&copy; 2026 E-Patient Connect. Secure healthcare data management system.</p>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 space-x-4">
              <Link
                href="/dev-credentials"
                className="inline-block px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium"
              >
                🚀 View Demo Credentials
              </Link>
              <Link
                href="/admin/sms-config"
                className="inline-block px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
              >
                📱 SMS Configuration
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}