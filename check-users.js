const { executeSQLiteQuery } = require('./database/sqlite.js');

async function checkUsers() {
  console.log('🔍 Checking users in database...\n');

  try {
    const users = await executeSQLiteQuery('SELECT id, name, mobile, email, role FROM users');
    
    console.log('👥 ALL USERS:');
    if (users.length === 0) {
      console.log('   No users found');
    } else {
      users.forEach(user => {
        console.log(`   ${user.role}: ${user.name} - ${user.mobile} - ${user.email}`);
      });
    }

    console.log('\n👤 PATIENTS ONLY:');
    const patients = await executeSQLiteQuery('SELECT id, name, mobile, email FROM users WHERE role = "PATIENT"');
    if (patients.length === 0) {
      console.log('   No patients found');
    } else {
      patients.forEach(patient => {
        console.log(`   ${patient.name} - ${patient.mobile} - ${patient.email}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUsers();