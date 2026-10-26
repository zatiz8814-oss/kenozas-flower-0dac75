import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core'
export const accounts = pgTable('accounts', {
  id: text().primaryKey(),
  name: text().notNull(),
  isAdmin: boolean('is_admin').notNull().default(false),
  cart: jsonb().notNull().default([]),
  wishlist: jsonb().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})
export const shoppingSessions = pgTable('shopping_sessions', {
  tokenHash: text('token_hash').primaryKey(),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
})
export const categories = pgTable('categories', {
  id: serial().primaryKey(),
  name: text().notNull().unique(),
})
export const products = pgTable('products', {
  id: serial().primaryKey(),
  name: text().notNull(),
  description: text().notNull(),
  price: integer().notNull(),
  stock: integer().notNull(),
  category: text()
    .notNull()
    .references(() => categories.name, { onUpdate: 'cascade' }),
  image: text().notNull(),
  tag: text().notNull().default(''),
  active: boolean().notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})
export const promos = pgTable('promos', {
  code: text().primaryKey(),
  percent: integer().notNull(),
  active: boolean().notNull().default(true),
})
export const orders = pgTable('orders', {
  id: serial().primaryKey(),
  customerId: text('customer_id').references(() => accounts.id),
  customerName: text('customer_name').notNull(),
  type: text().notNull(),
  fulfillment: text().notNull(),
  address: text().notNull().default(''),
  courierNote: text('courier_note').notNull().default(''),
  note: text().notNull().default(''),
  payment: text().notNull(),
  paymentStatus: text('payment_status').notNull().default('Lunas'),
  status: text().notNull().default('Selesai'),
  subtotal: integer().notNull(),
  discount: integer().notNull().default(0),
  total: integer().notNull(),
  requestKey: text('request_key').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})
export const orderItems = pgTable('order_items', {
  id: serial().primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id),
  name: text().notNull(),
  quantity: integer().notNull(),
  price: integer().notNull(),
})
export const invoices = pgTable('invoices', {
  orderId: integer('order_id')
    .primaryKey()
    .references(() => orders.id),
  number: text().notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})
export const activity = pgTable('activity', {
  id: serial().primaryKey(),
  actor: text().notNull(),
  message: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})
export const settings = pgTable('settings', {
  key: text().primaryKey(),
  value: text().notNull(),
})
export const reviews = pgTable('reviews', {
  id: serial().primaryKey(),
  customerId: text('customer_id')
    .notNull()
    .references(() => accounts.id),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id),
  rating: integer().notNull(),
  comment: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})
