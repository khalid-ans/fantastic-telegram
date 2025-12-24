require('dotenv').config();
const mongoose = require('mongoose');
const { Settings } = require('./models');

const clearSession = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const result = await Settings.findOneAndDelete({ key: 'telegram_session' });

        if (result) {
            console.log('✅ Successfully removed invalid telegram_session from DB.');
        } else {
            console.log('ℹ️ No session found to remove.');
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
};

clearSession();
