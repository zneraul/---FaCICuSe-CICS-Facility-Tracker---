import { computeDashboardMetrics } from '../../domain/rules.js';
import { UserRole } from '../../domain/entities.js';

export function createDashboardUseCases({
  facilityRepo,
  reservationRepo,
  issueRepo,
  notificationPort,
}) {
  return {
    async getRoleDashboard(actor) {
      const todayIso = new Date().toISOString().slice(0, 10);
      const [facilities, reservations, issues, notifications] = await Promise.all([
        facilityRepo.listAll(),
        actor.role === UserRole.ADMIN
          ? reservationRepo.listAll()
          : reservationRepo.listByUserId(actor.id),
        actor.role === UserRole.ADMIN
          ? issueRepo.listAll()
          : issueRepo.listByReporterId(actor.id),
        notificationPort.listByUserId(actor.id),
      ]);

      const metrics = computeDashboardMetrics({
        reservations,
        issues,
        facilities,
        user: actor,
        todayIso,
      });

      return {
        user: {
          id: actor.id,
          email: actor.email,
          fullName: actor.fullName,
          role: actor.role,
          department: actor.department,
          academicBlock: actor.academicBlock || null,
          isDemo: actor.isDemo,
        },
        metrics,
        recentIssues: issues.slice(0, 5),
        unreadNotificationsCount: notifications.filter((n) => !n.isRead).length,
      };
    },

    async getNotificationsForUser(actor) {
      return notificationPort.listByUserId(actor.id);
    },

    async markNotificationRead(actor, notificationId) {
      if (notificationId === 'all') {
        await notificationPort.markAllAsRead(actor.id);
        return { updated: true };
      }
      await notificationPort.markAsRead(actor.id, Number(notificationId));
      return { updated: true };
    },
  };
}
