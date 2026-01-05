import { database } from '../src/lib/database.js'

async function seedDatabase() {
  console.log('🌱 Starting database seed...')

  try {
    // Create Hospital
    const [hospitalResult] = await database.execute(
      'INSERT INTO hospitals (name) VALUES (?)',
      ['City General Hospital']
    ) as any

    const hospitalId = hospitalResult.insertId

    // Create Patient User
    const [patientResult] = await database.execute(`
      INSERT INTO users (role, name, mobile, email) 
      VALUES (?, ?, ?, ?)
    `, ['PATIENT', 'John Doe', '+1234567890', 'john.doe@example.com']) as any

    const patientUserId = patientResult.insertId

    // Create Patient Profile
    await database.execute(`
      INSERT INTO patient_profiles (
        user_id, id_proof_type, id_proof_number, emergency_contact, 
        biometric_fingerprint_ref, biometric_iris_ref
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      patientUserId, 'Aadhaar', '1234-5678-9012', '+1234567891',
      'fp_john_doe_123', 'iris_john_doe_456'
    ])

    // Create Doctor User
    const [doctorResult] = await database.execute(`
      INSERT INTO users (role, name, mobile, email) 
      VALUES (?, ?, ?, ?)
    `, ['DOCTOR', 'Dr. Sarah Smith', '+1234567892', 'dr.sarah@example.com']) as any

    const doctorUserId = doctorResult.insertId

    // Create Doctor Profile
    await database.execute(`
      INSERT INTO doctor_profiles (user_id, hospital_name) 
      VALUES (?, ?)
    `, [doctorUserId, 'City General Hospital'])

    // Create Operator User
    const [operatorResult] = await database.execute(`
      INSERT INTO users (role, name, mobile, email, hospital_id) 
      VALUES (?, ?, ?, ?, ?)
    `, ['OPERATOR', 'Mike Johnson', '+1234567893', 'mike.operator@example.com', hospitalId]) as any

    const operatorUserId = operatorResult.insertId

    // Create Operator Profile
    await database.execute(`
      INSERT INTO operator_profiles (user_id, hospital_id) 
      VALUES (?, ?)
    `, [operatorUserId, hospitalId])

    // Create sample encounters for the patient
    const [encounter1Result] = await database.execute(`
      INSERT INTO encounters (
        patient_user_id, occurred_at, type, reason_diagnosis, prescriptions_notes,
        allergies_snapshot, chronic_snapshot, blood_group, recent_surgery,
        created_by_role, created_by_user_id, hospital_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      patientUserId, '2024-01-15 10:00:00', 'Consultation', 
      'Annual health checkup', 'Patient is in good health. Continue regular exercise.',
      'Peanuts, Shellfish', 'None', 'O+', 'None',
      'PATIENT', patientUserId, hospitalId
    ]) as any

    const encounter1Id = encounter1Result.insertId

    const [encounter2Result] = await database.execute(`
      INSERT INTO encounters (
        patient_user_id, occurred_at, type, reason_diagnosis, prescriptions_notes,
        allergies_snapshot, chronic_snapshot, blood_group, recent_surgery,
        created_by_role, created_by_user_id, hospital_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      patientUserId, '2024-06-20 14:30:00', 'Lab Test',
      'Blood work for routine screening', 'All lab values within normal range',
      'Peanuts, Shellfish', 'None', 'O+', 'None',
      'OPERATOR', operatorUserId, hospitalId
    ]) as any

    const encounter2Id = encounter2Result.insertId

    const [encounter3Result] = await database.execute(`
      INSERT INTO encounters (
        patient_user_id, occurred_at, type, reason_diagnosis, prescriptions_notes,
        allergies_snapshot, chronic_snapshot, blood_group, recent_surgery,
        created_by_role, created_by_user_id, hospital_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      patientUserId, '2024-11-10 09:15:00', 'Surgery',
      'Appendectomy', 'Post-operative care instructions provided. Follow-up in 2 weeks.',
      'Peanuts, Shellfish', 'None', 'O+', 'Appendectomy - November 2024',
      'OPERATOR', operatorUserId, hospitalId
    ]) as any

    const encounter3Id = encounter3Result.insertId

    // Create sample documents
    await database.execute(`
      INSERT INTO documents (
        encounter_id, patient_user_id, uploaded_by_user_id, hospital_id,
        filename, storage_path, mimetype
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      encounter2Id, patientUserId, operatorUserId, hospitalId,
      'blood_test_results.pdf', '/uploads/blood_test_results.pdf', 'application/pdf'
    ])

    await database.execute(`
      INSERT INTO documents (
        encounter_id, patient_user_id, uploaded_by_user_id, hospital_id,
        filename, storage_path, mimetype
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      encounter3Id, patientUserId, operatorUserId, hospitalId,
      'discharge_summary.pdf', '/uploads/discharge_summary.pdf', 'application/pdf'
    ])

    // Create sample audit logs
    await database.execute(`
      INSERT INTO audit_logs (
        actor_user_id, actor_role, patient_user_id, action_type, details_json
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      patientUserId, 'PATIENT', patientUserId, 'PATIENT_REGISTRATION',
      JSON.stringify({
        action: 'Patient registered successfully',
        timestamp: new Date().toISOString(),
      })
    ])

    await database.execute(`
      INSERT INTO audit_logs (
        actor_user_id, actor_role, patient_user_id, action_type, details_json
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      operatorUserId, 'OPERATOR', patientUserId, 'DOCUMENT_UPLOAD',
      JSON.stringify({
        action: 'Document uploaded',
        filename: 'blood_test_results.pdf',
        encounterId: encounter2Id,
        timestamp: new Date().toISOString(),
      })
    ])

    // Get user details for display
    const [patientData] = await database.execute(
      'SELECT * FROM users WHERE id = ?', [patientUserId]
    ) as any

    const [doctorData] = await database.execute(
      'SELECT * FROM users WHERE id = ?', [doctorUserId]
    ) as any

    const [operatorData] = await database.execute(
      'SELECT * FROM users WHERE id = ?', [operatorUserId]
    ) as any

    const [hospitalData] = await database.execute(
      'SELECT * FROM hospitals WHERE id = ?', [hospitalId]
    ) as any

    console.log('✅ Database seeded successfully!')
    console.log('\n📋 Demo User Credentials:')
    console.log('========================')
    console.log('🏥 Patient:')
    console.log(`   Name: ${patientData[0].name}`)
    console.log(`   Mobile: ${patientData[0].mobile}`)
    console.log(`   Email: ${patientData[0].email}`)
    console.log('\n👨‍⚕️ Doctor:')
    console.log(`   Name: ${doctorData[0].name}`)
    console.log(`   Mobile: ${doctorData[0].mobile}`)
    console.log(`   Email: ${doctorData[0].email}`)
    console.log('\n👨‍💼 Hospital Operator:')
    console.log(`   Name: ${operatorData[0].name}`)
    console.log(`   Mobile: ${operatorData[0].mobile}`)
    console.log(`   Email: ${operatorData[0].email}`)
    console.log(`   Hospital: ${hospitalData[0].name}`)
    console.log('\n💡 Use mobile number or email for login identification')
    console.log('💡 OTP will be displayed in development mode')

  } catch (error) {
    console.error('❌ Seed failed:', error)
    throw error
  }
}

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => {
      console.log('Seed completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Seed failed:', error)
      process.exit(1)
    })
}

export { seedDatabase }