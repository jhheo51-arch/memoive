ALTER TABLE `user_profiles` ADD `household_type` text DEFAULT 'single' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `care_needs` text DEFAULT '[]' NOT NULL;