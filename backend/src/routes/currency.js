// ============================================
// CURRENCY ROUTES
// File: backend/src/routes/currency.js
// ============================================

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get all currencies
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM currencies WHERE is_active = TRUE ORDER BY code');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching currencies:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch currencies' });
  }
});

// Get exchange rates
router.get('/rates', async (req, res) => {
  try {
    const { base = 'GHS' } = req.query;

    const result = await query(
      `SELECT 
        from_currency, to_currency, rate, fetched_at
       FROM exchange_rates 
       WHERE from_currency = $1 OR to_currency = $1
       ORDER BY to_currency`,
      [base]
    );

    res.json({ success: true, data: result.rows, base_currency: base });
  } catch (error) {
    console.error('Error fetching rates:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch exchange rates' });
  }
});

// Convert amount
router.post('/convert', async (req, res) => {
  try {
    const { amount, from_currency, to_currency } = req.body;

    if (!amount || !from_currency || !to_currency) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (from_currency === to_currency) {
      return res.json({ 
        success: true, 
        data: { 
          original_amount: amount,
          converted_amount: amount,
          from_currency,
          to_currency,
          rate: 1
        }
      });
    }

    const result = await query(
      'SELECT rate FROM exchange_rates WHERE from_currency = $1 AND to_currency = $2',
      [from_currency, to_currency]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Exchange rate not found' });
    }

    const rate = parseFloat(result.rows[0].rate);
    const convertedAmount = Math.round(amount * rate * 100) / 100;

    res.json({ 
      success: true, 
      data: {
        original_amount: amount,
        converted_amount: convertedAmount,
        from_currency,
        to_currency,
        rate
      }
    });
  } catch (error) {
    console.error('Error converting:', error);
    res.status(500).json({ success: false, message: 'Failed to convert currency' });
  }
});

// Get user's default currency settings
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT us.default_currency, c.name as currency_name, c.symbol
       FROM user_settings us
       JOIN currencies c ON us.default_currency = c.code
       WHERE us.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Return default if no settings
      return res.json({ 
        success: true, 
        data: { default_currency: 'GHS', currency_name: 'Ghanaian Cedi', symbol: '₵' }
      });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch currency settings' });
  }
});

// Update user's default currency
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { default_currency } = req.body;

    // Verify currency exists
    const currencyCheck = await query(
      'SELECT code FROM currencies WHERE code = $1 AND is_active = TRUE',
      [default_currency]
    );

    if (currencyCheck.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid currency code' });
    }

    // Upsert user settings
    const result = await query(
      `INSERT INTO user_settings (user_id, default_currency)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET default_currency = $2
       RETURNING *`,
      [userId, default_currency]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, message: 'Failed to update currency settings' });
  }
});

// Refresh exchange rates (admin/cron job)
router.post('/rates/refresh', async (req, res) => {
  try {
    // In production, this would fetch from an external API
    // For now, just update the timestamp
    await query(
      'UPDATE exchange_rates SET fetched_at = CURRENT_TIMESTAMP'
    );

    res.json({ success: true, message: 'Exchange rates refreshed' });
  } catch (error) {
    console.error('Error refreshing rates:', error);
    res.status(500).json({ success: false, message: 'Failed to refresh rates' });
  }
});

module.exports = router;
