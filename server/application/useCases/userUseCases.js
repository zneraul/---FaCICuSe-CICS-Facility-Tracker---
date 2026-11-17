import { UserRole } from '../../domain/entities.js';
import {
  AuthorizationError,
  DomainValidationError,
  NotFoundError,
} from '../../domain/errors.js';
import { assertCanManageUsers } from '../../domain/rules.js';
import { normalizeAcademicBlock } from '../../domain/valueObjects.js';

export function createUserUseCases({
  userRepo,
  auditLogPort,
  domainPolicy,
  adminBootstrapEmails = [],
}) {
  const normalizedBootstrapAdmins = adminBootstrapEmails.map((e) =>
    String(e).trim().toLowerCase()
  );

  return {
    async syncVerifiedGoogleUser(decodedToken, requestedProfile = {}) {
      const verifiedEmail = domainPolicy.assertEmailAllowed(decodedToken.email);
      const existing = await userRepo.findByUid(decodedToken.uid);

      // Never allow public admin registration; only bootstrap emails or existing admins get admin role
      let resolvedRole = UserRole.STUDENT;
      if (existing) {
        resolvedRole = existing.role;
      } else if (normalizedBootstrapAdmins.includes(verifiedEmail)) {
        resolvedRole = UserRole.ADMIN;
      }

      const fullName =
        String(requestedProfile.fullName || decodedToken.name || '').trim() ||
        verifiedEmail.split('@')[0];

      const user = await userRepo.upsertVerifiedUser({
        uid: decodedToken.uid,
        email: verifiedEmail,
        fullName,
        role: resolvedRole,
        department: requestedProfile.department
          ? String(requestedProfile.department).trim()
          : existing?.department || 'College of Informatics and Computing Sciences (CICS)',
        isDemo: false,
      });

      if (!user.isActive) {
        throw new AuthorizationError('This user account has been deactivated by an administrator.');
      }

      return user;
    },

    async updateOwnProfile(actor, payload) {
      const fullName = String(payload.fullName || actor.fullName).trim();
      const department = String(payload.department || actor.department || '').trim();
      const academicBlock =
        payload.academicBlock !== undefined
          ? normalizeAcademicBlock(payload.academicBlock)
          : undefined;
      if (fullName.length < 2 || fullName.length > 100) {
        throw new DomainValidationError('Full name must be between 2 and 100 characters.');
      }
      return userRepo.updateProfile(actor.id, { fullName, department, academicBlock });
    },

    async listUsersForAdmin(actor) {
      if (actor.role !== UserRole.ADMIN) {
        throw new AuthorizationError('Only System Administrators may view user accounts.');
      }
      return userRepo.listAll();
    },

    async updateUserForAdmin(actor, targetUserId, payload) {
      if (actor.role !== UserRole.ADMIN) {
        throw new AuthorizationError('Only System Administrators may modify user accounts.');
      }
      const id = Number(targetUserId);
      const targetUser = await userRepo.findById(id);
      if (!targetUser) {
        throw new NotFoundError('User account not found.');
      }

      const nextRole = payload.role ? String(payload.role).toLowerCase() : targetUser.role;
      const nextIsActive =
        typeof payload.isActive === 'boolean' ? payload.isActive : targetUser.isActive;
      const nextAcademicBlock =
        payload.academicBlock !== undefined
          ? normalizeAcademicBlock(payload.academicBlock)
          : undefined;

      if (actor.id === targetUser.id && nextRole !== UserRole.ADMIN) {
        throw new DomainValidationError('You cannot remove your own System Administrator role.');
      }

      assertCanManageUsers(actor.role, targetUser, nextRole, nextIsActive);

      const updated = await userRepo.updateUserAccount(id, {
        role: nextRole,
        isActive: nextIsActive,
        department:
          payload.department !== undefined
            ? String(payload.department).trim()
            : targetUser.department,
        academicBlock: nextAcademicBlock,
      });

      await auditLogPort.record({
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: 'USER_UPDATED',
        entityType: 'user',
        entityId: String(id),
        details: `Updated ${targetUser.email} role=${nextRole}, active=${nextIsActive}`,
      });

      return updated;
    },
  };
}
