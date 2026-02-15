const { query } = require('../config/database');

/**
 * Create a notification for a user
 */
const createNotification = async (userId, type, title, message) => {
  try {
    const result = await query(
      'INSERT INTO notifications (user_id, type, title, message) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, type, title, message]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Create notification error:', error);
    throw error;
  }
};

/**
 * Get user notifications
 */
const getUserNotifications = async (userId, limit = 20, offset = 0) => {
  try {
    const result = await query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1',
      [userId]
    );

    return {
      notifications: result.rows,
      total: parseInt(countResult.rows[0].count),
      unread: result.rows.filter(n => !n.is_read).length
    };
  } catch (error) {
    console.error('Get notifications error:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId, userId) => {
  try {
    const result = await query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [notificationId, userId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Mark as read error:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (userId) => {
  try {
    await query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    return true;
  } catch (error) {
    console.error('Mark all as read error:', error);
    throw error;
  }
};

/**
 * Delete notification
 */
const deleteNotification = async (notificationId, userId) => {
  try {
    await query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );

    return true;
  } catch (error) {
    console.error('Delete notification error:', error);
    throw error;
  }
};

/**
 * Get unread count
 */
const getUnreadCount = async (userId) => {
  try {
    const result = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Get unread count error:', error);
    throw error;
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount
};
