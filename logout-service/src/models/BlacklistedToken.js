const mongoose = require('mongoose');

const blacklistedTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: [true, 'Token is required'],
    unique: true,
    index: true
  },
  tokenType: {
    type: String,
    required: [true, 'Token type is required'],
    enum: ['access', 'refresh'],
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'User ID is required'],
    ref: 'User',
    index: true
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiration date is required'],
    index: { expireAfterSeconds: 0 } // MongoDB TTL index for automatic cleanup
  },
  blacklistedAt: {
    type: Date,
    default: Date.now
  },
  reason: {
    type: String,
    enum: ['logout', 'logout-all', 'manual-invalidation', 'security-breach', 'password-change'],
    default: 'logout'
  },
  userAgent: {
    type: String
  },
  ipAddress: {
    type: String
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
blacklistedTokenSchema.index({ userId: 1, tokenType: 1 });
blacklistedTokenSchema.index({ expiresAt: 1, tokenType: 1 });

// Static method to check if token is blacklisted
blacklistedTokenSchema.statics.isBlacklisted = async function(token) {
  const blacklistedToken = await this.findOne({ token });
  return !!blacklistedToken;
};

// Static method to blacklist a token
blacklistedTokenSchema.statics.blacklistToken = async function(tokenData) {
  const {
    token,
    tokenType,
    userId,
    expiresAt,
    reason = 'logout',
    userAgent = null,
    ipAddress = null
  } = tokenData;

  try {
    const blacklistedToken = await this.create({
      token,
      tokenType,
      userId,
      expiresAt,
      reason,
      userAgent,
      ipAddress
    });

    return blacklistedToken;
  } catch (error) {
    if (error.code === 11000) {
      // Token already blacklisted
      return await this.findOne({ token });
    }
    throw error;
  }
};

// Static method to get blacklisted tokens for a user
blacklistedTokenSchema.statics.getBlacklistedTokensByUser = async function(userId, tokenType = null) {
  const query = { userId };
  if (tokenType) {
    query.tokenType = tokenType;
  }

  return await this.find(query)
    .sort({ createdAt: -1 })
    .limit(50); // Limit to recent 50 tokens
};

// Static method to clean up expired tokens
blacklistedTokenSchema.statics.cleanupExpired = async function() {
  const now = new Date();
  const result = await this.deleteMany({
    expiresAt: { $lte: now }
  });

  return result.deletedCount;
};

// Static method to get blacklist statistics
blacklistedTokenSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$tokenType',
        count: { $sum: 1 },
        latestBlacklist: { $max: '$createdAt' }
      }
    }
  ]);

  const totalTokens = await this.countDocuments();
  const expiredTokens = await this.countDocuments({
    expiresAt: { $lte: new Date() }
  });

  return {
    totalBlacklistedTokens: totalTokens,
    expiredTokens,
    activeBlacklistedTokens: totalTokens - expiredTokens,
    byType: stats.reduce((acc, stat) => {
      acc[stat._id] = {
        count: stat.count,
        latestBlacklist: stat.latestBlacklist
      };
      return acc;
    }, {})
  };
};

// Instance method to check if token is expired
blacklistedTokenSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Pre-save middleware to set blacklistedAt if not provided
blacklistedTokenSchema.pre('save', function(next) {
  if (this.isNew && !this.blacklistedAt) {
    this.blacklistedAt = new Date();
  }
  next();
});

// Post-save middleware for logging
blacklistedTokenSchema.post('save', function(doc) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`Token blacklisted: ${doc.tokenType} token for user ${doc.userId}`);
  }
});

module.exports = mongoose.model('BlacklistedToken', blacklistedTokenSchema);