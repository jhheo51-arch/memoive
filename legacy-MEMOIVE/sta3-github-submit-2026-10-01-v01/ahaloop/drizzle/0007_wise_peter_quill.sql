CREATE TABLE `pilot_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`operator_user_id` text NOT NULL,
	`participant_code` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`consent_status` text DEFAULT 'pending' NOT NULL,
	`choices_to_first_benefit` integer,
	`first_benefit_elapsed_ms` integer,
	`first_benefit_id` text,
	`preparation_started` integer DEFAULT false NOT NULL,
	`stop_point` text,
	`observation` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_pilot_operator_participant` ON `pilot_sessions` (`operator_user_id`,`participant_code`);--> statement-breakpoint
CREATE INDEX `idx_pilot_operator_status` ON `pilot_sessions` (`operator_user_id`,`status`);