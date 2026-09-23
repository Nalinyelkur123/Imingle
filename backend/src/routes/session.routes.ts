// ============================================================================
// NexusChat — Session Routes
// ============================================================================

import { Router } from 'express';
import {
  initSession,
  getSessionStatus,
  endSession,
} from '../controllers/session.controller.js';

const router = Router();

router.post('/api/session/init', initSession);
router.get('/api/session/status', getSessionStatus);
router.post('/api/session/end', endSession);

export default router;
