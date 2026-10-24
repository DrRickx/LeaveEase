CREATE TYPE "approval_decision" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "leave_code" AS ENUM('ANNUAL', 'SICK', 'PERSONAL', 'BEREAVEMENT', 'PARENTAL', 'UNPAID');--> statement-breakpoint
CREATE TYPE "leave_status" AS ENUM('APPROVED', 'REJECTED', 'CANCELLED', 'WITHDRAWN', 'PENDING_HR', 'PENDING_MANAGER');--> statement-breakpoint
CREATE TABLE "approval_policies" (
	"id" uuid PRIMARY KEY,
	"version" varchar(20) NOT NULL UNIQUE,
	"effective_from" date NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_policy_rules" (
	"id" uuid PRIMARY KEY,
	"policy_id" uuid NOT NULL,
	"leave_type_id" uuid NOT NULL,
	"max_days" numeric(5,1),
	"chain" jsonb NOT NULL,
	"notify_manager" boolean DEFAULT false NOT NULL,
	CONSTRAINT "approval_policy_rules_policy_id_leave_type_id_max_days_unique" UNIQUE NULLS NOT DISTINCT("policy_id","leave_type_id","max_days")
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" uuid PRIMARY KEY,
	"date" date NOT NULL,
	"name" varchar(255) NOT NULL,
	CONSTRAINT "holidays_id_name_unique" UNIQUE("id","name")
);
--> statement-breakpoint
CREATE TABLE "leave_balances" (
	"id" uuid PRIMARY KEY,
	"leave_type" "leave_code" NOT NULL,
	"entitled" numeric(5,1),
	"carried" numeric(5,1),
	"adjustment" numeric(5,1),
	"used" numeric(5,1),
	"pending" numeric(5,1),
	"available" numeric(5,1),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_request_approvals" (
	"id" uuid PRIMARY KEY,
	"request_id" uuid NOT NULL,
	"step" smallint NOT NULL,
	"role" "role" NOT NULL,
	"approver_id" uuid,
	"decision" "approval_decision" DEFAULT 'PENDING'::"approval_decision" NOT NULL,
	"comment" text,
	"decided_at" timestamp with time zone,
	CONSTRAINT "leave_request_approvals_request_id_step_unique" UNIQUE("request_id","step"),
	CONSTRAINT "approver_role_not_employee" CHECK ("role" <> 'EMPLOYEE')
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" uuid PRIMARY KEY,
	"user_id" uuid NOT NULL,
	"leave_type" "leave_code" NOT NULL,
	"date_from" date NOT NULL,
	"date_to" date NOT NULL,
	"days" numeric(4,1) DEFAULT '0' NOT NULL,
	"reason" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "leave_status" DEFAULT 'PENDING_MANAGER'::"leave_status" NOT NULL,
	"policy_id" uuid NOT NULL,
	"chain_snapshot" jsonb NOT NULL,
	"current_step" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "positive_days" CHECK ("days" > 0),
	CONSTRAINT "date_order" CHECK ("date_to" >= "date_from")
);
--> statement-breakpoint
CREATE TABLE "leave_types" (
	"id" uuid PRIMARY KEY,
	"code" "leave_code" DEFAULT 'PERSONAL'::"leave_code" NOT NULL,
	"name" varchar(255) NOT NULL UNIQUE,
	"entitlement" numeric(5,1),
	"allow_half_days" boolean DEFAULT false NOT NULL,
	"carry_over_cap" numeric(5,1),
	"document_required_after_days" smallint,
	"is_statutory" boolean DEFAULT false NOT NULL,
	"is_paid" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "holidays_id_idx" ON "holidays" ("id");--> statement-breakpoint
CREATE INDEX "holidays_date_idx" ON "holidays" ("date");--> statement-breakpoint
CREATE INDEX "holidays_name_idx" ON "holidays" ("name");--> statement-breakpoint
CREATE INDEX "leave_balances_id_idx" ON "leave_balances" ("id");--> statement-breakpoint
CREATE INDEX "leave_balances_leave_type_idx" ON "leave_balances" ("leave_type");--> statement-breakpoint
CREATE INDEX "leave_request_approvals_request_id_index" ON "leave_request_approvals" ("request_id");--> statement-breakpoint
CREATE INDEX "chain_snapshots_idx" ON "leave_requests" ("chain_snapshot");--> statement-breakpoint
ALTER TABLE "approval_policy_rules" ADD CONSTRAINT "approval_policy_rules_policy_id_approval_policies_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "approval_policies"("id");--> statement-breakpoint
ALTER TABLE "approval_policy_rules" ADD CONSTRAINT "approval_policy_rules_leave_type_id_leave_types_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id");--> statement-breakpoint
ALTER TABLE "leave_request_approvals" ADD CONSTRAINT "leave_request_approvals_request_id_leave_requests_id_fkey" FOREIGN KEY ("request_id") REFERENCES "leave_requests"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "leave_request_approvals" ADD CONSTRAINT "leave_request_approvals_approver_id_users_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_policy_id_approval_policies_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "approval_policies"("id");