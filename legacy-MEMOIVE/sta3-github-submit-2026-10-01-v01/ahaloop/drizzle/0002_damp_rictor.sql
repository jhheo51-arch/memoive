CREATE TABLE `benefit_applications` (
	`application_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`benefit_id` text NOT NULL,
	`stage` text DEFAULT 'checking' NOT NULL,
	`eligibility_status` text DEFAULT 'needs_info' NOT NULL,
	`expected_value` integer DEFAULT 0 NOT NULL,
	`detail` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_benefit_applications_user_benefit` ON `benefit_applications` (`user_id`,`benefit_id`);--> statement-breakpoint
CREATE INDEX `idx_benefit_applications_stage_updated` ON `benefit_applications` (`stage`,`updated_at`);--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `birth_year` integer DEFAULT 1999 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `region` text DEFAULT '서울특별시' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `employment_status` text DEFAULT 'employed' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `housing_status` text DEFAULT 'monthly_rent' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `annual_income` integer DEFAULT 3200 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `monthly_transit_cost` integer DEFAULT 60000 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `has_student_loan` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `life_event` text DEFAULT 'first_independence' NOT NULL;