/**
 * File upload and management utilities
 */

export const ALLOWED_FILE_TYPES = {
  'application/pdf': {
    extension: '.pdf',
    icon: '📄',
    name: 'PDF Document'
  },
  'image/jpeg': {
    extension: '.jpg',
    icon: '🖼️',
    name: 'JPEG Image'
  },
  'image/jpg': {
    extension: '.jpg',
    icon: '🖼️',
    name: 'JPG Image'
  },
  'image/png': {
    extension: '.png',
    icon: '🖼️',
    name: 'PNG Image'
  }
} as const

export type AllowedMimeType = keyof typeof ALLOWED_FILE_TYPES

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const UPLOAD_CHUNK_SIZE = 1024 * 1024 // 1MB chunks for large files

/**
 * Validate file type
 */
export function isAllowedFileType(mimetype: string): mimetype is AllowedMimeType {
  return mimetype in ALLOWED_FILE_TYPES
}

/**
 * Get file type information
 */
export function getFileTypeInfo(mimetype: string) {
  return ALLOWED_FILE_TYPES[mimetype as AllowedMimeType] || {
    extension: '',
    icon: '📎',
    name: 'Unknown File'
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase()
}

/**
 * Validate filename
 */
export function validateFilename(filename: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!filename || filename.trim().length === 0) {
    errors.push('Filename cannot be empty')
  }

  if (filename.length > 255) {
    errors.push('Filename too long (maximum 255 characters)')
  }

  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/
  if (invalidChars.test(filename)) {
    errors.push('Filename contains invalid characters')
  }

  // Check for reserved names (Windows)
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
  const nameWithoutExt = filename.split('.')[0].toUpperCase()
  if (reservedNames.includes(nameWithoutExt)) {
    errors.push('Filename uses a reserved name')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Sanitize filename for storage
 */
export function sanitizeFilename(filename: string): string {
  // Remove or replace invalid characters
  let sanitized = filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .trim()

  // Ensure it doesn't start or end with dots or spaces
  sanitized = sanitized.replace(/^[.\s]+|[.\s]+$/g, '')

  // Ensure it's not empty
  if (!sanitized) {
    sanitized = 'unnamed_file'
  }

  // Limit length
  if (sanitized.length > 200) {
    const ext = getFileExtension(sanitized)
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'))
    sanitized = nameWithoutExt.substring(0, 200 - ext.length - 1) + '.' + ext
  }

  return sanitized
}

/**
 * Generate unique filename
 */
export function generateUniqueFilename(originalFilename: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const extension = getFileExtension(originalFilename)
  const nameWithoutExt = originalFilename.substring(0, originalFilename.lastIndexOf('.'))
  const sanitizedName = sanitizeFilename(nameWithoutExt)

  return `${sanitizedName}_${timestamp}_${random}.${extension}`
}

/**
 * Check if file is an image
 */
export function isImageFile(mimetype: string): boolean {
  return mimetype.startsWith('image/')
}

/**
 * Check if file is a PDF
 */
export function isPDFFile(mimetype: string): boolean {
  return mimetype === 'application/pdf'
}

/**
 * Get file category
 */
export function getFileCategory(mimetype: string): 'image' | 'document' | 'other' {
  if (isImageFile(mimetype)) {
    return 'image'
  } else if (isPDFFile(mimetype)) {
    return 'document'
  } else {
    return 'other'
  }
}

/**
 * Validate file upload constraints
 */
export function validateFileUpload(file: {
  name: string
  type: string
  size: number
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validate filename
  const filenameValidation = validateFilename(file.name)
  if (!filenameValidation.isValid) {
    errors.push(...filenameValidation.errors)
  }

  // Validate file type
  if (!isAllowedFileType(file.type)) {
    const allowedTypes = Object.values(ALLOWED_FILE_TYPES).map(t => t.name).join(', ')
    errors.push(`Invalid file type. Allowed types: ${allowedTypes}`)
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File too large. Maximum size: ${formatFileSize(MAX_FILE_SIZE)}`)
  }

  if (file.size === 0) {
    errors.push('File is empty')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Create file upload progress tracker
 */
export class FileUploadTracker {
  private progress: number = 0
  private status: 'idle' | 'uploading' | 'completed' | 'error' = 'idle'
  private error: string | null = null
  private callbacks: Array<(progress: number, status: string) => void> = []

  constructor(private filename: string) {}

  onProgress(callback: (progress: number, status: string) => void) {
    this.callbacks.push(callback)
  }

  updateProgress(progress: number) {
    this.progress = Math.max(0, Math.min(100, progress))
    this.status = progress >= 100 ? 'completed' : 'uploading'
    this.notifyCallbacks()
  }

  setError(error: string) {
    this.error = error
    this.status = 'error'
    this.notifyCallbacks()
  }

  setCompleted() {
    this.progress = 100
    this.status = 'completed'
    this.notifyCallbacks()
  }

  private notifyCallbacks() {
    this.callbacks.forEach(callback => {
      callback(this.progress, this.status)
    })
  }

  getStatus() {
    return {
      filename: this.filename,
      progress: this.progress,
      status: this.status,
      error: this.error
    }
  }
}

/**
 * Convert file to base64 for preview
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = error => reject(error)
  })
}

/**
 * Create file preview URL
 */
export function createFilePreviewUrl(file: File): string {
  return URL.createObjectURL(file)
}

/**
 * Revoke file preview URL
 */
export function revokeFilePreviewUrl(url: string): void {
  URL.revokeObjectURL(url)
}

/**
 * Check if browser supports file API
 */
export function supportsFileAPI(): boolean {
  return typeof File !== 'undefined' && typeof FileReader !== 'undefined' && typeof FileList !== 'undefined' && typeof Blob !== 'undefined'
}

/**
 * Get file upload error message
 */
export function getUploadErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error
  }

  if (error?.message) {
    return error.message
  }

  if (error?.response?.data?.error) {
    return error.response.data.error
  }

  return 'An unknown error occurred during file upload'
}