import { eq, inArray } from 'drizzle-orm';
import { db } from '../../../src/db/index.ts';
import { facilities, users } from '../../../src/db/schema.ts';
import {
  CICS_FACILITY_CATALOG,
  OBSOLETE_GENERIC_FACILITY_CODES,
} from '../../domain/projectInfo.js';

export const DEMO_USERS = [
  {
    uid: 'demo-student-001',
    email: 'student.demo@campus.local',
    fullName: 'Maya Chen',
    role: 'student',
    department: 'College of Informatics and Computing Sciences (CICS)',
    academicBlock: null,
    isDemo: true,
    isActive: true,
  },
  {
    uid: 'demo-professor-001',
    email: 'professor.demo@campus.local',
    fullName: 'Dr. Julian Reyes',
    role: 'professor',
    department: 'CICS Faculty',
    academicBlock: null,
    isDemo: true,
    isActive: true,
  },
  {
    uid: 'demo-admin-001',
    email: 'admin.demo@campus.local',
    fullName: 'Elena Alvarez',
    role: 'admin',
    department: 'CICS Facilities Operations',
    academicBlock: null,
    isDemo: true,
    isActive: true,
  },
];

const LEGACY_DEMO_DEPARTMENTS = new Set([
  'Computer Science & Robotics',
  'School of Engineering & Architecture',
  'Campus Facilities Operations',
]);

let seedPromise = null;

export async function ensureSeedData() {
  if (seedPromise) {
    return seedPromise;
  }

  seedPromise = (async () => {
    try {
      // 1. Ensure demo sandbox accounts exist with CICS-aligned department context (no fabricated academicBlock)
      for (const demoUser of DEMO_USERS) {
        const existingUsers = await db
          .select()
          .from(users)
          .where(eq(users.uid, demoUser.uid));

        if (existingUsers.length === 0) {
          await db.insert(users).values(demoUser);
        } else if (LEGACY_DEMO_DEPARTMENTS.has(existingUsers[0].department || '')) {
          await db
            .update(users)
            .set({ department: demoUser.department })
            .where(eq(users.id, existingUsers[0].id));
        }
      }

      // 2. Safely archive obsolete generic facilities without deleting linked historical foreign-key records
      if (OBSOLETE_GENERIC_FACILITY_CODES.length > 0) {
        await db
          .update(facilities)
          .set({
            isArchived: true,
            isReservable: false,
            status: 'Restricted',
          })
          .where(inArray(facilities.code, [...OBSOLETE_GENERIC_FACILITY_CODES]));
      }

      // 3. Synchronize the canonical 37 CICS Building facilities without fabricating capacities or utilization records
      const existingRows = await db.select().from(facilities);
      const existingByCode = new Map(existingRows.map((row) => [row.code, row]));

      const missingCicsFacilities = CICS_FACILITY_CATALOG.filter(
        (room) => !existingByCode.has(room.code)
      ).map((room) => ({
        code: room.code,
        name: room.name,
        category: room.category,
        building: room.building,
        floor: room.floor,
        capacity: room.capacity,
        description: room.description,
        amenities: room.amenities,
        status: room.status,
        allowedRoles: room.allowedRoles,
        openHour: room.openHour,
        closeHour: room.closeHour,
        imageUrl: room.imageUrl,
        isReservable: room.isReservable,
        isArchived: false,
        isDemo: false,
      }));

      if (missingCicsFacilities.length > 0) {
        await db.insert(facilities).values(missingCicsFacilities).onConflictDoNothing();
      }
    } catch (error) {
      seedPromise = null;
      console.error('[Seed/Migration] CICS database synchronization failed:', error);
    }
  })();

  return seedPromise;
}

export function resetSeedCache() {
  seedPromise = null;
}
