const jwt = require('jsonwebtoken');

// Ye function ek naya encrypted VIP pass (Token) banata hai jo 30 din chalta hai
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d', 
    });
};

module.exports = generateToken;
