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

// Creator codes and referral system tables
export const creatorProfiles = pgTable('creator_profiles', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 50 }).unique().notNull(),
  displayName: varchar('display_name', { length: 100 }),
  stripeCouponId: text('stripe_coupon_id'), // Links to Stripe coupon
  stripePromotionCodeId: text('stripe_promotion_code_id'), // Links to Stripe promotion code
  plusCommissionPercent: varchar('plus_commission_percent', { length: 10 }).notNull().default('5.00'),
  proCommissionPercent: varchar('pro_commission_percent', { length: 10 }).notNull().default('15.00'),
  freeMonthsPlus: integer('free_months_plus').notNull().default(1),
  requiresCreditCard: boolean('requires_credit_card').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  totalEarnings: integer('total_earnings').notNull().default(0), // in cents
  totalRedemptions: integer('total_redemptions').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const codeRedemptions = pgTable('code_redemptions', {
  id: serial('id').primaryKey(),
  creatorProfileId: integer('creator_profile_id').notNull().references(() => creatorProfiles.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  stripeSubscriptionId: text('stripe_subscription_id'),
  stripePriceId: text('stripe_price_id'),
  planName: varchar('plan_name', { length: 50 }),
  redeemedAt: timestamp('redeemed_at').notNull().defaultNow(),
  freeMonthsGranted: integer('free_months_granted').notNull().default(0),
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, cancelled, expired
});

export const userReferrals = pgTable('user_referrals', {
  id: serial('id').primaryKey(),
  referrerId: varchar('referrer_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  referredId: varchar('referred_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  referralCode: varchar('referral_code', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, converted, expired
  convertedAt: timestamp('converted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const userShareCodes = pgTable('user_share_codes', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 50 }).unique().notNull(),
  totalReferrals: integer('total_referrals').notNull().default(0),
  successfulReferrals: integer('successful_referrals').notNull().default(0),
  freeMonthsEarned: integer('free_months_earned').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const creatorEarnings = pgTable('creator_earnings', {
  id: serial('id').primaryKey(),
  creatorProfileId: integer('creator_profile_id').notNull().references(() => creatorProfiles.id, { onDelete: 'cascade' }),
  redemptionId: integer('redemption_id').notNull().references(() => codeRedemptions.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(), // in cents
  commissionPercent: varchar('commission_percent', { length: 10 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, paid, cancelled
  stripePaymentId: text('stripe_payment_id'),
  stripeInvoiceId: text('stripe_invoice_id'),
  calculatedAt: timestamp('calculated_at').notNull().defaultNow(),
  paidAt: timestamp('paid_at'),
});

// System configuration for dynamic settings
export const systemConfig = pgTable('system_config', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).unique().notNull(),
  value: jsonb('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// HTML Deployments table for storing user-generated sites
export const deployments = pgTable('deployments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  deploymentId: varchar('deployment_id', { length: 100 }).unique().notNull(), // URL-safe deployment ID
  title: varchar('title', { length: 255 }),
  htmlContent: text('html_content').notNull(), // Sanitized HTML content
  cssContent: text('css_content'), // Optional separate CSS
  jsContent: text('js_content'), // Optional separate JS (sanitized)
  metadata: jsonb('metadata'), // Store any additional metadata
  viewCount: integer('view_count').notNull().default(0),
  isPublic: boolean('is_public').notNull().default(true),
  expiresAt: timestamp('expires_at'), // Optional expiration
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// RELATIONS
export const usersRelations = relations(users, ({ one, many }) => ({
  chatSessions: many(chatSessions),
  deployments: many(deployments),
  stripe: one(stripe, {
    fields: [users.id],
    references: [stripe.userId],
  }),
  creatorProfile: one(creatorProfiles, {
    fields: [users.id],
    references: [creatorProfiles.userId],
  }),
  shareCode: one(userShareCodes, {
    fields: [users.id],
    references: [userShareCodes.userId],
  }),
  referralsMade: many(userReferrals, {
    relationName: 'referrer',
  }),
  referralsReceived: many(userReferrals, {
    relationName: 'referred',
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

// Creator system relations
export const creatorProfilesRelations = relations(creatorProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [creatorProfiles.userId],
    references: [users.id],
  }),
  redemptions: many(codeRedemptions),
  earnings: many(creatorEarnings),
}));

export const codeRedemptionsRelations = relations(codeRedemptions, ({ one, many }) => ({
  creatorProfile: one(creatorProfiles, {
    fields: [codeRedemptions.creatorProfileId],
    references: [creatorProfiles.id],
  }),
  user: one(users, {
    fields: [codeRedemptions.userId],
    references: [users.id],
  }),
  earnings: many(creatorEarnings),
}));

export const userReferralsRelations = relations(userReferrals, ({ one }) => ({
  referrer: one(users, {
    fields: [userReferrals.referrerId],
    references: [users.id],
    relationName: 'referrer',
  }),
  referred: one(users, {
    fields: [userReferrals.referredId],
    references: [users.id],
    relationName: 'referred',
  }),
}));

export const userShareCodesRelations = relations(userShareCodes, ({ one }) => ({
  user: one(users, {
    fields: [userShareCodes.userId],
    references: [users.id],
  }),
}));

export const creatorEarningsRelations = relations(creatorEarnings, ({ one }) => ({
  creatorProfile: one(creatorProfiles, {
    fields: [creatorEarnings.creatorProfileId],
    references: [creatorProfiles.id],
  }),
  redemption: one(codeRedemptions, {
    fields: [creatorEarnings.redemptionId],
    references: [codeRedemptions.id],
  }),
}));

export const deploymentsRelations = relations(deployments, ({ one }) => ({
  user: one(users, {
    fields: [deployments.userId],
    references: [users.id],
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
export type CreatorProfile = typeof creatorProfiles.$inferSelect;
export type NewCreatorProfile = typeof creatorProfiles.$inferInsert;
export type CodeRedemption = typeof codeRedemptions.$inferSelect;
export type NewCodeRedemption = typeof codeRedemptions.$inferInsert;
export type UserReferral = typeof userReferrals.$inferSelect;
export type NewUserReferral = typeof userReferrals.$inferInsert;
export type UserShareCode = typeof userShareCodes.$inferSelect;
export type NewUserShareCode = typeof userShareCodes.$inferInsert;
export type CreatorEarning = typeof creatorEarnings.$inferSelect;
export type NewCreatorEarning = typeof creatorEarnings.$inferInsert;
export type SystemConfig = typeof systemConfig.$inferSelect;
export type NewSystemConfig = typeof systemConfig.$inferInsert;
export type Deployment = typeof deployments.$inferSelect;
export type NewDeployment = typeof deployments.$inferInsert;

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