const jwt = require('jsonwebtoken');

const superAdminProtect = (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token found' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'super-admin') {
            return res.status(403).json({ message: 'Forbidden: super-admin only' });
        }

        req.superAdmin = { email: decoded.email };
        return next();
    } catch (error) {
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

module.exports = { superAdminProtect };
