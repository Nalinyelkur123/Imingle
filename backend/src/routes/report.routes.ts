// ============================================================================
// NexusChat — Report Routes
// ============================================================================

import { Router } from 'express';
import { submitReport } from '../controllers/report.controller.js';

const router = Router();

router.post('/api/reports', submitReport);

export default router;
