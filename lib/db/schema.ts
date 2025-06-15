// lib/db/schema.ts
import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  uuid,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// The 'id' is now a varchar to store the Firebase UID.
// The 'passwordHash' column is removed.
export const users = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(), // Changed from serial to varchar for Firebase UID
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }).unique(),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  isGuest: boolean('is_guest').notNull().default(false),
  litellmVirtualKey: text('litellm_virtual_key'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

// The 'userId' is updated to varchar to match the new users.id type.
export const stripe = pgTable('stripe', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeProductId: text('stripe_product_id'),
  planName: varchar('plan_name', { length: 50 }).notNull().default('Free'),
  subscriptionStatus: varchar('subscription_status', { length: 20 }).notNull().default('inactive'),
});

// The 'userId' is updated to varchar to match the new users.id type.
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  stripeId: integer('stripe_id').notNull().references(() => stripe.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 }).references(() => users.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
});

// The 'userId' is updated to varchar to match the new users.id type.
export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  selectedModelId: varchar('selected_model_id', { length: 100 }),
});

export const chatMessages = pgTable('chat_messages', {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').notNull().references(() => chatSessions.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 10 }).notNull(),
    content: jsonb('content').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

// RELATIONS
export const usersRelations = relations(users, ({ one, many }) => ({
  chatSessions: many(chatSessions),
  stripe: one(stripe, {
    fields: [users.id],
    references: [stripe.userId],
  }),
}));

export const stripeRelations = relations(stripe, ({ one, many }) => ({
  activityLogs: many(activityLogs),
  user: one(users, {
    fields: [stripe.userId],
    references: [users.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  stripe: one(stripe, {
    fields: [activityLogs.stripeId],
    references: [stripe.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
    user: one(users, {
        fields: [chatSessions.userId],
        references: [users.id],
    }),
    messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
    session: one(chatSessions, {
        fields: [chatMessages.sessionId],
        references: [chatSessions.id],
    }),
}));

// TYPES
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Stripe = typeof stripe.$inferSelect;
export type NewStripe = typeof stripe.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  CREATE_TEAM = 'CREATE_TEAM',
  REMOVE_TEAM_MEMBER = 'REMOVE_TEAM_MEMBER',
  INVITE_TEAM_MEMBER = 'INVITE_TEAM_MEMBER',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION',
}