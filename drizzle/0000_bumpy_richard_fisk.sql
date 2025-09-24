CREATE TABLE "a11y_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"report" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_insights" (
	"id" text PRIMARY KEY NOT NULL,
	"test_id" text NOT NULL,
	"suggestions" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_results" (
	"test_id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"run_at" timestamp with time zone NOT NULL,
	"phase" text NOT NULL,
	"status_text" text,
	"summary_url" text,
	"json_url" text,
	"metrics" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"session_id" text PRIMARY KEY NOT NULL,
	"recent_tests" jsonb DEFAULT '[]'::jsonb,
	"ai_preferences" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_access_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_test_id_test_results_test_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."test_results"("test_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "a11y_reports_url_idx" ON "a11y_reports" USING btree ("url");--> statement-breakpoint
CREATE INDEX "a11y_reports_expires_at_idx" ON "a11y_reports" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "ai_insights_test_id_idx" ON "ai_insights" USING btree ("test_id");--> statement-breakpoint
CREATE INDEX "ai_insights_expires_at_idx" ON "ai_insights" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "test_results_url_idx" ON "test_results" USING btree ("url");--> statement-breakpoint
CREATE INDEX "test_results_run_at_idx" ON "test_results" USING btree ("run_at");--> statement-breakpoint
CREATE INDEX "test_results_phase_idx" ON "test_results" USING btree ("phase");--> statement-breakpoint
CREATE INDEX "user_sessions_last_access_idx" ON "user_sessions" USING btree ("last_access_at");