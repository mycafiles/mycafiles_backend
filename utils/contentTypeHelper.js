/**
 * Resolves HTTP Content-Type for downloads/previews when DB stores MIME, shorthand,
 * or inconsistent legacy values.
 */
const EXT_TO_MIME = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    txt: 'text/plain',
    csv: 'text/csv',
    html: 'text/html',
    htm: 'text/html',
    json: 'application/json',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const SHORTHAND_TO_MIME = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    csv: 'text/csv',
    txt: 'text/plain',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function extensionFromFilename(fileName) {
    if (!fileName || typeof fileName !== 'string') return '';
    const base = fileName.split('?')[0].split('#')[0];
    const m = /\.([a-z0-9]+)$/i.exec(base);
    return m ? m[1].toLowerCase() : '';
}

function looksLikeMime(s) {
    return typeof s === 'string' && /^[a-z0-9][a-z0-9._+-]+\/[a-z0-9][a-z0-9._+-]+$/i.test(s.trim());
}

/**
 * @param {string|null|undefined} storedFileType
 * @param {string|null|undefined} fileName
 * @returns {string}
 */
function resolveContentType(storedFileType, fileName) {
    const raw = (storedFileType && String(storedFileType).trim()) || '';
    if (raw && looksLikeMime(raw)) {
        return raw;
    }

    const upperish = raw.toUpperCase().replace(/^IMAGE\//, '');
    const shorthand =
        upperish === 'JPG'
            ? 'jpeg'
            : upperish.startsWith('.')
              ? upperish.slice(1).toLowerCase()
              : raw.replace(/^\./, '').toLowerCase();

    if (shorthand && SHORTHAND_TO_MIME[shorthand]) {
        return SHORTHAND_TO_MIME[shorthand];
    }

    const ext = extensionFromFilename(fileName || '');
    if (ext && EXT_TO_MIME[ext]) {
        return EXT_TO_MIME[ext];
    }

    return 'application/octet-stream';
}

module.exports = { resolveContentType, extensionFromFilename };
