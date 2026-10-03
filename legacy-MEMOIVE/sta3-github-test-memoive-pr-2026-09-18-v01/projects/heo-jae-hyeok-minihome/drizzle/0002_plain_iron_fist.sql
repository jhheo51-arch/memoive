CREATE TABLE `admin_credentials` (
	`id` integer PRIMARY KEY NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `admin_login_attempts` (
	`client_key` text PRIMARY KEY NOT NULL,
	`failed_count` integer NOT NULL,
	`window_started_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `daily_visitors` (
	`date_key` text NOT NULL,
	`visitor_key` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`date_key`, `visitor_key`)
);
--> statement-breakpoint
CREATE INDEX `idx_daily_visitors_date_key` ON `daily_visitors` (`date_key`);--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`interest_title` text NOT NULL,
	`interest_tags` text NOT NULL,
	`updated_at` integer NOT NULL
);
