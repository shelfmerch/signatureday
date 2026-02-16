import Group from '../models/groupModel.js';
import AmbassadorReward from '../models/ambassadorRewardModel.js';
import Ambassador from '../models/ambassadorModel.js';
import Order from '../models/orderModel.js';

/**
 * Get comprehensive stats for an ambassador
 * @param {string} ambassadorId - Ambassador ID
 * @returns {Promise<Object>} - Ambassador statistics
 */
export const getAmbassadorStats = async (ambassadorId) => {
  // Get referred groups count
  const referredGroupsCount = await Group.countDocuments({ ambassadorId });

  // Get all groups for this ambassador (for member counting)
  const referredGroups = await Group.find({ ambassadorId })
    .select('_id members')
    .lean();

  // Calculate total members across all referred groups
  const totalMembers = referredGroups.reduce((sum, group) => {
    return sum + (group.members?.length || 0);
  }, 0);

  // Aggregate reward statistics
  const rewardStats = await AmbassadorReward.aggregate([
    { $match: { ambassadorId: ambassadorId } },
    {
      $group: {
        _id: null,
        totalRewards: { $sum: '$rewardAmount' },
        pendingRewards: {
          $sum: {
            $cond: [{ $eq: ['$status', 'Pending'] }, '$rewardAmount', 0]
          }
        },
        paidRewards: {
          $sum: {
            $cond: [{ $eq: ['$status', 'Paid'] }, '$rewardAmount', 0]
          }
        }
      }
    }
  ]);

  const stats = rewardStats[0] || {
    totalRewards: 0,
    pendingRewards: 0,
    paidRewards: 0
  };

  // Count completed orders (paid orders) for groups referred by this ambassador
  // Note: This requires linking orders to groups. We'll check if order description/members match group
  // For now, we'll use a simple approach: count rewards with orderValue > 0 as completed orders
  const completedOrdersCount = await AmbassadorReward.countDocuments({
    ambassadorId,
    orderValue: { $exists: true, $gt: 0 },
    status: { $in: ['Approved', 'Paid'] }
  });

  // Get ambassador details for clicks
  const ambassador = await Ambassador.findById(ambassadorId).select('referralClicks').lean();

  return {
    totalGroups: referredGroupsCount,
    referredGroups: referredGroupsCount,
    totalMembers,
    totalClicks: ambassador?.referralClicks || 0,
    totalRewards: stats.totalRewards || 0,
    pendingRewards: stats.pendingRewards || 0,
    paidRewards: stats.paidRewards || 0,
    completedOrders: completedOrdersCount
  };
};
