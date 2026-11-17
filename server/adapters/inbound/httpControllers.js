import { DEMO_COOKIE_NAME } from './authMiddleware.js';
import { DEMO_USERS, ensureSeedData } from '../outbound/seedService.js';
import { DomainValidationError } from '../../domain/errors.js';
import { getPublicProjectInfo } from '../../domain/projectInfo.js';

export function createHttpControllers({
  facilityUseCases,
  reservationUseCases,
  maintenanceUseCases,
  userUseCases,
  dashboardUseCases,
  analyticsUseCases,
  authProvider,
  userRepo,
  domainPolicy,
}) {
  return {
    async health(_req, res) {
      res.json({ ok: true, service: 'FaCICuSe' });
    },

    async getProjectInfo(_req, res) {
      res.json(getPublicProjectInfo());
    },

    async getAuthConfig(_req, res) {
      res.json({
        allowedDomainsConfigured: domainPolicy.isConfigured(),
        allowedDomains: domainPolicy.allowedDomains,
        demoAccounts: DEMO_USERS.map((u) => ({
          uid: u.uid,
          email: u.email,
          fullName: u.fullName,
          role: u.role,
          department: u.department,
        })),
      });
    },

    async createDemoSession(req, res) {
      await ensureSeedData();
      const requestedRole = String(req.body?.role || '').trim().toLowerCase();
      const targetDemo = DEMO_USERS.find((d) => d.role === requestedRole);
      if (!targetDemo) {
        throw new DomainValidationError('Select a valid demo role: student, professor, or admin.');
      }

      const user = await userRepo.findByUid(targetDemo.uid);
      if (!user) {
        throw new DomainValidationError('Demo sandbox account is not available.');
      }

      const proto = req.headers['x-forwarded-proto'] || req.protocol;
      const isHttps = req.secure || String(proto).split(',')[0].trim() === 'https';
      const token = authProvider.issueDemoSessionToken(user.uid);
      res.cookie(DEMO_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: isHttps ? 'none' : 'lax',
        secure: isHttps,
        path: '/',
        maxAge: 1000 * 60 * 60 * 12,
      });

      res.json({
        sessionToken: token,
        user: {
          id: user.id,
          uid: user.uid,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          department: user.department,
          academicBlock: user.academicBlock || null,
          isDemo: true,
        },
      });
    },

    async clearSession(req, res) {
      const proto = req.headers['x-forwarded-proto'] || req.protocol;
      const isHttps = req.secure || String(proto).split(',')[0].trim() === 'https';
      res.clearCookie(DEMO_COOKIE_NAME, {
        httpOnly: true,
        sameSite: isHttps ? 'none' : 'lax',
        secure: isHttps,
        path: '/',
      });
      res.json({ ok: true });
    },

    async getSessionStatus(req, res) {
      res.json({
        user: req.actor
          ? {
              id: req.actor.id,
              uid: req.actor.uid,
              email: req.actor.email,
              fullName: req.actor.fullName,
              role: req.actor.role,
              department: req.actor.department,
              academicBlock: req.actor.academicBlock || null,
              isDemo: req.actor.isDemo,
            }
          : null,
      });
    },

    async getCurrentUser(req, res) {
      res.json({
        user: {
          id: req.actor.id,
          uid: req.actor.uid,
          email: req.actor.email,
          fullName: req.actor.fullName,
          role: req.actor.role,
          department: req.actor.department,
          academicBlock: req.actor.academicBlock || null,
          isDemo: req.actor.isDemo,
        },
      });
    },

    async updateOwnProfile(req, res) {
      const updated = await userUseCases.updateOwnProfile(req.actor, req.body || {});
      res.json({ user: updated });
    },

    async listPublicFacilities(req, res) {
      await ensureSeedData();
      const items = await facilityUseCases.listPublicFacilities(req.query);
      res.json({ facilities: items });
    },

    async getPublicFacilityDetail(req, res) {
      await ensureSeedData();
      const detail = await facilityUseCases.getPublicFacilityDetail(
        req.params.id,
        req.query.date
      );
      res.json(detail);
    },

    async getDashboard(req, res) {
      await ensureSeedData();
      const data = await dashboardUseCases.getRoleDashboard(req.actor);
      res.json(data);
    },

    async listNotifications(req, res) {
      const items = await dashboardUseCases.getNotificationsForUser(req.actor);
      res.json({ notifications: items });
    },

    async markNotificationRead(req, res) {
      const result = await dashboardUseCases.markNotificationRead(
        req.actor,
        req.params.id
      );
      res.json(result);
    },

    async listFacilities(req, res) {
      await ensureSeedData();
      const items = await facilityUseCases.listFacilitiesForUser(req.actor, req.query);
      res.json({ facilities: items });
    },

    async getFacilityDetail(req, res) {
      await ensureSeedData();
      const detail = await facilityUseCases.getFacilityDetailForUser(
        req.actor,
        req.params.id,
        req.query.date
      );
      res.json(detail);
    },

    async listMyReservations(req, res) {
      await ensureSeedData();
      const items = await reservationUseCases.listUserReservations(
        req.actor,
        req.query.status
      );
      res.json({ reservations: items });
    },

    async getCalendarSchedule(req, res) {
      await ensureSeedData();
      const calendar = await reservationUseCases.getCalendarSchedule(req.actor, req.query || {});
      res.json(calendar);
    },

    async createReservation(req, res) {
      const created = await reservationUseCases.createReservationRequest(
        req.actor,
        req.body || {}
      );
      res.status(201).json({ reservation: created });
    },

    async cancelReservation(req, res) {
      const updated = await reservationUseCases.cancelUserReservation(
        req.actor,
        req.params.id
      );
      res.json({ reservation: updated });
    },

    async listIssues(req, res) {
      await ensureSeedData();
      const items = await maintenanceUseCases.listMaintenanceIssues(
        req.actor,
        req.query.status
      );
      res.json({ issues: items });
    },

    async createIssue(req, res) {
      const created = await maintenanceUseCases.submitMaintenanceIssue(
        req.actor,
        req.body || {}
      );
      res.status(201).json({ issue: created });
    },

    // System Administrator Controllers
    async adminCreateFacility(req, res) {
      const created = await facilityUseCases.createFacility(req.actor, req.body || {});
      res.status(201).json({ facility: created });
    },

    async adminUpdateFacility(req, res) {
      const updated = await facilityUseCases.updateFacility(
        req.actor,
        req.params.id,
        req.body || {}
      );
      res.json({ facility: updated });
    },

    async adminDeleteFacility(req, res) {
      const result = await facilityUseCases.deleteFacility(req.actor, req.params.id);
      res.json(result);
    },

    async adminListReservations(req, res) {
      await ensureSeedData();
      const items = await reservationUseCases.listAllReservationsForAdmin(
        req.actor,
        req.query.status
      );
      res.json({ reservations: items });
    },

    async adminCreateSchedule(req, res) {
      const created = await reservationUseCases.createAdminScheduleBlock(
        req.actor,
        req.body || {}
      );
      res.status(201).json({ reservation: created });
    },

    async adminReviewReservation(req, res) {
      const updated = await reservationUseCases.reviewReservation(
        req.actor,
        req.params.id,
        req.body || {}
      );
      res.json({ reservation: updated });
    },

    async adminRescheduleReservation(req, res) {
      const updated = await reservationUseCases.rescheduleReservation(
        req.actor,
        req.params.id,
        req.body || {}
      );
      res.json({ reservation: updated });
    },

    async adminUpdateIssue(req, res) {
      const updated = await maintenanceUseCases.updateMaintenanceIssueForAdmin(
        req.actor,
        req.params.id,
        req.body || {}
      );
      res.json({ issue: updated });
    },

    async adminListUsers(req, res) {
      await ensureSeedData();
      const items = await userUseCases.listUsersForAdmin(req.actor);
      res.json({ users: items });
    },

    async adminUpdateUser(req, res) {
      const updated = await userUseCases.updateUserForAdmin(
        req.actor,
        req.params.id,
        req.body || {}
      );
      res.json({ user: updated });
    },

    async adminGetAnalytics(req, res) {
      await ensureSeedData();
      const analytics = await analyticsUseCases.getAdminAnalytics(req.actor, req.query || {});
      res.json(analytics);
    },

    async adminExportCsv(req, res) {
      await ensureSeedData();
      const csv = await analyticsUseCases.exportReservationsCsv(req.actor);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="facicuse-reservations-report.csv"'
      );
      res.send(csv);
    },
  };
}
