const { query } = require('./src/config/database');

async function checkUsersColumns() {
  try {
    const result = await query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'users' 
       ORDER BY ordinal_position`
    );
    
    console.log('Users table columns:');
    result.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Check if profile columns exist
    const hasProfile = result.rows.some(c => c.column_name === 'profile_picture');
    const hasTheme = result.rows.some(c => c.column_name === 'theme');
    const hasCurrency = result.rows.some(c => c.column_name === 'currency');
    
    console.log('\n--- Profile column status ---');
    console.log('profile_picture:', hasProfile ? '✅ EXISTS' : '❌ MISSING');
    console.log('theme:', hasTheme ? '✅ EXISTS' : '❌ MISSING');
    console.log('currency:', hasCurrency ? '✅ EXISTS' : '❌ MISSING');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUsersColumns();
