// services/folderService.js
const Folder = require('../models/Folder');

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
        await createFolderRecursive('KYC', clientId, 'KYC');

        // --- 2. Income Tax (For Everyone) ---
        // Root: "Income Tax"
        const itrRoot = await createFolderRecursive('Income Tax', clientId, 'ITR');
        const itrRootPath = [{ _id: itrRoot._id, name: itrRoot.name }];

        for (const year of financialYears) {
            // "Income Tax" -> "FY-202X-2Y"
            await createFolderRecursive(year, clientId, 'ITR', itrRoot._id, itrRootPath);
        }

        // --- 3. GST (Only if GST Number exists) ---
        if (hasGST) {
            // Root: "GST"
            const gstRoot = await createFolderRecursive('GST', clientId, 'GST');
            const gstRootPath = [{ _id: gstRoot._id, name: gstRoot.name }];

            for (const year of financialYears) {
                // "GST" -> "FY-202X-2Y"
                const yearFolder = await createFolderRecursive(year, clientId, 'GST', gstRoot._id, gstRootPath);
                const yearPath = [...gstRootPath, { _id: yearFolder._id, name: yearFolder.name }];

                // Create Months
                for (const month of MONTHS) {
                    const monthFolder = await createFolderRecursive(month, clientId, 'GST', yearFolder._id, yearPath);
                    const monthPath = [...yearPath, { _id: monthFolder._id, name: monthFolder.name }];

                    // Sales and Purchase Bills folders inside "Month"
                    await createFolderRecursive('Sale Bill', clientId, 'GST', monthFolder._id, monthPath);
                    await createFolderRecursive('Purchase Bill', clientId, 'GST', monthFolder._id, monthPath);
                }
            }
        }

        // --- 4. TDS (Only if TDS Number exists) ---
        if (hasTAN) {
            const tanRoot = await createFolderRecursive('TDS', clientId, 'TDS');
            const tanRootPath = [{ _id: tanRoot._id, name: tanRoot.name }];

            for (const year of financialYears) {
                const yearFolder = await createFolderRecursive(year, clientId, 'TDS', tanRoot._id, tanRootPath);
                const yearPath = [...tanRootPath, { _id: yearFolder._id, name: yearFolder.name }];

                for (const quarter of QUARTERS) {
                    await createFolderRecursive(quarter, clientId, 'TDS', yearFolder._id, yearPath);
                }
            }
        }

        console.log(`[FolderService] Folders generated successfully.`);

    } catch (error) {
        console.error(`[FolderService] ERROR:`, error);
    }
};
