CREATE TABLE `diary_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`image_key` text,
	`image_type` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_diary_created_at_id` ON `diary_entries` (`created_at`,`id`);