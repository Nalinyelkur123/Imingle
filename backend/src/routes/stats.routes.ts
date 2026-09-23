// ============================================================================
// NexusChat — Stats Routes
// ============================================================================

import { Router } from 'express';
import { getStats } from '../controllers/stats.controller.js';

const router = Router();

router.get('/api/stats', getStats);

export default router;
