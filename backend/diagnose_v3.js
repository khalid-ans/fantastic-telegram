require('dotenv').config();
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Settings } = require('./models');
const mongoose = require('mongoose');
const fs = require('fs');

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const dbSession = await Settings.findOne({ key: 'telegram_session' });
    const sessionString = dbSession?.value || process.env.TELEGRAM_SESSION || "";

    const client = new TelegramClient(new StringSession(sessionString), parseInt(process.env.API_ID), process.env.API_HASH, {
        connectionRetries: 5,
    });

    if (process.env.BOT_TOKEN) await client.start({ botAuthToken: process.env.BOT_TOKEN });
    else await client.connect();

    const dialogs = await client.getDialogs({});
    let output = "DIALOG LIST:\n";
    for (const d of dialogs) {
        output += `Name: ${d.title} | ID: ${d.id} | Type: ${d.isChannel ? 'Channel/Supergroup' : d.isGroup ? 'BasicGroup' : 'User'}\n`;
    }
    fs.writeFileSync('dialog_list.txt', output);

    await client.disconnect();
    await mongoose.disconnect();
};

run().catch(console.error);
