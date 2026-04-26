import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

import { users } from "./auth";

export const orderIntents = pgTable("order_intents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  latestCheckoutAt: timestamp("latest_checkout_at", {
    withTimezone: true
  }).notNull(),
  deliveryCluster: varchar("delivery_cluster", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  roomId: uuid("room_id"),
  createdAt: timestamp("created_at", {
    withTimezone: true
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true
  })
    .defaultNow()
    .notNull(),
  cancelledAt: timestamp("cancelled_at", {
    withTimezone: true
  }),
  expiredAt: timestamp("expired_at", {
    withTimezone: true
  })
});

export const matchRooms = pgTable("match_rooms", {
  id: uuid("id").defaultRandom().primaryKey(),
  leaderUserId: text("leader_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  deliveryCluster: varchar("delivery_cluster", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  minimumAmount: integer("minimum_amount").notNull(),
  totalAmount: integer("total_amount").notNull(),
  latestCheckoutAt: timestamp("latest_checkout_at", {
    withTimezone: true
  }).notNull(),
  createdAt: timestamp("created_at", {
    withTimezone: true
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true
  })
    .defaultNow()
    .notNull(),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  expiredAt: timestamp("expired_at", { withTimezone: true })
});

export const matchRoomMembers = pgTable("match_room_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id")
    .notNull()
    .references(() => matchRooms.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  orderIntentId: uuid("order_intent_id")
    .notNull()
    .references(() => orderIntents.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  createdAt: timestamp("created_at", {
    withTimezone: true
  })
    .defaultNow()
    .notNull()
});

export const settlements = pgTable("settlements", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id")
    .notNull()
    .references(() => matchRooms.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  amountOwed: integer("amount_owed").notNull(),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  markedPaidAt: timestamp("marked_paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", {
    withTimezone: true
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true
  })
    .defaultNow()
    .notNull()
});

export const paymentEvents = pgTable("payment_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id")
    .notNull()
    .references(() => matchRooms.id, { onDelete: "cascade" }),
  memberUserId: text("member_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  markedByUserId: text("marked_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 32 }).notNull(),
  createdAt: timestamp("created_at", {
    withTimezone: true
  })
    .defaultNow()
    .notNull(),
  metadata: text("metadata")
});

export const orderIntentsRelations = relations(orderIntents, ({ one }) => ({
  user: one(users, {
    fields: [orderIntents.userId],
    references: [users.id]
  }),
  room: one(matchRooms, {
    fields: [orderIntents.roomId],
    references: [matchRooms.id]
  })
}));

export const matchRoomsRelations = relations(matchRooms, ({ one, many }) => ({
  leader: one(users, {
    fields: [matchRooms.leaderUserId],
    references: [users.id]
  }),
  members: many(matchRoomMembers),
  settlements: many(settlements)
}));
