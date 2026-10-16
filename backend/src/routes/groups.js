import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { customerOrderRoutes } from './customerOrders.js';
import { customerFileRoutes } from './customerFiles.js';
import { customerUploadRoutes } from './uploads.js';
import { partnerJobRoutes } from './partnerJobs.js';
import { partnerExtraRoutes } from './partnerExtra.js';
import { partnerApprovalRoutes } from './partnerApprovals.js';
import { partnerUploadRoutes } from './partnerUploads.js';
import { ticketRoutes, devTicketRoutes } from './tickets.js';
import { reportRoutes } from './reports.js';
import { devSettingsRoutes } from './devSettings.js';

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
customerRoutes.use(customerFileRoutes);
customerRoutes.use(customerUploadRoutes);
customerRoutes.use(ticketRoutes);

// Order matters: extra routes (guards) and approvals come before the job routes.
export const partnerRoutes = group('partner');
partnerRoutes.use(partnerExtraRoutes);
partnerRoutes.use(partnerApprovalRoutes);
partnerRoutes.use(partnerJobRoutes);
partnerRoutes.use(partnerUploadRoutes);
partnerRoutes.use(ticketRoutes);

export const devRoutes = group('developer');
devRoutes.use(devTicketRoutes);
devRoutes.use(reportRoutes);
devRoutes.use('/settings', devSettingsRoutes);
