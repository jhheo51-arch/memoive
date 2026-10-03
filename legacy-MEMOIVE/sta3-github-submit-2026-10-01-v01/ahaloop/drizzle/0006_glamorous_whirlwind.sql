CREATE TABLE `notification_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`channel` text NOT NULL,
	`day` text NOT NULL,
	`status` text NOT NULL,
	`provider_message_id` text,
	`provider_group_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_notification_pilot_daily` ON `notification_attempts` (`user_id`,`day`);--> statement-breakpoint
CREATE INDEX `idx_notification_user_time` ON `notification_attempts` (`user_id`,`created_at`);