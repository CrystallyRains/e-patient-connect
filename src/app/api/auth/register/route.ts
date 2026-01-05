import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/lib/services/user-service'
import { OTPService } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const name = formData.get('name') as string
    const mobile = formData.get('mobile') as string
    const email = formData.get('email') as string
    const idProofType = formData.get('idProofType') as string
    const idProofNumber = formData.get('idProofNumber') as string
    const emergencyContact = formData.get('emergencyContact') as string
    const familyMemberId = formData.get('familyMemberId') as string
    const otp = formData.get('otp') as string
    const fingerprintData = formData.get('fingerprintData') as string
    const irisData = formData.get('irisData') as string
    const profilePhoto = formData.get('profilePhoto') as File

    // Validate required fields
    if (!name || !mobile || !email || !idProofType || !idProofNumber || !emergencyContact || !otp) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      )
    }

    // Verify OTP first
    const otpResult = await OTPService.verifyOTP(mobile, otp, 'REGISTRATION')

    if (!otpResult.success) {
      return NextResponse.json(
        { error: otpResult.message },
        { status: 400 }
      )
    }

    // Handle profile photo upload
    let profilePhotoPath = null
    if (profilePhoto && profilePhoto.size > 0) {
      try {
        const bytes = await profilePhoto.arrayBuffer()
        const buffer = Buffer.from(bytes)
        
        // Ensure uploads directory exists
        const uploadsDir = join(process.cwd(), 'uploads', 'profiles')
        await mkdir(uploadsDir, { recursive: true })
        
        // Generate unique filename
        const fileExtension = profilePhoto.name.split('.').pop() || 'jpg'
        const fileName = `${uuidv4()}.${fileExtension}`
        const filePath = join(uploadsDir, fileName)
        
        await writeFile(filePath, buffer)
        profilePhotoPath = `/uploads/profiles/${fileName}`
      } catch (fileError) {
        console.error('File upload error during registration:', fileError)
        // Don't fail registration for photo upload issues
        console.warn('Profile photo upload failed, continuing with registration')
      }
    }

    // Create patient
    const patientResult = await UserService.createPatient({
      name,
      mobile,
      email,
      idProofType,
      idProofNumber,
      emergencyContact,
      familyMemberId: familyMemberId || undefined,
      profilePhotoPath
    })

    if (!patientResult.success) {
      return NextResponse.json(
        { error: patientResult.message },
        { status: 400 }
      )
    }

    // Register biometrics if provided
    if (fingerprintData || irisData) {
      const biometricResult = await UserService.registerBiometrics(
        patientResult.userId!,
        fingerprintData,
        irisData
      )

      if (!biometricResult.success) {
        // Log warning but don't fail registration
        console.warn('Biometric registration failed:', biometricResult.message)
      }
    }

    return NextResponse.json({
      message: 'Patient registered successfully',
      userId: patientResult.userId
    })

  } catch (error) {
    console.error('Patient registration API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}