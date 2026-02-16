import AmbassadorReward from '../models/ambassadorRewardModel.js';
import { upsertReward, listRewardsByAmbassador } from '../services/rewardService.js';

/**
 * @desc    Create reward for a group (internal/service endpoint)
 * @route   POST /api/rewards/create
 * @access  Internal (should be protected)
 */
export const createReward = async (req, res) => {
  try {
    const { groupId, orderValue } = req.body;

    if (!groupId) {
      return res.status(400).json({ message: 'Group ID is required' });
    }

    try {
      const reward = await upsertReward({ groupId, orderValue });
      res.status(201).json({ reward });
    } catch (error) {
      if (error.message === 'Group not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === 'Group is not attributed to an ambassador') {
        // Not an error - group simply wasn't referred
        return res.status(200).json({ message: 'No ambassador attribution found for this group' });
      }
      // Handle duplicate key error as success (idempotency)
      if (error.code === 11000) {
        const existingReward = await AmbassadorReward.findOne({
          groupId
        }).lean();
        if (existingReward) {
          return res.status(200).json({ reward: existingReward, message: 'Reward already exists' });
        }
      }
      throw error;
    }
  } catch (error) {
    console.error('Create reward error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Update reward status (admin)
 * @route   PATCH /api/rewards/:id
 * @access  Admin
 */
export const updateRewardStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['Pending', 'Approved', 'Paid'].includes(status)) {
      return res.status(400).json({ message: 'Valid status (Pending, Approved, Paid) is required' });
    }

    const updateData = { status };
    
    // Set paidAt when status changes to 'Paid'
    if (status === 'Paid') {
      updateData.paidAt = new Date();
    }

    const reward = await AmbassadorReward.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!reward) {
      return res.status(404).json({ message: 'Reward not found' });
    }

    // Audit log (optional - can be enhanced)
    console.log(`[Audit] Reward ${id} status changed to ${status} by user ${req.user?._id || 'system'}`);

    res.json({ reward });
  } catch (error) {
    console.error('Update reward status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get rewards with filters (admin)
 * @route   GET /api/rewards
 * @access  Admin
 */
export const getRewards = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;

    const query = {};
    if (status && ['Pending', 'Approved', 'Paid'].includes(status)) {
      query.status = status;
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      AmbassadorReward.find(query)
        .populate('ambassadorId', 'name email referralCode')
        .populate('groupId', 'name yearOfPassing')
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AmbassadorReward.countDocuments(query)
    ]);

    res.json({
      items,
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
      hasMore: skip + items.length < total
    });
  } catch (error) {
    console.error('Get rewards error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
