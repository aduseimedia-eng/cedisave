const { query } = require('./src/config/database');

async function checkGoalsTable() {
  try {
    // Check if goals table exists
    const tableCheck = await query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'goals'
      )`
    );
    
    console.log('Goals table exists:', tableCheck.rows[0].exists);
    
    // Get column info
    if (tableCheck.rows[0].exists) {
      const columns = await query(
        `SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'goals'
        ORDER BY ordinal_position`
      );
      console.log('\nGoals table columns:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }

    // Check how many goals exist
    const goalCount = await query('SELECT COUNT(*) FROM goals');
    console.log(`\nTotal goals in database: ${goalCount.rows[0].count}`);

    process.exit(0);
  } catch (error) {
    console.log('Error:', error.message);
    process.exit(1);
  }
}

checkGoalsTable();
