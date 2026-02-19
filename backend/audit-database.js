const { query } = require('./src/config/database');

async function auditDatabase() {
  console.log('🔍 KudiSave Database Audit - Checking all tables\n');
  
  try {
    // Get all tables
    const tableResult = await query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    );

    const tables = tableResult.rows.map(r => r.table_name);
    console.log(`📊 Total tables: ${tables.length}\n`);

    const audit = {};

    for (const table of tables) {
      // Get row count
      const countResult = await query(`SELECT COUNT(*) as count FROM ${table}`);
      const rowCount = countResult.rows[0].count;
      
      // Get columns
      const columnResult = await query(
        `SELECT column_name, data_type, is_nullable 
         FROM information_schema.columns 
         WHERE table_name = $1 
         ORDER BY ordinal_position`,
        [table]
      );

      audit[table] = {
        rows: parseInt(rowCount),
        columns: columnResult.rows.length,
        columnDetails: columnResult.rows
      };
    }

    // Display audit results
    Object.entries(audit).forEach(([table, info]) => {
      console.log(`📋 ${table}`);
      console.log(`   Rows: ${info.rows}`);
      console.log(`   Columns: ${info.columns}`);
      if (info.rows === 0) {
        console.log(`   ⚠️  EMPTY TABLE`);
      }
      console.log();
    });

    // Check for critical tables and their relationships
    console.log('\n🔗 Data Integrity Checks:\n');

    // Check users
    const userCount = await query('SELECT COUNT(*) as count FROM users');
    console.log(`✅ Users: ${userCount.rows[0].count}`);

    // Check if expenses are linked to users
    const orphanExpenses = await query(
      `SELECT COUNT(*) as count FROM expenses WHERE user_id NOT IN (SELECT id FROM users)`
    );
    if (parseInt(orphanExpenses.rows[0].count) > 0) {
      console.log(`❌ Orphaned expenses: ${orphanExpenses.rows[0].count}`);
    } else {
      console.log(`✅ All expenses linked to users`);
    }

    // Check if goals are linked to users
    const orphanGoals = await query(
      `SELECT COUNT(*) as count FROM goals WHERE user_id NOT IN (SELECT id FROM users)`
    );
    if (parseInt(orphanGoals.rows[0].count) > 0) {
      console.log(`❌ Orphaned goals: ${orphanGoals.rows[0].count}`);
    } else {
      console.log(`✅ All goals linked to users`);
    }

    // Check if income is linked to users
    const orphanIncome = await query(
      `SELECT COUNT(*) as count FROM income WHERE user_id NOT IN (SELECT id FROM users)`
    );
    if (parseInt(orphanIncome.rows[0].count) > 0) {
      console.log(`❌ Orphaned income: ${orphanIncome.rows[0].count}`);
    } else {
      console.log(`✅ All income linked to users`);
    }

    // Sample data verification
    console.log('\n📊 Sample Data:\n');

    const sampleUser = await query('SELECT id, name, email, phone_verified FROM users LIMIT 1');
    if (sampleUser.rows.length > 0) {
      const user = sampleUser.rows[0];
      console.log(`Sample User: ${user.name} (${user.email})`);
      console.log(`Phone Verified: ${user.phone_verified}`);

      // Check user's data
      const userExpenses = await query(
        'SELECT COUNT(*) as count FROM expenses WHERE user_id = $1',
        [user.id]
      );
      console.log(`User's Expenses: ${userExpenses.rows[0].count}`);

      const userGoals = await query(
        'SELECT COUNT(*) as count FROM goals WHERE user_id = $1',
        [user.id]
      );
      console.log(`User's Goals: ${userGoals.rows[0].count}`);

      const userIncome = await query(
        'SELECT COUNT(*) as count FROM income WHERE user_id = $1',
        [user.id]
      );
      console.log(`User's Income: ${userIncome.rows[0].count}`);
    }

    console.log('\n✨ Audit Complete!\n');

    process.exit(0);
  } catch (error) {
    console.log('❌ Audit Error:', error.message);
    process.exit(1);
  }
}

auditDatabase();
