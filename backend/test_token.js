require('dotenv').config();
const botToken = process.env.BOT_TOKEN.trim();

const testToken = async () => {
    console.log(`Testing Token: ${botToken}`);
    const url = `https://api.telegram.org/bot${botToken}/getMe`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Fetch error:', e.message);
    }
};

testToken();
