require('dotenv').config(); // Load from .env in current dir
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Settings } = require('./models'); // Relative to root
const mongoose = require('mongoose');
const fs = require('fs');
const logFile = 'diagnosis_results.txt';
if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
};

const runDiagnosis = async () => {
    log('🔍 Starting Diagnosis (Root)...');

    // 1. Connect to DB to get Session
    await mongoose.connect(process.env.MONGODB_URI);
    const dbSession = await Settings.findOne({ key: 'telegram_session' });
    const sessionString = dbSession?.value || process.env.TELEGRAM_SESSION || "";

    if (!sessionString && !process.env.BOT_TOKEN) {
        log('❌ No session found');
        return;
    }

    const apiId = parseInt(process.env.API_ID);
    const apiHash = process.env.API_HASH;
    const botToken = process.env.BOT_TOKEN;

    const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
        connectionRetries: 5,
    });

    if (botToken) {
        await client.start({ botAuthToken: botToken });
    } else {
        await client.connect();
    }

    log('✅ Connected to Telegram');

    // 2. Fetch Dialogs to see REAL IDs
    log('\n📋 Fetching Dialogs (Top 20)...');
    try {
        const dialogs = await client.getDialogs({ limit: 20 });
        for (const d of dialogs) {
            log(`[${d.isChannel ? 'CH' : d.isGroup ? 'GR' : 'US'}] Name: "${d.title}" | ID: ${d.id}`);
        }
    } catch (e) { log("Error Dialogs: " + e.message); }

    // 3. Test Poll Sending to "Saved Messages" (Me)
    log('\n🧪 Testing Minimal Poll Construction...');
    try {
        const pollId = BigInt(Date.now()) + BigInt(Math.floor(Math.random() * 100000));
        log(`POLL ID: ${pollId}`);

        // APP-LIKE POLL (Simplified)
        const result = await client.sendMessage('me', {
            file: new Api.InputMediaPoll({
                poll: new Api.Poll({
                    id: pollId,
                    question: new Api.TextWithEntities({ text: "Quiz Check Simp", entities: [] }),
                    answers: [
                        new Api.PollAnswer({ text: new Api.TextWithEntities({ text: "A", entities: [] }), option: Buffer.from('0') }),
                        new Api.PollAnswer({ text: new Api.TextWithEntities({ text: "B", entities: [] }), option: Buffer.from('1') })
                    ],
                    closed: false,
                    // publicVoters: false, // REMOVED
                    multipleChoice: false,
                    quiz: true,
                    closePeriod: null,
                    closeDate: null
                }),
                correctAnswers: [Buffer.from('0')],
                solution: "Explanation String", // CHANGED TO STRING
                solutionEntities: []
            })
        });
        log('✅ STRING SOLUTION QUIZ SENT SUCCESSFULLY!');
    } catch (err) {
        log('❌ POLL FAILED: ' + err.message);
        // log('Detailed: ' + JSON.stringify(err, null, 2));
    }

    await client.disconnect();
    await mongoose.disconnect();
};

runDiagnosis().catch(e => {
    log('FATAL: ' + e.message);
});
