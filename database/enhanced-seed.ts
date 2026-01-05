import { database } from '../src/lib/database'

async function enhancedSeed() {
  console.log('🌱 Starting enhanced database seed...')

  try {
    // Create additional hospitals
    const [hospital2Result] = await database.execute(
      'INSERT INTO hospitals (name) VALUES (?)',
      ['Metro Medical Center']
    ) as any
    const hospital2Id = hospital2Result.insertId

    const [hospital3Result] = await database.execute(
      'INSERT INTO hospitals (name) VALUES (?)',
      ['Regional Health Clinic']
    ) as any
    const hospital3Id = hospital3Result.insertId

    // Create additional patient users
    const [patient2Result] = await database.execute(`
      INSERT INTO users (role, name, mobile, email) 
      VALUES (?, ?, ?, ?)
    `, ['PATIENT', 'Jane Smith', '+1234567894', 'jane.smith@example.com']) as any
    const patient2Id = patient2Result.insertId

    await database.execute(`
      INSERT INTO patient_profiles (
        user_id, id_proof_type, id_proof_number, emergency_contact, 
        biometric_fingerprint_ref, biometric_iris_ref
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      patient2Id, 'Driver License', 'DL123456789', '+1234567895',
      'fp_jane_smith_123', 'iris_jane_smith_456'
    ])

    const [patient3Result] = await database.execute(`
      INSERT INTO users (role, name, mobile, email) 
      VALUES (?, ?, ?, ?)
    `, ['PATIENT', 'Robert Johnson', '+1234567896', 'robert.j@example.com']) as any
    const patient3Id = patient3Result.insertId

    await database.execute(`
      INSERT INTO patient_profiles (
        user_id, id_proof_type, id_proof_number, emergency_contact, 
        biometric_fingerprint_ref, biometric_iris_ref
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      patient3Id, 'Passport', 'P12345678', '+1234567897',
      'fp_robert_johnson_123', 'iris_robert_johnson_456'
    ])

    // Create additional doctors
    const [doctor2Result] = await database.execute(`
      INSERT INTO users (role, name, mobile, email) 
      VALUES (?, ?, ?, ?)
    `, ['DOCTOR', 'Dr. Michael Brown', '+1234567898', 'dr.michael@example.com']) as any
    const doctor2Id = doctor2Result.insertId

    await database.execute(`
      INSERT INTO doctor_profiles (user_id, hospital_name) 
      VALUES (?, ?)
    `, [doctor2Id, 'Metro Medical Center'])

    const [doctor3Result] = await database.execute(`
      INSERT INTO users (role, name, mobile, email) 
      VALUES (?, ?, ?, ?)
    `, ['DOCTOR', 'Dr. Emily Davis', '+1234567899', 'dr.emily@example.com']) as any
    const doctor3Id = doctor3Result.insertId

    await database.execute(`
      INSERT INTO doctor_profiles (user_id, hospital_name) 
      VALUES (?, ?)
    `, [doctor3Id, 'Regional Health Clinic'])

    // Create additional operators
    const [operator2Result] = await database.execute(`
      INSERT INTO users (role, name, mobile, email, hospital_id) 
      VALUES (?, ?, ?, ?, ?)
    `, ['OPERATOR', 'Lisa Wilson', '+1234567900', 'lisa.operator@example.com', hospital2Id]) as any
    const operator2Id = operator2Result.insertId

    await database.execute(`
      INSERT INTO operator_profiles (user_id, hospital_id) 
      VALUES (?, ?)
    `, [operator2Id, hospital2Id])

    const [operator3Result] = await database.execute(`
      INSERT INTO users (role, name, mobile, email, hospital_id) 
      VALUES (?, ?, ?, ?, ?)
    `, ['OPERATOR', 'David Chen', '+1234567901', 'david.operator@example.com', hospital3Id]) as any
    const operator3Id = operator3Result.insertId

    await database.execute(`
      INSERT INTO operator_profiles (user_id, hospital_id) 
      VALUES (?, ?)
    `, [operator3Id, hospital3Id])

    console.log('✅ Enhanced seed data added successfully!')
    console.log('\n📊 TOTAL USERS IN SYSTEM:')
    
    const [allUsers] = await database.execute(
      'SELECT u.*, h.name as hospital_name FROM users u LEFT JOIN hospitals h ON u.hospital_id = h.id ORDER BY u.role, u.name'
    ) as any

    const usersByRole = allUsers.reduce((acc: any, user: any) => {
      if (!acc[user.role]) acc[user.role] = []
      acc[user.role].push(user)
      return acc
    }, {})

    console.log('\n👤 ALL PATIENTS:')
    usersByRole.PATIENT?.forEach((user: any, index: number) => {
      console.log(`   ${index + 1}. ${user.name} (${user.mobile})`)
    })

    console.log('\n👨‍⚕️ ALL DOCTORS:')
    usersByRole.DOCTOR?.forEach((user: any, index: number) => {
      console.log(`   ${index + 1}. ${user.name} (${user.mobile})`)
    })

    console.log('\n👨‍💼 ALL OPERATORS:')
    usersByRole.OPERATOR?.forEach((user: any, index: number) => {
      console.log(`   ${index + 1}. ${user.name} (${user.mobile}) - ${user.hospital_name}`)
    })

  } catch (error) {
    console.error('❌ Enhanced seed failed:', error)
    throw error
  }
}

// Run enhanced seed if called directly
if (require.main === module) {
  enhancedSeed()
    .then(() => {
      console.log('Enhanced seed completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Enhanced seed failed:', error)
      process.exit(1)
    })
}

export { enhancedSeed }