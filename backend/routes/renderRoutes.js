import express from 'express';
import { renderOrAdmin } from '../middleware/renderAuth.js';
import { getRenderOrder, ensureRender, getRenderStatus } from '../controllers/renderController.js';

const router = express.Router();

router.get('/order/:orderId', renderOrAdmin, getRenderOrder);
router.post('/ensure/:orderId', renderOrAdmin, ensureRender);
router.get('/status/:orderId', renderOrAdmin, getRenderStatus);

export default router;
