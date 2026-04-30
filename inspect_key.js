require('dotenv').config({ path: 'c:/Users/HP/Downloads/2/MRDCO-Prarthana/mycafiles_backend/.env' });
const key = process.env.ONESIGNAL_REST_API_KEY;
if (key) {
    const hex = Buffer.from(key).toString('hex');
    process.stdout.write(hex + '\n');
    console.log('Length:', key.length);
} else {
    console.log('Key not found');
}
