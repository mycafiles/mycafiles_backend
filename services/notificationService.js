const axios = require('axios');
const Notification = require('../models/Notification');
const logger = require('../utils/logger'); // Assuming logger exists, if not use console

/**
 * Send notification via OneSignal and optionally save to Database
 * @param {string} title - Notification Title
 * @param {string} body - Notification Body
 * @param {string} recipientId - The DB ID of the recipient (CA User)
 * @param {Object} options - Additional options
 * @param {Object} [options.data] - Additional metadata for OneSignal
 * @param {boolean} [options.saveToDb] - Whether to save to Notification collection
 * @param {string} [options.senderId] - The DB ID of the sender (Client)
 * @param {string} [options.type] - Notification category (enum)
 * @param {Object} [options.metadata] - DB metadata (docId, folderId, etc)
 */
const sendNotification = async (title, body, recipientId, options = {}) => {
    const { data = {}, saveToDb = false, senderId, type = 'GENERAL', metadata = {} } = options;

    // 1. Save to Database if requested
    if (saveToDb) {
        try {
            await Notification.create({
                recipient: recipientId,
                sender: senderId,
                title,
                message: body,
                type,
                metadata
            });
            console.log('[NotificationService] Saved to database');
        } catch (dbError) {
            console.error('[NotificationService] Database Save Failed:', dbError);
        }
    }

    // ANSI Colors for logging
    const cyan = '\x1b[36m';
    const yellow = '\x1b[33m';
    const green = '\x1b[32m';
    const red = '\x1b[31m';
    const reset = '\x1b[0m';
    const bold = '\x1b[1m';

    console.log(`\n${cyan}${bold}┌────────────────────────────────────────────────────────────────────────┐${reset}`);
    console.log(`${cyan}│ 🚀 ONESIGNAL NOTIFICATION REQUEST                                      │${reset}`);
    console.log(`${cyan}├────────────────────────────────────────────────────────────────────────┤${reset}`);
    console.log(`${cyan}│ Title: ${reset}${yellow}${title}${reset}`);
    console.log(`${cyan}│ Body:  ${reset}${yellow}${body}${reset}`);
    console.log(`${cyan}│ User:  ${reset}${yellow}${recipientId}${reset}`);
    if (Object.keys(data).length > 0) {
        console.log(`${cyan}│ Data:  ${reset}${JSON.stringify(data)}`);
    }

    try {
        const osOptions = {
            method: 'POST',
            url: 'https://onesignal.com/api/v1/notifications',
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Key ${process.env.ONESIGNAL_REST_API_KEY}`
            },
            data: {
                app_id: process.env.ONESIGNAL_APP_ID,
                headings: { en: title },
                contents: { en: body },
                target_channel: 'push',
                include_aliases: {
                    external_id: [recipientId]
                },
                data: data
            }
        };

        const response = await axios.request(osOptions);

        console.log(`${cyan}├────────────────────────────────────────────────────────────────────────┤${reset}`);
        console.log(`${cyan}│ ✅ STATUS: SUCCESS                                                     │${reset}`);
        console.log(`${cyan}│ ID:     ${reset}${green}${response.data.id}${reset}`);
        console.log(`${cyan}│ Recip:  ${reset}${green}${response.data.recipients}${reset}`);
        console.log(`${cyan}└────────────────────────────────────────────────────────────────────────┘${reset}\n`);

        return response.data;
    } catch (error) {
        console.log(`${cyan}├────────────────────────────────────────────────────────────────────────┤${reset}`);
        console.log(`${cyan}│ ❌ STATUS: FAILED                                                      │${reset}`);
        console.log(`${cyan}│ Error:  ${reset}${red}${error.message}${reset}`);
        if (error.response) {
            console.log(`${cyan}│ Resp:   ${reset}${red}${JSON.stringify(error.response.data)}${reset}`);
        }
        console.log(`${cyan}└────────────────────────────────────────────────────────────────────────┘${reset}\n`);

        // Don't throw error to prevent blocking main flow
        return null;
    }
};

module.exports = { sendNotification };
