import { pgTable, varchar, decimal, boolean, timestamp, uuid, integer, text } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// Plans table
export const plans = pgTable('plans', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  priceMonthly: decimal('price_monthly', { precision: 10, scale: 2 }),
  priceYearly: decimal('price_yearly', { precision: 10, scale: 2 }),
  stripePriceIdMonthly: varchar('stripe_price_id_monthly', { length: 100 }),
  stripePriceIdYearly: varchar('stripe_price_id_yearly', { length: 100 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

// Features table
export const features = pgTable('features', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

// Plan Features table (many-to-many)
export const planFeatures = pgTable('plan_features', {
  planId: varchar('plan_id', { length: 50 }).notNull().references(() => plans.id, { onDelete: 'cascade' }),
  featureId: varchar('feature_id', { length: 50 }).notNull().references(() => features.id, { onDelete: 'cascade' }),
  enabled: boolean('enabled').notNull().default(false),
  limitValue: integer('limit_value'), // NULL means unlimited
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // 複合主キー設定
  pk: { columns: [table.planId, table.featureId], name: "plan_features_pkey" },
}))

// Users table (linked to Supabase auth.users)
// 注意: 実際のサービスではauth.users.plan_typeを使用しており、このテーブルは将来的な拡張用
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // References auth.users.id
  name: varchar('name', { length: 100 }).notNull(),
  planId: varchar('plan_id', { length: 50 }).notNull().default('free').references(() => plans.id),
  stripeCustomerId: varchar('stripe_customer_id', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // auth.usersへの外部キー制約は手動で設定（Supabase auth schemaのため）
}))

// User Subscriptions table
export const userSubscriptions = pgTable('user_subscriptions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull(), // 外部キー制約は手動設定（auth.users参照のため）
  planId: varchar('plan_id', { length: 50 }).notNull().references(() => plans.id),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 100 }),
  status: varchar('status', { length: 20 }).notNull(),
  trialStart: timestamp('trial_start', { withTimezone: true }),
  trialEnd: timestamp('trial_end', { withTimezone: true }),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

// AI Usage Logs table
export const aiUsageLogs = pgTable('ai_usage_logs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull(), // 外部キー制約は手動設定（auth.users参照のため）
  provider: varchar('provider', { length: 20 }).notNull(),
  model: varchar('model', { length: 50 }),
  tokensUsed: integer('tokens_used'),
  cost: decimal('cost', { precision: 10, scale: 4 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
})

// Type exports for TypeScript
export type Plan = typeof plans.$inferSelect
export type InsertPlan = typeof plans.$inferInsert

export type Feature = typeof features.$inferSelect
export type InsertFeature = typeof features.$inferInsert

export type PlanFeature = typeof planFeatures.$inferSelect
export type InsertPlanFeature = typeof planFeatures.$inferInsert

export type User = typeof users.$inferSelect
export type InsertUser = typeof users.$inferInsert

export type UserSubscription = typeof userSubscriptions.$inferSelect
export type InsertUserSubscription = typeof userSubscriptions.$inferInsert

export type AiUsageLog = typeof aiUsageLogs.$inferSelect
export type InsertAiUsageLog = typeof aiUsageLogs.$inferInsert