require('dotenv').config();
const mongoose = require('mongoose');
const { Entity } = require('./models');

const checkEntities = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const entities = await Entity.find({});
        console.log(`Found ${entities.length} entities.`);

        entities.forEach(e => {
            console.log(`ID: ${e.telegramId} | Type: ${e.type} | Name: ${e.name} | AccessHash: ${e.accessHash} (Type: ${typeof e.accessHash})`);
        });

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkEntities();
