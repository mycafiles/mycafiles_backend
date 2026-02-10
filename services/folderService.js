// services/folderService.js
const Folder = require('../models/Folder');
const { logActivity } = require('../services/activityService');

// 1. CONSTANTS
const MONTHS = [
    '1-APRIL', '2-MAY', '3-JUNE', '4-JULY', '5-AUGUST', '6-SEPTEMBER',
    '7-OCTOBER', '8-NOVEMBER', '9-DECEMBER', '10-JANUARY', '11-FEBRUARY', '12-MARCH'
];

const QUARTERS = ['Q1 - APR-JUN', 'Q2 - JUL-SEP', 'Q3 - OCT-DEC', 'Q4 - JAN-MAR'];

// Helper to get financial years
const getFinancialYears = () => {
    // Generates current FY and maybe 2 past + 1 future
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-11

    // If before April, we are in (Year-1)-Year. If after April, Year-(Year+1)
    let startYear = currentMonth >= 3 ? currentYear : currentYear - 1;

    return [
        `FY - ${startYear - 2}-${(startYear - 1).toString().slice(-2)}`,
        `FY - ${startYear - 1}-${startYear.toString().slice(-2)}`,
        `FY - ${startYear}-${(startYear + 1).toString().slice(-2)}`, // Current
    ];
};


// 2. THE RECURSIVE BUILDER FUNCTION (With Category)
const createFolderRecursive = async (name, clientId, category, parentId = null, path = []) => {
    // console.log(`[FolderService] Creating folder: "${name}" (${category})`);
    const folder = await Folder.create({
        name,
        clientId,
        category,
        parentFolderId: parentId,
        path: path
    });
    return folder;
};

// 3. MAIN FUNCTION
exports.generateClientFolders = async (clientId, clientData) => {
    console.log(`[FolderService] Generating structure for client: ${clientId}`);
    const financialYears = getFinancialYears();

    // Extract GST/TAN availability
    // Extract GST/TAN availability
    // LOGIC UPDATE: 'BUSINESS' clients get GST folders, 'INDIVIDUAL' do not.
    // TAN logic remains based on tanNumber existence for now (or could be implied).
    const isBusiness = clientData.type === 'BUSINESS';
    const hasGST = isBusiness; // Business clients get GST folder regardless of number? Or if they have number? User said "Business Client Should have default GST folder"
    // "Individual client have itr only".

    // Explicitly using type as requested
    const hasTAN = !!clientData.tanNumber;

    try {
        // --- 1. KYC (One-time Root Folder, Always) ---
        await createFolderRecursive('KYC DOCUMENT', clientId, 'KYC');

        // --- 2. Iterate through Financial Years (Root Folders) ---
        for (const year of financialYears) {
            // Create Year Folder at Root
            const yearRoot = await createFolderRecursive(year, clientId, 'GENERAL');
            const yearRootPath = [{ _id: yearRoot._id, name: yearRoot.name }];

            // --- 2a. Income Tax (Inside Year) ---
            const itrFolder = await createFolderRecursive('Income Tax', clientId, 'ITR', yearRoot._id, yearRootPath);
            const itrPath = [...yearRootPath, { _id: itrFolder._id, name: itrFolder.name }];

            // Add "Bank statement" inside Income Tax
            await createFolderRecursive('Bank statement', clientId, 'ITR', itrFolder._id, itrPath);

            // --- 2b. GST (Inside Year, Only if Business) ---
            if (hasGST) {
                const gstFolder = await createFolderRecursive('GST', clientId, 'GST', yearRoot._id, yearRootPath);
                const gstPath = [...yearRootPath, { _id: gstFolder._id, name: gstFolder.name }];

                // Create Months inside GST
                for (const month of MONTHS) {
                    const monthFolder = await createFolderRecursive(month, clientId, 'GST', gstFolder._id, gstPath);
                    const monthPath = [...gstPath, { _id: monthFolder._id, name: monthFolder.name }];

                    // Sales and Purchase Bills folders inside "Month"
                    await createFolderRecursive('Sale Bill', clientId, 'GST', monthFolder._id, monthPath);
                    await createFolderRecursive('Purchase Bill', clientId, 'GST', monthFolder._id, monthPath);
                }
            }

            // --- 2c. TDS (Inside Year, Only if TAN exists) ---
            if (hasTAN) {
                const tdsFolder = await createFolderRecursive('TDS', clientId, 'TDS', yearRoot._id, yearRootPath);
                const tdsPath = [...yearRootPath, { _id: tdsFolder._id, name: tdsFolder.name }];

                for (const quarter of QUARTERS) {
                    await createFolderRecursive(quarter, clientId, 'TDS', tdsFolder._id, tdsPath);
                }
            }
        }

        await logActivity({
            caId: clientData?.caId, // Try to get caId from clientData if passed
            action: 'GENERATE_FOLDERS',
            details: `Generated standard folder structure for client: ${clientData?.name || clientId}`,
            clientId: clientId
        });

        console.log(`[FolderService] Folders generated successfully.`);

    } catch (error) {
        console.error(`[FolderService] ERROR:`, error);
    }
};
