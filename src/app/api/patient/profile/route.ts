import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/lib/services/user-service'
import jwt from 'jsonwebtoken'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Verify JWT token
    let decoded: any
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Get user profile
    const result = await UserService.getUserProfile(decoded.userId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Profile retrieved successfully',
      user: result.user
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
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Verify JWT token
    let decoded: any
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const emergencyContact = formData.get('emergencyContact') as string
    const profilePhoto = formData.get('profilePhoto') as File

    // Handle profile photo upload
    let profilePhotoPath = null
    if (profilePhoto && profilePhoto.size > 0) {
      const bytes = await profilePhoto.arrayBuffer()
      const buffer = Buffer.from(bytes)
      
      // Generate unique filename
      const fileExtension = profilePhoto.name.split('.').pop()
      const fileName = `${uuidv4()}.${fileExtension}`
      const filePath = join(process.cwd(), 'uploads', 'profiles', fileName)
      
      await writeFile(filePath, buffer)
      profilePhotoPath = `/uploads/profiles/${fileName}`
    }

    // Update profile
    const updateData: any = {}
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (emergencyContact) updateData.emergencyContact = emergencyContact

    const result = await UserService.updatePatientProfile(decoded.userId, updateData)

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }

    // TODO: Update profile photo path in database if uploaded

    return NextResponse.json({
      message: 'Profile updated successfully'
    })

  } catch (error) {
    console.error('Update profile API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}