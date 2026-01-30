const axios = require('axios');
const logger = require('../utils/logger'); // Assuming logger exists, if not use console

const sendNotification = async (title, body, externalUserId, data = {}) => {
    // ANSI Colors
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
    console.log(`${cyan}│ User:  ${reset}${yellow}${externalUserId}${reset}`);
    if (Object.keys(data).length > 0) {
        console.log(`${cyan}│ Data:  ${reset}${JSON.stringify(data)}`);
    }

    try {
        const options = {
            method: 'POST',
            url: 'https://onesignal.com/api/v1/notifications',
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`
            },
            data: {
                app_id: process.env.ONESIGNAL_APP_ID,
                headings: { en: title },
                contents: { en: body },
                target_channel: 'push',
                include_aliases: {
                    external_id: [externalUserId] // Target specific user by their DB ID
                },
                data: data // Additional data like deep link info
            }
        };

        const response = await axios.request(options);

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
