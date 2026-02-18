const { pool } = require('./src/config/database');
require('dotenv').config();

async function fix() {
  const client = await pool.connect();
  try {
    // 1. Add missing is_paid column to bill_reminders
    console.log('Adding is_paid column to bill_reminders...');
    await client.query(`ALTER TABLE bill_reminders ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE`);
    console.log('✅ is_paid column added');

    // 2. Create the upcoming_bills view (now that is_paid exists)
    console.log('Creating upcoming_bills view...');
    await client.query(`
      CREATE OR REPLACE VIEW upcoming_bills AS
      SELECT 
          br.*,
          CASE 
              WHEN due_date <= CURRENT_DATE THEN 'overdue'
              WHEN due_date <= CURRENT_DATE + reminder_days_before THEN 'due_soon'
              ELSE 'upcoming'
          END as status,
          due_date - CURRENT_DATE as days_until_due
      FROM bill_reminders br
      WHERE is_active = TRUE AND (is_paid = FALSE OR frequency != 'once')
      ORDER BY due_date ASC
    `);
    console.log('✅ upcoming_bills view created');

    // 3. Insert savings_challenges seed data if empty
    const count = await client.query(`SELECT COUNT(*) FROM savings_challenges`);
    if (parseInt(count.rows[0].count) === 0) {
      console.log('Inserting savings challenge seed data...');
      await client.query(`
        INSERT INTO savings_challenges (title, description, challenge_type, target_amount, target_days, xp_reward, difficulty) VALUES
          ('No-Spend Weekend', 'Spend nothing on Saturday and Sunday', 'no_spend', NULL, 2, 50, 'easy'),
          ('Save ₵50 This Week', 'Save at least ₵50 by the end of the week', 'save_amount', 50, 7, 75, 'easy'),
          ('Save ₵200 This Month', 'Save at least ₵200 this month', 'save_amount', 200, 30, 150, 'medium'),
          ('Cut Transport Costs', 'Reduce transport spending by 30%', 'reduce_category', NULL, 7, 100, 'medium'),
          ('7-Day Streak', 'Log expenses for 7 consecutive days', 'streak', NULL, 7, 100, 'easy'),
          ('No Betting Week', 'No betting/gaming expenses for a week', 'no_spend', NULL, 7, 150, 'hard'),
          ('Frugal Foodie', 'Keep food expenses under ₵100 for a week', 'save_amount', 100, 7, 100, 'medium'),
          ('Data Detox', 'Reduce data/airtime spending by 50%', 'reduce_category', NULL, 7, 120, 'hard'),
          ('30-Day Saver', 'Save something every day for 30 days', 'streak', NULL, 30, 300, 'extreme'),
          ('Budget Master', 'Stay under budget for 4 weeks', 'custom', NULL, 28, 250, 'hard')
      `);
      console.log('✅ Savings challenges seeded');
    } else {
      console.log('⏭️  Savings challenges already seeded (' + count.rows[0].count + ' rows)');
    }

    // Verify everything
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name
    `);
    const views = await client.query(`
      SELECT table_name FROM information_schema.views 
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    
    console.log('\n✅ All fixed! Database has ' + tables.rows.length + ' tables and ' + views.rows.length + ' views.');
    
  } finally {
    client.release();
    await pool.end();
  }
}
fix().catch(e => { console.error('❌', e.message); process.exit(1); });
