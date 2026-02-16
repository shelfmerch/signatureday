import mongoose from "mongoose";
import Ambassador from "../models/ambassadorModel.js";
import AmbassadorReward from "../models/ambassadorRewardModel.js";
import AmbassadorWaitlist from "../models/ambassadorWaitlistModel.js";
import Group from "../models/groupModel.js";
import { getAmbassadorStats } from "../services/statsService.js";
import { listRewardsByAmbassador } from "../services/rewardService.js";
import { sendMail } from "../utils/email.js";

// List ambassadors with aggregated reward totals (admin)
export const listAmbassadors = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim() || '';

    // Build search query
    const searchQuery = {};
    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { referralCode: { $regex: search, $options: 'i' } },
        { college: { $regex: search, $options: 'i' } }
      ];
    }

    // Basic ambassador list with search
    const items = await Ambassador.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await Ambassador.countDocuments(searchQuery);

    // Collect IDs for reward aggregation
    const ids = items.map(a => a._id.toString());

    // ---------- REWARDS AGGREGATION (PAID + PENDING) ----------
    // Convert ObjectIds to ObjectId instances for $in query
    const objectIds = ids.map(id => new mongoose.Types.ObjectId(id));

    const rewardsAgg = await AmbassadorReward.aggregate([
      { $match: { ambassadorId: { $in: objectIds } } },
      {
        $group: {
          _id: "$ambassadorId",
          rewardsPaid: {
            $sum: {
              $cond: [
                { $in: [{ $toLower: "$status" }, ["paid"]] },
                "$rewardAmount",
                0
              ]
            }
          },
          rewardsPending: {
            $sum: {
              $cond: [
                { $in: [{ $toLower: "$status" }, ["pending"]] },
                "$rewardAmount",
                0
              ]
            }
          }
        }
      }
    ]);

    // Create lookup map → ambassadorId → totals
    const rewardMap = new Map(
      rewardsAgg.map(r => [
        r._id.toString(),
        {
          rewardsPaid: r.rewardsPaid || 0,
          rewardsPending: r.rewardsPending || 0
        }
      ])
    );

    // ---------- FINAL RESPONSE MAPPING ----------
    const mapped = items.map(a => ({
      id: a._id.toString(),
      name: a.name,
      email: a.email,
      phone: a.phone,
      college: a.college,
      city: a.city,
      referralCode: a.referralCode,
      referralLink:
        (process.env.APP_BASE_URL || "http://localhost:8080") +
        "/ref/" +
        a.referralCode,
      upiId: a.payoutMethod?.upiId ?? a.upiId,
      createdAt: a.createdAt,

      // FIX → Now frontend receives `totals`
      totals: rewardMap.get(a._id.toString()) || {
        rewardsPaid: 0,
        rewardsPending: 0
      }
    }));

    return res.json({
      items: mapped,
      total: totalCount,
      totalCount, // Keep for backward compatibility
      page,
      limit,
      hasMore: skip + mapped.length < totalCount,
      pages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error("Error listing ambassadors:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Login ambassador with verified phone
export const loginAmbassador = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    const ambassador = await Ambassador.findOne({ phone: phone.trim() });

    if (!ambassador) {
      return res.status(404).json({ message: "Ambassador not found with this phone number" });
    }

    // Update last login
    ambassador.lastLogin = new Date();
    await ambassador.save();

    return res.json({
      id: ambassador._id.toString(),
      name: ambassador.name,
      email: ambassador.email,
      phone: ambassador.phone,
      referralCode: ambassador.referralCode,
      referralLink: ambassador.referralLink,
      upiId: ambassador.payoutMethod?.upiId ?? ambassador.upiId
    });
  } catch (error) {
    console.error("Error logging in ambassador:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a new ambassador waitlist entry (public)
export const createAmbassador = async (req, res) => {
  try {
    const { name, email, phone, college, city, state, graduationYear, upiId } = req.body || {};

    console.log('[createAmbassador] Request received:', { name, email, phone, college, city, state, graduationYear, upiId });

    if (!name || !email || !phone) {
      return res.status(400).json({ message: "Name, email and phone are required" });
    }

    // Check for duplicate email or phone in existing ambassadors
    const existingAmbassador = await Ambassador.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { phone: phone.trim() }
      ]
    });

    if (existingAmbassador) {
      const duplicateField = existingAmbassador.email === email.toLowerCase().trim() ? 'email' : 'phone';
      return res.status(409).json({
        message: `Ambassador with this ${duplicateField} already exists`,
        field: duplicateField
      });
    }

    // Check for duplicate in waitlist
    const existingWaitlist = await AmbassadorWaitlist.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { phone: phone.trim() }
      ]
    });

    if (existingWaitlist) {
      const duplicateField = existingWaitlist.email === email.toLowerCase().trim() ? 'email' : 'phone';
      const status = existingWaitlist.status;
      return res.status(409).json({
        message: `Application with this ${duplicateField} already exists. Status: ${status}`,
        field: duplicateField,
        status: status,
        waitlistId: existingWaitlist._id.toString()
      });
    }

    // Create waitlist entry instead of ambassador
    const waitlistEntry = await AmbassadorWaitlist.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      college: college?.trim(),
      city: city?.trim(),
      state: state?.trim(),
      graduationYear: graduationYear?.trim(),
      status: 'pending'
    });

    console.log('[createAmbassador] Waitlist entry created successfully:', waitlistEntry._id.toString());

    return res.status(201).json({
      waitlistId: waitlistEntry._id.toString(),
      status: 'pending',
      message: 'Your application has been submitted and is pending admin approval. You will be notified once approved.'
    });
  } catch (error) {
    console.error("Error creating waitlist entry:", error);
    console.error("Error stack:", error.stack);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: "Validation error",
        errors: errors,
        error: error.message
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        message: `Application with this ${field} already exists`,
        field: field,
        error: error.message
      });
    }

    // Handle other errors
    res.status(500).json({
      message: "Server error",
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

// Get ambassador basic profile by id (public)
export const getAmbassadorById = async (req, res) => {
  try {
    const { id } = req.params;
    const ambassador = await Ambassador.findById(id).lean({ virtuals: true });

    if (!ambassador) {
      return res.status(404).json({ message: "Ambassador not found" });
    }

    return res.json({
      id: ambassador._id.toString(),
      name: ambassador.name,
      email: ambassador.email,
      phone: ambassador.phone,
      referralCode: ambassador.referralCode,
      referralLink: ambassador.referralLink,
      upiId: ambassador.payoutMethod?.upiId ?? ambassador.upiId
    });
  } catch (error) {
    console.error("Error getting ambassador:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get ambassador by email (public - for checking if user is ambassador)
export const getAmbassadorByEmail = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const ambassador = await Ambassador.findOne({
      email: email.toLowerCase().trim()
    }).lean({ virtuals: true });

    if (!ambassador) {
      return res.status(404).json({ message: "Ambassador not found" });
    }

    return res.json({
      id: ambassador._id.toString(),
      name: ambassador.name,
      email: ambassador.email,
      phone: ambassador.phone,
      referralCode: ambassador.referralCode,
      referralLink: ambassador.referralLink,
      upiId: ambassador.payoutMethod?.upiId ?? ambassador.upiId
    });
  } catch (error) {
    console.error("Error getting ambassador by email:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update ambassador basic profile (admin or self – auth checked in middleware)
export const updateAmbassador = async (req, res) => {
  try {
    const { id } = req.params;
    const update = {};
    const allowedFields = ["name", "email", "phone", "college", "city", "state", "graduationYear"];

    for (const field of allowedFields) {
      if (field in req.body) {
        update[field] = req.body[field];
      }
    }

    const ambassador = await Ambassador.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    ).lean({ virtuals: true });

    if (!ambassador) {
      return res.status(404).json({ message: "Ambassador not found" });
    }

    return res.json({
      id: ambassador._id.toString(),
      name: ambassador.name,
      email: ambassador.email,
      phone: ambassador.phone,
      referralCode: ambassador.referralCode,
      referralLink: ambassador.referralLink,
      upiId: ambassador.payoutMethod?.upiId ?? ambassador.upiId
    });
  } catch (error) {
    console.error("Error updating ambassador:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update payout method (UPI) for ambassador (public – used from dashboard)
export const updatePayoutMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, upiId } = req.body || {};

    if (type !== "upi" || !upiId) {
      return res.status(400).json({ message: "Payout type 'upi' and valid upiId are required" });
    }

    const ambassador = await Ambassador.findById(id);
    if (!ambassador) {
      return res.status(404).json({ message: "Ambassador not found" });
    }

    ambassador.upiId = upiId;
    ambassador.payoutMethod = {
      type: "upi",
      upiId,
      updatedAt: new Date()
    };
    await ambassador.save();

    const json = ambassador.toJSON();

    return res.json({
      id: json._id.toString(),
      name: json.name,
      email: json.email,
      phone: json.phone,
      referralCode: json.referralCode,
      referralLink: json.referralLink,
      upiId: json.payoutMethod?.upiId ?? json.upiId
    });
  } catch (error) {
    console.error("Error updating payout method:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get detailed stats for ambassador (wraps statsService)
export const getAmbassadorStatsEndpoint = async (req, res) => {
  try {
    const { id } = req.params;
    const stats = await getAmbassadorStats(id);
    return res.json(stats);
  } catch (error) {
    console.error("Error getting ambassador stats:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get ambassador summary (totals + pending payouts list)
export const getAmbassadorSummary = async (req, res) => {
  try {
    const { id } = req.params;

    // Total groups and members
    const groups = await Group.find({ ambassadorId: id })
      .select("members name")
      .lean();

    const totalGroups = groups.length;
    const totalMembers = groups.reduce(
      (sum, g) => sum + (Array.isArray(g.members) ? g.members.length : 0),
      0
    );

    // Rewards summary
    const rewards = await AmbassadorReward.find({ ambassadorId: id }).lean();
    const totalPaid = rewards
      .filter(r => r.status === "paid" || r.status === "Paid")
      .reduce((sum, r) => sum + (r.rewardAmount || 0), 0);
    const totalPending = rewards
      .filter(r => r.status === "pending" || r.status === "Pending")
      .reduce((sum, r) => sum + (r.rewardAmount || 0), 0);

    // Pending payouts list
    const pendingRewards = rewards.filter(
      r => r.status === "pending" || r.status === "Pending"
    );

    const pendingPayouts = pendingRewards.map(r => ({
      id: r._id.toString(),
      groupId: r.groupId?.toString?.() || "",
      groupName: r.groupNameSnapshot,
      members: r.memberCountSnapshot,
      amount: r.rewardAmount,
      status: r.status,
      createdAt: r.createdAt
    }));

    return res.json({
      totalGroups,
      totalMembers,
      totalRewards: {
        paid: totalPaid,
        pending: totalPending
      },
      pendingPayouts
    });
  } catch (error) {
    console.error("Error getting ambassador summary:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Paginated rewards for an ambassador
export const getAmbassadorRewards = async (req, res) => {
  try {
    const { id } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const { items, pagination } = await listRewardsByAmbassador(id, { page, limit });

    return res.json({
      items,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages: pagination.pages,
      hasMore: pagination.hasMore
    });
  } catch (error) {
    console.error("Error getting ambassador rewards:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Paginated groups for an ambassador
export const getAmbassadorGroups = async (req, res) => {
  try {
    const { id } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Group.find({ ambassadorId: id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Group.countDocuments({ ambassadorId: id })
    ]);

    const mapped = items.map(g => ({
      id: g._id.toString(),
      name: g.name,
      yearOfPassing: g.yearOfPassing,
      totalMembers: g.totalMembers,
      currentMemberCount: Array.isArray(g.members) ? g.members.length : 0,
      gridTemplate: g.gridTemplate,
      status: g.status,
      createdAt: g.createdAt
    }));

    return res.json({
      items: mapped,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasMore: skip + items.length < total
    });
  } catch (error) {
    console.error("Error getting ambassador groups:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// List waitlist entries (admin only)
export const listWaitlist = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status || 'pending';
    const search = req.query.search?.trim() || '';

    // Build search query
    const searchQuery = { status };
    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { college: { $regex: search, $options: 'i' } }
      ];
    }

    const [items, total] = await Promise.all([
      AmbassadorWaitlist.find(searchQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AmbassadorWaitlist.countDocuments(searchQuery)
    ]);

    const mapped = items.map(w => ({
      id: w._id.toString(),
      name: w.name,
      email: w.email,
      phone: w.phone,
      college: w.college,
      city: w.city,
      state: w.state,
      graduationYear: w.graduationYear,
      status: w.status,
      reviewedAt: w.reviewedAt,
      rejectionReason: w.rejectionReason,
      ambassadorId: w.ambassadorId?.toString(),
      createdAt: w.createdAt
    }));

    return res.json({
      items: mapped,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasMore: skip + items.length < total
    });
  } catch (error) {
    console.error("Error listing waitlist:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Approve waitlist entry and create ambassador (admin only)
export const approveWaitlist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const waitlistEntry = await AmbassadorWaitlist.findById(id);
    if (!waitlistEntry) {
      return res.status(404).json({ message: "Waitlist entry not found" });
    }

    if (waitlistEntry.status !== 'pending') {
      return res.status(400).json({
        message: `Waitlist entry is already ${waitlistEntry.status}`
      });
    }

    // Check if ambassador already exists
    const existingAmbassador = await Ambassador.findOne({
      $or: [
        { email: waitlistEntry.email },
        { phone: waitlistEntry.phone }
      ]
    });

    if (existingAmbassador) {
      // Update waitlist entry to link to existing ambassador
      waitlistEntry.status = 'approved';
      waitlistEntry.reviewedAt = new Date();
      waitlistEntry.reviewedBy = userId;
      waitlistEntry.ambassadorId = existingAmbassador._id;
      await waitlistEntry.save();

      const json = existingAmbassador.toJSON();

      // Send approval email with dashboard link (non-blocking)
      setImmediate(() => {
        (async () => {
          try {
            const frontendOrigin = process.env.APP_BASE_URL || 'http://localhost:8080';
            const dashboardUrl = `${frontendOrigin}/ambassador/${json._id.toString()}`;

            const htmlTemplate = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <title>Ambassador Application Approved</title>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
                  .header { background: linear-gradient(135deg, #6d28d9 0%, #db2777 100%); color: white; padding: 20px; text-align: center; }
                  .content { padding: 20px; }
                  .footer { background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #666; }
                  .details { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 5px; padding: 15px; margin: 20px 0; }
                  .button { display: inline-block; background-color: #6d28d9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                  h1 { margin: 0; }
                </style>
              </head>
              <body>
                <div class="header">
                  <h1>🎉 Application Approved!</h1>
                </div>
                <div class="content">
                  <p>Hi ${waitlistEntry.name},</p>
                  <p>Great news! Your Campus Ambassador application has been approved and linked to your existing account.</p>
                  
                  <div class="details">
                    <h3>Your Ambassador Details</h3>
                    <p><strong>Referral Code:</strong> ${json.referralCode}</p>
                    <p><strong>Referral Link:</strong> ${dashboardUrl}</p>
                  </div>

                  <p>You can now start earning rewards by sharing your referral link! For every member who joins a group using your link, you'll earn 16% of their payment.</p>

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
                  </div>

                  <p>Your dashboard includes:</p>
                  <ul>
                    <li>Your unique referral link to share</li>
                    <li>Track your earnings and rewards</li>
                    <li>View all groups you've referred</li>
                    <li>Manage your payout settings (UPI ID)</li>
                  </ul>

                  <p>If you have any questions, feel free to reach out to our support team.</p>

                  <p>Best regards,<br>The Signature Day Team</p>
                </div>
                <div class="footer">
                  <p>This is an automated message, please do not reply to this email.</p>
                  <p>&copy; ${new Date().getFullYear()} Signature Day. All rights reserved.</p>
                </div>
              </body>
              </html>
            `;

            const textVersion = `
              Application Approved - Signature Day
              
              Hi ${waitlistEntry.name},
              
              Great news! Your Campus Ambassador application has been approved and linked to your existing account.
              
              Your Ambassador Details:
              - Referral Code: ${json.referralCode}
              - Referral Link: ${dashboardUrl}
              
              You can now start earning rewards by sharing your referral link!
              
              Go to your dashboard: ${dashboardUrl}
              
              Your dashboard includes:
              - Your unique referral link to share
              - Track your earnings and rewards
              - View all groups you've referred
              - Manage your payout settings (UPI ID)
              
              If you have any questions, feel free to reach out to our support team.
              
              Best regards,
              The Signature Day Team
              
              This is an automated message, please do not reply to this email.
              © ${new Date().getFullYear()} Signature Day. All rights reserved.
            `;

            await sendMail({
              to: waitlistEntry.email,
              subject: 'Your Campus Ambassador Application Has Been Approved!',
              html: htmlTemplate,
              text: textVersion,
            });

            console.log('[approveWaitlist] Approval email sent to:', waitlistEntry.email);
          } catch (emailError) {
            console.error('[approveWaitlist] Failed to send approval email:', emailError);
          }
        })();
      });

      return res.json({
        message: "Waitlist entry approved and linked to existing ambassador",
        ambassador: {
          id: json._id.toString(),
          name: json.name,
          email: json.email,
          phone: json.phone,
          referralCode: json.referralCode,
          referralLink: json.referralLink
        },
        waitlistId: waitlistEntry._id.toString()
      });
    }

    // Create new ambassador
    const ambassador = await Ambassador.create({
      name: waitlistEntry.name,
      email: waitlistEntry.email,
      phone: waitlistEntry.phone,
      college: waitlistEntry.college,
      city: waitlistEntry.city,
      state: waitlistEntry.state,
      graduationYear: waitlistEntry.graduationYear
    });

    // Update waitlist entry
    waitlistEntry.status = 'approved';
    waitlistEntry.reviewedAt = new Date();
    waitlistEntry.reviewedBy = userId;
    waitlistEntry.ambassadorId = ambassador._id;
    await waitlistEntry.save();

    const json = ambassador.toJSON();

    console.log('[approveWaitlist] Ambassador created from waitlist:', json._id.toString());

    // Send approval email with dashboard link (non-blocking)
    setImmediate(() => {
      (async () => {
        try {
          const frontendOrigin = process.env.APP_BASE_URL || 'http://localhost:8080';
          const dashboardUrl = `${frontendOrigin}/ambassador/${json._id.toString()}`;

          const htmlTemplate = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Ambassador Application Approved</title>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
                .header { background: linear-gradient(135deg, #6d28d9 0%, #db2777 100%); color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
                .footer { background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #666; }
                .details { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 5px; padding: 15px; margin: 20px 0; }
                .button { display: inline-block; background-color: #6d28d9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                h1 { margin: 0; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>🎉 Application Approved!</h1>
              </div>
              <div class="content">
                <p>Hi ${waitlistEntry.name},</p>
                <p>Great news! Your Campus Ambassador application has been approved.</p>
                
                <div class="details">
                  <h3>Your Ambassador Details</h3>
                  <p><strong>Referral Code:</strong> ${json.referralCode}</p>
                  <p><strong>Referral Link:</strong> ${dashboardUrl}</p>
                </div>

                <p>You can now start earning rewards by sharing your referral link! For every member who joins a group using your link, you'll earn 12% of their payment.</p>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
                </div>

                <p>Your dashboard includes:</p>
                <ul>
                  <li>Your unique referral link to share</li>
                  <li>Track your earnings and rewards</li>
                  <li>View all groups you've referred</li>
                  <li>Manage your payout settings (UPI ID)</li>
                </ul>

                <p>If you have any questions, feel free to reach out to our support team.</p>

                <p>Best regards,<br>The Signature Day Team</p>
              </div>
              <div class="footer">
                <p>This is an automated message, please do not reply to this email.</p>
                <p>&copy; ${new Date().getFullYear()} Signature Day. All rights reserved.</p>
              </div>
            </body>
            </html>
          `;

          const textVersion = `
            Application Approved - Signature Day
            
            Hi ${waitlistEntry.name},
            
            Great news! Your Campus Ambassador application has been approved.
            
            Your Ambassador Details:
            - Referral Code: ${json.referralCode}
            - Referral Link: ${dashboardUrl}
            
            You can now start earning rewards by sharing your referral link!
            
            Go to your dashboard: ${dashboardUrl}
            
            Your dashboard includes:
            - Your unique referral link to share
            - Track your earnings and rewards
            - View all groups you've referred
            - Manage your payout settings (UPI ID)
            
            If you have any questions, feel free to reach out to our support team.
            
            Best regards,
            The Signature Day Team
            
            This is an automated message, please do not reply to this email.
            © ${new Date().getFullYear()} Signature Day. All rights reserved.
          `;

          await sendMail({
            to: waitlistEntry.email,
            subject: 'Your Campus Ambassador Application Has Been Approved!',
            html: htmlTemplate,
            text: textVersion,
          });

          console.log('[approveWaitlist] Approval email sent to:', waitlistEntry.email);
        } catch (emailError) {
          console.error('[approveWaitlist] Failed to send approval email:', emailError);
        }
      })();
    });

    return res.json({
      message: "Waitlist entry approved and ambassador created",
      ambassador: {
        id: json._id.toString(),
        name: json.name,
        email: json.email,
        phone: json.phone,
        referralCode: json.referralCode,
        referralLink: json.referralLink,
        upiId: json.payoutMethod?.upiId ?? json.upiId
      },
      waitlistId: waitlistEntry._id.toString()
    });
  } catch (error) {
    console.error("Error approving waitlist:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Reject waitlist entry (admin only)
export const rejectWaitlist = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const userId = req.user?._id;

    const waitlistEntry = await AmbassadorWaitlist.findById(id);
    if (!waitlistEntry) {
      return res.status(404).json({ message: "Waitlist entry not found" });
    }

    if (waitlistEntry.status !== 'pending') {
      return res.status(400).json({
        message: `Waitlist entry is already ${waitlistEntry.status}`
      });
    }

    waitlistEntry.status = 'rejected';
    waitlistEntry.reviewedAt = new Date();
    waitlistEntry.reviewedBy = userId;
    if (reason) {
      waitlistEntry.rejectionReason = reason.trim();
    }
    await waitlistEntry.save();

    return res.json({
      message: "Waitlist entry rejected",
      waitlistId: waitlistEntry._id.toString()
    });
  } catch (error) {
    console.error("Error rejecting waitlist:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
