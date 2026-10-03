CREATE TABLE `experiment_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`experiment_id` text NOT NULL,
	`variant` text NOT NULL,
	`assigned_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_experiment_user` ON `experiment_assignments` (`user_id`,`experiment_id`);--> statement-breakpoint
CREATE TABLE `portfolio_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_portfolio_user_kind` ON `portfolio_records` (`user_id`,`kind`);--> statement-breakpoint
CREATE TABLE `source_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`benefit_id` text NOT NULL,
	`source_url` text NOT NULL,
	`content_hash` text,
	`excerpt` text,
	`previous_excerpt` text,
	`status` text NOT NULL,
	`note` text,
	`discovered_at` text NOT NULL,
	`reviewed_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_source_reviews_user_benefit` ON `source_reviews` (`user_id`,`benefit_id`);--> statement-breakpoint
ALTER TABLE `benefit_applications` ADD `received_amount` integer;--> statement-breakpoint
ALTER TABLE `benefit_applications` ADD `received_at` text;--> statement-breakpoint
ALTER TABLE `benefit_applications` ADD `receipt_method` text;--> statement-breakpoint
ALTER TABLE `benefit_applications` ADD `rule_version` text;--> statement-breakpoint
ALTER TABLE `events` ADD `properties` text;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `profile_data` text;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `data_mode` text DEFAULT 'demo' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `confirmed_at` text;