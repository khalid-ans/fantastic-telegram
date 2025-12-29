const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Middleware to protect routes - ensures user is logged in
 */
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ error: 'Not authorized to access this route' });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

        // Check if user still exists
        const user = await User.findById(decoded.id);
        if (!user) {
            console.error(`❌ [Auth] Token valid but user ${decoded.id} not found in DB`);
            return res.status(401).json({ error: 'The user belonging to this token no longer exists' });
        }

        // Grant access
        req.user = user;
        next();
    } catch (err) {
        console.error(`❌ [Auth] Token verification failed: ${err.message}`);
        return res.status(401).json({ error: 'Not authorized to access this route' });
    }
};

/**
 * Middleware to restrict access based on roles
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};

/**
 * Middleware to ensure user is approved (for Moderators)
 */
const checkApproval = (req, res, next) => {
    if (req.user.role === 'moderator' && req.user.status !== 'approved') {
        return res.status(403).json({
            error: 'Your account is pending approval by an admin'
        });
    }
    next();
};

module.exports = { protect, authorize, checkApproval };
