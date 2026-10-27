import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { customerOrderRoutes } from './customerOrders.js';
import { customerFileRoutes } from './customerFiles.js';
import { customerCouponRoutes } from './customerCoupons.js';
import { customerPaymentRoutes } from './customerPayments.js';
import { customerStkRoutes } from './customerStk.js';
import { partnerPaymentRoutes } from './partnerPayments.js';
import { customerUploadRoutes } from './uploads.js';
import { partnerJobRoutes } from './partnerJobs.js';
import { partnerExtraRoutes } from './partnerExtra.js';
import { partnerApprovalRoutes } from './partnerApprovals.js';
import { partnerUploadRoutes } from './partnerUploads.js';
import { ticketRoutes, devTicketRoutes } from './tickets.js';
import { reportRoutes } from './reports.js';
import { partnerMoneyRoutes } from './partnerMoney.js';
import { devSettingsRoutes } from './devSettings.js';
import { vendorJobRoutes } from './vendorJobs.js';
import { partnerCatalogRoutes } from './partnerCatalog.js';
import { partnerBrowseRoutes } from './partnerBrowse.js';
import { partnerCouponRoutes } from './partnerCoupons.js';
import { partnerApplicationRoutes } from './partnerApplications.js';
import { partnerDealerRoutes } from './partnerDealers.js';
import { partnerInflowRoutes } from './partnerInflow.js';
import { partnerInvoiceRoutes } from './partnerInvoices.js';
import { partnerActivityRoutes } from './partnerActivity.js';
import { partnerMessageRoutes } from './partnerMessages.js';
import { partnerConnectRoutes } from './partnerConnect.js';
import { partnerSendRoutes } from './partnerSend.js';
import { partnerCsvRoutes } from './partnerCsv.js';
import { devSystemRoutes } from './devSystem.js';
import { devUserRoutes } from './devUsers.js';
import { devGraphRoutes } from './devGraphs.js';
import { devUptimeRoutes } from './devUptime.js';
import { devSecurityRoutes } from './devSecurity.js';
import { devSecurityLabRoutes } from './devSecurityLab.js';
import { devSessionsRoutes } from './devSessions.js';
import { devSqlRoutes } from './devSql.js';
import { devCommandRoutes } from './devCommands.js';
import { devCodeRoutes } from './devCode.js';
import { devVaultRoutes } from './devVault.js';
import { devThemeRoutes } from './devTheme.js';
import { devPasswordHelpRoutes } from './devPasswordHelp.js';
import { siteVideoAdminRoutes } from './siteVideos.js';
import { partnerContentRoutes } from './siteContent.js';
import { partnerSocialRoutes } from './partnerSocial.js';

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
customerRoutes.use(customerCouponRoutes);
customerRoutes.use(customerPaymentRoutes);
customerRoutes.use(customerStkRoutes);
customerRoutes.use(customerUploadRoutes);
customerRoutes.use(ticketRoutes);

// Order matters: extra routes (guards) and approvals come before the job routes.
export const partnerRoutes = group('partner');
partnerRoutes.use('/catalog', partnerCatalogRoutes);
partnerRoutes.use('/catalog', partnerBrowseRoutes);
partnerRoutes.use('/coupons', partnerCouponRoutes);
partnerRoutes.use('/applications', partnerApplicationRoutes);
partnerRoutes.use('/dealers', partnerDealerRoutes);
partnerRoutes.use('/social', partnerSocialRoutes);
partnerRoutes.use(partnerPaymentRoutes);
partnerRoutes.use('/videos', siteVideoAdminRoutes);
partnerRoutes.use(partnerExtraRoutes);
partnerRoutes.use(partnerInflowRoutes);
partnerRoutes.use(partnerInvoiceRoutes);
partnerRoutes.use(partnerActivityRoutes);
partnerRoutes.use(partnerMessageRoutes);
partnerRoutes.use(partnerConnectRoutes);
partnerRoutes.use(partnerSendRoutes);
partnerRoutes.use(partnerCsvRoutes);
partnerRoutes.use(reportRoutes);
partnerRoutes.use(partnerMoneyRoutes);
partnerRoutes.use(partnerApprovalRoutes);
partnerRoutes.use(partnerJobRoutes);
partnerRoutes.use(partnerUploadRoutes);
partnerRoutes.use(ticketRoutes);

export const devRoutes = group('developer');
devRoutes.use(devTicketRoutes);
devRoutes.use(reportRoutes);
devRoutes.use('/settings', devSettingsRoutes);
devRoutes.use('/videos', siteVideoAdminRoutes);
devRoutes.use('/content', partnerContentRoutes);
devRoutes.use('/social', partnerSocialRoutes);
devRoutes.use(partnerActivityRoutes);
devRoutes.use('/system', devSystemRoutes);
devRoutes.use('/password-help', devPasswordHelpRoutes);
devRoutes.use('/system', devGraphRoutes);
devRoutes.use('/system', devUptimeRoutes);
devRoutes.use('/system', devSecurityRoutes);
devRoutes.use('/system', devSecurityLabRoutes);
devRoutes.use('/system', devSessionsRoutes);
devRoutes.use('/system', devSqlRoutes);
devRoutes.use('/system', devCommandRoutes);
devRoutes.use('/system', devCodeRoutes);
devRoutes.use('/system', devVaultRoutes);
devRoutes.use('/theme', devThemeRoutes);
devRoutes.use('/system', devUserRoutes);

export const vendorRoutes = group('vendor');
vendorRoutes.use(vendorJobRoutes);

