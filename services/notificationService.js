const axios = require('axios');
const Notification = require('../models/Notification');
const logger = require('../utils/logger'); // Assuming logger exists, if not use console

const RECIPIENT_CONFIG = {
    CA: {
        appIdEnv: 'ONESIGNAL_APP_ID',
        apiKeyEnv: 'ONESIGNAL_REST_API_KEY',
        externalIdPrefix: 'ca'
    },
    CLIENT: {
        appIdEnv: 'ONESIGNAL_APP_ID_2',
        apiKeyEnv: 'ONESIGNAL_REST_API_KEY_2',
        externalIdPrefix: 'client'
    }
};

const getOneSignalExternalId = (recipientId, recipientType = 'CA') => {
    const config = RECIPIENT_CONFIG[recipientType] || RECIPIENT_CONFIG.CA;
    const id = String(recipientId || '').trim();

    if (!id) return null;
    if (id.startsWith('ca_') || id.startsWith('client_')) return id;

    return `${config.externalIdPrefix}_${id}`;
};

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
            // Logic to determine recipient/sender types based on ID prefix or roles
            // For now, let's assume 'c' (cuid) or similar.
            // A better way: check if it's a CA or Client by ID (not yet available globally)
            // But we can pass it from controller!
            
            const notificationData = {
                title,
                message: body,
                type,
                metadata,
                senderId: options.senderId,
                senderType: options.senderType || 'CLIENT',
                senderUserId: options.senderUserId // Add this if CA is the sender
            };

            if (options.recipientType === 'CLIENT') {
                notificationData.clientId = recipientId;
            } else {
                notificationData.recipientId = recipientId;
            }

            notificationData.recipientType = options.recipientType || 'CA';

            await Notification.create(notificationData);
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
        const recipientType = options.recipientType === 'CLIENT' ? 'CLIENT' : 'CA';
        const recipientConfig = RECIPIENT_CONFIG[recipientType];
        const oneSignalExternalId = getOneSignalExternalId(recipientId, recipientType);
        const appId = process.env[recipientConfig.appIdEnv]?.trim();
        const apiKey = process.env[recipientConfig.apiKeyEnv]?.trim();

        if (!apiKey) {
            console.error(`[NotificationService] Error: ${recipientConfig.apiKeyEnv} is not defined in .env`);
        }
        if (!appId) {
            console.error(`[NotificationService] Error: ${recipientConfig.appIdEnv} is not defined in .env`);
        }
        if (!oneSignalExternalId) {
            console.error('[NotificationService] Error: recipientId is required for OneSignal external_id targeting');
            return null;
        }

        const osOptions = {
            method: 'POST',
            url: 'https://api.onesignal.com/notifications',
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Key ${apiKey}`
            },
            data: {
                app_id: appId,
                headings: { en: title },
                contents: { en: body },
                target_channel: 'push',
                include_aliases: {
                    external_id: [oneSignalExternalId]
                },
                data: data
            }
        };

        // Debug: Log Authorization header (partially masked)
        const auth = osOptions.headers.Authorization;
        if (auth && auth.length > 20) {
            console.log(`[NotificationService Debug] Auth Header: ${auth.substring(0, 15)}...${auth.substring(auth.length - 5)}`);
        } else {
            console.warn('[NotificationService Debug] Auth Header is invalid or too short');
        }
        console.log(`[NotificationService Debug] Target: ${recipientType} app via external_id=${oneSignalExternalId}`);

        const response = await axios.request(osOptions);

        console.log(`${cyan}├────────────────────────────────────────────────────────────────────────┤${reset}`);
        console.log(`${cyan}│ ✅ STATUS: SUCCESS                                                     │${reset}`);
        console.log(`${cyan}│ ID:     ${reset}${green}${response.data.id || 'N/A'}${reset}`);
        console.log(`${cyan}│ Recip:  ${reset}${green}${response.data.recipients ?? 0}${reset}`);
        if (response.data.errors) {
            console.log(`${cyan}│ Errors: ${reset}${red}${JSON.stringify(response.data.errors)}${reset}`);
        }
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
