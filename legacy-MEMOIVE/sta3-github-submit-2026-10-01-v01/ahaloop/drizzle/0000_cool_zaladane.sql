CREATE TABLE `consent_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`channel` text NOT NULL,
	`purpose` text NOT NULL,
	`agreed` integer NOT NULL,
	`agreed_at` text,
	`withdrawn_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_consent_logs_user_channel` ON `consent_logs` (`user_id`,`channel`);--> statement-breakpoint
CREATE TABLE `contents` (
	`content_id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`topic_tags` text NOT NULL,
	`role_tags` text NOT NULL,
	`title` text NOT NULL,
	`source_url` text NOT NULL,
	`published_at` text NOT NULL,
	`deadline` text,
	`approval_status` text DEFAULT 'pending' NOT NULL,
	`reviewed_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_contents_approval_published` ON `contents` (`approval_status`,`published_at`);--> statement-breakpoint
CREATE TABLE `evaluations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`send_id` text,
	`relevance` text NOT NULL,
	`amount` text NOT NULL,
	`action_intent` integer NOT NULL,
	`improvement` text,
	`receive_next` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_evaluations_user_time` ON `evaluations` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`send_id` text,
	`content_id` text,
	`event_type` text NOT NULL,
	`event_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_events_user_time` ON `events` (`user_id`,`event_at`);--> statement-breakpoint
CREATE INDEX `idx_events_type_time` ON `events` (`event_type`,`event_at`);--> statement-breakpoint
CREATE TABLE `followup_tasks` (
	`task_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`request_type` text NOT NULL,
	`due_at` text NOT NULL,
	`owner` text DEFAULT '미배정' NOT NULL,
	`outcome` text,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_followup_tasks_status_due` ON `followup_tasks` (`status`,`due_at`);--> statement-breakpoint
CREATE TABLE `sends` (
	`send_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`card_ids` text NOT NULL,
	`channel` text NOT NULL,
	`sent_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`status` text DEFAULT 'delivered' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sends_user_sent` ON `sends` (`user_id`,`sent_at`);--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`interest_topics` text NOT NULL,
	`interest_roles` text NOT NULL,
	`content_types` text NOT NULL,
	`preferred_channel` text NOT NULL,
	`restart_consent` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
