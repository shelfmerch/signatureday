import { resolveReferralCode, setReferralCookie, recordClick, hashIP, hashUserAgent } from '../services/referralService.js';
import Group from '../models/groupModel.js';

/**
 * @desc    Track referral and set cookie
 * @route   POST /api/referrals/track
 * @access  Public
 */
export const trackReferral = async (req, res) => {
  try {
    const { referralCode } = req.body;

    if (!referralCode || typeof referralCode !== 'string') {
      return res.status(400).json({ message: 'Referral code is required' });
    }

    const ambassador = await resolveReferralCode(referralCode);

    if (!ambassador) {
      return res.status(404).json({ message: 'Invalid referral code' });
    }

    // Set cookie
    setReferralCookie(res, referralCode.trim().toUpperCase());

    // Optional: Record click for analytics
    const ip = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('user-agent');
    const ipHash = ip ? hashIP(ip) : null;
    const uaHash = userAgent ? hashUserAgent(userAgent) : null;

    await recordClick(ambassador._id, referralCode.trim().toUpperCase(), ipHash, uaHash);

    res.json({
      success: true,
      ambassadorId: ambassador._id,
      referralCode: ambassador.referralCode,
      cookieSet: true
    });
  } catch (error) {
    console.error('Track referral error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Resolve referral code to ambassador ID
 * @route   GET /api/referrals/code/:code
 * @access  Public
 */
export const resolveReferral = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({ message: 'Referral code is required' });
    }

    const ambassador = await resolveReferralCode(code);

    if (!ambassador) {
      return res.status(404).json({ message: 'Referral code not found' });
    }

    res.json({
      ambassadorId: ambassador._id,
      referralCode: ambassador.referralCode
    });
  } catch (error) {
    console.error('Resolve referral error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get the current user's group for a referral code (if any)
 * @route   GET /api/referrals/:code/my-group
 * @access  Private
 */
export const getMyReferralGroup = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({ message: 'Referral code is required' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const normalized = String(code).trim().toUpperCase();

    const group = await Group.findOne({
      createdByUserId: req.user._id,
      referralCode: normalized,
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!group) {
      return res.json({ group: null });
    }

    return res.json({
      group: {
        id: group._id,
        name: group.name,
        yearOfPassing: group.yearOfPassing,
        totalMembers: group.totalMembers,
        gridTemplate: group.gridTemplate,
        createdAt: group.createdAt,
        status: group.status,
      },
    });
  } catch (error) {
    console.error('getMyReferralGroup error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
