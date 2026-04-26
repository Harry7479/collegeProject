const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    // Check karo ki header mein Authorization token hai aur 'Bearer' shabd se shuru hota hai
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // "Bearer h8y43r7... " usme se token word bahar nikalo
            token = req.headers.authorization.split(' ')[1];

            // Token ko JWT_SECRET key daal kar decode (kholo) karo
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // User ko database se dhoondh lo (bas password nahi laana aage security ke liye)
            req.user = await User.findById(decoded.id).select('-password');
            next(); // Bouncer kehta hai "Aage jao bhai!"
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, VIP token failed!' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token found!' });
    }
};

module.exports = { protect };
