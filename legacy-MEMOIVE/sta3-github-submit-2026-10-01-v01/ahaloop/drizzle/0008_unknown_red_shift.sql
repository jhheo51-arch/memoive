CREATE TABLE `operational_alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`operator_user_id` text NOT NULL,
	`alert_key` text NOT NULL,
	`category` text NOT NULL,
	`severity` text NOT NULL,
	`title` text NOT NULL,
	`detail` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`first_detected_at` text NOT NULL,
	`last_detected_at` text NOT NULL,
	`resolved_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_operational_alert_operator_key` ON `operational_alerts` (`operator_user_id`,`alert_key`);--> statement-breakpoint
CREATE INDEX `idx_operational_alert_status` ON `operational_alerts` (`operator_user_id`,`status`,`severity`);--> statement-breakpoint
CREATE TABLE `operations_health_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`operator_user_id` text NOT NULL,
	`overall_status` text NOT NULL,
	`alert_count` integer DEFAULT 0 NOT NULL,
	`source_failure_count` integer DEFAULT 0 NOT NULL,
	`notification_failure_count` integer DEFAULT 0 NOT NULL,
	`data_anomaly_count` integer DEFAULT 0 NOT NULL,
	`checked_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_operations_health_operator_time` ON `operations_health_runs` (`operator_user_id`,`checked_at`);