const ActivityLog = require('../models/ActivityLog');

/**
 * Log an activity to the database
 * @param {Object} data - Activity data
 * @param {string} data.caId - The ID of the CA performing the action
 * @param {string} data.action - The action type (enum value)
 * @param {string} data.details - Human readable description
 * @param {string} [data.clientId] - Associated client ID
 * @param {string} [data.clientName] - Associated client name
 * @param {string} [data.docId] - Associated document ID
 * @param {string} [data.folderId] - Associated folder ID
 */
exports.logActivity = async (data) => {
    try {
        await ActivityLog.create(data);
    } catch (error) {
        console.error('[ActivityService] Error logging activity:', error);
        // We don't throw error here to prevent blocking the main operation
    }
};
