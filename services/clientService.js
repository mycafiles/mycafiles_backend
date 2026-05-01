const { getFileProxyUrl } = require('../utils/urlHelper');

const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const getFiscalMonthSequence = (name) => {
    const match = String(name || '').trim().match(/^(\d{1,2})-/);
    if (!match) return null;
    const monthNumber = parseInt(match[1], 10);
    return monthNumber >= 1 && monthNumber <= 12 ? monthNumber : null;
};

const getFolderPriority = (name) => {
    const lowerName = String(name || '').toLowerCase();
    if (lowerName.includes('sale')) return 1;
    if (lowerName.includes('purchase')) return 2;
    if (lowerName.includes('income')) return 3;
    if (lowerName.includes('bank')) return 4;
    return 99;
};

const compareFoldersByFiscalSequence = (a, b) => {
    const aSequence = getFiscalMonthSequence(a?.name);
    const bSequence = getFiscalMonthSequence(b?.name);

    if (aSequence !== null || bSequence !== null) {
        if (aSequence === null) return 1;
        if (bSequence === null) return -1;
        if (aSequence !== bSequence) return aSequence - bSequence;
    }

    const priorityDiff = getFolderPriority(a?.name) - getFolderPriority(b?.name);
    if (priorityDiff !== 0) return priorityDiff;

    return String(a?.name || '').localeCompare(String(b?.name || ''), undefined, {
        numeric: true,
        sensitivity: 'base'
    });
};

function isValidPanFormat(panNumber) {
    return panRegex.test(panNumber);
}

function isValidGstPanCombination(gstNumber, panNumber) {
    if (!gstNumber || !panNumber) return true;
    if (gstNumber.length < 12) return true;
    return gstNumber.substring(2, 12) === panNumber;
}

function buildClientUpdatePayload(body) {
    const { tradeName, tradeNumber, ...rest } = body;
    const finalTradeName = tradeName || tradeNumber;

    const updateData = { ...rest, tradeName: finalTradeName };
    if (updateData.gstNumber) {
        updateData.type = 'BUSINESS';
    } else if (updateData.panNumber || updateData.tanNumber) {
        updateData.type = 'INDIVIDUAL';
    }

    return updateData;
}

function mapClientWithLegacyId(client) {
    return { ...client, _id: client.id };
}

function mapClientListWithLegacyId(clients) {
    return clients.map(mapClientWithLegacyId);
}

function mapClientWithSignedFiles(req, client) {
    const { folders, documents, ...clientData } = client;
    const formattedFolders = folders.map((f) => ({ ...f, _id: f.id }));
    const signedFiles = documents.map((file) => ({
        ...file,
        _id: file.id,
        fileUrl: file.cloudinaryId ? getFileProxyUrl(req, file.id) : ''
    }));

    return {
        ...clientData,
        _id: client.id,
        folders: formattedFolders,
        files: signedFiles
    };
}

function mapCategorizedClients(req, clients) {
    return clients.map((client) => mapClientWithSignedFiles(req, client));
}

function buildClientDataResponse(req, client, folders, files) {
    const formattedFolders = [...folders].sort(compareFoldersByFiscalSequence).map((f) => ({
        ...f,
        _id: f.id,
        isDeletable: !f.isPredefined,
        isEditable: !f.isPredefined
    }));

    const buildTree = (parentId = null) => {
        return formattedFolders
            .filter((f) => f.parentFolderId === parentId)
            .sort(compareFoldersByFiscalSequence)
            .map((f) => ({
                ...f,
                subFolders: buildTree(f.id),
                files: files.filter((file) => file.folderId === f.id).map((file) => ({ ...file, _id: file.id }))
            }));
    };

    const hierarchy = buildTree(null);
    const rootFiles = files.filter((f) => f.folderId === null).map((f) => ({ ...f, _id: f.id }));
    const formattedFiles = files.map((f) => ({ ...f, _id: f.id }));

    const signedFiles = client.caId
        ? formattedFiles.map((file) => ({
            ...file,
            fileUrl: file.cloudinaryId ? getFileProxyUrl(req, file.id) : ''
        }))
        : formattedFiles;

    return {
        status: 'success',
        client: { ...client, _id: client.id },
        folders: formattedFolders,
        files: signedFiles,
        hierarchy: {
            rootFolders: hierarchy,
            rootFiles
        }
    };
}

module.exports = {
    isValidPanFormat,
    isValidGstPanCombination,
    buildClientUpdatePayload,
    mapClientWithLegacyId,
    mapClientListWithLegacyId,
    mapCategorizedClients,
    buildClientDataResponse,
    compareFoldersByFiscalSequence
};
