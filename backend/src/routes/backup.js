// ============================================
// DATA BACKUP & RESTORE ROUTES
// File: backend/src/routes/backup.js
// ============================================

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const crypto = require('crypto');

// Get all backups for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT id, backup_name, backup_type, file_size, created_at, status
       FROM data_backups
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get backups' });
  }
});

// Create a new backup
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { backup_name, backup_type = 'full' } = req.body;

    // Gather all user data
    const [expenses, income, budgets, goals, challenges] = await Promise.all([
      query('SELECT * FROM expenses WHERE user_id = $1', [userId]),
      query('SELECT * FROM income WHERE user_id = $1', [userId]),
      query('SELECT * FROM budgets WHERE user_id = $1', [userId]),
      query('SELECT * FROM goals WHERE user_id = $1', [userId]),
      query('SELECT * FROM user_challenges WHERE user_id = $1', [userId])
    ]);

    const backupData = {
      version: '2.0',
      created_at: new Date().toISOString(),
      user_id: userId,
      data: {
        expenses: expenses.rows,
        income: income.rows,
        budgets: budgets.rows,
        goals: goals.rows,
        challenges: challenges.rows
      },
      counts: {
        expenses: expenses.rows.length,
        income: income.rows.length,
        budgets: budgets.rows.length,
        goals: goals.rows.length,
        challenges: challenges.rows.length
      }
    };

    // Generate checksum for data integrity
    const checksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(backupData))
      .digest('hex');

    const fileSize = Buffer.byteLength(JSON.stringify(backupData), 'utf8');

    // Store backup metadata
    const result = await query(
      `INSERT INTO data_backups (user_id, backup_name, backup_type, backup_data, file_size, checksum, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'completed')
       RETURNING id, backup_name, backup_type, file_size, created_at, status`,
      [userId, backup_name || `Backup ${new Date().toLocaleDateString()}`, backup_type, JSON.stringify(backupData), fileSize, checksum]
    );

    res.json({ 
      success: true, 
      data: result.rows[0],
      message: 'Backup created successfully',
      summary: backupData.counts
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Failed to create backup' });
  }
});

// Download backup data
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await query(
      `SELECT backup_data, backup_name, checksum
       FROM data_backups
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Backup not found' });
    }

    const backup = result.rows[0];
    
    // Verify checksum
    const currentChecksum = crypto
      .createHash('sha256')
      .update(backup.backup_data)
      .digest('hex');

    if (currentChecksum !== backup.checksum) {
      return res.status(500).json({ success: false, message: 'Backup data integrity check failed' });
    }

    res.json({ 
      success: true, 
      data: JSON.parse(backup.backup_data),
      filename: `${backup.backup_name.replace(/\s+/g, '_')}.json`
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Failed to download backup' });
  }
});

// Restore from backup
router.post('/:id/restore', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { mode = 'merge' } = req.body; // 'merge' or 'replace'

    const result = await query(
      `SELECT backup_data, checksum
       FROM data_backups
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Backup not found' });
    }

    const backup = result.rows[0];
    const backupData = JSON.parse(backup.backup_data);

    // Verify checksum
    const currentChecksum = crypto
      .createHash('sha256')
      .update(backup.backup_data)
      .digest('hex');

    if (currentChecksum !== backup.checksum) {
      return res.status(500).json({ success: false, message: 'Backup data integrity check failed' });
    }

    let restored = { expenses: 0, income: 0, budgets: 0, goals: 0 };

    if (mode === 'replace') {
      // Delete existing data first
      await Promise.all([
        query('DELETE FROM expenses WHERE user_id = $1', [userId]),
        query('DELETE FROM income WHERE user_id = $1', [userId]),
        query('DELETE FROM budgets WHERE user_id = $1', [userId]),
        query('DELETE FROM goals WHERE user_id = $1', [userId])
      ]);
    }

    // Restore expenses
    for (const expense of backupData.data.expenses) {
      try {
        await query(
          `INSERT INTO expenses (user_id, amount, category, description, expense_date)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT DO NOTHING`,
          [userId, expense.amount, expense.category, expense.description, expense.expense_date]
        );
        restored.expenses++;
      } catch (e) { /* Skip duplicates in merge mode */ }
    }

    // Restore income
    for (const inc of backupData.data.income) {
      try {
        await query(
          `INSERT INTO income (user_id, amount, source, description, income_date)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT DO NOTHING`,
          [userId, inc.amount, inc.source, inc.description, inc.income_date]
        );
        restored.income++;
      } catch (e) { /* Skip duplicates */ }
    }

    // Restore budgets
    for (const budget of backupData.data.budgets) {
      try {
        await query(
          `INSERT INTO budgets (user_id, category, amount, period, start_date)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT DO NOTHING`,
          [userId, budget.category, budget.amount, budget.period, budget.start_date]
        );
        restored.budgets++;
      } catch (e) { /* Skip duplicates */ }
    }

    // Restore goals
    for (const goal of backupData.data.goals) {
      try {
        await query(
          `INSERT INTO goals (user_id, name, target_amount, current_amount, deadline)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT DO NOTHING`,
          [userId, goal.name, goal.target_amount, goal.current_amount, goal.deadline]
        );
        restored.goals++;
      } catch (e) { /* Skip duplicates */ }
    }

    res.json({ 
      success: true, 
      message: `Data restored successfully (${mode} mode)`,
      restored
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Failed to restore backup' });
  }
});

// Import external backup
router.post('/import', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { backup_data, mode = 'merge' } = req.body;

    if (!backup_data || !backup_data.data) {
      return res.status(400).json({ success: false, message: 'Invalid backup format' });
    }

    // Validate version
    if (!backup_data.version || !backup_data.version.startsWith('2.')) {
      return res.status(400).json({ success: false, message: 'Unsupported backup version' });
    }

    let restored = { expenses: 0, income: 0, budgets: 0, goals: 0 };

    if (mode === 'replace') {
      await Promise.all([
        query('DELETE FROM expenses WHERE user_id = $1', [userId]),
        query('DELETE FROM income WHERE user_id = $1', [userId]),
        query('DELETE FROM budgets WHERE user_id = $1', [userId]),
        query('DELETE FROM goals WHERE user_id = $1', [userId])
      ]);
    }

    // Import data (same logic as restore)
    for (const expense of (backup_data.data.expenses || [])) {
      try {
        await query(
          `INSERT INTO expenses (user_id, amount, category, description, expense_date)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, expense.amount, expense.category, expense.description, expense.expense_date]
        );
        restored.expenses++;
      } catch (e) { /* Skip errors */ }
    }

    for (const inc of (backup_data.data.income || [])) {
      try {
        await query(
          `INSERT INTO income (user_id, amount, source, description, income_date)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, inc.amount, inc.source, inc.description, inc.income_date]
        );
        restored.income++;
      } catch (e) { /* Skip errors */ }
    }

    for (const budget of (backup_data.data.budgets || [])) {
      try {
        await query(
          `INSERT INTO budgets (user_id, category, amount, period, start_date)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, budget.category, budget.amount, budget.period, budget.start_date]
        );
        restored.budgets++;
      } catch (e) { /* Skip errors */ }
    }

    for (const goal of (backup_data.data.goals || [])) {
      try {
        await query(
          `INSERT INTO goals (user_id, name, target_amount, current_amount, deadline)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, goal.name, goal.target_amount, goal.current_amount, goal.deadline]
        );
        restored.goals++;
      } catch (e) { /* Skip errors */ }
    }

    res.json({ 
      success: true, 
      message: 'Import completed successfully',
      restored
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Failed to import backup' });
  }
});

// Delete a backup
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await query(
      'DELETE FROM data_backups WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Backup not found' });
    }

    res.json({ success: true, message: 'Backup deleted' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete backup' });
  }
});

// Get backup statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT 
        COUNT(*) as total_backups,
        MAX(created_at) as last_backup,
        SUM(file_size) as total_size
       FROM data_backups
       WHERE user_id = $1`,
      [userId]
    );

    const stats = result.rows[0];
    const lastBackup = stats.last_backup ? new Date(stats.last_backup) : null;
    const daysSinceBackup = lastBackup 
      ? Math.floor((new Date() - lastBackup) / (1000 * 60 * 60 * 24))
      : null;

    res.json({ 
      success: true, 
      data: {
        ...stats,
        days_since_backup: daysSinceBackup,
        needs_backup: daysSinceBackup === null || daysSinceBackup > 7,
        backup_reminder: daysSinceBackup > 7 
          ? `It's been ${daysSinceBackup} days since your last backup`
          : null
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get backup stats' });
  }
});

module.exports = router;
