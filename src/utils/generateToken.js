import jwt from 'jsonwebtoken';

/**
 * Sign a JWT for an authenticated admin.
 *
 * @param {string|import('mongoose').Types.ObjectId} adminId - The admin's _id.
 * @returns {string} A signed JWT that expires in 30 days.
 */
const generateToken = (adminId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwt.sign({ id: String(adminId) }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

export default generateToken;