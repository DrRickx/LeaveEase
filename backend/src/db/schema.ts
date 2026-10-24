import { sql } from "drizzle-orm";
import { randomUUIDv7 as uuidv7 } from "crypto";
import {
  date,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  boolean,
  varchar,
  check,
  jsonb,
  numeric,
  smallint,
  text,
  unique,
  index,
} from "drizzle-orm/pg-core";

export const departmentEnum = pgEnum("department", [
  "Engineering",
  "Human Resources (HR)",
  "Design",
  "People ops",
]);
export const leaveStatusEnum = pgEnum("leave_status", [
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "WITHDRAWN",
  "PENDING_HR",
  "PENDING_MANAGER",
]);
export const approvalDecisionEnum = pgEnum("approval_decision", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SKIPPED",
]);
export const roleEnum = pgEnum("role", ["EMPLOYEE", "MANAGER", "HR_ADMIN"]);
export type Role = (typeof roleEnum.enumValues)[number];

export type ApproverRole = Exclude<Role, "EMPLOYEE">;

export const leaveCodeEnum = pgEnum("leave_code", [
  "ANNUAL",
  "SICK",
  "PERSONAL",
  "BEREAVEMENT",
  "PARENTAL",
  "UNPAID",
]);

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  username: varchar("username", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull().unique(),
  role: roleEnum("role").notNull().default("EMPLOYEE"),
  department: departmentEnum("department").notNull().default("Engineering"),
  hireDate: date("hire_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const userProfiles = pgTable("user_profiles", {
  id: uuid("id")
    .primaryKey()
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  middleName: varchar("middle_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  imagePath: varchar("image_path"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;

export const leaveTypes = pgTable("leave_types", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  code: leaveCodeEnum("code").notNull().default("PERSONAL"),
  name: varchar("name", { length: 255 }).notNull().unique(),
  entitlement: numeric("entitlement", {
    precision: 5,
    scale: 1,
    mode: "number",
  }),
  allowHalfDays: boolean("allow_half_days").notNull().default(false),
  carryOverCap: numeric("carry_over_cap", {
    precision: 5,
    scale: 1,
    mode: "number",
  }),
  // null = never required; 2 = required when leave exceeds 2 days; 0 = always required
  documentRequiredAfterDays: smallint("document_required_after_days"),
  isStatutory: boolean("is_statutory").notNull().default(false),
  isPaid: boolean("is_paid").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type LeaveType = typeof leaveTypes.$inferSelect;
export type NewLeaveType = typeof leaveTypes.$inferInsert;

export const approvalPolicies = pgTable("approval_policies", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  version: varchar("version", { length: 20 }).notNull().unique(),
  effectiveFrom: date("effective_from").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const approvalPolicyRules = pgTable(
  "approval_policy_rules",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => approvalPolicies.id),
    leaveTypeId: uuid("leave_type_id")
      .notNull()
      .references(() => leaveTypes.id),
    maxDays: numeric("max_days", { precision: 5, scale: 1, mode: "number" }),
    chain: jsonb("chain").$type<ApproverRole[]>().notNull(),
    notifyManager: boolean("notify_manager").notNull().default(false),
  },
  (t) => [unique().on(t.policyId, t.leaveTypeId, t.maxDays).nullsNotDistinct()],
);

export type ApprovalPolicyRule = typeof approvalPolicyRules.$inferSelect;
export type NewApprovalPolicyRule = typeof approvalPolicyRules.$inferInsert;

export const leaveRequests = pgTable(
  "leave_requests",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    leaveType: leaveCodeEnum("leave_type").notNull(),
    dateFrom: date("date_from").notNull(),
    dateTo: date("date_to").notNull(),
    days: numeric("days", { precision: 4, scale: 1, mode: "number" })
      .notNull()
      .default(0),
    reason: text("reason"),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: leaveStatusEnum("status").notNull().default("PENDING_MANAGER"),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => approvalPolicies.id),
    chainSnapshot: jsonb("chain_snapshot").$type<ApproverRole[]>().notNull(),
    currentStep: smallint("current_step").notNull().default(0),
  },
  (table) => [
    index("chain_snapshots_idx").on(table.chainSnapshot),
    check("positive_days", sql`${table.days} > 0`),
    check("date_order", sql`${table.dateTo} >= ${table.dateFrom}`),
  ],
);

export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type NewLeaveRequest = typeof leaveRequests.$inferInsert;

export const leaveBalances = pgTable(
  "leave_balances",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    leaveType: leaveCodeEnum("leave_type").notNull(),
    entitled: numeric("entitled", { precision: 5, scale: 1, mode: "number" }),
    carried: numeric("carried", { precision: 5, scale: 1, mode: "number" }),
    adjustment: numeric("adjustment", {
      precision: 5,
      scale: 1,
      mode: "number",
    }),
    used: numeric("used", { precision: 5, scale: 1, mode: "number" }),
    pending: numeric("pending", { precision: 5, scale: 1, mode: "number" }),
    available: numeric("available", { precision: 5, scale: 1, mode: "number" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("leave_balances_id_idx").on(table.id),
    index("leave_balances_leave_type_idx").on(table.leaveType),
  ],
);

export type LeaveBalances = typeof leaveBalances.$inferSelect;
export type NewLeaveBalances = typeof leaveBalances.$inferInsert;

export const leaveRequestApprovals = pgTable(
  "leave_request_approvals",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    requestId: uuid("request_id")
      .notNull()
      .references(() => leaveRequests.id, { onDelete: "cascade" }),
    step: smallint("step").notNull(),
    role: roleEnum("role").notNull(),
    approverId: uuid("approver_id").references(() => users.id),
    decision: approvalDecisionEnum("decision").notNull().default("PENDING"),
    comment: text("comment"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (t) => [
    check("approver_role_not_employee", sql`${t.role} <> 'EMPLOYEE'`),
    unique().on(t.requestId, t.step),
    index().on(t.requestId),
  ],
);

export type LeaveRequestApproval = typeof leaveRequestApprovals.$inferSelect;
export type NewLeaveRequestApproval = typeof leaveRequestApprovals.$inferInsert;

export const holidays = pgTable(
  "holidays",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    date: date("date").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
  },
  (table) => [
    index("holidays_id_idx").on(table.id),
    index("holidays_date_idx").on(table.date),
    index("holidays_name_idx").on(table.name),
    unique().on(table.id, table.name),
  ],
);

export type Holiday = typeof holidays.$inferSelect;
export type NewHoliday = typeof holidays.$inferInsert;
