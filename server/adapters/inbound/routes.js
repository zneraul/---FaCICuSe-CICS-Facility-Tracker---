import express from 'express';
import { UserRole } from '../../domain/entities.js';
import { asyncHandler, errorHandler } from './errorHandler.js';

export function createApiRouter({ controllers, authMiddleware }) {
  const router = express.Router();
  const { optionalAuth, requireAuth, requireRole } = authMiddleware;

  // Health & Public Website Endpoints
  router.get('/health', asyncHandler(controllers.health));
  router.get('/auth/config', asyncHandler(controllers.getAuthConfig));
  router.get('/auth/session', optionalAuth, asyncHandler(controllers.getSessionStatus));
  router.post('/auth/demo-session', asyncHandler(controllers.createDemoSession));
  router.post('/auth/logout', asyncHandler(controllers.clearSession));

  router.get('/public/project-info', asyncHandler(controllers.getProjectInfo));
  router.get('/public/facilities', asyncHandler(controllers.listPublicFacilities));
  router.get('/public/facilities/:id', asyncHandler(controllers.getPublicFacilityDetail));

  // Authenticated User Endpoints
  router.get('/auth/me', requireAuth, asyncHandler(controllers.getCurrentUser));
  router.patch('/profile', requireAuth, asyncHandler(controllers.updateOwnProfile));
  router.get('/dashboard', requireAuth, asyncHandler(controllers.getDashboard));
  router.get('/notifications', requireAuth, asyncHandler(controllers.listNotifications));
  router.patch('/notifications/:id/read', requireAuth, asyncHandler(controllers.markNotificationRead));

  router.get('/facilities', requireAuth, asyncHandler(controllers.listFacilities));
  router.get('/facilities/:id', requireAuth, asyncHandler(controllers.getFacilityDetail));

  router.get('/calendar', requireAuth, asyncHandler(controllers.getCalendarSchedule));

  router.get('/reservations', requireAuth, asyncHandler(controllers.listMyReservations));
  router.post('/reservations', requireAuth, asyncHandler(controllers.createReservation));
  router.patch('/reservations/:id/cancel', requireAuth, asyncHandler(controllers.cancelReservation));

  router.get('/issues', requireAuth, asyncHandler(controllers.listIssues));
  router.post('/issues', requireAuth, asyncHandler(controllers.createIssue));

  // System Administrator Only Endpoints (Strictly Enforced Server-Side)
  const adminOnly = [requireAuth, requireRole(UserRole.ADMIN)];

  router.post('/admin/facilities', ...adminOnly, asyncHandler(controllers.adminCreateFacility));
  router.patch('/admin/facilities/:id', ...adminOnly, asyncHandler(controllers.adminUpdateFacility));
  router.delete('/admin/facilities/:id', ...adminOnly, asyncHandler(controllers.adminDeleteFacility));

  router.get('/admin/reservations', ...adminOnly, asyncHandler(controllers.adminListReservations));
  router.post('/admin/schedules', ...adminOnly, asyncHandler(controllers.adminCreateSchedule));
  router.patch('/admin/reservations/:id/review', ...adminOnly, asyncHandler(controllers.adminReviewReservation));
  router.patch('/admin/reservations/:id/reschedule', ...adminOnly, asyncHandler(controllers.adminRescheduleReservation));

  router.patch('/admin/issues/:id', ...adminOnly, asyncHandler(controllers.adminUpdateIssue));

  router.get('/admin/users', ...adminOnly, asyncHandler(controllers.adminListUsers));
  router.patch('/admin/users/:id', ...adminOnly, asyncHandler(controllers.adminUpdateUser));

  router.get('/admin/analytics', ...adminOnly, asyncHandler(controllers.adminGetAnalytics));
  router.get('/admin/analytics/export.csv', ...adminOnly, asyncHandler(controllers.adminExportCsv));

  router.use(errorHandler);
  return router;
}
