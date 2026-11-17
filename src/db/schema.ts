import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull().unique(),
  fullName: text('full_name').notNull(),
  role: text('role').notNull().default('student'),
  department: text('department'),
  academicBlock: text('academic_block'),
  isDemo: boolean('is_demo').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const facilities = pgTable('facilities', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  building: text('building').notNull(),
  floor: text('floor').notNull(),
  capacity: integer('capacity'),
  description: text('description').notNull(),
  amenities: text('amenities').notNull(),
  status: text('status').notNull().default('Available'),
  allowedRoles: text('allowed_roles').notNull().default('student,professor,admin'),
  openHour: text('open_hour').notNull().default('07:00'),
  closeHour: text('close_hour').notNull().default('21:00'),
  imageUrl: text('image_url').notNull(),
  isReservable: boolean('is_reservable').notNull().default(true),
  isArchived: boolean('is_archived').notNull().default(false),
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const reservations = pgTable('reservations', {
  id: serial('id').primaryKey(),
  facilityId: integer('facility_id')
    .references(() => facilities.id, { onDelete: 'cascade' })
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  reservationDate: text('reservation_date').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  purpose: text('purpose').notNull(),
  academicBlock: text('academic_block'),
  attendeesCount: integer('attendees_count').notNull().default(1),
  status: text('status').notNull().default('Pending'),
  reviewerId: integer('reviewer_id').references(() => users.id),
  reviewNote: text('review_note'),
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const maintenanceIssues = pgTable('maintenance_issues', {
  id: serial('id').primaryKey(),
  facilityId: integer('facility_id')
    .references(() => facilities.id, { onDelete: 'cascade' })
    .notNull(),
  reporterId: integer('reporter_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  category: text('category').notNull(),
  priority: text('priority').notNull().default('Medium'),
  title: text('title').notNull(),
  description: text('description').notNull(),
  imageDataUrl: text('image_data_url'),
  status: text('status').notNull().default('Open'),
  actionTaken: text('action_taken'),
  assignedTo: text('assigned_to'),
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull().default('info'),
  linkPath: text('link_path'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorUserId: integer('actor_user_id').references(() => users.id),
  actorEmail: text('actor_email').notNull(),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  details: text('details').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  reservations: many(reservations),
  maintenanceIssues: many(maintenanceIssues),
  notifications: many(notifications),
}));

export const facilitiesRelations = relations(facilities, ({ many }) => ({
  reservations: many(reservations),
  maintenanceIssues: many(maintenanceIssues),
}));

export const reservationsRelations = relations(reservations, ({ one }) => ({
  facility: one(facilities, {
    fields: [reservations.facilityId],
    references: [facilities.id],
  }),
  user: one(users, {
    fields: [reservations.userId],
    references: [users.id],
  }),
}));

export const maintenanceIssuesRelations = relations(maintenanceIssues, ({ one }) => ({
  facility: one(facilities, {
    fields: [maintenanceIssues.facilityId],
    references: [facilities.id],
  }),
  reporter: one(users, {
    fields: [maintenanceIssues.reporterId],
    references: [users.id],
  }),
}));
