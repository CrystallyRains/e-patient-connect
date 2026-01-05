/**
 * Utility functions for encounter management
 */

export const ENCOUNTER_TYPES = [
  'Consultation',
  'Lab Test',
  'Surgery',
  'Emergency',
  'Follow-up',
  'Vaccination',
  'Screening',
  'Therapy',
  'Discharge',
  'Admission',
  'Other'
] as const

export type EncounterType = typeof ENCOUNTER_TYPES[number]

export const BLOOD_GROUPS = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'
] as const

export type BloodGroup = typeof BLOOD_GROUPS[number]

/**
 * Validate encounter type
 */
export function isValidEncounterType(type: string): type is EncounterType {
  return ENCOUNTER_TYPES.includes(type as EncounterType)
}

/**
 * Validate blood group
 */
export function isValidBloodGroup(bloodGroup: string): bloodGroup is BloodGroup {
  return BLOOD_GROUPS.includes(bloodGroup as BloodGroup)
}

/**
 * Format encounter date for display
 */
export function formatEncounterDate(date: Date | string): string {
  const encounterDate = typeof date === 'string' ? new Date(date) : date
  
  return encounterDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Get encounter type icon/emoji
 */
export function getEncounterTypeIcon(type: string): string {
  const iconMap: Record<string, string> = {
    'Consultation': '👨‍⚕️',
    'Lab Test': '🧪',
    'Surgery': '🏥',
    'Emergency': '🚨',
    'Follow-up': '📋',
    'Vaccination': '💉',
    'Screening': '🔍',
    'Therapy': '🩺',
    'Discharge': '🚪',
    'Admission': '🏨',
    'Other': '📄'
  }
  
  return iconMap[type] || '📄'
}

/**
 * Calculate time since encounter
 */
export function getTimeSinceEncounter(date: Date | string): string {
  const encounterDate = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - encounterDate.getTime()
  
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
  } else {
    return 'Just now'
  }
}

/**
 * Group encounters by date
 */
export function groupEncountersByDate(encounters: any[]): Record<string, any[]> {
  return encounters.reduce((groups, encounter) => {
    const date = new Date(encounter.occurredAt).toDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(encounter)
    return groups
  }, {} as Record<string, any[]>)
}

/**
 * Group encounters by type
 */
export function groupEncountersByType(encounters: any[]): Record<string, any[]> {
  return encounters.reduce((groups, encounter) => {
    const type = encounter.type
    if (!groups[type]) {
      groups[type] = []
    }
    groups[type].push(encounter)
    return groups
  }, {} as Record<string, any[]>)
}

/**
 * Filter encounters by date range
 */
export function filterEncountersByDateRange(
  encounters: any[],
  startDate?: Date,
  endDate?: Date
): any[] {
  return encounters.filter(encounter => {
    const encounterDate = new Date(encounter.occurredAt)
    
    if (startDate && encounterDate < startDate) {
      return false
    }
    
    if (endDate && encounterDate > endDate) {
      return false
    }
    
    return true
  })
}

/**
 * Sort encounters chronologically
 */
export function sortEncountersChronologically(encounters: any[], ascending: boolean = false): any[] {
  return [...encounters].sort((a, b) => {
    const dateA = new Date(a.occurredAt).getTime()
    const dateB = new Date(b.occurredAt).getTime()
    
    return ascending ? dateA - dateB : dateB - dateA
  })
}

/**
 * Extract critical medical information from encounters
 */
export function extractCriticalInfo(encounters: any[]): {
  allergies: string[]
  chronicConditions: string[]
  bloodGroup: string | null
  recentSurgeries: string[]
} {
  const allergiesSet = new Set<string>()
  const chronicSet = new Set<string>()
  const surgeriesSet = new Set<string>()
  let bloodGroup: string | null = null
  
  // Process encounters from most recent to oldest
  const sortedEncounters = sortEncountersChronologically(encounters, false)
  
  for (const encounter of sortedEncounters) {
    // Extract allergies
    if (encounter.allergiesSnapshot) {
      const allergies = encounter.allergiesSnapshot.split(',').map((a: string) => a.trim())
      allergies.forEach((allergy: string) => {
        if (allergy && allergy !== 'None' && allergy !== 'None recorded') {
          allergiesSet.add(allergy)
        }
      })
    }
    
    // Extract chronic conditions
    if (encounter.chronicSnapshot) {
      const conditions = encounter.chronicSnapshot.split(',').map((c: string) => c.trim())
      conditions.forEach((condition: string) => {
        if (condition && condition !== 'None' && condition !== 'None recorded') {
          chronicSet.add(condition)
        }
      })
    }
    
    // Get most recent blood group
    if (!bloodGroup && encounter.bloodGroup && encounter.bloodGroup !== 'Unknown') {
      bloodGroup = encounter.bloodGroup
    }
    
    // Extract recent surgeries
    if (encounter.recentSurgery) {
      const surgeries = encounter.recentSurgery.split(',').map((s: string) => s.trim())
      surgeries.forEach((surgery: string) => {
        if (surgery && surgery !== 'None' && surgery !== 'None recorded') {
          surgeriesSet.add(surgery)
        }
      })
    }
  }
  
  return {
    allergies: Array.from(allergiesSet),
    chronicConditions: Array.from(chronicSet),
    bloodGroup,
    recentSurgeries: Array.from(surgeriesSet)
  }
}

/**
 * Validate encounter data
 */
export function validateEncounterData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!data.type || !isValidEncounterType(data.type)) {
    errors.push('Invalid encounter type')
  }
  
  if (!data.occurredAt) {
    errors.push('Occurrence date is required')
  } else {
    const occurredAt = new Date(data.occurredAt)
    if (isNaN(occurredAt.getTime())) {
      errors.push('Invalid occurrence date')
    } else if (occurredAt > new Date()) {
      errors.push('Occurrence date cannot be in the future')
    }
  }
  
  if (!data.reasonDiagnosis || data.reasonDiagnosis.trim().length === 0) {
    errors.push('Reason/diagnosis is required')
  }
  
  if (!data.prescriptionsNotes || data.prescriptionsNotes.trim().length === 0) {
    errors.push('Prescriptions/notes are required')
  }
  
  if (data.bloodGroup && !isValidBloodGroup(data.bloodGroup)) {
    errors.push('Invalid blood group')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Generate encounter summary
 */
export function generateEncounterSummary(encounter: any): string {
  const date = formatEncounterDate(encounter.occurredAt)
  const type = encounter.type
  const reason = encounter.reasonDiagnosis
  
  return `${type} on ${date}: ${reason}`
}