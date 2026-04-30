/**
 * Generate a proxy URL for file viewing that is HTTPS compatible.
 * @param {Object} req - Express request object
 * @param {string} fileId - The ID of the document
 * @returns {string} - The full URL to the backend's view proxy
 */
exports.getFileProxyUrl = (req, fileId) => {
    let protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host');

    // Force https on production domains to prevent Mixed Content errors
    if (host.includes('mycafiles.com') && !host.includes('localhost')) {
        protocol = 'https';
    }

    let url = `${protocol}://${host}/api/drive/files/view/${fileId}`;

    // Append token if present in request to allow authentication for iframes/images
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        url += `?token=${token}`;
    } else if (req.query.token) {
        url += `?token=${req.query.token}`;
    }

    return url;
};
