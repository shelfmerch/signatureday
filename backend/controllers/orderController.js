import Order from '../models/orderModel.js';
import OrderRenderStatus from '../models/OrderRenderStatus.js';
import VariationTemplate from '../models/VariationTemplate.js';
import { upsertReward } from '../services/rewardService.js';
import { queueOrderRender } from '../services/sharpRenderService.js';
import Group from '../models/groupModel.js';
import { sendMail } from '../utils/email.js';
import path from 'path';
import fs from 'fs';

export const createOrder = async (req, res) => {
  try {
    const payload = req.body || {};
    const clientOrderId = payload.id || payload.clientOrderId || `ORD-${Date.now()}`;

    // Extract groupId from payload (may be in notes or directly in payload)
    let groupId = payload.groupId || payload.notes?.groupId || null;

    // If not found, try to extract from description or find by members
    if (!groupId && payload.description) {
      const descMatch = payload.description.match(/group[_-]?id[:\s]+([a-f0-9]{24})/i);
      if (descMatch) {
        groupId = descMatch[1];
      }
    }

    // If still not found, try to find by member roll numbers
    if (!groupId && payload.members && payload.members.length > 0) {
      const firstMemberRoll = payload.members[0]?.memberRollNumber;
      if (firstMemberRoll) {
        const group = await Group.findOne({
          'members.memberRollNumber': firstMemberRoll
        }).select('_id ambassadorId').lean();

        if (group) {
          groupId = group._id.toString();
        }
      }
    }

    const order = await Order.create({
      clientOrderId,
      status: payload.status || 'new',
      paid: !!payload.paid,
      paymentId: payload.paymentId,
      paidAt: payload.paidAt ? new Date(payload.paidAt) : undefined,
      description: payload.description,
      gridTemplate: payload.gridTemplate,
      members: (payload.members || []).map((m, i) => ({
        id: m.id || m.memberRollNumber || `member-${i}-${Date.now()}`,
        name: m.name,
        memberRollNumber: m.memberRollNumber,
        photo: m.photo,
        vote: m.vote,
        joinedAt: m.joinedAt ? new Date(m.joinedAt) : new Date(),
        size: m.size,
        phone: m.phone || undefined,
      })),
      shipping: payload.shipping,
      settings: payload.settings,
      groupId: groupId || undefined
    });

    // Create ambassador reward if order is paid and group has ambassador
    if (payload.paid && groupId) {
      try {
        // Verify group exists and has ambassador
        const group = await Group.findById(groupId).select('ambassadorId members').lean();

        if (group && group.ambassadorId) {
          // Calculate order value (total amount in rupees)
          const orderValue = payload.settings?.total ? payload.settings.total / 100 : null;

          await upsertReward({ groupId, orderValue });
          console.log(`[Order] Created reward for group ${groupId}`);
        }
      } catch (rewardError) {
        // Non-blocking: reward creation failure shouldn't break order creation
        console.error('[Order] Failed to create ambassador reward:', rewardError.message);
      }
    }

    return res.status(201).json(order.toJSON());
  } catch (err) {
    console.error('createOrder error:', err);
    return res.status(400).json({ message: err.message || 'Failed to create order' });
  }
};

export const getOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      paid,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (paid !== undefined) {
      if (paid === 'true' || paid === true) query.paid = true;
      if (paid === 'false' || paid === false) query.paid = false;
    }
    if (search) {
      const s = String(search);
      query.$or = [
        { clientOrderId: { $regex: s, $options: 'i' } },
        { 'shipping.name': { $regex: s, $options: 'i' } },
        { 'shipping.email': { $regex: s, $options: 'i' } },
      ];
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      Order.find(query).sort(sort).skip(skip).limit(limitNum).populate('groupId', 'name').lean({ virtuals: true }),
      Order.countDocuments(query),
    ]);

    // Get render status for all orders
    const orderIds = data.map((o) => o.clientOrderId || String(o._id));
    const renderStatuses = await OrderRenderStatus.find({ orderId: { $in: orderIds } }).lean();
    const renderMap = Object.fromEntries(renderStatuses.map((r) => [r.orderId, r]));

    const orders = data.map((o) => {
      const g = o.groupId;
      const groupName = g?.name ?? undefined;
      const groupIdStr = g ? (typeof g === 'object' && g._id ? String(g._id) : String(g)) : undefined;
      const oid = o.clientOrderId || String(o._id);
      const rs = renderMap[oid];
      const cvCount = o.centerVariantImages?.length ?? 0;
      const membersWithPhotos = (o.members || []).filter(m => m?.photo && m.photo.trim() !== '').length;
      
      // Use render status if available, otherwise fall back to stored images
      const done = rs ? rs.completedVariants : cvCount;
      const total = rs ? rs.totalVariants : (membersWithPhotos >= 2 ? membersWithPhotos : 0);
      const status = rs ? rs.status : (cvCount > 0 ? 'completed' : null);
      
      return {
        ...o,
        id: oid,
        groupId: groupIdStr,
        groupName,
        centerVariantsDone: done,
        centerVariantsTotal: total,
        centerVariantsStatus: status,
      };
    });

    return res.json({ orders, total });
  } catch (err) {
    console.error('getOrders error:', err);
    return res.status(500).json({ message: 'Failed to fetch orders' });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if id is a valid ObjectId
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);

    // Build query based on id format
    let query;
    if (isValidObjectId) {
      query = { $or: [{ clientOrderId: id }, { _id: id }] };
    } else {
      // If not a valid ObjectId, only search by clientOrderId
      query = { clientOrderId: id };
    }

    const order = await Order.findOne(query).populate('groupId', 'name').lean({ virtuals: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const g = order.groupId;
    const groupName = g?.name ?? undefined;
    const groupIdStr = g ? (typeof g === 'object' && g._id ? String(g._id) : String(g)) : undefined;
    return res.json({
      ...order,
      id: order.clientOrderId || String(order._id),
      groupId: groupIdStr,
      groupName,
    });
  } catch (err) {
    console.error('getOrderById error:', err);
    return res.status(500).json({ message: 'Failed to fetch order' });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    if (updates.id) delete updates.id;
    if (updates.clientOrderId) delete updates.clientOrderId;

    // Normalize nested fields if provided
    if (updates.members) {
      updates.members = updates.members.map((m) => ({
        id: m.id,
        name: m.name,
        memberRollNumber: m.memberRollNumber,
        photo: m.photo,
        vote: m.vote,
        joinedAt: m.joinedAt ? new Date(m.joinedAt) : new Date(),
        size: m.size,
      }));
    }

    if (updates.paidAt) updates.paidAt = new Date(updates.paidAt);

    // Check if id is a valid ObjectId
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);

    // Build query based on id format
    let query;
    if (isValidObjectId) {
      query = { $or: [{ clientOrderId: id }, { _id: id }] };
    } else {
      // If not a valid ObjectId, only search by clientOrderId
      query = { clientOrderId: id };
    }

    const updated = await Order.findOneAndUpdate(
      query,
      { $set: updates },
      { new: true, lean: true }
    );

    if (!updated) return res.status(404).json({ message: 'Order not found' });
    return res.json({ ...updated, id: updated.clientOrderId || String(updated._id) });
  } catch (err) {
    console.error('updateOrder error:', err);
    return res.status(400).json({ message: err.message || 'Failed to update order' });
  }
};

export const exportOrdersCsv = async (req, res) => {
  try {
    const ids = (req.query.ids || '').toString().split(',').filter(Boolean);
    if (!ids.length) return res.status(400).json({ message: 'No order ids provided' });

    const orders = await Order.find({ $or: [{ clientOrderId: { $in: ids } }, { _id: { $in: ids } }] })
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });

    const header = ['Order ID', 'Customer Name', 'Status', 'Paid', 'Created At', 'Member Count'];
    const csvEscape = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (/[",\n]/.test(str)) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };
    const lines = [header.join(',')];
    for (const o of orders) {
      const row = [
        o.clientOrderId || String(o._id),
        o.shipping?.name || '',
        o.status || '',
        o.paid ? 'true' : 'false',
        o.createdAt ? new Date(o.createdAt).toISOString() : '',
        Array.isArray(o.members) ? o.members.length : 0,
      ].map(csvEscape);
      lines.push(row.join(','));
    }
    const csv = lines.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="orders-export-${Date.now()}.csv"`);
    return res.status(200).send(csv);
  } catch (err) {
    console.error('exportOrdersCsv error:', err);
    return res.status(500).json({ message: 'Failed to export orders' });
  }
};

function buildVariantsFromStored(centerVariantImages, orderMembers) {
  if (!Array.isArray(centerVariantImages) || centerVariantImages.length === 0) return [];
  return centerVariantImages.map((item) => {
    const memberId = (item.variantId || '').replace(/^variant-/, '') || item.variantId;
    const member = (orderMembers || []).find((m) => m.id === memberId || m.memberRollNumber === memberId) || null;
    const centerMember = member
      ? { ...member, id: member.id || memberId, name: member.name || item.centerMemberName || 'Unknown' }
      : { id: memberId, name: item.centerMemberName || 'Unknown', memberRollNumber: memberId, photo: '', joinedAt: new Date().toISOString() };
    return {
      id: item.variantId,
      centerMember,
      members: orderMembers || [],
      centerIndex: 0,
    };
  });
}

export const getCenterVariants = async (req, res) => {
  try {
    const { id } = req.params;
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isValidObjectId ? { $or: [{ clientOrderId: id }, { _id: id }] } : { clientOrderId: id };

    const order = await Order.findOne(query).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const orderId = order.clientOrderId || String(order._id);

    // First try to get from VariationTemplates collection
    const templates = await VariationTemplate.find({ 
      orderId, 
      status: 'completed' 
    }).lean();

    if (templates.length > 0) {
      // Separate square and hexagonal templates
      const squareTemplates = templates.filter(t => !t.gridType || t.gridType === 'square');
      const hexTemplates = templates.filter(t => t.gridType === 'hexagonal');

      // Build variants helper
      const buildVariantFromTemplate = (t) => {
        const member = (order.members || []).find((m) => 
          m.id === t.centerMemberId || m.memberRollNumber === t.centerMemberId
        );
        const centerMember = member
          ? { ...member, id: member.id || t.centerMemberId, name: member.name || t.centerMemberName || 'Unknown' }
          : { id: t.centerMemberId, name: t.centerMemberName || 'Unknown', memberRollNumber: t.centerMemberId, photo: '', joinedAt: new Date().toISOString() };
        return {
          id: t.variantId,
          centerMember,
          members: order.members || [],
          centerIndex: 0,
          gridType: t.gridType || 'square',
        };
      };

      // Build square variants and images
      const squareVariants = squareTemplates.map(buildVariantFromTemplate);
      const squareRenderedImages = {};
      for (const t of squareTemplates) {
        if (t.variantId && t.imageUrl) squareRenderedImages[t.variantId] = t.imageUrl;
      }

      // Build hexagonal variants and images
      const hexVariants = hexTemplates.map(buildVariantFromTemplate);
      const hexRenderedImages = {};
      for (const t of hexTemplates) {
        if (t.variantId && t.imageUrl) hexRenderedImages[t.variantId] = t.imageUrl;
      }

      // Return both grid types
      return res.json({
        variants: squareVariants,
        renderedImages: squareRenderedImages,
        hexagonalVariants: hexVariants,
        hexagonalRenderedImages: hexRenderedImages,
        totalSquare: squareVariants.length,
        totalHexagonal: hexVariants.length,
      });
    }

    // Fallback to order.centerVariantImages for backward compatibility
    const stored = order.centerVariantImages || [];
    if (stored.length === 0) {
      return res.json({ variants: [], renderedImages: {}, hexagonalVariants: [], hexagonalRenderedImages: {} });
    }

    // Separate by gridType for backward compat data
    const squareStored = stored.filter(s => !s.gridType || s.gridType === 'square');
    const hexStored = stored.filter(s => s.gridType === 'hexagonal');

    const variants = buildVariantsFromStored(squareStored, order.members);
    const renderedImages = {};
    for (const item of squareStored) {
      if (item.variantId && item.imageUrl) renderedImages[item.variantId] = item.imageUrl;
    }

    const hexagonalVariants = buildVariantsFromStored(hexStored, order.members);
    const hexagonalRenderedImages = {};
    for (const item of hexStored) {
      if (item.variantId && item.imageUrl) hexagonalRenderedImages[item.variantId] = item.imageUrl;
    }

    return res.json({
      variants,
      renderedImages,
      hexagonalVariants,
      hexagonalRenderedImages,
      totalSquare: variants.length,
      totalHexagonal: hexagonalVariants.length,
    });
  } catch (err) {
    console.error('getCenterVariants error:', err);
    return res.status(500).json({ message: err.message || 'Failed to fetch center variants' });
  }
};

export const patchCenterVariants = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isValidObjectId ? { $or: [{ clientOrderId: id }, { _id: id }] } : { clientOrderId: id };

    const order = await Order.findOne(query).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });

    let centerVariantImages = body.centerVariantImages;
    if (!centerVariantImages && body.variants && body.renderedImages) {
      const renderedImages = body.renderedImages;
      centerVariantImages = (body.variants || []).map((v) => ({
        variantId: v.id,
        imageUrl: renderedImages[v.id] || '',
        centerMemberName: v.centerMember?.name,
      })).filter((item) => item.imageUrl);
    }
    if (!Array.isArray(centerVariantImages)) {
      return res.status(400).json({ message: 'Invalid payload: centerVariantImages or variants+renderedImages required' });
    }

    const updated = await Order.findOneAndUpdate(
      query,
      { $set: { centerVariantImages } },
      { new: true, lean: true }
    );
    return res.json({
      ...updated,
      id: updated.clientOrderId || String(updated._id),
      variants: buildVariantsFromStored(updated.centerVariantImages || [], updated.members),
      renderedImages: Object.fromEntries((updated.centerVariantImages || []).map((i) => [i.variantId, i.imageUrl]).filter(([, url]) => url)),
    });
  } catch (err) {
    console.error('patchCenterVariants error:', err);
    return res.status(400).json({ message: err.message || 'Failed to update center variants' });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if id is a valid ObjectId
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);

    // Build query based on id format
    let query;
    if (isValidObjectId) {
      query = { $or: [{ clientOrderId: id }, { _id: id }] };
    } else {
      // If not a valid ObjectId, only search by clientOrderId
      query = { clientOrderId: id };
    }

    const deleted = await Order.findOneAndDelete(query);
    if (!deleted) return res.status(404).json({ message: 'Order not found' });
    return res.status(204).send();
  } catch (err) {
    console.error('deleteOrder error:', err);
    return res.status(500).json({ message: 'Failed to delete order' });
  }
};

/**
 * @desc    Create order directly without payment (for Editor checkout)
 * @route   POST /api/orders/create-direct
 * @access  Private (Leader)
 */
export const createOrderDirect = async (req, res) => {
  try {
    const payload = req.body || {};
    const { invoicePdfBase64, invoiceFileName } = payload;

    // Get user info for shipping if not provided
    const user = req.user;
    const clientOrderId = payload.id || payload.clientOrderId || `ORD-${Date.now()}`;

    // Extract groupId from payload
    let groupId = payload.groupId || payload.notes?.groupId || null;

    // If not found, try to extract from description or find by members
    if (!groupId && payload.description) {
      const descMatch = payload.description.match(/group[_-]?id[:\s]+([a-f0-9]{24})/i);
      if (descMatch) {
        groupId = descMatch[1];
      }
    }

    // If still not found, try to find by member roll numbers
    if (!groupId && payload.members && payload.members.length > 0) {
      const firstMemberRoll = payload.members[0]?.memberRollNumber;
      if (firstMemberRoll) {
        const group = await Group.findOne({
          'members.memberRollNumber': firstMemberRoll
        }).select('_id ambassadorId').lean();

        if (group) {
          groupId = group._id.toString();
        }
      }
    }

    // Use user info for shipping if not provided, and ensure required fields have defaults
    const shipping = payload.shipping || {
      name: user.name || 'Customer',
      phone: user.phone || '',
      email: user.email || '',
      line1: 'Address to be updated',
      line2: '',
      city: 'City to be updated',
      state: '',
      postalCode: '000000',
      country: 'India',
    };

    // Ensure required fields are not empty (use defaults if empty)
    if (!shipping.line1 || shipping.line1.trim() === '') {
      shipping.line1 = 'Address to be updated';
    }
    if (!shipping.city || shipping.city.trim() === '') {
      shipping.city = 'City to be updated';
    }
    if (!shipping.postalCode || shipping.postalCode.trim() === '') {
      shipping.postalCode = '000000';
    }
    if (!shipping.country || shipping.country.trim() === '') {
      shipping.country = 'India';
    }
    if (!shipping.name || shipping.name.trim() === '') {
      shipping.name = user.name || 'Customer';
    }

    const order = await Order.create({
      clientOrderId,
      status: payload.status || 'new',
      paid: true, // Mark as paid since there's no payment step
      paymentId: `DIRECT-${Date.now()}`, // Use a direct payment ID
      paidAt: new Date(),
      description: payload.description,
      gridTemplate: payload.gridTemplate,
      members: (payload.members || []).map((m, i) => ({
        id: m.id || m.memberRollNumber || `member-${i}-${Date.now()}`,
        name: m.name,
        memberRollNumber: m.memberRollNumber,
        photo: m.photo,
        vote: m.vote,
        joinedAt: m.joinedAt ? new Date(m.joinedAt) : new Date(),
        size: m.size,
        phone: m.phone || undefined,
      })),
      shipping,
      settings: payload.settings || {
        widthPx: 2550,
        heightPx: 3300,
        keepAspect: true,
        gapPx: 4,
        cellScale: 1.0,
        dpi: 300,
      },
      groupId: groupId || undefined
    });

    // Create ambassador reward if group has ambassador
    if (groupId) {
      try {
        const group = await Group.findById(groupId).select('ambassadorId members').lean();

        if (group && group.ambassadorId) {
          // Calculate order value from already paid amounts
          const memberCount = group.members.length;
          const hasAmbassador = !!group.ambassadorId;
          const perItemTotal = hasAmbassador ? 149 : 189;
          const orderValue = perItemTotal * memberCount;

          await upsertReward({ groupId, orderValue });
          console.log(`[Order] Created reward for group ${groupId}`);
        }
      } catch (rewardError) {
        console.error('[Order] Failed to create ambassador reward:', rewardError.message);
      }
    }

    // Queue center variant generation (triggered on Place Order)
    setImmediate(() => {
      queueOrderRender(order.clientOrderId || order._id.toString()).catch((err) => {
        console.error('[Order] Failed to queue center variants render:', err.message);
      });
    });

    // Send confirmation email with invoice
    if (invoicePdfBase64 && invoiceFileName && shipping.email) {
      setImmediate(() => {
        (async () => {
          try {

            const htmlTemplate = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <title>Order Confirmation - Signature Day</title>
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
                    <h1>Order Confirmation</h1>
                  </div>
                  <div class="content">
                    <p>Dear ${shipping.name || 'Customer'},</p>
                    <p>Thank you for your order! We are pleased to confirm that your order has been successfully placed and is now being processed.</p>
                    
                    <div class="details-card">
                      <p style="margin-top: 0; font-weight: 700; color: #1e293b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Order Details</p>
                      <div class="details-row">
                        <span class="details-label">Order ID:</span>
                        <span class="details-value">${clientOrderId}</span>
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
              to: shipping.email,
              subject: 'Order Confirmation - Signature Day',
              html: htmlTemplate.replace('https://signatureday.com/shelf-merch-logo.webp', 'cid:shelf-merch-logo'),
              attachments
            });
            console.log(`[Order] Confirmation email sent to ${shipping.email}`);
          } catch (emailError) {
            console.error('[Order] Failed to send confirmation email:', emailError);
          }
        })();
      });
    }

    return res.status(201).json({
      success: true,
      order: order.toJSON(),
      message: 'Order created successfully'
    });
  } catch (err) {
    console.error('createOrderDirect error:', err);
    return res.status(400).json({ message: err.message || 'Failed to create order' });
  }
};

