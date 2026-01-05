import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { UserService } from '@/lib/services/user-service'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)

    if (!authResult.success) {
      return authResult.response!
    }

    const user = authResult.user!

    // Get user profile
    const profileResult = await UserService.getUserProfile(user.userId)

    if (!profileResult.success) {
      return NextResponse.json(
        { error: profileResult.message },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Profile retrieved successfully',
      user: profileResult.user
    })

  } catch (error) {
    console.error('Get profile API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request, ['PATIENT'])

    if (!authResult.success) {
      return authResult.response!
    }

    const user = authResult.user!
    
    // Handle FormData for file uploads
    const formData = await request.formData()
    
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const emergencyContact = formData.get('emergencyContact') as string
    const profilePhoto = formData.get('profilePhoto') as File

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
        console.error('File upload error:', fileError)
        return NextResponse.json(
          { error: 'Failed to upload profile photo' },
          { status: 400 }
        )
      }
    }

    // Update patient profile
    const updateResult = await UserService.updatePatientProfile(user.userId, {
      name,
      email,
      emergencyContact,
      profilePhotoPath: profilePhotoPath || undefined
    })

    if (!updateResult.success) {
      return NextResponse.json(
        { error: updateResult.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: updateResult.message
    })

  } catch (error) {
    console.error('Update profile API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request, ['PATIENT'])

    if (!authResult.success) {
      return authResult.response!
    }

    const user = authResult.user!

    // Soft delete patient account
    const deleteResult = await UserService.softDeletePatient(user.userId)

    if (!deleteResult.success) {
      return NextResponse.json(
        { error: deleteResult.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: deleteResult.message
    })

  } catch (error) {
    console.error('Delete profile API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}