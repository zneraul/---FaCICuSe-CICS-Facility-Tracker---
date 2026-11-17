import { IssueStatus, UserRole, createIssueDraft } from '../../domain/entities.js';
import { AuthorizationError, NotFoundError } from '../../domain/errors.js';
import { assertCanUpdateIssue } from '../../domain/rules.js';

export function createMaintenanceUseCases({
  facilityRepo,
  issueRepo,
  notificationPort,
  auditLogPort,
}) {
  return {
    async submitMaintenanceIssue(actor, payload) {
      const draft = createIssueDraft(payload);
      const facility = await facilityRepo.findById(draft.facilityId);
      if (!facility) {
        throw new NotFoundError('Selected facility does not exist.');
      }

      const created = await issueRepo.create({
        ...draft,
        reporterId: actor.id,
        status: IssueStatus.OPEN,
        isDemo: Boolean(actor.isDemo),
      });

      await notificationPort.create({
        userId: actor.id,
        title: 'Maintenance Report Logged',
        message: `Report "${created.title}" for ${facility.name} has been queued with status Open.`,
        type: 'info',
        linkPath: '/app/issues',
      });

      await auditLogPort.record({
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: 'ISSUE_REPORTED',
        entityType: 'maintenance_issue',
        entityId: String(created.id),
        details: `Reported "${created.title}" (${created.priority}) for ${facility.code}`,
      });

      return created;
    },

    async listMaintenanceIssues(actor, statusFilter = 'All') {
      const rows =
        actor.role === UserRole.ADMIN
          ? await issueRepo.listAll()
          : await issueRepo.listByReporterId(actor.id);

      if (!statusFilter || statusFilter === 'All') {
        return rows;
      }
      return rows.filter((row) => row.status === statusFilter);
    },

    async updateMaintenanceIssueForAdmin(actor, issueId, payload) {
      if (actor.role !== UserRole.ADMIN) {
        throw new AuthorizationError('Only System Administrators may update maintenance tickets.');
      }
      const id = Number(issueId);
      const existing = await issueRepo.findById(id);
      if (!existing) {
        throw new NotFoundError('Maintenance report not found.');
      }

      const nextStatus = payload.status || existing.status;
      assertCanUpdateIssue(actor.role, nextStatus);

      const updated = await issueRepo.updateStatus(id, {
        status: nextStatus,
        actionTaken:
          payload.actionTaken !== undefined
            ? String(payload.actionTaken || '').trim()
            : existing.actionTaken,
        assignedTo:
          payload.assignedTo !== undefined
            ? String(payload.assignedTo || '').trim()
            : existing.assignedTo,
      });

      await notificationPort.create({
        userId: existing.reporterId,
        title: `Maintenance Update: ${nextStatus}`,
        message: `Ticket "${existing.title}" was updated to ${nextStatus}.${updated.actionTaken ? ` Action taken: ${updated.actionTaken}` : ''}`,
        type: nextStatus === IssueStatus.RESOLVED ? 'success' : 'info',
        linkPath: '/app/issues',
      });

      await auditLogPort.record({
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: 'ISSUE_UPDATED',
        entityType: 'maintenance_issue',
        entityId: String(id),
        details: `Updated issue #${id} to ${nextStatus}`,
      });

      return updated;
    },
  };
}
