// User Management Services
export { UserService } from './user-service'
export type { CreatePatientData, UpdatePatientData, UserResult } from './user-service'

// Encounter Management Services
export { EncounterService } from './encounter-service'
export type { 
  CreateEncounterData, 
  UpdateEncounterData, 
  EncounterResult, 
  TimelineFilters 
} from './encounter-service'

// Emergency Access Services
export { EmergencyService } from './emergency-service'
export type {
  EmergencyAccessRequest,
  EmergencyAccessResult,
  EmergencySessionInfo
} from './emergency-service'

// Document Management Services
export { DocumentService } from './document-service'
export type {
  UploadDocumentData,
  DocumentResult,
  DocumentFilters
} from './document-service'

// Audit Logging Services
export { AuditService } from './audit-service'
export type {
  AuditLogEntry,
  AuditLogFilters,
  AuditResult,
  AuditActionType
} from './audit-service'

// Role-Based Access Control
export { RBACService, ROLE_PERMISSIONS } from './rbac-service'
export type { Permission, RolePermissions } from './rbac-service'