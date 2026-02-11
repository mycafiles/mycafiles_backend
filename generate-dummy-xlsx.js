const XLSX = require('xlsx');
const path = require('path');

const data = [
    {
        name: "Rahul Sharma",
        mobileNumber: "9876543210",
        panNumber: "ABCDE1234F",
        type: "BUSINESS",
        dob: "1990-01-01",
        gstNumber: "22ABCDE1234F1Z5",
        tanNumber: "TAN1234567",
        tradeNumber: "Rahul Trades",
        address: "Mumbai Maharashtra"
    },
    {
        name: "Raj Patel",
        mobileNumber: "9123456789",
        panNumber: "FGHIJ5678K",
        type: "INDIVIDUAL",
        dob: "1985-05-15",
        gstNumber: "",
        tanNumber: "",
        tradeNumber: "Raj Services",
        address: "Ahmedabad Gujarat"
    },
    {
        name: "Priya Gupta",
        mobileNumber: "9988776655",
        panNumber: "KLMNO9012P",
        type: "BUSINESS",
        dob: "1992-08-20",
        gstNumber: "27KLMNO9012P1ZA",
        tanNumber: "",
        tradeNumber: "Priya Enterprises",
        address: "Pune Maharashtra"
    },
    {
        name: "Amit Singh",
        mobileNumber: "9876543211",
        panNumber: "QRSTU3456V",
        type: "INDIVIDUAL",
        dob: "1988-12-10",
        gstNumber: "",
        tanNumber: "",
        tradeNumber: "Amit Consult",
        address: "Delhi"
    },
    {
        name: "Sneha Reddy",
        mobileNumber: "9123456780",
        panNumber: "WXYZA7890B",
        type: "BUSINESS",
        dob: "1994-03-25",
        gstNumber: "37WXYZA7890B1Z2",
        tanNumber: "TAN7654321",
        tradeNumber: "Sneha Solutions",
        address: "Hyderabad"
    },
    {
        name: "Vikram Verama",
        mobileNumber: "9988776644",
        panNumber: "CDEFG1234H",
        type: "INDIVIDUAL",
        dob: "1982-11-30",
        gstNumber: "",
        tanNumber: "",
        tradeNumber: "Vikram Works",
        address: "Bangalore"
    },
    {
        name: "Kavita Iyer",
        mobileNumber: "9876543212",
        panNumber: "IJKLM5678N",
        type: "BUSINESS",
        dob: "1991-07-05",
        gstNumber: "33IJKLM5678N1Z9",
        tanNumber: "",
        tradeNumber: "Iyer Group",
        address: "Chennai"
    },
    {
        name: "Manish Jain",
        mobileNumber: "9123456781",
        panNumber: "OPQRS9012T",
        type: "INDIVIDUAL",
        dob: "1987-02-14",
        gstNumber: "",
        tanNumber: "",
        tradeNumber: "Jain & Co",
        address: "Kolkata"
    },
    {
        name: "Ananya Das",
        mobileNumber: "9988776633",
        panNumber: "UVWXY3456Z",
        type: "BUSINESS",
        dob: "1993-09-12",
        gstNumber: "19UVWXY3456Z1Z8",
        tanNumber: "TAN9876543",
        tradeNumber: "Das Industries",
        address: "Bhubaneswar"
    },
    {
        name: "",
        mobileNumber: "9000000000",
        panNumber: "ERROR1234E",
        type: "BUSINESS",
        dob: "1990-01-01",
        gstNumber: "22ERROR1234E1Z5",
        tanNumber: "",
        tradeNumber: "Missing Name",
        address: "Error Row"
    },
    {
        name: "Invalid Pan",
        mobileNumber: "9000000001",
        panNumber: "PAN123",
        type: "INDIVIDUAL",
        dob: "1990-01-01",
        gstNumber: "",
        tanNumber: "",
        tradeNumber: "Short PAN",
        address: "Error Row"
    },
    {
        name: "GST Mismatch",
        mobileNumber: "9000000002",
        panNumber: "BCDEF1234G",
        type: "BUSINESS",
        dob: "1990-01-01",
        gstNumber: "22ABCDE1234F1Z5",
        tanNumber: "",
        tradeNumber: "GST not matching PAN",
        address: "Error Row"
    },
    {
        name: "Missing Type",
        mobileNumber: "9000000003",
        panNumber: "CDEFG5678H",
        type: "",
        dob: "1990-01-01",
        gstNumber: "",
        tanNumber: "",
        tradeNumber: "No Type",
        address: "Error Row"
    },
    {
        name: "Missing DOB",
        mobileNumber: "9000000004",
        panNumber: "DEFGH9012I",
        type: "INDIVIDUAL",
        dob: "",
        gstNumber: "",
        tanNumber: "",
        tradeNumber: "No DOB",
        address: "Error Row"
    }
];

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "DummyData");

const outputPath = path.join(__dirname, 'dummy_data.xlsx');
XLSX.writeFile(wb, outputPath);

console.log(`Generated XLSX file at: ${outputPath}`);
