import Order from '../models/orderModel.js';
import { queueOrderRender } from '../services/sharpRenderService.js';
import OrderRenderStatus from '../models/OrderRenderStatus.js';
import VariationTemplate from '../models/VariationTemplate.js';

/**
 * GET /api/render/order/:orderId - Returns order data for render bootstrap (token auth).
 */
export const getRenderOrder = async (req, res) => {
  const { orderId } = req.params;
  if (!orderId) {
    return res.status(400).json({ message: 'Order ID required' });
  }
  try {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(orderId);
    const query = isObjectId ? { $or: [{ clientOrderId: orderId }, { _id: orderId }] } : { clientOrderId: orderId };
    const order = await Order.findOne(query).populate('groupId', 'name').lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const o = {
      ...order,
      id: order.clientOrderId || String(order._id),
      groupId: order.groupId ? (typeof order.groupId === 'object' && order.groupId._id ? String(order.groupId._id) : String(order.groupId)) : undefined,
      groupName: order.groupId?.name,
    };
    return res.json(o);
  } catch (err) {
    console.error('[Render] getRenderOrder error:', err);
    return res.status(500).json({ message: 'Failed to fetch order' });
  }
};

/**
 * Ensure a render job is enqueued for the order.
 * Frontend calls this when opening order detail so server can pre-generate variant images.
 * Pass ?force=true to force re-render even if completed.
 */
export const ensureRender = async (req, res) => {
  const { orderId } = req.params;
  const force = req.query.force === 'true';
  
  if (!orderId) {
    return res.status(400).json({ message: 'Order ID required' });
  }

  try {
    let status = await OrderRenderStatus.findOne({ orderId: String(orderId) });

    // Force re-render: delete existing status, variation templates, and clear order's centerVariantImages
    if (force && status) {
      console.log(`[Render] Force re-render for order ${orderId}`);
      await OrderRenderStatus.deleteOne({ orderId: String(orderId) });
      await VariationTemplate.deleteMany({ orderId: String(orderId) });
      await Order.updateOne(
        { $or: [{ clientOrderId: orderId }, { _id: orderId }] },
        { $set: { centerVariantImages: [] } }
      );
      status = null;
    }

    // If not exists or failed, queue it
    if (!status || status.status === 'failed') {
      console.log(`[Render] Queueing render for order ${orderId} (triggered by admin)`);
      await queueOrderRender(orderId);

      return res.status(200).json({
        message: force ? 'Force re-render queued' : 'Render queued',
        status: 'queued'
      });
    }

    return res.status(200).json({
      message: 'Render already in progress or done',
      status: status.status
    });
  } catch (error) {
    console.error('[Render] ensureRender error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get render status for an order (done/total and per-variant image URLs).
 */
export const getRenderStatus = async (req, res) => {
  const { orderId } = req.params;
  if (!orderId) {
    return res.status(400).json({ message: 'Order ID required' });
  }

  try {
    const status = await OrderRenderStatus.findOne({ orderId: String(orderId) });

    if (!status) {
      return res.status(404).json({ message: 'No render status found' });
    }

    // Filter only completed variants to send back
    const validVariants = (status.variants || [])
      .filter(v => v.status === 'completed' && v.imageUrl)
      .map(v => ({
        id: v.variantId,
        url: v.imageUrl,
        centerMemberId: v.centerMemberId
      }));

    return res.status(200).json({
      orderId,
      status: status.status,
      done: status.completedVariants,
      total: status.totalVariants,
      variants: validVariants,
      error: status.error
    });
  } catch (error) {
    console.error('[Render] getRenderStatus error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get render status for an order (done/total and per-variant image URLs).
 * Returns placeholder until OrderRenderStatus/queue is implemented.
 */
// export const getRenderStatus = async (req, res) => {
//   const { orderId } = req.params;
//   if (!orderId) {
//     return res.status(400).json({ message: 'Order ID required' });
//   }
//   return res.status(200).json({
//     orderId,
//     done: 0,
//     total: 0,
//     variants: [],
//   });
// };
