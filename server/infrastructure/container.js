import { EmailDomainPolicy } from '../domain/valueObjects.js';
import {
  AUDIT_LOG_PORT_METHODS,
  FACILITY_REPO_METHODS,
  ISSUE_REPO_METHODS,
  NOTIFICATION_PORT_METHODS,
  RESERVATION_REPO_METHODS,
  USER_REPO_METHODS,
  assertPortImplemented,
} from '../application/ports.js';
import { createFacilityUseCases } from '../application/useCases/facilityUseCases.js';
import { createReservationUseCases } from '../application/useCases/reservationUseCases.js';
import { createMaintenanceUseCases } from '../application/useCases/maintenanceUseCases.js';
import { createUserUseCases } from '../application/useCases/userUseCases.js';
import { createDashboardUseCases } from '../application/useCases/dashboardUseCases.js';
import { createAnalyticsUseCases } from '../application/useCases/analyticsUseCases.js';
import { createPostgresAdapters } from '../adapters/outbound/postgresRepositories.js';
import { createAuthProviderAdapter } from '../adapters/outbound/firebaseAuthAdapter.js';
import { createAuthMiddleware } from '../adapters/inbound/authMiddleware.js';
import { createHttpControllers } from '../adapters/inbound/httpControllers.js';
import { createApiRouter } from '../adapters/inbound/routes.js';

export function buildApplicationContainer(config) {
  // 1. Outbound Adapters
  const {
    facilityRepo,
    reservationRepo,
    issueRepo,
    userRepo,
    notificationPort,
    auditLogPort,
  } = createPostgresAdapters();

  assertPortImplemented(facilityRepo, FACILITY_REPO_METHODS, 'FacilityRepositoryPort');
  assertPortImplemented(reservationRepo, RESERVATION_REPO_METHODS, 'ReservationRepositoryPort');
  assertPortImplemented(issueRepo, ISSUE_REPO_METHODS, 'IssueRepositoryPort');
  assertPortImplemented(userRepo, USER_REPO_METHODS, 'UserRepositoryPort');
  assertPortImplemented(notificationPort, NOTIFICATION_PORT_METHODS, 'NotificationPort');
  assertPortImplemented(auditLogPort, AUDIT_LOG_PORT_METHODS, 'AuditLogPort');

  const authProvider = createAuthProviderAdapter({
    sessionSecret: config.sessionSecret,
  });

  const domainPolicy = new EmailDomainPolicy(config.allowedUniversityDomains);

  // 2. Application Core Use Cases
  const facilityUseCases = createFacilityUseCases({
    facilityRepo,
    reservationRepo,
    issueRepo,
    auditLogPort,
  });

  const reservationUseCases = createReservationUseCases({
    facilityRepo,
    reservationRepo,
    userRepo,
    notificationPort,
    auditLogPort,
  });

  const maintenanceUseCases = createMaintenanceUseCases({
    facilityRepo,
    issueRepo,
    notificationPort,
    auditLogPort,
  });

  const userUseCases = createUserUseCases({
    userRepo,
    auditLogPort,
    domainPolicy,
    adminBootstrapEmails: config.adminBootstrapEmails,
  });

  const dashboardUseCases = createDashboardUseCases({
    facilityRepo,
    reservationRepo,
    issueRepo,
    notificationPort,
  });

  const analyticsUseCases = createAnalyticsUseCases({
    facilityRepo,
    reservationRepo,
    issueRepo,
    userRepo,
    auditLogPort,
  });

  // 3. Inbound Adapters
  const authMiddleware = createAuthMiddleware({
    authProvider,
    userRepo,
    userUseCases,
  });

  const controllers = createHttpControllers({
    facilityUseCases,
    reservationUseCases,
    maintenanceUseCases,
    userUseCases,
    dashboardUseCases,
    analyticsUseCases,
    authProvider,
    userRepo,
    domainPolicy,
  });

  const apiRouter = createApiRouter({
    controllers,
    authMiddleware,
  });

  return {
    apiRouter,
  };
}
