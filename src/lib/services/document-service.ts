import { database } from '../database'
import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

export interface UploadDocumentData {
  encounterId: string
  patientUserId: string
  uploadedByUserId: string
  hospitalId: string
  filename: string
  mimetype: string
  buffer: Buffer
}

export interface DocumentResult {
  success: boolean
  message: string
  documentId?: string
  document?: any
  documents?: any[]
}

export interface DocumentFilters {
  patientUserId?: string
  encounterId?: string
  hospitalId?: string
  mimetype?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export const ALLOWED_MIMETYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg', 
  'image/png'
] as const

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export class DocumentService {
  private static readonly UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'

  /**
   * Upload a document and save metadata
   */
  static async uploadDocument(uploadData: UploadDocumentData): Promise<DocumentResult> {
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      // Validate file type
      if (!ALLOWED_MIMETYPES.includes(uploadData.mimetype as any)) {
        return {
          success: false,
          message: `Invalid file type. Allowed types: ${ALLOWED_MIMETYPES.join(', ')}`
        }
      }

      // Validate file size
      if (uploadData.buffer.length > MAX_FILE_SIZE) {
        return {
          success: false,
          message: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`
        }
      }

      // Verify encounter exists and user has permission
      const [encounters] = await connection.execute(
        'SELECT patient_user_id, hospital_id FROM encounters WHERE id = ?',
        [uploadData.encounterId]
      ) as any

      if (!encounters || encounters.length === 0) {
        return {
          success: false,
          message: 'Encounter not found'
        }
      }

      const encounter = encounters[0]

      // Verify patient matches
      if (encounter.patient_user_id !== uploadData.patientUserId) {
        return {
          success: false,
          message: 'Patient ID does not match encounter'
        }
      }

      // Verify hospital matches (for operators)
      if (uploadData.hospitalId && encounter.hospital_id !== uploadData.hospitalId) {
        return {
          success: false,
          message: 'Hospital ID does not match encounter'
        }
      }

      // Generate unique filename
      const fileExtension = path.extname(uploadData.filename)
      const uniqueFilename = `${uuidv4()}${fileExtension}`
      const storagePath = path.join(this.UPLOAD_DIR, uniqueFilename)

      // Ensure upload directory exists
      await fs.mkdir(this.UPLOAD_DIR, { recursive: true })

      // Save file to disk
      await fs.writeFile(storagePath, uploadData.buffer)

      // Save document metadata to database
      const [documentResult] = await connection.execute(`
        INSERT INTO documents (
          encounter_id, patient_user_id, uploaded_by_user_id, hospital_id,
          filename, storage_path, mimetype
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        uploadData.encounterId,
        uploadData.patientUserId,
        uploadData.uploadedByUserId,
        uploadData.hospitalId,
        uploadData.filename,
        storagePath,
        uploadData.mimetype
      ]) as any

      const documentId = documentResult.insertId

      // Log document upload
      await connection.execute(
        'INSERT INTO audit_logs (actor_user_id, actor_role, patient_user_id, action_type, details_json) VALUES (?, ?, ?, ?, ?)',
        [
          uploadData.uploadedByUserId,
          'OPERATOR', // Assuming operators upload documents
          uploadData.patientUserId,
          'DOCUMENT_UPLOADED',
          JSON.stringify({
            documentId: documentId.toString(),
            filename: uploadData.filename,
            mimetype: uploadData.mimetype,
            encounterId: uploadData.encounterId,
            fileSize: uploadData.buffer.length,
            timestamp: new Date().toISOString()
          })
        ]
      )

      await connection.commit()

      console.log(`📄 Document uploaded: ${uploadData.filename} for encounter ${uploadData.encounterId}`)

      return {
        success: true,
        message: 'Document uploaded successfully',
        documentId: documentId.toString()
      }

    } catch (error) {
      await connection.rollback()
      console.error('Document upload error:', error)
      
      // Clean up file if it was created
      try {
        const fileExtension = path.extname(uploadData.filename)
        const uniqueFilename = `${uuidv4()}${fileExtension}`
        const storagePath = path.join(this.UPLOAD_DIR, uniqueFilename)
        await fs.unlink(storagePath)
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      return {
        success: false,
        message: 'Failed to upload document'
      }
    } finally {
      connection.release()
    }
  }

  /**
   * Get document by ID
   */
  static async getDocument(documentId: string): Promise<DocumentResult> {
    try {
      const [documents] = await database.execute(`
        SELECT 
          d.id, d.encounter_id, d.patient_user_id, d.uploaded_by_user_id,
          d.hospital_id, d.filename, d.storage_path, d.mimetype, d.uploaded_at,
          uploader.name as uploaded_by_name,
          h.name as hospital_name
        FROM documents d
        LEFT JOIN users uploader ON d.uploaded_by_user_id = uploader.id
        LEFT JOIN hospitals h ON d.hospital_id = h.id
        WHERE d.id = ?
      `, [documentId]) as any

      if (!documents || documents.length === 0) {
        return {
          success: false,
          message: 'Document not found'
        }
      }

      const document = documents[0]

      return {
        success: true,
        message: 'Document retrieved successfully',
        document: {
          id: document.id,
          encounterId: document.encounter_id,
          patientUserId: document.patient_user_id,
          uploadedByUserId: document.uploaded_by_user_id,
          uploadedByName: document.uploaded_by_name,
          hospitalId: document.hospital_id,
          hospitalName: document.hospital_name,
          filename: document.filename,
          storagePath: document.storage_path,
          mimetype: document.mimetype,
          uploadedAt: document.uploaded_at
        }
      }

    } catch (error) {
      console.error('Get document error:', error)
      return {
        success: false,
        message: 'Failed to retrieve document'
      }
    }
  }

  /**
   * Get document file content
   */
  static async getDocumentFile(documentId: string): Promise<{ success: boolean; buffer?: Buffer; mimetype?: string; filename?: string; message?: string }> {
    try {
      const documentResult = await this.getDocument(documentId)
      
      if (!documentResult.success || !documentResult.document) {
        return {
          success: false,
          message: documentResult.message
        }
      }

      const document = documentResult.document

      // Check if file exists
      try {
        await fs.access(document.storagePath)
      } catch (error) {
        return {
          success: false,
          message: 'Document file not found on disk'
        }
      }

      // Read file content
      const buffer = await fs.readFile(document.storagePath)

      return {
        success: true,
        buffer,
        mimetype: document.mimetype,
        filename: document.filename
      }

    } catch (error) {
      console.error('Get document file error:', error)
      return {
        success: false,
        message: 'Failed to retrieve document file'
      }
    }
  }

  /**
   * Get documents with filters
   */
  static async getDocuments(filters: DocumentFilters = {}): Promise<DocumentResult> {
    try {
      let query = `
        SELECT 
          d.id, d.encounter_id, d.patient_user_id, d.uploaded_by_user_id,
          d.hospital_id, d.filename, d.mimetype, d.uploaded_at,
          uploader.name as uploaded_by_name,
          h.name as hospital_name,
          e.type as encounter_type,
          e.occurred_at as encounter_date
        FROM documents d
        LEFT JOIN users uploader ON d.uploaded_by_user_id = uploader.id
        LEFT JOIN hospitals h ON d.hospital_id = h.id
        LEFT JOIN encounters e ON d.encounter_id = e.id
        WHERE 1=1
      `

      const queryParams: any[] = []

      // Apply filters
      if (filters.patientUserId) {
        query += ' AND d.patient_user_id = ?'
        queryParams.push(filters.patientUserId)
      }

      if (filters.encounterId) {
        query += ' AND d.encounter_id = ?'
        queryParams.push(filters.encounterId)
      }

      if (filters.hospitalId) {
        query += ' AND d.hospital_id = ?'
        queryParams.push(filters.hospitalId)
      }

      if (filters.mimetype) {
        query += ' AND d.mimetype = ?'
        queryParams.push(filters.mimetype)
      }

      if (filters.startDate) {
        query += ' AND d.uploaded_at >= ?'
        queryParams.push(filters.startDate)
      }

      if (filters.endDate) {
        query += ' AND d.uploaded_at <= ?'
        queryParams.push(filters.endDate)
      }

      query += ' ORDER BY d.uploaded_at DESC'

      // Apply pagination
      if (filters.limit) {
        query += ' LIMIT ?'
        queryParams.push(filters.limit)

        if (filters.offset) {
          query += ' OFFSET ?'
          queryParams.push(filters.offset)
        }
      }

      const [documents] = await database.execute(query, queryParams) as any

      const formattedDocuments = documents.map((doc: any) => ({
        id: doc.id,
        encounterId: doc.encounter_id,
        patientUserId: doc.patient_user_id,
        uploadedByUserId: doc.uploaded_by_user_id,
        uploadedByName: doc.uploaded_by_name,
        hospitalId: doc.hospital_id,
        hospitalName: doc.hospital_name,
        filename: doc.filename,
        mimetype: doc.mimetype,
        uploadedAt: doc.uploaded_at,
        encounterType: doc.encounter_type,
        encounterDate: doc.encounter_date
      }))

      return {
        success: true,
        message: 'Documents retrieved successfully',
        documents: formattedDocuments
      }

    } catch (error) {
      console.error('Get documents error:', error)
      return {
        success: false,
        message: 'Failed to retrieve documents'
      }
    }
  }

  /**
   * Delete document (soft delete - mark as deleted but keep file)
   */
  static async deleteDocument(documentId: string, deletedByUserId: string): Promise<DocumentResult> {
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      // Get document info
      const documentResult = await this.getDocument(documentId)
      if (!documentResult.success || !documentResult.document) {
        return {
          success: false,
          message: 'Document not found'
        }
      }

      const document = documentResult.document

      // For now, we'll just log the deletion without actually deleting the file
      // In a production system, you might want to move files to a "deleted" folder
      
      // Log document deletion
      await connection.execute(
        'INSERT INTO audit_logs (actor_user_id, actor_role, patient_user_id, action_type, details_json) VALUES (?, ?, ?, ?, ?)',
        [
          deletedByUserId,
          'SYSTEM',
          document.patientUserId,
          'DOCUMENT_DELETED',
          JSON.stringify({
            documentId,
            filename: document.filename,
            encounterId: document.encounterId,
            timestamp: new Date().toISOString()
          })
        ]
      )

      // Remove from database (hard delete for now, but could be soft delete)
      await connection.execute('DELETE FROM documents WHERE id = ?', [documentId])

      await connection.commit()

      console.log(`🗑️ Document deleted: ${document.filename} (ID: ${documentId})`)

      return {
        success: true,
        message: 'Document deleted successfully'
      }

    } catch (error) {
      await connection.rollback()
      console.error('Delete document error:', error)
      return {
        success: false,
        message: 'Failed to delete document'
      }
    } finally {
      connection.release()
    }
  }

  /**
   * Get document statistics
   */
  static async getDocumentStats(patientUserId?: string, hospitalId?: string): Promise<DocumentResult> {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_documents,
          COUNT(DISTINCT mimetype) as file_types,
          COUNT(DISTINCT hospital_id) as hospitals,
          SUM(CASE WHEN mimetype = 'application/pdf' THEN 1 ELSE 0 END) as pdf_count,
          SUM(CASE WHEN mimetype LIKE 'image/%' THEN 1 ELSE 0 END) as image_count
        FROM documents
        WHERE 1=1
      `

      const queryParams: any[] = []

      if (patientUserId) {
        query += ' AND patient_user_id = ?'
        queryParams.push(patientUserId)
      }

      if (hospitalId) {
        query += ' AND hospital_id = ?'
        queryParams.push(hospitalId)
      }

      const [stats] = await database.execute(query, queryParams) as any

      const [recentDocs] = await database.execute(`
        SELECT filename, uploaded_at, mimetype
        FROM documents
        ${patientUserId ? 'WHERE patient_user_id = ?' : hospitalId ? 'WHERE hospital_id = ?' : ''}
        ORDER BY uploaded_at DESC
        LIMIT 5
      `, patientUserId ? [patientUserId] : hospitalId ? [hospitalId] : []) as any

      const statistics = {
        totalDocuments: stats[0]?.total_documents || 0,
        fileTypes: stats[0]?.file_types || 0,
        hospitals: stats[0]?.hospitals || 0,
        pdfCount: stats[0]?.pdf_count || 0,
        imageCount: stats[0]?.image_count || 0,
        recentDocuments: recentDocs.map((doc: any) => ({
          filename: doc.filename,
          uploadedAt: doc.uploaded_at,
          mimetype: doc.mimetype
        }))
      }

      return {
        success: true,
        message: 'Document statistics retrieved successfully',
        document: statistics
      }

    } catch (error) {
      console.error('Get document stats error:', error)
      return {
        success: false,
        message: 'Failed to retrieve document statistics'
      }
    }
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(filename: string, mimetype: string, size: number): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check file type
    if (!ALLOWED_MIMETYPES.includes(mimetype as any)) {
      errors.push(`Invalid file type. Allowed types: ${ALLOWED_MIMETYPES.join(', ')}`)
    }

    // Check file size
    if (size > MAX_FILE_SIZE) {
      errors.push(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    }

    // Check filename
    if (!filename || filename.trim().length === 0) {
      errors.push('Filename is required')
    }

    // Check for potentially dangerous file extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com']
    const fileExtension = path.extname(filename).toLowerCase()
    if (dangerousExtensions.includes(fileExtension)) {
      errors.push('File type not allowed for security reasons')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Get file type icon
   */
  static getFileTypeIcon(mimetype: string): string {
    const iconMap: Record<string, string> = {
      'application/pdf': '📄',
      'image/jpeg': '🖼️',
      'image/jpg': '🖼️',
      'image/png': '🖼️'
    }

    return iconMap[mimetype] || '📎'
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}