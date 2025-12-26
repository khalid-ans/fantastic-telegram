require('dotenv').config();
const fs = require('fs');
const path = require('path');

const botToken = process.env.BOT_TOKEN.trim();
const recipientId = "-1003635220309";

const testMedia = async () => {
    console.log(`Testing Media Upload to: ${recipientId}`);
    const endpoint = `https://api.telegram.org/bot${botToken}/sendDocument`;

    // Create a dummy file
    const testFile = path.join(__dirname, 'uploads', 'test_doc.txt');
    if (!fs.existsSync(path.dirname(testFile))) fs.mkdirSync(path.dirname(testFile));
    fs.writeFileSync(testFile, 'Hello Telegram!');

    const formData = new FormData();
    formData.append('chat_id', recipientId);
    formData.append('caption', 'Test Caption with Document! 📄');
    formData.append('parse_mode', 'HTML');

    try {
        const fileBuffer = fs.readFileSync(testFile);
        const blob = new Blob([fileBuffer]);
        formData.append('document', blob, 'test_doc.txt');

        const res = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });

        const data = await res.json();
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
};

testMedia();
