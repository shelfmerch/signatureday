import AmbassadorReward from '../models/ambassadorRewardModel.js';
import Group from '../models/groupModel.js';

const JOIN_FEE = parseInt(process.env.JOIN_FEE || '200', 10);
const AMBASSADOR_SHARE = parseFloat(process.env.AMBASSADOR_SHARE || '0.10');

/**
 * Calculate reward amount based on member count
 * @param {number} memberCount - Number of members
 * @param {number} fee - Join fee per member (default from env)
 * @param {number} share - Ambassador share percentage (default from env)
 * @returns {number} - Reward amount in rupees
 */
export const calculateReward = (memberCount, fee = JOIN_FEE, share = AMBASSADOR_SHARE) => {
  if (memberCount <= 0) return 0;
  return Math.round(memberCount * fee * share);
};

/**
 * Upsert reward for a group (idempotent)
 * @param {Object} params - Reward parameters
 * @param {string} params.groupId - Group ID
 * @param {number} params.orderValue - Order value (optional)
 * @returns {Promise<Object>} - Created or updated reward
 */
export const upsertReward = async ({ groupId, orderValue = null }) => {
  const group = await Group.findById(groupId);
  
  if (!group) {
    throw new Error('Group not found');
  }

  if (!group.ambassadorId) {
    throw new Error('Group is not attributed to an ambassador');
  }

  // Use authoritative member count from group
  const memberCount = group.members.length;
  const rewardAmount = calculateReward(memberCount);

  // Upsert with unique constraint on (ambassadorId, groupId)
  const reward = await AmbassadorReward.findOneAndUpdate(
    { ambassadorId: group.ambassadorId, groupId: group._id },
    {
      ambassadorId: group.ambassadorId,
      groupId: group._id,
      groupNameSnapshot: group.name,
      memberCountSnapshot: memberCount,
      rewardAmount,
      orderValue: orderValue || undefined,
      // Don't overwrite status if reward already exists
      $setOnInsert: {
        status: 'Pending'
      }
    },
    {
      upsert: true,
      new: true,
      runValidators: true
    }
  ).lean();

  return reward;
};

/**
 * List rewards for an ambassador with pagination
 * @param {string} ambassadorId - Ambassador ID
 * @param {Object} pagination - Pagination parameters
 * @param {number} pagination.page - Page number (1-indexed)
 * @param {number} pagination.limit - Items per page
 * @returns {Promise<Object>} - Paginated rewards
 */
export const listRewardsByAmbassador = async (ambassadorId, { page = 1, limit = 10 } = {}) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    AmbassadorReward.find({ ambassadorId })
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    AmbassadorReward.countDocuments({ ambassadorId })
  ]);

  return {
    items,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
      hasMore: skip + items.length < total
    }
  };
};
