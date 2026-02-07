
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const tanRegex = /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/;
const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const tests = [
    { type: 'PAN', val: 'ABCDE1234F', expected: true },
    { type: 'PAN', val: 'abcde1234f', expected: false }, // Case sensitive check (though frontend converts)
    { type: 'PAN', val: 'ABCDE12345', expected: false },
    { type: 'TAN', val: 'ABCD12345E', expected: true },
    { type: 'TAN', val: 'ABCD1234E', expected: false },
    { type: 'GST', val: '22ABCDE1234F1Z5', expected: true },
    { type: 'GST', val: '22ABCDE1234F1Z', expected: false }, // Short
    { type: 'GST', val: '22ABCDE1234F1Y5', expected: false }, // No Z
];

console.log('Running Validation Tests...\n');

let failed = 0;
tests.forEach(t => {
    let regex;
    if (t.type === 'PAN') regex = panRegex;
    if (t.type === 'TAN') regex = tanRegex;
    if (t.type === 'GST') regex = gstRegex;

    const result = regex.test(t.val);
    if (result !== t.expected) {
        console.error(`[FAIL] ${t.type} ${t.val}: Expected ${t.expected}, got ${result}`);
        failed++;
    } else {
        console.log(`[PASS] ${t.type} ${t.val}`);
    }
});

if (failed === 0) console.log('\nAll tests passed!');
else console.error(`\n${failed} tests failed.`);
