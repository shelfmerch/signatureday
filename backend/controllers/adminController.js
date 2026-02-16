import Group from '../models/groupModel.js';
import Order from '../models/orderModel.js';
import AmbassadorReward from '../models/ambassadorRewardModel.js';
import Ambassador from '../models/ambassadorModel.js';
import User from '../models/userModel.js';
import mongoose from 'mongoose';
import { sendMail } from '../utils/email.js';

// Helper to get date range
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getAdminStats = async (req, res) => {
  try {
    // Parse range param for trend (default 7d). Allowed: 7d, 30d, 120d, 365d
    const range = String(req.query.range || '7d');
    const rangeToDays = (r) => {
      switch (r) {
        case '7d': return 7;
        case '30d': return 30;
        case '120d': return 120;
        case '365d': return 365;
        default: return 7;
      }
    };
    const days = rangeToDays(range);
    // Totals
    const [totalOrders, paidOrders, groups] = await Promise.all([
      Order.countDocuments({}),
      Order.countDocuments({ paid: true }),
      Group.find({}).select('members createdAt').lean(),
    ]);

    // Members and revenue (₹200/member)
    const totalMembers = groups.reduce((sum, g) => sum + (g.members?.length || 0), 0);
    const totalRevenue = totalMembers * 200;

    // Distinct customers by shipping.email
    const distinctEmails = await Order.distinct('shipping.email', { 'shipping.email': { $ne: null } });
    const totalCustomers = distinctEmails.length;

    // Repeat customers
    const emailCounts = await Order.aggregate([
      { $match: { 'shipping.email': { $ne: null } } },
      { $group: { _id: '$shipping.email', c: { $sum: 1 } } },
      { $match: { c: { $gt: 1 } } },
      { $count: 'repeat' },
    ]);
    const repeatCustomers = emailCounts?.[0]?.repeat || 0;

    // Avg order value
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Trend: last 7d vs previous 7d
    const now = new Date();
    const start7 = daysAgo(7);
    const start14 = daysAgo(14);

    const groupsLast7 = await Group.find({ createdAt: { $gte: start7, $lt: now } }).select('members').lean();
    const groupsPrev7 = await Group.find({ createdAt: { $gte: start14, $lt: start7 } }).select('members').lean();

    const membersLast7 = groupsLast7.reduce((s, g) => s + (g.members?.length || 0), 0);
    const membersPrev7 = groupsPrev7.reduce((s, g) => s + (g.members?.length || 0), 0);

    const revenueLast7 = membersLast7 * 200;
    const revenuePrev7 = membersPrev7 * 200;

    const percentChangeRevenue = revenuePrev7 === 0 ? (revenueLast7 > 0 ? 100 : 0) : ((revenueLast7 - revenuePrev7) / revenuePrev7) * 100;

    const ordersLast7 = await Order.countDocuments({ createdAt: { $gte: start7, $lt: now } });
    const ordersPrev7 = await Order.countDocuments({ createdAt: { $gte: start14, $lt: start7 } });
    const percentChangeOrders = ordersPrev7 === 0 ? (ordersLast7 > 0 ? 100 : 0) : ((ordersLast7 - ordersPrev7) / ordersPrev7) * 100;

    const customersLast7 = await Order.distinct('shipping.email', { 'shipping.email': { $ne: null }, createdAt: { $gte: start7, $lt: now } });
    const customersPrev7 = await Order.distinct('shipping.email', { 'shipping.email': { $ne: null }, createdAt: { $gte: start14, $lt: start7 } });
    const percentChangeCustomers = customersPrev7.length === 0 ? (customersLast7.length > 0 ? 100 : 0) : ((customersLast7.length - customersPrev7.length) / customersPrev7.length) * 100;

    // Order status breakdown
    const orderStatusAgg = await Order.aggregate([
      { $group: { _id: '$status', c: { $sum: 1 } } }
    ]);
    const orderStatus = orderStatusAgg.reduce((acc, cur) => {
      acc[cur._id] = cur.c;
      return acc;
    }, { new: 0, in_progress: 0, ready: 0, shipped: 0 });

    // Conversion rate: paid orders / total orders
    const conversionRate = totalOrders > 0 ? (paidOrders / totalOrders) * 100 : 0;

    // Revenue trend for last 7 days using PAID orders
    const startTrend = daysAgo(days - 1); // include today
    const paidRecent = await Order.find({
      paid: true,
      createdAt: { $gte: startTrend }
    }).select('createdAt members').lean();

    const revenueTrend = Array.from({ length: days }).map((_, idx) => {
      const day = new Date(startTrend);
      day.setDate(startTrend.getDate() + idx);
      day.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setDate(day.getDate() + 1);
      const dayItems = paidRecent.filter(o => o.createdAt >= day && o.createdAt < dayEnd);
      const ordersCount = dayItems.length;
      const membersCount = dayItems.reduce((s, o) => s + (o.members?.length || 0), 0);
      const revenue = membersCount * 200;
      return {
        date: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue,
        ordersCount
      };
    });

    // Recent orders (last 10, newest first)
    const recentOrdersRaw = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean({ virtuals: true });

    const recentOrders = recentOrdersRaw.map((o) => ({
      id: o.clientOrderId || String(o._id),
      orderId: o.clientOrderId || String(o._id),
      customerName: o.shipping?.name || '—',
      membersCount: Array.isArray(o.members) ? o.members.length : 0,
      totalAmount: (Array.isArray(o.members) ? o.members.length : 0) * 200,
      status: o.status,
      paymentStatus: o.paid ? 'paid' : 'pending',
      createdAt: o.createdAt
    }));

    // Top designs by gridTemplate from paid orders
    const topDesignsAgg = await Order.aggregate([
      { $match: { paid: true } },
      {
        $group: {
          _id: '$gridTemplate',
          ordersCount: { $sum: 1 },
          membersCount: { $sum: { $size: '$members' } }
        }
      },
      { $project: {
        _id: 0,
        designName: '$__id_does_not_exist__' // placeholder to compute below
      } }
    ]);
    // Note: we cannot compute designName in pipeline easily due to TypeScript; map here:
    const topDesigns = topDesignsAgg.map((d) => ({
      designId: String(d._id || 'unknown'),
      designName: String(d._id || 'unknown'),
      previewImage: '/images/designs.png',
      ordersCount: d.ordersCount || 0,
      revenue: (d.membersCount || 0) * 200,
    }));

    // ---------------- COLLEGE-WISE STATS ----------------
    // Ambassadors per college
    const ambassadorsByCollege = await Ambassador.aggregate([
      {
        $group: {
          _id: { $ifNull: ['$college', 'Unknown'] },
          ambassadors: { $sum: 1 },
        },
      },
    ]);

    // Rewards (paid & pending) per college
    const rewardsByCollege = await AmbassadorReward.aggregate([
      {
        $lookup: {
          from: 'ambassadors',
          localField: 'ambassadorId',
          foreignField: '_id',
          as: 'amb',
        },
      },
      { $unwind: '$amb' },
      {
        $group: {
          _id: { $ifNull: ['$amb.college', 'Unknown'] },
          rewardsPaid: {
            $sum: {
              $cond: [
                { $in: [{ $toLower: '$status' }, ['paid']] },
                '$rewardAmount',
                0,
              ],
            },
          },
          rewardsPending: {
            $sum: {
              $cond: [
                { $in: [{ $toLower: '$status' }, ['pending']] },
                '$rewardAmount',
                0,
              ],
            },
          },
        },
      },
    ]);

    // Groups & members per college (via ambassador on group.ambassadorId)
    const groupsByCollege = await Group.aggregate([
      {
        $match: {
          ambassadorId: { $ne: null },
        },
      },
      {
        $lookup: {
          from: 'ambassadors',
          localField: 'ambassadorId',
          foreignField: '_id',
          as: 'amb',
        },
      },
      { $unwind: '$amb' },
      {
        $group: {
          _id: { $ifNull: ['$amb.college', 'Unknown'] },
          groups: { $sum: 1 },
          members: { $sum: { $size: '$members' } },
        },
      },
    ]);

    // Merge into a single structure
    const collegeMap = new Map();

    const ensureCollegeEntry = (college) => {
      const key = college || 'Unknown';
      if (!collegeMap.has(key)) {
        collegeMap.set(key, {
          college: key,
          ambassadors: 0,
          groups: 0,
          members: 0,
          rewardsPaid: 0,
          rewardsPending: 0,
        });
      }
      return collegeMap.get(key);
    };

    ambassadorsByCollege.forEach((row) => {
      const entry = ensureCollegeEntry(row._id);
      entry.ambassadors = row.ambassadors || 0;
    });

    rewardsByCollege.forEach((row) => {
      const entry = ensureCollegeEntry(row._id);
      entry.rewardsPaid = row.rewardsPaid || 0;
      entry.rewardsPending = row.rewardsPending || 0;
    });

    groupsByCollege.forEach((row) => {
      const entry = ensureCollegeEntry(row._id);
      entry.groups = row.groups || 0;
      entry.members = row.members || 0;
    });

    const collegeStats = Array.from(collegeMap.values()).sort(
      (a, b) => (b.rewardsPaid || 0) - (a.rewardsPaid || 0)
    );

    return res.json({
      stats: {
        totalOrders,
        totalRevenue,
        totalCustomers,
        avgOrderValue,
        percentChangeOrders,
        percentChangeRevenue,
        percentChangeCustomers,
        repeatCustomers,
        totalMembers,
        conversionRate,
      },
      orderStatus,
      revenueTrend,
      recentOrders,
      topDesigns,
      collegeStats,
    });
  } catch (err) {
    console.error('getAdminStats error:', err);
    return res.status(500).json({ message: 'Failed to fetch admin stats' });
  }
};

/**
 * @desc    Mark reward payout as paid (manual UPI)
 * @route   POST /api/admin/rewards/:rewardId/pay
 * @access  Admin
 */
export const markPayoutPaid = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { rewardId } = req.params;
    const { txRef, paidVia = 'manual-upi' } = req.body || {};

    if (!txRef || typeof txRef !== 'string') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Transaction reference (txRef) is required' });
    }

    const reward = await AmbassadorReward.findById(rewardId).session(session);
    if (!reward) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Reward not found' });
    }

    if (reward.status === 'paid') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Reward already marked as paid' });
    }

    // Update ambassador totals
    const ambassador = await Ambassador.findById(reward.ambassadorId).session(session);
    if (!ambassador) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Ambassador not found for this reward' });
    }

    const upiId = ambassador.payoutMethod?.upiId || ambassador.upiId;
    if (!upiId) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Ambassador has no UPI payout method configured' });
    }

    // Update reward status and payout metadata
    reward.status = 'paid';
    reward.paidAt = new Date();
    reward.paidTxRef = txRef;
    reward.paidVia = paidVia;
    await reward.save({ session });

    ambassador.totals.rewardsPending = Math.max(
      0,
      (ambassador.totals.rewardsPending || 0) - reward.rewardAmount
    );
    ambassador.totals.rewardsPaid = (ambassador.totals.rewardsPaid || 0) + reward.rewardAmount;
    await ambassador.save({ session });

    await session.commitTransaction();

    // Fire-and-forget: email the ambassador a payout success message
    setImmediate(() => {
      (async () => {
        try {
          const toEmail = ambassador?.email;
          const ambassadorName = ambassador?.name || 'Ambassador';
          const amountDisplay = `₹${(reward.rewardAmount || 0).toFixed(0)}`;
          const paidAtISO = reward.paidAt?.toISOString?.() || new Date().toISOString();

          // Extract screenshot URL if embedded in txRef as SCREENSHOT:<url>
          let screenshotUrl = null;
          if (typeof reward.paidTxRef === 'string') {
            const m = reward.paidTxRef.match(/SCREENSHOT:(https?:\/\/[^\s]+)/);
            screenshotUrl = m ? m[1] : null;
          }

          if (toEmail) {
            const subject = 'Your ambassador reward has been paid - Signature Day';
            const html = `
              <div style="font-family:Inter,Segoe UI,Arial,sans-serif;line-height:1.6;color:#0f172a">
                <h2 style="margin:0 0 12px">Congratulations, ${ambassadorName}! 🎉</h2>
                <p>Your ambassador reward has been <strong>marked as Paid</strong>.</p>
                <ul style="padding-left:16px">
                  <li><strong>Amount:</strong> ${amountDisplay}</li>
                  <li><strong>Transaction Ref:</strong> ${reward.paidTxRef || '-'}</li>
                  <li><strong>Paid At:</strong> ${new Date(paidAtISO).toLocaleString()}</li>
                  <li><strong>Group:</strong> ${reward.groupNameSnapshot || '—'}</li>
                </ul>
                ${screenshotUrl ? `<p>You can view the payment screenshot here: <a href="${screenshotUrl}">${screenshotUrl}</a></p>` : ''}
                <p>Thank you for your contributions to Signature Day!</p>
                <p style="margin-top:24px;color:#475569">— Signature Day Team</p>
              </div>
            `;
            const text = `Congratulations, ${ambassadorName}!\n\nYour ambassador reward has been marked as Paid.\n\n` +
              `Amount: ${amountDisplay}\n` +
              `Transaction Ref: ${reward.paidTxRef || '-'}\n` +
              `Paid At: ${new Date(paidAtISO).toLocaleString()}\n` +
              `Group: ${reward.groupNameSnapshot || '—'}\n` +
              (screenshotUrl ? `Screenshot: ${screenshotUrl}\n` : '') +
              `\n— Signature Day Team`;

            let attachments = [];
            // Try to attach the screenshot image if available
            if (screenshotUrl) {
              try {
                const resp = await fetch(screenshotUrl);
                if (resp.ok) {
                  const contentType = resp.headers.get('content-type') || 'image/jpeg';
                  const arrayBuf = await resp.arrayBuffer();
                  const buffer = Buffer.from(arrayBuf);
                  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : contentType.includes('gif') ? 'gif' : 'jpg';
                  attachments.push({
                    filename: `payout-screenshot-${reward._id}.${ext}`,
                    content: buffer,
                    contentType
                  });
                }
              } catch (attachErr) {
                console.warn('Failed to fetch/attach payout screenshot, sending link only:', attachErr);
              }
            }

            await sendMail({ to: toEmail, subject, html, text, attachments: attachments.length ? attachments : undefined });
          }
        } catch (emailErr) {
          console.error('Failed to send payout email to ambassador:', emailErr);
        }
      })();
    });

    return res.json({
      reward: {
        id: reward._id.toString(),
        amount: reward.rewardAmount,
        status: reward.status,
        paidAt: reward.paidAt
      },
      ambassador: ambassador ? {
        id: ambassador._id.toString(),
        totals: {
          rewardsPaid: ambassador.totals.rewardsPaid,
          rewardsPending: ambassador.totals.rewardsPending
        }
      } : null
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('markPayoutPaid error:', error);
    return res.status(500).json({ message: 'Failed to mark payout as paid' });
  } finally {
    session.endSession();
  }
};

// --- Manage Groups (admin only) ---

const getOrigin = () => process.env.FRONTEND_ORIGIN || process.env.APP_BASE_URL || 'http://localhost:8080';

/**
 * List ambassadors who have at least one group (for ambassador-led flow).
 * @route   GET /api/admin/manage-groups/ambassadors
 * @access  Admin
 */
export const listAmbassadorsWithGroups = async (req, res) => {
  try {
    const agg = await Group.aggregate([
      { $match: { ambassadorId: { $ne: null, $exists: true } } },
      {
        $group: {
          _id: '$ambassadorId',
          groupsCount: { $sum: 1 },
          totalMembersJoined: { $sum: { $size: { $ifNull: ['$members', []] } } }
        }
      }
    ]);

    if (agg.length === 0) {
      return res.json({ items: [], total: 0 });
    }

    const ambassadorIds = agg.map((a) => a._id);
    const ambassadors = await Ambassador.find({ _id: { $in: ambassadorIds } })
      .select('name referralCode')
      .lean();

    const byId = new Map(ambassadors.map((a) => [a._id.toString(), a]));
    const items = agg.map((a) => {
      const amb = byId.get(a._id.toString());
      return {
        id: a._id.toString(),
        ambassadorName: amb?.name ?? '—',
        referralCode: amb?.referralCode ?? a._id.toString(),
        groupsCount: a.groupsCount,
        totalMembersJoined: a.totalMembersJoined ?? 0
      };
    });

    res.json({ items, total: items.length });
  } catch (err) {
    console.error('listAmbassadorsWithGroups error:', err);
    res.status(500).json({ message: 'Failed to list ambassadors with groups' });
  }
};

/**
 * List groups for an ambassador (admin; includes creator + shareLink).
 * @route   GET /api/admin/manage-groups/ambassadors/:ambassadorId/groups
 * @access  Admin
 */
export const listAmbassadorGroupsAdmin = async (req, res) => {
  try {
    const { ambassadorId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Group.find({ ambassadorId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Group.countDocuments({ ambassadorId })
    ]);

    const userIds = [...new Set(items.map((g) => g.createdByUserId).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } })
      .select('name email')
      .lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const origin = getOrigin();
    const mapped = items.map((g) => {
      const creator = g.createdByUserId ? userMap.get(g.createdByUserId.toString()) : null;
      return {
        id: g._id.toString(),
        teamName: g.name,
        groupCode: g._id.toString(),
        groupLink: `${origin}/join/${g._id}`,
        creatorName: creator?.name ?? g.name ?? '—',
        creatorEmail: creator?.email ?? '—',
        creatorPhone: g.phone ?? '—',
        membersJoined: Array.isArray(g.members) ? g.members.length : 0,
        createdAt: g.createdAt
      };
    });

    res.json({
      items: mapped,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('listAmbassadorGroupsAdmin error:', err);
    res.status(500).json({ message: 'Failed to list ambassador groups' });
  }
};

/**
 * List direct groups (no ambassador).
 * @route   GET /api/admin/manage-groups/direct
 * @access  Admin
 */
export const listDirectGroups = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Group.find({ $or: [{ ambassadorId: null }, { ambassadorId: { $exists: false } }] })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Group.countDocuments({ $or: [{ ambassadorId: null }, { ambassadorId: { $exists: false } }] })
    ]);

    const userIds = [...new Set(items.map((g) => g.createdByUserId).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } })
      .select('name email')
      .lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const origin = getOrigin();
    const mapped = items.map((g) => {
      const creator = g.createdByUserId ? userMap.get(g.createdByUserId.toString()) : null;
      return {
        id: g._id.toString(),
        teamName: g.name,
        groupCode: g._id.toString(),
        groupLink: `${origin}/join/${g._id}`,
        creatorName: creator?.name ?? g.name ?? '—',
        creatorEmail: creator?.email ?? '—',
        creatorPhone: g.phone ?? '—',
        membersJoined: Array.isArray(g.members) ? g.members.length : 0,
        createdAt: g.createdAt
      };
    });

    res.json({
      items: mapped,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('listDirectGroups error:', err);
    res.status(500).json({ message: 'Failed to list direct groups' });
  }
};

/**
 * Get group details + normalized participants (creator + members).
 * @route   GET /api/admin/manage-groups/group/:groupId
 * @access  Admin
 */
export const getGroupWithParticipants = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId).lean();
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    let creatorUser = null;
    if (group.createdByUserId) {
      creatorUser = await User.findById(group.createdByUserId).select('name email').lean();
    }

    const participants = [];
    // Prepare normalized participants list from group members ONLY
    const members = group.members || [];
    const creatorEmail = creatorUser?.email?.toLowerCase();

    for (const m of members) {
      const isCreator = creatorEmail && m.email && m.email.toLowerCase() === creatorEmail;
      participants.push({
        role: isCreator ? 'CREATOR' : 'MEMBER',
        name: m.name ?? '—',
        email: m.email ?? '—',
        phone: m.phone ?? '—',
        rollNumber: m.memberRollNumber ?? '—',
        joinedAt: m.joinedAt ?? group.createdAt
      });
    }


    const ambassador = group.ambassadorId
      ? await Ambassador.findById(group.ambassadorId).select('name referralCode').lean()
      : null;
    const origin = getOrigin();

    res.json({
      group: {
        id: group._id.toString(),
        teamName: group.name,
        groupCode: group._id.toString(),
        groupLink: `${origin}/join/${group._id}`,
        createdAt: group.createdAt,
        ambassador: ambassador
          ? { name: ambassador.name, referralCode: ambassador.referralCode }
          : null
      },
      participants
    });
  } catch (err) {
    console.error('getGroupWithParticipants error:', err);
    res.status(500).json({ message: 'Failed to load group participants' });
  }
};
