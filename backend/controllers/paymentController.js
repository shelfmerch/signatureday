import Razorpay from 'razorpay';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { sendMail } from '../utils/email.js';
import Order from '../models/orderModel.js';
import Group from '../models/groupModel.js';
import User from '../models/userModel.js';
import Payment from '../models/paymentModel.js';
import AmbassadorReward from '../models/ambassadorRewardModel.js';
import Ambassador from '../models/ambassadorModel.js';
import mongoose from 'mongoose';
// import OTPVerification from '../models/OTPVerification.js';
// import { standardizePhoneNumber } from '../utils/otpUtils.js';

const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET');
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

export const getKey = async (req, res) => {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    if (!keyId) return res.status(500).json({ message: 'Razorpay key not configured' });
    return res.json({ keyId });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch key' });
  }
};

export const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, notes } = req.body || {};
    if (!amount || typeof amount !== 'number') {
      return res.status(400).json({ message: 'Amount (in paise) is required' });
    }

    // Convert amount to integer (Razorpay requires integer values)
    const amountPaise = Math.round(amount);

    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.create({
      amount: amountPaise, // paise (must be integer)
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: notes || {},
    });

    return res.status(201).json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
    });
  } catch (err) {
    console.error('createRazorpayOrder error:', err);
    return res.status(500).json({ message: 'Failed to create payment order' });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, clientOrderId, orderId } = req.body || {};
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

    const valid = expectedSignature === razorpay_signature;
    if (!valid) return res.status(400).json({ valid: false, message: 'Invalid signature' });

    // Attempt to send confirmation email to the customer
    let emailed = false;
    try {
      const {
        email: bodyEmail,
        name: bodyName,
        amount: bodyAmount,
        invoicePdfBase64,
        invoiceFileName
      } = req.body;

      let customerEmail = bodyEmail;
      let customerName = bodyName;
      let orderDetails = null;

      if (!customerEmail && (clientOrderId || orderId)) {
        const orderRef = clientOrderId || orderId;
        orderDetails = await Order.findOne({ clientOrderId: orderRef }).lean();
        if (orderDetails && orderDetails.shipping && orderDetails.shipping.email) {
          customerEmail = orderDetails.shipping.email;
          customerName = orderDetails.shipping.name;
        }
      }

      if (!customerEmail && req.user && req.user.email) {
        customerEmail = req.user.email;
        customerName = req.user.name;
      }

      if (customerEmail) {
        const displayOrderId = clientOrderId || orderId || razorpay_order_id;
        const amountDisplay = typeof bodyAmount === 'number' ? `₹${(bodyAmount / 100).toFixed(2)}` : 'N/A';

        const htmlTemplate = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Payment Confirmation - Signature Day</title>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #ffffff; }
              .container { background-color: #ffffff; border: 1px solid #e1e8ed; margin-top: 20px; }
              .header { text-align: center; padding: 30px 20px; background-color: #f8fafc; border-bottom: 2px solid #6d28d9; }
              .logo { max-width: 150px; margin-bottom: 20px; }
              .content { padding: 40px 30px; }
              .footer { background-color: #f8fafc; padding: 30px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
              .details-card { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 25px; margin: 30px 0; }
              .details-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; border-bottom: 1px dashed #f1f5f9; padding-bottom: 8px; }
              .details-row:last-child { border-bottom: none; }
              .details-label { color: #64748b; }
              .details-value { color: #1e293b; font-weight: 600; }
              h1 { margin: 0; font-size: 20px; color: #1e293b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
              p { margin-bottom: 15px; font-size: 15px; color: #475569; }
              .company-info { margin-top: 40px; font-size: 11px; color: #94a3b8; line-height: 1.6; text-align: left; }
              .thank-you { font-weight: 700; color: #6d28d9; margin-top: 30px; font-size: 16px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <img src="https://signatureday.com/shelf-merch-logo.webp" alt="Signature Day Logo" class="logo">
                <h1>Payment Confirmation</h1>
              </div>
              <div class="content">
                <p>Dear ${customerName || 'Customer'},</p>
                <p>Thank you for your payment. We are pleased to confirm that your transaction has been successfully processed and your order has been received.</p>
                
                <div class="details-card">
                  <p style="margin-top: 0; font-weight: 700; color: #1e293b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Transaction Details</p>
                  <div class="details-row">
                    <span class="details-label">Order ID:</span>
                    <span class="details-value">${displayOrderId}</span>
                  </div>
                  <div class="details-row">
                    <span class="details-label">Payment ID:</span>
                    <span class="details-value">${razorpay_payment_id}</span>
                  </div>
                  <div class="details-row">
                    <span class="details-label">Total Amount:</span>
                    <span class="details-value">${amountDisplay}</span>
                  </div>
                  <div class="details-row">
                    <span class="details-label">Date:</span>
                    <span class="details-value">${new Date().toLocaleDateString('en-IN')}</span>
                  </div>
                </div>

                <p>We've attached your official <strong>Tax Invoice</strong> to this email for your records.</p>
                
                <p><strong>What's next?</strong><br>
                Our team will now begin processing your order. You will receive further updates via email once your items are dispatched.</p>

                <p class="thank-you">Thank you for choosing Signature Day.</p>

                <div class="company-info">
                  <strong>Chitlu Innovations Private Limited</strong><br>
                  G2, Win Win Towers, Siddhi Vinayaka Nagar,<br>
                  Madhapur, Hyderabad, Telangana – 500081, India<br>
                  GSTIN: 36AAHCC5155C1ZW
                </div>
              </div>
              <div class="footer">
                <p>This is an automated message from Signature Day. Please do not reply.</p>
                <p>&copy; ${new Date().getFullYear()} Signature Day. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;

        const logoPath = path.join(process.cwd(), '..', 'public', 'shelf-merch-logo.webp');
        let logoContent = null;
        try {
          if (fs.existsSync(logoPath)) {
            logoContent = fs.readFileSync(logoPath);
          }
        } catch (logoErr) {
          console.error('Failed to read logo for email embedding:', logoErr);
        }

        const attachments = [
          ...(invoicePdfBase64 && invoiceFileName ? [
            {
              filename: invoiceFileName,
              content: invoicePdfBase64,
              encoding: 'base64',
              contentType: 'application/pdf'
            }
          ] : []),
          ...(logoContent ? [
            {
              filename: 'shelf-merch-logo.webp',
              content: logoContent,
              cid: 'shelf-merch-logo'
            }
          ] : [])
        ];

        await sendMail({
          to: customerEmail,
          subject: 'Payment Confirmation - Signature Day',
          html: htmlTemplate.replace('https://signatureday.com/shelf-merch-logo.webp', 'cid:shelf-merch-logo'),
          attachments
        });
        emailed = true;
      }
    } catch (emailErr) {
      console.error('Failed to send payment confirmation email:', emailErr);
    }

    return res.json({ valid: true, emailed });
  } catch (err) {
    console.error('verifyPayment error:', err);
    return res.status(500).json({ message: 'Failed to verify payment' });
  }
};

export const verifyPaymentAndJoin = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      groupId,
      member,
      invoicePdfBase64,
      invoiceFileName
    } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification fields' });
    }

    if (!groupId || !member) {
      return res.status(400).json({ success: false, message: 'Missing group or member data' });
    }
    const { name, email, memberRollNumber, photo, vote, size, zoomLevel, phone } = member;

    // if (!name || !email || !memberRollNumber || !photo || !vote || !phone) {
    if (!name || !email || !memberRollNumber || !photo || !vote) {
      return res.status(400).json({ success: false, message: 'Incomplete member details provided' });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(500).json({ success: false, message: 'Razorpay secret not configured' });
    }

    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // const normalizedPhone = standardizePhoneNumber(phone);
    // if (!normalizedPhone) {
    //   return res.status(400).json({ success: false, message: 'Invalid phone number' });
    // }

    // const verifiedWindowMs = Number(process.env.OTP_VERIFIED_MAX_AGE_MINUTES || 30) * 60 * 1000;
    // const otpRecord = await OTPVerification.findOne({ phone: normalizedPhone, verified: true })
    //   .sort({ verifiedAt: -1 });

    // if (!otpRecord || !otpRecord.verifiedAt || (Date.now() - otpRecord.verifiedAt.getTime()) > verifiedWindowMs || otpRecord.usedAt) {
    //   return res.status(400).json({ success: false, message: 'Phone number has not been verified recently. Please complete OTP verification again.' });
    // }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (group.members.length >= group.totalMembers) {
      return res.status(409).json({ success: false, message: 'Group is already full' });
    }

    const duplicateEmail = group.members.find((m) => m.email && email && m.email.toLowerCase() === email.toLowerCase());
    if (duplicateEmail) {
      return res.status(409).json({ success: false, message: 'Member with this email already exists in the group' });
    }

    const duplicateRoll = group.members.find((m) => m.memberRollNumber === memberRollNumber);
    if (duplicateRoll) {
      return res.status(400).json({ success: false, message: 'Member with this roll number already exists' });
    }

    // Determine per-member join price based on whether the group was referred by an ambassador.
    // - With ambassador (group.ambassadorId present and not null): ₹149
    // - Without ambassador (null, undefined, or empty): ₹189
    const hasAmbassador = !!(group.ambassadorId && group.ambassadorId !== null && group.ambassadorId !== undefined && String(group.ambassadorId).trim() !== '');
    const perItemTotal = hasAmbassador ? 149 : 189;
    
    console.log(`[Payment Verify] Group ID: ${groupId}, ambassadorId: ${JSON.stringify(group.ambassadorId)}, hasAmbassador: ${hasAmbassador}, price: ₹${perItemTotal}`);
    const perItemSubtotal = perItemTotal;
    const perItemGst = 0;
    const paymentAmountPaise = perItemTotal * 100;

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
      depositAmountPaise: paymentAmountPaise,
      depositOrderId: razorpay_order_id,
      depositPaymentId: razorpay_payment_id,
      depositPaidAt: new Date(),
      joinedAt: new Date()
    };

    group.members.push(newMember);
    group.votes[vote] = (group.votes[vote] || 0) + 1;

    await group.save();

    // otpRecord.usedAt = new Date();
    // otpRecord.verified = false;
    // await otpRecord.save();

    // Role-based: only the person who joined (by email) is the group creator → leader.
    // Use joiner identity (member email), not session, so shared browser does not get leader access.
    let isCreator = false;
    if (group.createdByUserId && email) {
      const creator = await User.findById(group.createdByUserId).select('email').lean();
      const creatorEmail = creator?.email;
      if (creatorEmail) {
        const joinerEmail = String(email).trim().toLowerCase();
        const creatorEmailNorm = String(creatorEmail).trim().toLowerCase();
        isCreator = joinerEmail === creatorEmailNorm;
        console.log(`[DEBUG] isCreator check: joiner=${joinerEmail}, creator=${creatorEmailNorm}, result=${isCreator}`);
      }
    }

    const responsePayload = {
      success: true,
      groupId: group._id,
      member: newMember,
      isCreator,
      message: 'Payment verified and member added'
    };

    res.json(responsePayload);

    setImmediate(() => {
      (async () => {
        try {
          const htmlTemplate = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Confirmation of Registration - ${group.name}</title>
              <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #ffffff; }
                .container { background-color: #ffffff; border: 1px solid #e1e8ed; margin-top: 20px; }
                .header { text-align: center; padding: 30px 20px; background-color: #f8fafc; border-bottom: 2px solid #6d28d9; }
                .logo { max-width: 150px; margin-bottom: 20px; }
                .content { padding: 40px 30px; }
                .footer { background-color: #f8fafc; padding: 30px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
                .details-card { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 25px; margin: 30px 0; }
                .details-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; border-bottom: 1px dashed #f1f5f9; padding-bottom: 8px; }
                .details-row:last-child { border-bottom: none; }
                .details-label { color: #64748b; }
                .details-value { color: #1e293b; font-weight: 600; }
                h1 { margin: 0; font-size: 20px; color: #1e293b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
                p { margin-bottom: 15px; font-size: 15px; color: #475569; }
                .company-info { margin-top: 40px; font-size: 11px; color: #94a3b8; line-height: 1.6; text-align: left; }
                .thank-you { font-weight: 700; color: #6d28d9; margin-top: 30px; font-size: 16px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <img src="https://signatureday.com/shelf-merch-logo.webp" alt="Signature Day Logo" class="logo">
                  <h1>Confirmation of Registration</h1>
                </div>
                <div class="content">
                  <p>Dear ${name},</p>
                  <p>This is to confirm that your registration for the group <strong>${group.name}</strong> (Class of ${group.yearOfPassing}) has been successfully completed. Your payment has been received and verified.</p>
                  
                  <div class="details-card">
                    <p style="margin-top: 0; font-weight: 700; color: #1e293b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Transaction Details</p>
                    <div class="details-row">
                      <span class="details-label">Order Reference:</span>
                      <span class="details-value">${razorpay_order_id}</span>
                    </div>
                    <div class="details-row">
                      <span class="details-label">Payment ID:</span>
                      <span class="details-value">${razorpay_payment_id}</span>
                    </div>
                    <div class="details-row">
                      <span class="details-label">Total Amount:</span>
                      <span class="details-value">₹${perItemTotal.toFixed(2)}</span>
                    </div>
                    <div class="details-row">
                      <span class="details-label">Transaction Date:</span>
                      <span class="details-value">${new Date().toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>

                  <p>We've attached your official <strong>Tax Invoice</strong> to this email for your records.</p>
                  
                  <p><strong>What's next?</strong><br>
                  We are waiting for more members to join. Once the group is complete, we'll start the high-quality printing process and keep you updated on the delivery status.</p>

                  <p>Thank you for being part of this memorable journey!</p>

                  <p>Best regards,<br><strong>The Signature Day Team</strong></p>
                  
                  <div class="company-info">
                    <strong>Chitlu Innovations Private Limited</strong><br>
                    G2, Win Win Towers, Siddhi Vinayaka Nagar,<br>
                    Madhapur, Hyderabad, Telangana – 500081, India<br>
                    GST: 36AAHCC5155C1ZW
                  </div>
                </div>
                <div class="footer">
                  <p>This is an automated message from Signature Day. Please do not reply.</p>
                  <p>&copy; ${new Date().getFullYear()} Signature Day. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>
          `;

          const logoPath = path.join(process.cwd(), '..', 'public', 'shelf-merch-logo.webp');
          let logoContent = null;
          try {
            if (fs.existsSync(logoPath)) {
              logoContent = fs.readFileSync(logoPath);
            }
          } catch (logoErr) {
            console.error('Failed to read logo for email embedding:', logoErr);
          }

          const attachments = [
            ...(invoicePdfBase64 && invoiceFileName ? [
              {
                filename: invoiceFileName,
                content: invoicePdfBase64,
                encoding: 'base64',
                contentType: 'application/pdf'
              }
            ] : []),
            ...(logoContent ? [
              {
                filename: 'shelf-merch-logo.webp',
                content: logoContent,
                cid: 'shelf-merch-logo'
              }
            ] : [])
          ];

          await sendMail({
            to: email,
            subject: `Confirmation of Registration - ${group.name}`,
            html: htmlTemplate.replace('https://signatureday.com/shelf-merch-logo.webp', 'cid:shelf-merch-logo'),
            attachments
          });
        } catch (emailError) {
          console.error('Failed to send join invoice email:', emailError);
        }
      })();
    });

  } catch (error) {
    console.error('verifyPaymentAndJoin error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process payment and join group' });
  }
};





/**
 * @desc    Create payment intent (demo)
 * @route   POST /api/payments/intent
 * @access  Private
 */
export const createPaymentIntent = async (req, res) => {
  try {
    const { groupId, itemTotal } = req.body;

    if (!groupId || !itemTotal || typeof itemTotal !== 'number' || itemTotal <= 0) {
      return res.status(400).json({ message: 'groupId and valid amount are required' });
    }

    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Create payment record
    const payment = await Payment.create({
      groupId,
      amount: Math.round(itemTotal), // Round to integer (INR)
      status: 'initiated',
      clientSecret: 'demo'
    });

    return res.status(201).json({
      paymentId: payment._id.toString(),
      clientSecret: 'demo'
    });
  } catch (error) {
    console.error('createPaymentIntent error:', error);
    return res.status(500).json({ message: 'Failed to create payment intent' });
  }
};

/**
 * @desc    Confirm payment (demo) and allocate rewards
 * @route   POST /api/payments/confirm
 * @access  Private
 */
export const confirmPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { paymentId, outcome = 'success' } = req.body;

    if (!paymentId) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'paymentId is required' });
    }

    const payment = await Payment.findById(paymentId).session(session);
    if (!payment) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (outcome === 'fail') {
      payment.status = 'failed';
      await payment.save({ session });
      await session.commitTransaction();
      return res.json({
        paymentId: payment._id.toString(),
        status: 'failed'
      });
    }

    // Success path
    if (payment.status === 'succeeded') {
      // Already processed, return existing reward if any
      const existingReward = await AmbassadorReward.findOne({ groupId: payment.groupId }).session(session);
      await session.commitTransaction();
      return res.json({
        paymentId: payment._id.toString(),
        status: 'succeeded',
        reward: existingReward ? {
          id: existingReward._id.toString(),
          amount: existingReward.rewardAmount,
          status: existingReward.status
        } : undefined
      });
    }

    // Load group
    const group = await Group.findById(payment.groupId).session(session);
    if (!group) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Group not found' });
    }

    // Idempotency check: if group already paid, skip reward creation
    if (group.status === 'paid') {
      payment.status = 'succeeded';
      await payment.save({ session });
      const existingReward = await AmbassadorReward.findOne({ groupId: payment.groupId }).session(session);
      await session.commitTransaction();
      return res.json({
        paymentId: payment._id.toString(),
        status: 'succeeded',
        reward: existingReward ? {
          id: existingReward._id.toString(),
          amount: existingReward.rewardAmount,
          status: existingReward.status
        } : undefined
      });
    }

    // Mark payment as succeeded
    payment.status = 'succeeded';
    await payment.save({ session });

    // Mark group as paid and store orderTotal
    group.status = 'paid';
    group.orderTotal = payment.amount;
    await group.save({ session });

    let reward = null;
    let ambassadorEmail = null;
    let ambassadorName = null;

    // Allocate reward if group has ambassador
    if (group.ambassadorId) {
      // Check if reward already exists (idempotency)
      const existingReward = await AmbassadorReward.findOne({
        ambassadorId: group.ambassadorId,
        groupId: group._id
      }).session(session);

      if (!existingReward) {
        // Calculate reward: 16% rounded down
        const rewardAmount = Math.floor(payment.amount * 0.16);

        // Create reward
        reward = await AmbassadorReward.create([{
          ambassadorId: group.ambassadorId,
          groupId: group._id,
          groupNameSnapshot: group.name,
          memberCountSnapshot: group.members.length,
          rewardAmount,
          status: 'pending',
          orderValue: payment.amount
        }], { session });

        reward = reward[0];

        // Update ambassador totals
        const ambassador = await Ambassador.findById(group.ambassadorId).session(session);
        if (ambassador) {
          ambassador.totals.rewardsPending = (ambassador.totals.rewardsPending || 0) + rewardAmount;
          await ambassador.save({ session });
          ambassadorEmail = ambassador.email;
          ambassadorName = ambassador.name;
        }

        console.log(`[Payment] Reward allocated: ₹${rewardAmount} to ambassador ${group.ambassadorId} for group ${group._id}`);
      } else {
        reward = existingReward;
        console.log(`[Payment] Reward already exists for group ${group._id}, skipping creation`);
      }
    } else {
      console.log(`[Payment] No ambassador linked to group ${group._id}, skipping reward allocation`);
    }

    await session.commitTransaction();

    // Notify ambassador about pending reward (non-blocking)
    if (reward && ambassadorEmail) {
      setImmediate(() => {
        (async () => {
          try {
            const amountDisplay = `₹${reward.rewardAmount.toFixed(0)}`;
            await sendMail({
              to: ambassadorEmail,
              subject: 'New reward pending approval - Signature Day',
              text: `Hi ${ambassadorName || 'Ambassador'},\n\n` +
                `A new reward of ${amountDisplay} has been generated for your referred group "${group.name}".\n` +
                `It is currently pending admin approval. Once approved and paid out, it will appear in your ambassador dashboard.\n\n` +
                `Thank you for your referrals!\n\n` +
                `- Signature Day Team`,
            });
          } catch (err) {
            console.error('Failed to send ambassador reward notification:', err);
          }
        })();
      });
    }

    return res.json({
      paymentId: payment._id.toString(),
      status: 'succeeded',
      reward: reward ? {
        id: reward._id.toString(),
        amount: reward.rewardAmount,
        status: reward.status
      } : undefined
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('confirmPayment error:', error);
    return res.status(500).json({ message: 'Failed to confirm payment' });
  } finally {
    session.endSession();
  }
};