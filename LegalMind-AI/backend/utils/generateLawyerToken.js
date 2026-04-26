const jwt = require('jsonwebtoken');

const generateLawyerToken = (lawyerId) => {
    return jwt.sign(
        {
            lawyerId,
            actor: 'lawyer',
        },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );
};

module.exports = generateLawyerToken;
