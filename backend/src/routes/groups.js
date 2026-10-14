import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { customerOrderRoutes } from './customerOrders.js';
import { partnerJobRoutes } from './partnerJobs.js';
import { partnerExtraRoutes } from './partnerExtra.js';
import { partnerApprovalRoutes } from './partnerApprovals.js';

function group(role) {
  const router = Router();
  router.use(authenticate, requireRole(role));
  router.get('/ping', (req, res) =>
    res.json({ ok: true, role: req.user.role, stage: req.user.stage, interface: req.user.interface })
  );
  return router;
}

export const customerRoutes = group('customer');
customerRoutes.use(customerOrderRoutes);
export const partnerRoutes = group('partner');
partnerRoutes.use(partnerExtraRoutes);
partnerRoutes.use(partnerApprovalRoutes);
partnerRoutes.use(partnerJobRoutes);
export const devRoutes = group('developer');




import { customerUploadRoutes } from './uploads.js';
customerRoutes.use(customerUploadRoutes);

import { partnerUploadRoutes } from './partnerUploads.js';
partnerRoutes.use(partnerUploadRoutes);
