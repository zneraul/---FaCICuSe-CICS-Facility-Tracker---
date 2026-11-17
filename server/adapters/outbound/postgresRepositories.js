import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../../../src/db/index.ts';
import {
  auditLogs,
  facilities,
  maintenanceIssues,
  notifications,
  reservations,
  users,
} from '../../../src/db/schema.ts';
import { ACTIVE_BLOCKING_STATUSES } from '../../domain/entities.js';
import { ConflictError } from '../../domain/errors.js';
import { TimeSlot } from '../../domain/valueObjects.js';

function wrapDbError(action, error) {
  if (error instanceof ConflictError) {
    throw error;
  }
  console.error(`[DB Error] ${action}:`, error);
  throw new Error(`Database operation failed during ${action}.`, { cause: error });
}

export function createPostgresAdapters() {
  const facilityRepo = {
    async listAll() {
      try {
        return await db
          .select()
          .from(facilities)
          .where(eq(facilities.isArchived, false))
          .orderBy(asc(facilities.id));
      } catch (error) {
        wrapDbError('list facilities', error);
      }
    },

    async findById(id) {
      try {
        const rows = await db.select().from(facilities).where(eq(facilities.id, id));
        return rows[0] || null;
      } catch (error) {
        wrapDbError('find facility by id', error);
      }
    },

    async findByCode(code) {
      try {
        const rows = await db.select().from(facilities).where(eq(facilities.code, code));
        return rows[0] || null;
      } catch (error) {
        wrapDbError('find facility by code', error);
      }
    },

    async create(data) {
      try {
        const rows = await db.insert(facilities).values(data).returning();
        return rows[0];
      } catch (error) {
        wrapDbError('create facility', error);
      }
    },

    async update(id, data) {
      try {
        const rows = await db
          .update(facilities)
          .set(data)
          .where(eq(facilities.id, id))
          .returning();
        return rows[0] || null;
      } catch (error) {
        wrapDbError('update facility', error);
      }
    },

    async remove(id) {
      try {
        await db
          .update(facilities)
          .set({ isArchived: true, isReservable: false, status: 'Restricted' })
          .where(eq(facilities.id, id));
        return true;
      } catch (error) {
        wrapDbError('archive facility', error);
      }
    },
  };

  async function enrichReservations(rows) {
    if (!rows.length) return [];
    const [allFacilities, allUsers] = await Promise.all([
      db.select().from(facilities),
      db.select().from(users),
    ]);
    const facilityMap = new Map(allFacilities.map((f) => [f.id, f]));
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    return rows.map((r) => {
      const f = facilityMap.get(r.facilityId);
      const u = userMap.get(r.userId);
      return {
        ...r,
        facilityCode: f?.code || '',
        facilityName: f?.name || 'Unknown Facility',
        facilityBuilding: f?.building || '',
        facilityFloor: f?.floor || '',
        facilityCategory: f?.category || '',
        facilityImageUrl: f?.imageUrl || '',
        facilityIsArchived: Boolean(f?.isArchived),
        userFullName: u?.fullName || 'Unknown User',
        userEmail: u?.email || '',
        userRole: u?.role || '',
        userAcademicBlock: u?.academicBlock || null,
      };
    });
  }

  const reservationRepo = {
    async listAll() {
      try {
        const rows = await db
          .select()
          .from(reservations)
          .orderBy(desc(reservations.reservationDate), asc(reservations.startTime));
        const enriched = await enrichReservations(rows);
        return enriched.filter((r) => !r.facilityIsArchived);
      } catch (error) {
        wrapDbError('list all reservations', error);
      }
    },

    async listByUserId(userId) {
      try {
        const rows = await db
          .select()
          .from(reservations)
          .where(eq(reservations.userId, userId))
          .orderBy(desc(reservations.reservationDate), asc(reservations.startTime));
        const enriched = await enrichReservations(rows);
        return enriched.filter((r) => !r.facilityIsArchived);
      } catch (error) {
        wrapDbError('list user reservations', error);
      }
    },

    async listByFacilityAndDate(facilityId, reservationDate) {
      try {
        return await db
          .select()
          .from(reservations)
          .where(
            and(
              eq(reservations.facilityId, facilityId),
              eq(reservations.reservationDate, reservationDate)
            )
          )
          .orderBy(asc(reservations.startTime));
      } catch (error) {
        wrapDbError('list facility schedule', error);
      }
    },

    async findById(id) {
      try {
        const rows = await db.select().from(reservations).where(eq(reservations.id, id));
        const enriched = await enrichReservations(rows);
        return enriched[0] || null;
      } catch (error) {
        wrapDbError('find reservation', error);
      }
    },

    async createWithConflictCheck(data) {
      try {
        const created = await db.transaction(async (tx) => {
          const sameDay = await tx
            .select()
            .from(reservations)
            .where(
              and(
                eq(reservations.facilityId, data.facilityId),
                eq(reservations.reservationDate, data.reservationDate),
                inArray(reservations.status, ACTIVE_BLOCKING_STATUSES)
              )
            );

          const requestedSlot = new TimeSlot(
            data.reservationDate,
            data.startTime,
            data.endTime
          );
          const conflict = sameDay.find((item) => {
            const existingSlot = new TimeSlot(
              item.reservationDate,
              item.startTime,
              item.endTime
            );
            return requestedSlot.overlapsWith(existingSlot);
          });

          if (conflict) {
            throw new ConflictError(
              `Time slot overlaps with an existing ${conflict.status.toLowerCase()} booking (${conflict.startTime}–${conflict.endTime}).`
            );
          }

          const inserted = await tx.insert(reservations).values(data).returning();
          return inserted[0];
        });

        const enriched = await enrichReservations([created]);
        return enriched[0];
      } catch (error) {
        wrapDbError('create reservation', error);
      }
    },

    async updateStatus(id, { status, reviewerId, reviewNote }) {
      try {
        const rows = await db
          .update(reservations)
          .set({
            status,
            reviewerId: reviewerId ?? null,
            reviewNote: reviewNote ?? null,
            updatedAt: new Date(),
          })
          .where(eq(reservations.id, id))
          .returning();
        const enriched = await enrichReservations(rows);
        return enriched[0] || null;
      } catch (error) {
        wrapDbError('update reservation status', error);
      }
    },

    async rescheduleWithConflictCheck(
      id,
      { facilityId, reservationDate, startTime, endTime, reviewerId, reviewNote }
    ) {
      try {
        const updated = await db.transaction(async (tx) => {
          const sameDay = await tx
            .select()
            .from(reservations)
            .where(
              and(
                eq(reservations.facilityId, facilityId),
                eq(reservations.reservationDate, reservationDate),
                inArray(reservations.status, ACTIVE_BLOCKING_STATUSES)
              )
            );

          const requestedSlot = new TimeSlot(reservationDate, startTime, endTime);
          const conflict = sameDay.find((item) => {
            if (item.id === id) return false;
            const existingSlot = new TimeSlot(
              item.reservationDate,
              item.startTime,
              item.endTime
            );
            return requestedSlot.overlapsWith(existingSlot);
          });

          if (conflict) {
            throw new ConflictError(
              `Time slot overlaps with an existing ${conflict.status.toLowerCase()} booking (${conflict.startTime}–${conflict.endTime}).`
            );
          }

          const rows = await tx
            .update(reservations)
            .set({
              facilityId,
              reservationDate,
              startTime,
              endTime,
              reviewerId: reviewerId ?? null,
              reviewNote: reviewNote ?? null,
              updatedAt: new Date(),
            })
            .where(eq(reservations.id, id))
            .returning();
          return rows[0] || null;
        });

        if (!updated) return null;
        const enriched = await enrichReservations([updated]);
        return enriched[0];
      } catch (error) {
        wrapDbError('reschedule reservation', error);
      }
    },
  };

  async function enrichIssues(rows) {
    if (!rows.length) return [];
    const [allFacilities, allUsers] = await Promise.all([
      db.select().from(facilities),
      db.select().from(users),
    ]);
    const facilityMap = new Map(allFacilities.map((f) => [f.id, f]));
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    return rows.map((issue) => {
      const f = facilityMap.get(issue.facilityId);
      const u = userMap.get(issue.reporterId);
      return {
        ...issue,
        facilityCode: f?.code || '',
        facilityName: f?.name || 'Unknown Facility',
        facilityBuilding: f?.building || '',
        facilityFloor: f?.floor || '',
        facilityIsArchived: Boolean(f?.isArchived),
        reporterName: u?.fullName || 'Unknown Reporter',
        reporterEmail: u?.email || '',
        reporterRole: u?.role || '',
      };
    });
  }

  const issueRepo = {
    async listAll() {
      try {
        const rows = await db
          .select()
          .from(maintenanceIssues)
          .orderBy(desc(maintenanceIssues.createdAt));
        const enriched = await enrichIssues(rows);
        return enriched.filter((i) => !i.facilityIsArchived);
      } catch (error) {
        wrapDbError('list all issues', error);
      }
    },

    async listByReporterId(reporterId) {
      try {
        const rows = await db
          .select()
          .from(maintenanceIssues)
          .where(eq(maintenanceIssues.reporterId, reporterId))
          .orderBy(desc(maintenanceIssues.createdAt));
        const enriched = await enrichIssues(rows);
        return enriched.filter((i) => !i.facilityIsArchived);
      } catch (error) {
        wrapDbError('list user issues', error);
      }
    },

    async findById(id) {
      try {
        const rows = await db
          .select()
          .from(maintenanceIssues)
          .where(eq(maintenanceIssues.id, id));
        const enriched = await enrichIssues(rows);
        return enriched[0] || null;
      } catch (error) {
        wrapDbError('find issue by id', error);
      }
    },

    async create(data) {
      try {
        const rows = await db.insert(maintenanceIssues).values(data).returning();
        const enriched = await enrichIssues(rows);
        return enriched[0];
      } catch (error) {
        wrapDbError('create maintenance issue', error);
      }
    },

    async updateStatus(id, { status, actionTaken, assignedTo }) {
      try {
        const rows = await db
          .update(maintenanceIssues)
          .set({
            status,
            actionTaken: actionTaken ?? null,
            assignedTo: assignedTo ?? null,
            updatedAt: new Date(),
          })
          .where(eq(maintenanceIssues.id, id))
          .returning();
        const enriched = await enrichIssues(rows);
        return enriched[0] || null;
      } catch (error) {
        wrapDbError('update maintenance issue', error);
      }
    },
  };

  const userRepo = {
    async listAll() {
      try {
        return await db.select().from(users).orderBy(asc(users.role), asc(users.fullName));
      } catch (error) {
        wrapDbError('list users', error);
      }
    },

    async findByUid(uid) {
      try {
        const rows = await db.select().from(users).where(eq(users.uid, uid));
        return rows[0] || null;
      } catch (error) {
        wrapDbError('find user by uid', error);
      }
    },

    async findById(id) {
      try {
        const rows = await db.select().from(users).where(eq(users.id, id));
        return rows[0] || null;
      } catch (error) {
        wrapDbError('find user by id', error);
      }
    },

    async upsertVerifiedUser({ uid, email, fullName, role, department, isDemo }) {
      try {
        const rows = await db
          .insert(users)
          .values({
            uid,
            email,
            fullName,
            role,
            department: department || 'General Academic',
            isDemo: Boolean(isDemo),
            isActive: true,
          })
          .onConflictDoUpdate({
            target: users.uid,
            set: {
              email,
              fullName,
            },
          })
          .returning();
        return rows[0];
      } catch (error) {
        wrapDbError('upsert user', error);
      }
    },

    async updateProfile(id, { fullName, department, academicBlock }) {
      try {
        const updateSet = { fullName, department };
        if (academicBlock !== undefined) {
          updateSet.academicBlock = academicBlock;
        }
        const rows = await db
          .update(users)
          .set(updateSet)
          .where(eq(users.id, id))
          .returning();
        return rows[0] || null;
      } catch (error) {
        wrapDbError('update profile', error);
      }
    },

    async updateUserAccount(id, { role, isActive, department, academicBlock }) {
      try {
        const updateSet = { role, isActive, department };
        if (academicBlock !== undefined) {
          updateSet.academicBlock = academicBlock;
        }
        const rows = await db
          .update(users)
          .set(updateSet)
          .where(eq(users.id, id))
          .returning();
        return rows[0] || null;
      } catch (error) {
        wrapDbError('update user account', error);
      }
    },
  };

  const notificationPort = {
    async listByUserId(userId) {
      try {
        return await db
          .select()
          .from(notifications)
          .where(eq(notifications.userId, userId))
          .orderBy(desc(notifications.createdAt));
      } catch (error) {
        wrapDbError('list notifications', error);
      }
    },

    async create({ userId, title, message, type, linkPath }) {
      try {
        const rows = await db
          .insert(notifications)
          .values({
            userId,
            title,
            message,
            type: type || 'info',
            linkPath: linkPath || null,
            isRead: false,
          })
          .returning();
        return rows[0];
      } catch (error) {
        wrapDbError('create notification', error);
      }
    },

    async markAsRead(userId, id) {
      try {
        await db
          .update(notifications)
          .set({ isRead: true })
          .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
      } catch (error) {
        wrapDbError('mark notification read', error);
      }
    },

    async markAllAsRead(userId) {
      try {
        await db
          .update(notifications)
          .set({ isRead: true })
          .where(eq(notifications.userId, userId));
      } catch (error) {
        wrapDbError('mark all notifications read', error);
      }
    },
  };

  const auditLogPort = {
    async record({ actorUserId, actorEmail, actorRole, action, entityType, entityId, details }) {
      try {
        await db.insert(auditLogs).values({
          actorUserId: actorUserId || null,
          actorEmail,
          actorRole,
          action,
          entityType,
          entityId,
          details,
        });
      } catch (error) {
        console.error('[AuditLog Error] Failed to record audit entry:', error);
      }
    },

    async listRecent(limitCount = 30) {
      try {
        return await db
          .select()
          .from(auditLogs)
          .orderBy(desc(auditLogs.createdAt))
          .limit(limitCount);
      } catch (error) {
        wrapDbError('list audit logs', error);
      }
    },
  };

  return {
    facilityRepo,
    reservationRepo,
    issueRepo,
    userRepo,
    notificationPort,
    auditLogPort,
  };
}
