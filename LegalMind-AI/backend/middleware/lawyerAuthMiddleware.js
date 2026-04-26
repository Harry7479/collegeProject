const jwt = require('jsonwebtoken');
const Lawyer = require('../models/Lawyer');

const lawyerProtect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (!decoded.lawyerId) {
                return res.status(401).json({ message: 'Not authorized as lawyer' });
            }

            const lawyer = await Lawyer.findById(decoded.lawyerId).select('-password');
            if (!lawyer) {
                return res.status(401).json({ message: 'Lawyer account not found' });
            }

            req.lawyer = lawyer;
            return next();
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    return res.status(401).json({ message: 'Not authorized, no token found' });
};

module.exports = { lawyerProtect };
