// services/folderService.js
const Folder = require('../models/Folder');
const prisma = require('../config/prisma');
const { logActivity } = require('../services/activityService');

// 1. CONSTANTS
const MONTHS = [
    '1-APRIL', '2-MAY', '3-JUNE', '4-JULY', '5-AUGUST', '6-SEPTEMBER',
    '7-OCTOBER', '8-NOVEMBER', '9-DECEMBER', '10-JANUARY', '11-FEBRUARY', '12-MARCH'
];

const QUARTERS = ['Q1 - APR-JUN', 'Q2 - JUL-SEP', 'Q3 - OCT-DEC', 'Q4 - JAN-MAR'];

const getCurrentFYIndex = () => {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    return (month - 3 + 12) % 12; // April (3) -> 0, March (2) -> 11
};

// Helper to get financial years
const getFinancialYears = () => {
    // Generates current FY and maybe 2 past + 1 future
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-11

    // If before April, we are in (Year-1)-Year. If after April, Year-(Year+1)
    let startYear = currentMonth >= 3 ? currentYear : currentYear - 1;

    return [
        `FY - ${startYear - 2}-${startYear - 1}`,
        `FY - ${startYear - 1}-${startYear}`,
        `FY - ${startYear}-${startYear + 1}`, // Current
    ];
};
exports.getFinancialYears = getFinancialYears;


// 2. THE RECURSIVE BUILDER FUNCTION (With Category)
const createFolderRecursive = async (name, clientId, category, parentId = null, path = [], isPredefined = true) => {
    // Check if the folder already exists to avoid duplicates
    let folder = await prisma.folder.findFirst({
        where: {
            name,
            clientId,
            parentFolderId: parentId,
            isDeleted: false
        }
    });

    if (!folder) {
        folder = await prisma.folder.create({
            data: {
                name,
                clientId,
                category,
                parentFolderId: parentId,
                path: path || [],
                isPredefined: isPredefined
            }
        });
    }
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
        let kycFolder = await prisma.folder.findFirst({
            where: { clientId, name: 'KYC DOCUMENT' }
        });

        if (!kycFolder) {
            kycFolder = await createFolderRecursive('KYC DOCUMENT', clientId, 'KYC');

            // Create prebuilt empty document models (placeholders)
            const kycDocs = [
                'Pan Card', 'Adhar card', 'Udyam number', 'IEC code',
                'GST registration', 'Passport', 'Patnership doc', 'Address proof'
            ];

            const docsData = kycDocs.map(docName => ({
                clientId,
                folderId: kycFolder.id,
                fileName: docName,
                fileUrl: '', // empty means placeholder
                cloudinaryId: '', // placeholder
                fileSize: 0,
                uploadedBy: 'CA', // Default to CA
                category: 'KYC'
            }));

            await prisma.document.createMany({
                data: docsData
            });
        }

        // --- 2. Iterate through Financial Years (Root Folders) ---
        for (const year of financialYears) {
            // Create Year Folder at Root
            const yearRoot = await createFolderRecursive(year, clientId, 'GENERAL');
            const yearRootPath = [{ id: yearRoot.id, name: yearRoot.name }];

            // --- 2a. Income Tax (Inside Year) ---
            const itrFolder = await createFolderRecursive('ITR', clientId, 'ITR', yearRoot.id, yearRootPath);
            const itrPath = [...yearRootPath, { id: itrFolder.id, name: itrFolder.name }];

            // Add folders inside ITR
            await createFolderRecursive('Income Tax Return', clientId, 'ITR', itrFolder.id, itrPath);
            await createFolderRecursive('Bank statement', clientId, 'ITR', itrFolder.id, itrPath);

            // --- 2b. GST (Inside Year, Only if Business) ---
            if (hasGST) {
                const gstFolder = await createFolderRecursive('GST', clientId, 'GST', yearRoot.id, yearRootPath);
                const gstPath = [...yearRootPath, { id: gstFolder.id, name: gstFolder.name }];

                // Check if this is the current financial year
                const now = new Date();
                const currentYearNum = now.getFullYear();
                const currentMonthNum = now.getMonth();
                const systemStartYear = currentMonthNum >= 3 ? currentYearNum : currentYearNum - 1;
                const currentFYRootName = `FY - ${systemStartYear}-${systemStartYear + 1}`;

                if (year === currentFYRootName) {
                    // Current Year: Create folders from April up to current month
                    const currentFYIndex = getCurrentFYIndex();
                    for (let i = 0; i <= currentFYIndex; i++) {
                        const month = MONTHS[i];
                        const monthFolder = await createFolderRecursive(month, clientId, 'GST', gstFolder.id, gstPath);
                        const monthPath = [...gstPath, { id: monthFolder.id, name: monthFolder.name }];

                        await createFolderRecursive('Sale Bill', clientId, 'GST', monthFolder.id, monthPath);
                        await createFolderRecursive('Purchase Bill', clientId, 'GST', monthFolder.id, monthPath);
                    }
                } else {
                    // Past Years: Create ALL 12 months
                    for (const month of MONTHS) {
                        const monthFolder = await createFolderRecursive(month, clientId, 'GST', gstFolder.id, gstPath);
                        const monthPath = [...gstPath, { id: monthFolder.id, name: monthFolder.name }];

                        await createFolderRecursive('Sale Bill', clientId, 'GST', monthFolder.id, monthPath);
                        await createFolderRecursive('Purchase Bill', clientId, 'GST', monthFolder.id, monthPath);
                    }
                }
            }

            // --- 2c. TDS (Inside Year, Only if TAN exists) ---
            if (hasTAN) {
                const tdsFolder = await createFolderRecursive('TDS', clientId, 'TDS', yearRoot.id, yearRootPath);
                const tdsPath = [...yearRootPath, { id: tdsFolder.id, name: tdsFolder.name }];

                const quarterMonths = {
                    'Q1 - APR-JUN': ['April', 'May', 'June'],
                    'Q2 - JUL-SEP': ['July', 'August', 'September'],
                    'Q3 - OCT-DEC': ['October', 'November', 'December'],
                    'Q4 - JAN-MAR': ['January', 'February', 'March']
                };

                for (const quarter of Object.keys(quarterMonths)) {
                    const quarterFolder = await createFolderRecursive(quarter, clientId, 'TDS', tdsFolder.id, tdsPath);
                    const quarterPath = [...tdsPath, { id: quarterFolder.id, name: quarterFolder.name }];
                    
                    for (const month of quarterMonths[quarter]) {
                        await createFolderRecursive(month, clientId, 'TDS', quarterFolder.id, quarterPath);
                    }
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

// Function specifically for Cron job to generate next month's folder
exports.generateNextMonthGSTFolders = async () => {
    console.log(`[FolderService] Running Cron: Generating next month folders for all business clients...`);
    const nextFYIndex = (getCurrentFYIndex() + 1) % 12;
    const nextMonthName = MONTHS[nextFYIndex];

    try {
        const clients = await prisma.client.findMany({
            where: { type: 'BUSINESS' }
        });

        for (const client of clients) {
            // Find current FY folder for this client
            const financialYears = getFinancialYears();
            const currentYear = financialYears[financialYears.length - 1]; // Assume the last one is future/current

            let startYearStr = currentYear.match(/FY - (\d{4})/)?.[1];
            if (!startYearStr) continue;
            
            // Actually, we need to find the root folder for the CURRENT date's FY.
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            const startYear = month >= 3 ? year : year - 1;
            const fyName = `FY - ${startYear}-${startYear + 1}`;

            const yearRoot = await prisma.folder.findFirst({
                where: { clientId: client.id, name: fyName, parentFolderId: null }
            });

            if (!yearRoot) continue; // Should have been created by rollover

            const gstFolder = await prisma.folder.findFirst({
                where: { clientId: client.id, name: 'GST', parentFolderId: yearRoot.id }
            });

            if (!gstFolder) continue;

            const gstPath = [...yearRoot.path, { id: yearRoot.id, name: yearRoot.name }, { id: gstFolder.id, name: gstFolder.name }];
            
            const monthFolder = await createFolderRecursive(nextMonthName, client.id, 'GST', gstFolder.id, gstPath);
            const monthPath = [...gstPath, { id: monthFolder.id, name: monthFolder.name }];

            await createFolderRecursive('Sale Bill', client.id, 'GST', monthFolder.id, monthPath);
            await createFolderRecursive('Purchase Bill', client.id, 'GST', monthFolder.id, monthPath);
        }
        console.log(`[FolderService] Next month GST folders generated successfully.`);
    } catch (error) {
        console.error(`[FolderService] Error in generateNextMonthGSTFolders:`, error);
    }
};
