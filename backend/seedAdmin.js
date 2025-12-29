require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./models');

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB for seeding');

        const adminExists = await User.findOne({ username: 'TPadmin' });
        if (adminExists) {
            console.log('ℹ️ Admin user already exists');
        } else {
            const admin = new User({
                username: 'TPadmin',
                password: 'TPadmin',
                role: 'admin',
                status: 'approved'
            });
            await admin.save();
            console.log('✅ Admin user created: TPadmin / TPadmin');
        }

        mongoose.connection.close();
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        process.exit(1);
    }
};

seedAdmin();
