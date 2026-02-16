import express from 'express';
import { protect, isAdmin, isLeader } from '../middleware/authMiddleware.js';
import {
  createOrder,
  createOrderDirect,
  getOrders,
  getOrderById,
  updateOrder,
  exportOrdersCsv,
  deleteOrder,
  getCenterVariants,
  patchCenterVariants,
  // ensureRender,
} from '../controllers/orderController.js';

const router = express.Router();

// Create order (leaders only)
router.post('/', protect, isLeader, createOrder);

// Create order directly without payment (for Editor checkout)
router.post('/create-direct', protect, isLeader, createOrderDirect);

// Admin endpoints
router.get('/', protect, isAdmin, getOrders);
router.get('/export', protect, isAdmin, exportOrdersCsv);
// router.post('/:id/ensure-render', protect, isAdmin, ensureRender);
router.get('/:id/center-variants', protect, isAdmin, getCenterVariants);
router.patch('/:id/center-variants', protect, isAdmin, patchCenterVariants);
router.get('/:id', protect, isAdmin, getOrderById);
router.put('/:id', protect, isAdmin, updateOrder);
router.delete('/:id', protect, isAdmin, deleteOrder);

export default router;


