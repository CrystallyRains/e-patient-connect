import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { DocumentService } from '@/lib/services/document-service'
import { RBACService } from '@/lib/services/rbac-service'

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request, ['OPERATOR'])

    if (!authResult.success) {
      return authResult.response!
    }

    const user = authResult.user!

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const encounterId = formData.get('encounterId') as string
    const patientUserId = formData.get('patientUserId') as string
    const hospitalId = formData.get('hospitalId') as string

    // Validate required fields
    if (!file || !encounterId || !patientUserId || !hospitalId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, encounterId, patientUserId, hospitalId' },
        { status: 400 }
      )
    }

    // Verify operator can upload for this hospital
    const canUpload = await RBACService.canOperatorUploadForHospital(user.userId, hospitalId)
    if (!canUpload) {
      return NextResponse.json(
        { error: 'You can only upload documents for your assigned hospital' },
        { status: 403 }
      )
    }

    // Validate file
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const validation = DocumentService.validateFileUpload(file.name, file.type, fileBuffer.length)

    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'File validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    // Upload document
    const uploadResult = await DocumentService.uploadDocument({
      encounterId,
      patientUserId,
      uploadedByUserId: user.userId,
      hospitalId,
      filename: file.name,
      mimetype: file.type,
      buffer: fileBuffer
    })

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: uploadResult.message,
      documentId: uploadResult.documentId
    })

  } catch (error) {
    console.error('Document upload API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}