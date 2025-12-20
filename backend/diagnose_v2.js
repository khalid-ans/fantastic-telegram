require('dotenv').config();
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Settings } = require('./models');
const mongoose = require('mongoose');
const fs = require('fs');

const logFile = 'diagnosis_v2_results.txt';
if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
};

const runDiagnosis = async () => {
    log('🔍 Starting Diagnosis V2 (Reproduction)...');

    await mongoose.connect(process.env.MONGODB_URI);
    const dbSession = await Settings.findOne({ key: 'telegram_session' });
    const sessionString = dbSession?.value || process.env.TELEGRAM_SESSION || "";

    const apiId = parseInt(process.env.API_ID);
    const apiHash = process.env.API_HASH;
    const botToken = process.env.BOT_TOKEN;

    const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
        connectionRetries: 5,
    });

    if (botToken) await client.start({ botAuthToken: botToken });
    else await client.connect();

    log('✅ Connected');

    // TEST 1: Basic Group Message (Direct ID vs Resolved)
    const testGroupId = BigInt('-5099839599');
    log(`\n🧪 Test 1: Sending Message to Basic Group ${testGroupId}`);

    try {
        // Try direct ID first (GramJS style)
        await client.sendMessage(testGroupId, { message: "Test 1: Direct ID" });
        log("✅ Sent via Direct ID");
    } catch (e) {
        log(`❌ Failed via Direct ID: ${e.message}`);
    }

    // TEST 2: Poll with byte-encoded options (Reproduction of INPUT_CONSTRUCTOR_INVALID)
    log(`\n🧪 Test 2: Sending Poll with Buffer.from([0]) to 'me'`);
    try {
        const pollId = BigInt(Date.now());
        await client.sendMessage('me', {
            file: new Api.InputMediaPoll({
                poll: new Api.Poll({
                    id: pollId,
                    question: new Api.TextWithEntities({ text: "Repro Byte Enc", entities: [] }),
                    answers: [
                        new Api.PollAnswer({ text: new Api.TextWithEntities({ text: "A", entities: [] }), option: Buffer.from([0]) }),
                        new Api.PollAnswer({ text: new Api.TextWithEntities({ text: "B", entities: [] }), option: Buffer.from([1]) })
                    ],
                    closed: false,
                    publicVoters: false,
                    multipleChoice: false,
                    quiz: true,
                    closePeriod: null,
                    closeDate: null
                }),
                correctAnswers: [Buffer.from([0])],
                solution: "test",
                solutionEntities: []
            })
        });
        log('✅ Poll Sent Successfully (Buffer.[0])');
    } catch (err) {
        log('❌ Poll Failed (Buffer.[0]): ' + err.message);
    }

    // TEST 3: Poll with string-encoded options (Buffer.from('0'))
    log(`\n🧪 Test 3: Sending Poll with Buffer.from('0')`);
    try {
        const pollId = BigInt(Date.now()) + BigInt(100);
        await client.sendMessage('me', {
            file: new Api.InputMediaPoll({
                poll: new Api.Poll({
                    id: pollId,
                    question: new Api.TextWithEntities({ text: "Repro String Enc", entities: [] }),
                    answers: [
                        new Api.PollAnswer({ text: new Api.TextWithEntities({ text: "A", entities: [] }), option: Buffer.from('0') }),
                        new Api.PollAnswer({ text: new Api.TextWithEntities({ text: "B", entities: [] }), option: Buffer.from('1') })
                    ],
                    closed: false,
                    publicVoters: false,
                    multipleChoice: false,
                    quiz: true,
                    closePeriod: null,
                    closeDate: null
                }),
                correctAnswers: [Buffer.from('0')],
                solution: "test",
                solutionEntities: []
            })
        });
        log('✅ Poll Sent Successfully (Buffer.from(\'0\'))');
    } catch (err) {
        log('❌ Poll Failed (Buffer.from(\'0\')): ' + err.message);
    }

    await client.disconnect();
    await mongoose.disconnect();
};

runDiagnosis().catch(e => log("FATAL: " + e.message));
