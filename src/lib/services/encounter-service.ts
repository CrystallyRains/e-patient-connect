import { database } from '../database'

export interface CreateEncounterData {
  patientUserId: string
  occurredAt: Date
  type: string
  reasonDiagnosis: string
  prescriptionsNotes: string
  allergiesSnapshot?: string
  chronicSnapshot?: string
  bloodGroup?: string
  recentSurgery?: string
  hospitalId?: string
}

export interface UpdateEncounterData {
  occurredAt?: Date
  type?: string
  reasonDiagnosis?: string
  prescriptionsNotes?: string
  allergiesSnapshot?: string
  chronicSnapshot?: string
  bloodGroup?: string
  recentSurgery?: string
}

export interface EncounterResult {
  success: boolean
  message: string
  encounterId?: string
  encounter?: any
  encounters?: any[]
}

export interface TimelineFilters {
  startDate?: Date
  endDate?: Date
  type?: string
  limit?: number
  offset?: number
}

export class EncounterService {
  /**
   * Create a new medical encounter
   */
  static async createEncounter(
    encounterData: CreateEncounterData,
    createdByUserId: string,
    createdByRole: string
  ): Promise<EncounterResult> {
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      // Verify patient exists and is active
      const [patients] = await connection.execute(
        'SELECT u.id, u.name, pp.deleted_at FROM users u LEFT JOIN patient_profiles pp ON u.id = pp.user_id WHERE u.id = ? AND u.role = ?',
        [encounterData.patientUserId, 'PATIENT']
      ) as any

      if (!patients || patients.length === 0) {
        return {
          success: false,
          message: 'Patient not found'
        }
      }

      const patient = patients[0]
      if (patient.deleted_at) {
        return {
          success: false,
          message: 'Cannot create encounter for deactivated patient'
        }
      }

      // Create encounter
      const [encounterResult] = await connection.execute(`
        INSERT INTO encounters (
          patient_user_id, occurred_at, type, reason_diagnosis, prescriptions_notes,
          allergies_snapshot, chronic_snapshot, blood_group, recent_surgery,
          created_by_role, created_by_user_id, hospital_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        encounterData.patientUserId,
        encounterData.occurredAt,
        encounterData.type,
        encounterData.reasonDiagnosis,
        encounterData.prescriptionsNotes,
        encounterData.allergiesSnapshot || null,
        encounterData.chronicSnapshot || null,
        encounterData.bloodGroup || null,
        encounterData.recentSurgery || null,
        createdByRole,
        createdByUserId,
        encounterData.hospitalId || null
      ]) as any

      const encounterId = encounterResult.insertId

      // Log encounter creation
      await connection.execute(
        'INSERT INTO audit_logs (actor_user_id, actor_role, patient_user_id, action_type, details_json) VALUES (?, ?, ?, ?, ?)',
        [
          createdByUserId,
          createdByRole,
          encounterData.patientUserId,
          'ENCOUNTER_CREATED',
          JSON.stringify({
            encounterId: encounterId.toString(),
            type: encounterData.type,
            occurredAt: encounterData.occurredAt.toISOString(),
            createdBy: createdByRole,
            timestamp: new Date().toISOString()
          })
        ]
      )

      await connection.commit()

      console.log(`📋 Encounter created: ${encounterData.type} for patient ${patient.name}`)

      return {
        success: true,
        message: 'Encounter created successfully',
        encounterId: encounterId.toString()
      }

    } catch (error) {
      await connection.rollback()
      console.error('Create encounter error:', error)
      return {
        success: false,
        message: 'Failed to create encounter'
      }
    } finally {
      connection.release()
    }
  }

  /**
   * Get patient's medical timeline with encounters
   */
  static async getPatientTimeline(
    patientUserId: string,
    filters: TimelineFilters = {}
  ): Promise<EncounterResult> {
    try {
      // Build query with filters
      let query = `
        SELECT 
          e.id, e.occurred_at, e.type, e.reason_diagnosis, e.prescriptions_notes,
          e.allergies_snapshot, e.chronic_snapshot, e.blood_group, e.recent_surgery,
          e.created_by_role, e.created_by_user_id, e.created_at,
          h.name as hospital_name,
          creator.name as created_by_name,
          COUNT(d.id) as document_count
        FROM encounters e
        LEFT JOIN hospitals h ON e.hospital_id = h.id
        LEFT JOIN users creator ON e.created_by_user_id = creator.id
        LEFT JOIN documents d ON e.id = d.encounter_id
        WHERE e.patient_user_id = ?
      `

      const queryParams: any[] = [patientUserId]

      // Apply filters
      if (filters.startDate) {
        query += ' AND e.occurred_at >= ?'
        queryParams.push(filters.startDate)
      }

      if (filters.endDate) {
        query += ' AND e.occurred_at <= ?'
        queryParams.push(filters.endDate)
      }

      if (filters.type) {
        query += ' AND e.type = ?'
        queryParams.push(filters.type)
      }

      query += ' GROUP BY e.id ORDER BY e.occurred_at DESC'

      // Apply pagination
      if (filters.limit) {
        query += ' LIMIT ?'
        queryParams.push(filters.limit)

        if (filters.offset) {
          query += ' OFFSET ?'
          queryParams.push(filters.offset)
        }
      }

      const [encounters] = await database.execute(query, queryParams) as any

      // Get documents for each encounter
      const encountersWithDocuments = await Promise.all(
        encounters.map(async (encounter: any) => {
          const [documents] = await database.execute(
            'SELECT id, filename, mimetype, uploaded_at FROM documents WHERE encounter_id = ?',
            [encounter.id]
          ) as any

          return {
            id: encounter.id,
            occurredAt: encounter.occurred_at,
            type: encounter.type,
            reasonDiagnosis: encounter.reason_diagnosis,
            prescriptionsNotes: encounter.prescriptions_notes,
            allergiesSnapshot: encounter.allergies_snapshot,
            chronicSnapshot: encounter.chronic_snapshot,
            bloodGroup: encounter.blood_group,
            recentSurgery: encounter.recent_surgery,
            createdByRole: encounter.created_by_role,
            createdByName: encounter.created_by_name,
            hospitalName: encounter.hospital_name,
            createdAt: encounter.created_at,
            documentCount: encounter.document_count,
            documents: documents.map((doc: any) => ({
              id: doc.id,
              filename: doc.filename,
              mimetype: doc.mimetype,
              uploadedAt: doc.uploaded_at
            }))
          }
        })
      )

      return {
        success: true,
        message: 'Timeline retrieved successfully',
        encounters: encountersWithDocuments
      }

    } catch (error) {
      console.error('Get patient timeline error:', error)
      return {
        success: false,
        message: 'Failed to retrieve timeline'
      }
    }
  }

  /**
   * Get a specific encounter with full details
   */
  static async getEncounter(encounterId: string): Promise<EncounterResult> {
    try {
      const [encounters] = await database.execute(`
        SELECT 
          e.id, e.patient_user_id, e.occurred_at, e.type, e.reason_diagnosis, e.prescriptions_notes,
          e.allergies_snapshot, e.chronic_snapshot, e.blood_group, e.recent_surgery,
          e.created_by_role, e.created_by_user_id, e.created_at,
          h.name as hospital_name,
          creator.name as created_by_name,
          patient.name as patient_name
        FROM encounters e
        LEFT JOIN hospitals h ON e.hospital_id = h.id
        LEFT JOIN users creator ON e.created_by_user_id = creator.id
        LEFT JOIN users patient ON e.patient_user_id = patient.id
        WHERE e.id = ?
      `, [encounterId]) as any

      if (!encounters || encounters.length === 0) {
        return {
          success: false,
          message: 'Encounter not found'
        }
      }

      const encounter = encounters[0]

      // Get associated documents
      const [documents] = await database.execute(
        'SELECT id, filename, mimetype, uploaded_at, uploaded_by_user_id FROM documents WHERE encounter_id = ?',
        [encounterId]
      ) as any

      const encounterWithDocuments = {
        id: encounter.id,
        patientUserId: encounter.patient_user_id,
        patientName: encounter.patient_name,
        occurredAt: encounter.occurred_at,
        type: encounter.type,
        reasonDiagnosis: encounter.reason_diagnosis,
        prescriptionsNotes: encounter.prescriptions_notes,
        allergiesSnapshot: encounter.allergies_snapshot,
        chronicSnapshot: encounter.chronic_snapshot,
        bloodGroup: encounter.blood_group,
        recentSurgery: encounter.recent_surgery,
        createdByRole: encounter.created_by_role,
        createdByName: encounter.created_by_name,
        hospitalName: encounter.hospital_name,
        createdAt: encounter.created_at,
        documents: documents.map((doc: any) => ({
          id: doc.id,
          filename: doc.filename,
          mimetype: doc.mimetype,
          uploadedAt: doc.uploaded_at,
          uploadedByUserId: doc.uploaded_by_user_id
        }))
      }

      return {
        success: true,
        message: 'Encounter retrieved successfully',
        encounter: encounterWithDocuments
      }

    } catch (error) {
      console.error('Get encounter error:', error)
      return {
        success: false,
        message: 'Failed to retrieve encounter'
      }
    }
  }

  /**
   * Update an encounter
   */
  static async updateEncounter(
    encounterId: string,
    updateData: UpdateEncounterData,
    updatedByUserId: string,
    updatedByRole: string
  ): Promise<EncounterResult> {
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      // Get current encounter
      const [encounters] = await connection.execute(
        'SELECT patient_user_id, created_by_user_id, created_by_role FROM encounters WHERE id = ?',
        [encounterId]
      ) as any

      if (!encounters || encounters.length === 0) {
        return {
          success: false,
          message: 'Encounter not found'
        }
      }

      const encounter = encounters[0]

      // Check permissions (only creator or patient can update)
      if (encounter.created_by_user_id !== updatedByUserId && encounter.patient_user_id !== updatedByUserId) {
        return {
          success: false,
          message: 'You do not have permission to update this encounter'
        }
      }

      // Build update query
      const updates = []
      const values = []

      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()
          updates.push(`${dbKey} = ?`)
          values.push(value)
        }
      })

      if (updates.length === 0) {
        return {
          success: false,
          message: 'No fields to update'
        }
      }

      values.push(encounterId)

      // Update encounter
      await connection.execute(
        `UPDATE encounters SET ${updates.join(', ')} WHERE id = ?`,
        values
      )

      // Log encounter update
      await connection.execute(
        'INSERT INTO audit_logs (actor_user_id, actor_role, patient_user_id, action_type, details_json) VALUES (?, ?, ?, ?, ?)',
        [
          updatedByUserId,
          updatedByRole,
          encounter.patient_user_id,
          'ENCOUNTER_UPDATED',
          JSON.stringify({
            encounterId,
            updatedFields: Object.keys(updateData),
            updatedBy: updatedByRole,
            timestamp: new Date().toISOString()
          })
        ]
      )

      await connection.commit()

      return {
        success: true,
        message: 'Encounter updated successfully'
      }

    } catch (error) {
      await connection.rollback()
      console.error('Update encounter error:', error)
      return {
        success: false,
        message: 'Failed to update encounter'
      }
    } finally {
      connection.release()
    }
  }

  /**
   * Get critical medical information summary for a patient
   */
  static async getCriticalMedicalInfo(patientUserId: string): Promise<EncounterResult> {
    try {
      // Get the most recent encounter for current medical info
      const [recentEncounter] = await database.execute(`
        SELECT allergies_snapshot, chronic_snapshot, blood_group, recent_surgery
        FROM encounters 
        WHERE patient_user_id = ? 
        ORDER BY occurred_at DESC 
        LIMIT 1
      `, [patientUserId]) as any

      const criticalInfo = recentEncounter && recentEncounter.length > 0 ? {
        allergies: recentEncounter[0].allergies_snapshot || 'None recorded',
        chronicConditions: recentEncounter[0].chronic_snapshot || 'None recorded',
        bloodGroup: recentEncounter[0].blood_group || 'Unknown',
        recentSurgery: recentEncounter[0].recent_surgery || 'None recorded'
      } : {
        allergies: 'No medical history available',
        chronicConditions: 'No medical history available',
        bloodGroup: 'Unknown',
        recentSurgery: 'No medical history available'
      }

      return {
        success: true,
        message: 'Critical medical information retrieved successfully',
        encounter: criticalInfo
      }

    } catch (error) {
      console.error('Get critical medical info error:', error)
      return {
        success: false,
        message: 'Failed to retrieve critical medical information'
      }
    }
  }

  /**
   * Get encounter statistics for a patient
   */
  static async getEncounterStats(patientUserId: string): Promise<EncounterResult> {
    try {
      const [stats] = await database.execute(`
        SELECT 
          COUNT(*) as total_encounters,
          COUNT(DISTINCT type) as encounter_types,
          COUNT(DISTINCT hospital_id) as hospitals_visited,
          MIN(occurred_at) as first_encounter,
          MAX(occurred_at) as last_encounter
        FROM encounters 
        WHERE patient_user_id = ?
      `, [patientUserId]) as any

      const [typeBreakdown] = await database.execute(`
        SELECT type, COUNT(*) as count
        FROM encounters 
        WHERE patient_user_id = ?
        GROUP BY type
        ORDER BY count DESC
      `, [patientUserId]) as any

      const statistics = {
        totalEncounters: stats[0]?.total_encounters || 0,
        encounterTypes: stats[0]?.encounter_types || 0,
        hospitalsVisited: stats[0]?.hospitals_visited || 0,
        firstEncounter: stats[0]?.first_encounter,
        lastEncounter: stats[0]?.last_encounter,
        typeBreakdown: typeBreakdown.map((item: any) => ({
          type: item.type,
          count: item.count
        }))
      }

      return {
        success: true,
        message: 'Encounter statistics retrieved successfully',
        encounter: statistics
      }

    } catch (error) {
      console.error('Get encounter stats error:', error)
      return {
        success: false,
        message: 'Failed to retrieve encounter statistics'
      }
    }
  }
}