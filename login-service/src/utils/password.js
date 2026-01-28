const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * Password utility functions for secure password handling
 */

/**
 * Hash a plain text password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
const hashPassword = async (password) => {
  try {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    return await bcrypt.hash(password, saltRounds);
  } catch (error) {
    throw new Error('Error hashing password');
  }
};

/**
 * Compare a plain text password with a hashed password
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<boolean>} - True if passwords match
 */
const comparePassword = async (password, hashedPassword) => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new Error('Error comparing passwords');
  }
};

/**
 * Generate a secure random password
 * @param {number} length - Password length (default: 12)
 * @returns {string} - Random password
 */
const generateRandomPassword = (length = 12) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }

  return password;
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} - Validation result with isValid and errors
 */
const validatePasswordStrength = (password) => {
  const errors = [];

  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }

  // Check for common weak patterns
  const commonPatterns = [
    /(.)\1{2,}/, // Repeated characters (aaa, 111, etc.)
    /123456|654321|qwerty|password|admin|letmein/i, // Common passwords
    /^[0-9]+$/, // Only numbers
    /^[a-zA-Z]+$/ // Only letters
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains common weak patterns');
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
};

/**
 * Calculate password strength score
 * @param {string} password - Password to evaluate
 * @returns {string} - Strength level (weak, medium, strong)
 */
const calculatePasswordStrength = (password) => {
  let score = 0;

  // Length scoring
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Character type scoring
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[@$!%*?&]/.test(password)) score += 1;

  // Complexity scoring
  if (/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(password)) score += 2;

  if (score <= 3) return 'weak';
  if (score <= 6) return 'medium';
  return 'strong';
};

/**
 * Generate a secure salt for additional security
 * @returns {string} - Random salt
 */
const generateSalt = () => {
  return crypto.randomBytes(32).toString('hex');
};

module.exports = {
  hashPassword,
  comparePassword,
  generateRandomPassword,
  validatePasswordStrength,
  calculatePasswordStrength,
  generateSalt
};