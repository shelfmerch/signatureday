import jwt from 'jsonwebtoken';

/**
 * Generate JWT token for authentication
 * @param {string} userId - User ID to encode in the token
 * @returns {string} JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production', {
    expiresIn: '30d' // Token expires in 30 days
  });
};

export default generateToken;

