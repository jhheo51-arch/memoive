CREATE TABLE `guestbook_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nickname` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_guestbook_created_at_id` ON `guestbook_entries` (`created_at`,`id`);