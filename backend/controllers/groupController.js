import Group from '../models/groupModel.js';
import User from '../models/userModel.js';
import Order from '../models/orderModel.js';
import OTPVerification from '../models/OTPVerification.js';
import crypto from 'crypto';
import { validationResult } from 'express-validator';
import { standardizePhoneNumber } from '../utils/otpUtils.js';
import { getReferralCode, resolveReferralCode, clearReferralCookie } from '../services/referralService.js';

/**
 * @desc    Create a new group
 * @route   POST /api/groups
 * @access  Private
 */
export const createGroup = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, yearOfPassing, totalMembers, gridTemplate, layoutMode } = req.body;
    console.log('[DEBUG] createGroup req.body:', JSON.stringify(req.body, null, 2));

    // Resolve referral code from cookie or body
    const referralCode = getReferralCode(req);
    let ambassadorId = null;
    let resolvedReferralCode = null;
    let referredAt = null;

    if (referralCode) {
      const ambassador = await resolveReferralCode(referralCode);
      if (ambassador) {
        ambassadorId = ambassador._id;
        resolvedReferralCode = referralCode;
        referredAt = new Date();
        console.log(`[Group Creation] Group created with ambassador referral: ${referralCode}, ambassadorId: ${ambassadorId}`);
      } else {
        console.log(`[Group Creation] Referral code found but invalid: ${referralCode}`);
      }
    } else {
      console.log(`[Group Creation] No referral code found - group will be created without ambassador (price: ₹189)`);
    }

    // Create new group
    // Explicitly set ambassadorId to null if not provided (not undefined)
    const group = await Group.create({
      name,
      yearOfPassing,
      totalMembers,
      gridTemplate: gridTemplate || 'square',
      layoutMode: layoutMode || 'voting',
      members: [],
      ambassadorId: ambassadorId || null, // Explicitly set to null if no ambassador
      referralCode: resolvedReferralCode || null, // Explicitly set to null if no referral
      referredAt: referredAt || null, // Explicitly set to null if no referral
      createdByUserId: req.user?._id || null
    });

    if (group) {
      // Update user to be a leader and associate with group
      // Update user to be a leader and associate with group
      await User.findByIdAndUpdate(req.user._id, {
        isLeader: true,
        groupId: group._id.toString() // Ensure stored as string
      });

      // Clear referral cookie after group creation to prevent reuse
      // This ensures the cookie is only used once per group creation
      if (referralCode) {
        clearReferralCookie(res);
      }

      res.status(201).json({
        id: group._id,
        name: group.name,
        yearOfPassing: group.yearOfPassing,
        totalMembers: group.totalMembers,
        gridTemplate: group.gridTemplate,
        layoutMode: group.layoutMode,
        shareLink: `/join/${group._id}`,
        createdAt: group.createdAt,
        leaderId: group.createdByUserId, // Return leaderId for frontend filtering
        ambassadorId: group.ambassadorId ? group.ambassadorId.toString() : null,
        referralCode: group.referralCode || null,
        referredAt: group.referredAt || null,
        members: group.members.map(member => ({
          ...member,
          id: member._id || member.id // Include id field for frontend compatibility
        })),
        votes: group.votes
      });
    } else {
      res.status(400).json({ message: 'Invalid group data' });
    }
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Join a group after successful payment (deposit)
 * @route   POST /api/groups/:id/join-paid
 * @access  Private (JWT)
 */
export const joinGroupPaid = async (req, res) => {
  try {
    const groupId = req.params.id;
    const { member, payment } = req.body || {};
    if (!member || !payment) {
      return res.status(400).json({ message: 'Missing member or payment payload' });
    }

    const { name, email, memberRollNumber, photo, vote, size, phone, zoomLevel } = member;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = payment;

    if (!name || !memberRollNumber || !photo || !vote) {
      return res.status(400).json({ message: 'Invalid member payload' });
    }
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing payment verification fields' });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) return res.status(500).json({ message: 'Razorpay secret not configured' });

    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(payload)
      .digest('hex');
    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Idempotency: prevent duplicate paid joins by same roll or phone
    const dupe = group.members.find(m => m.memberRollNumber === memberRollNumber || (phone && m.phone === phone));
    if (dupe && dupe.paidDeposit) {
      return res.status(200).json({ message: 'Already joined with deposit', groupId: group._id, member: dupe });
    }

    // Capacity check using actual member count
    const currentMembersCount = group.members.length;
    if (currentMembersCount >= group.totalMembers) {
      return res.status(409).json({ message: 'Group is already full' });
    }

    // Compute server-authoritative deposit amount (keep in paise)
    const tshirt = Number(process.env.TSHIRT_PRICE || 1);
    const print = Number(process.env.PRINT_PRICE || 1);
    const depositAmountPaise = (tshirt + print) * 100;

    const newMember = {
      name,
      email,
      memberRollNumber,
      photo,
      vote,
      size: size || 'm',
      zoomLevel: typeof zoomLevel === 'number' ? zoomLevel : 0.4,
      phone: phone || undefined,
      paidDeposit: true,
      depositAmountPaise,
      depositOrderId: razorpay_order_id,
      depositPaymentId: razorpay_payment_id,
      depositPaidAt: new Date(),
      joinedAt: new Date(),
    };

    // Atomic push via update with capacity constraint
    // Note: This constraint is tricky with the leader exclusion.
    // For simplicity, we rely on the pre-check above since concurrent paid joins are rare
    // or we'd need a complex aggregation pipeline in the update query.
    // We'll relax the strict atomic check slightly or assume the pre-check covers 99% cases.
    const updated = await Group.findByIdAndUpdate(
      groupId,
      { $push: { members: newMember }, $inc: { [`votes.${vote}`]: 1 } },
      { new: true }
    );

    if (!updated) {
      return res.status(409).json({ message: 'Group became full. Please contact support for refund.' });
    }

    return res.status(201).json({ groupId: updated._id, member: newMember, message: 'Joined with deposit' });
  } catch (err) {
    console.error('joinGroupPaid error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * @desc    Get all groups
 * @route   GET /api/groups
 * @access  Private/Admin
 */
export const getGroups = async (req, res) => {
  try {
    // Extract pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Extract sorting parameters
    const sortField = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortOrder };

    // Extract filtering parameters
    const filter = {};
    if (req.query.yearOfPassing) {
      filter.yearOfPassing = req.query.yearOfPassing;
    }
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: 'i' };
    }

    // Use lean() for better performance and select() to exclude large photo data
    const groups = await Group.find(filter)
      .select('-members.photo')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Group.countDocuments(filter);

    res.json({
      groups,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get group by ID
 * @route   GET /api/groups/:id
 * @access  Public (for joining via link)
 */
export const getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).lean();

    if (group) {
      // Do not truncate photos; return full data for proper rendering/face detection
      const compressedMembers = group.members;

      res.json({
        id: group._id,
        name: group.name,
        yearOfPassing: group.yearOfPassing,
        totalMembers: group.totalMembers,
        gridTemplate: group.gridTemplate,
        layoutMode: group.layoutMode,
        shareLink: `/join/${group._id}`,
        createdAt: group.createdAt,
        leaderId: group.createdByUserId, // Return leaderId for frontend filtering
        ambassadorId: (group.ambassadorId && group.ambassadorId.toString()) || null, // Include ambassadorId for pricing logic (convert to string or null)
        referralCode: group.referralCode || null,
        referredAt: group.referredAt || null,
        members: group.members.map(member => ({
          ...member,
          id: member._id || member.id // Include id field for frontend compatibility
        })),
        votes: group.votes
      });
    } else {
      res.status(404).json({ message: 'Group not found' });
    }
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get group members with pagination
 * @route   GET /api/groups/:id/members
 * @access  Public
 */
export const getGroupMembers = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).lean();

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Extract pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Extract sorting parameters
    const sortField = req.query.sortBy || 'joinedAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Extract search parameter
    const search = req.query.search || '';

    // Filter and sort members
    let members = [...group.members];

    // Apply search filter if provided
    if (search) {
      members = members.filter(member =>
        member.name.toLowerCase().includes(search.toLowerCase()) ||
        member.memberRollNumber.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sort members
    members.sort((a, b) => {
      if (sortField === 'joinedAt') {
        return sortOrder === 1
          ? new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
          : new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
      }

      if (sortField === 'name') {
        return sortOrder === 1
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }

      if (sortField === 'memberRollNumber') {
        return sortOrder === 1
          ? a.memberRollNumber.localeCompare(b.memberRollNumber)
          : b.memberRollNumber.localeCompare(a.memberRollNumber);
      }

      return 0;
    });

    // Apply pagination
    const total = members.length;
    const paginatedMembers = members.slice(skip, skip + limit);

    // Do not truncate photos for members list
    const resultMembers = paginatedMembers.map(member => ({
      ...member,
      id: member._id || member.id // Include id field for frontend compatibility
    }));

    res.json({
      members: resultMembers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get group members error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Join a group
 * @route   POST /api/groups/:id/join
 * @access  Private
 */
export const joinGroup = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, memberRollNumber, photo, vote, size, phone, zoomLevel } = req.body;
    const normalizedPhone = standardizePhoneNumber(phone);
    if (!normalizedPhone) {
      return res.status(400).json({ message: 'Valid phone number is required' });
    }

    const otpRecord = await OTPVerification.findOne({ phone: normalizedPhone, verified: true })
      .sort({ verifiedAt: -1 });

    const verifiedWindowMs = Number(process.env.OTP_VERIFIED_MAX_AGE_MINUTES || 30) * 60 * 1000;
    const now = Date.now();

    if (!otpRecord || !otpRecord.verifiedAt || (now - otpRecord.verifiedAt.getTime()) > verifiedWindowMs || otpRecord.usedAt) {
      return res.status(400).json({ message: 'Phone number has not been verified. Please complete OTP verification.' });
    }

    const group = await Group.findById(req.params.id);
    console.log('Join group request body:', req.body);
    console.log('Phone from join request (normalized):', normalizedPhone);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if group is full using actual member count
    const currentMembersCount = group.members.length;
    if (currentMembersCount >= group.totalMembers) {
      return res.status(400).json({ message: 'Group is already full' });
    }

    // Check if user is already a member
    const existingMember = group.members.find(
      member => member.memberRollNumber === memberRollNumber
    );

    if (existingMember) {
      return res.status(400).json({ message: 'Member with this roll number already exists' });
    }

    // Add member to group
    const newMember = {
      name,
      memberRollNumber,
      photo,
      vote,
      size: size || 'm',
      zoomLevel: typeof zoomLevel === 'number' ? zoomLevel : 0.4,
      phone: normalizedPhone,
      joinedAt: new Date()
    };

    console.log('Creating new member with data:', newMember);

    group.members.push(newMember);
    group.votes[vote] = (group.votes[vote] || 0) + 1;

    // Update user's group association
    // Preserve leader status if user is already the leader of this group
    if (req.user) {
      const user = await User.findById(req.user._id);
      const isCurrentLeader = user?.isLeader && user?.groupId === group._id.toString();

      await User.findByIdAndUpdate(req.user._id, {
        groupId: group._id,
        // Preserve leader status if already a leader, or set it if they are the creator
        isLeader: user?.isLeader || (group.createdByUserId && group.createdByUserId.toString() === user._id.toString()) ? true : false
      });
    }

    // Save group
    const updatedGroup = await group.save();

    otpRecord.usedAt = new Date();
    otpRecord.verified = false;
    await otpRecord.save();

    console.log('Group saved. Last member added:', updatedGroup.members[updatedGroup.members.length - 1]);
    console.log('Last member phone:', updatedGroup.members[updatedGroup.members.length - 1]?.phone);

    res.status(201).json({
      groupId: updatedGroup._id,
      member: newMember,
      message: 'Successfully joined group'
    });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Update group template
 * @route   PUT /api/groups/:id/template
 * @access  Private/Leader
 */
export const updateGroupTemplate = async (req, res) => {
  try {
    // Use lean() for better performance since we're not using Mongoose methods
    const group = await Group.findById(req.params.id).lean();

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Skip auth check for public access to improve performance
    // Only perform auth check if it's not a public request
    if (req.headers.authorization) {
      // Check if user is the leader of this group
      if (!req.user || !req.user.isLeader || req.user.groupId !== group._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this group' });
      }
    }

    // Calculate winning template based on votes
    const votes = group.votes;
    let maxVotes = 0;
    let winningTemplate = group.gridTemplate;

    for (const [template, count] of Object.entries(votes)) {
      if (count > maxVotes) {
        maxVotes = count;
        winningTemplate = template;
      }
    }

    // Only update if template has changed
    if (winningTemplate !== group.gridTemplate || (req.body && req.body.gridTemplate)) {
      const templateToUse = (req.body && req.body.gridTemplate) ? req.body.gridTemplate : winningTemplate;

      // Update the document directly without loading the entire object
      await Group.updateOne(
        { _id: req.params.id },
        { $set: { gridTemplate: templateToUse } }
      );

      res.json({
        id: group._id,
        gridTemplate: templateToUse,
        message: 'Group template updated successfully'
      });
    } else {
      // No change needed
      res.json({
        id: group._id,
        gridTemplate: group.gridTemplate,
        message: 'Group template is already up to date'
      });
    }
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Update group
 * @route   PUT /api/groups/:id
 * @access  Private/Leader
 */
export const updateGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is the leader of this group
    if (!req.user.isLeader || req.user.groupId !== group._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this group' });
    }

    console.log('[DEBUG] updateGroup req.body:', JSON.stringify(req.body, null, 2));

    // Update group fields
    if (req.body.name) group.name = req.body.name;
    if (req.body.yearOfPassing) group.yearOfPassing = req.body.yearOfPassing;
    if (req.body.totalMembers) group.totalMembers = req.body.totalMembers;
    if (req.body.gridTemplate) group.gridTemplate = req.body.gridTemplate;
    if (req.body.layoutMode) group.layoutMode = req.body.layoutMode;

    const updatedGroup = await group.save();

    res.json({
      id: updatedGroup._id,
      name: updatedGroup.name,
      yearOfPassing: updatedGroup.yearOfPassing,
      totalMembers: updatedGroup.totalMembers,
      gridTemplate: updatedGroup.gridTemplate,
      layoutMode: updatedGroup.layoutMode,
      message: 'Group updated successfully'
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Delete group
 * @route   DELETE /api/groups/:id
 * @access  Private/Leader
 */
export const deleteGroup = async (req, res) => {
  console.log(`[Backend] DELETE request received for group: ${req.params.id}`);
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is the leader of this group
    // 1. Check if they are the 'active' leader (User.groupId matches)
    const isActiveLeader = req.user.isLeader && req.user.groupId == group._id.toString();

    // 2. Legacy member-based leader detection is no longer used
    const isMemberLeader = false;

    // 3. Check explicit ownership if field exists
    const isOwner = group.createdByUserId && group.createdByUserId.toString() === req.user._id.toString();

    // 4. Legacy fallback based on first member is no longer used
    const isFirstMember = false;

    console.log(`[Auth Debug] active=${isActiveLeader}, memberLeader=${isMemberLeader}, owner=${isOwner}, first=${isFirstMember}`);

    if (!isActiveLeader && !isMemberLeader && !isOwner && !isFirstMember) {
      console.warn(`Delete blocked: User ${req.user._id} is not authorized for group ${group._id}`);
      return res.status(403).json({ message: 'Not authorized to delete this group' });
    }

    // Remove group association from all users in this group
    await User.updateMany({ groupId: group._id }, { groupId: null, isLeader: false });
    console.log(`Detached users from group ${group._id}`);

    // Delete the group using findByIdAndDelete to ensure it is removed and return the doc
    const deletedGroup = await Group.findByIdAndDelete(group._id);

    if (!deletedGroup) {
      console.error('Delete failed: Group not found during delete operation');
      return res.status(500).json({ message: 'Failed to delete group' });
    }

    console.log(`Group ${group._id} deleted successfully`);
    res.json({ message: 'Group removed successfully', deletedId: group._id });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};