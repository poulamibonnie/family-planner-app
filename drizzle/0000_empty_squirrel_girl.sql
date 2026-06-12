CREATE TABLE `calendar_events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`description` text NOT NULL,
	`scope` text NOT NULL,
	`user_id` text NOT NULL,
	`family_id` text,
	`notify_minutes_before` integer NOT NULL,
	`notified` integer DEFAULT false NOT NULL,
	`reminder_email` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `families` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`member_ids` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `families_code_unique` ON `families` (`code`);--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`type` text NOT NULL,
	`week_number` integer,
	`year` integer NOT NULL,
	`day` text,
	`user_id` text NOT NULL,
	`scope` text NOT NULL,
	`family_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `meal_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`day` text NOT NULL,
	`meal_type` text NOT NULL,
	`meal` text NOT NULL,
	`week_number` integer NOT NULL,
	`year` integer NOT NULL,
	`family_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shopping_items` (
	`id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`quantity` text NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`added_by` text NOT NULL,
	`added_by_name` text NOT NULL,
	`family_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `todos` (
	`id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`date` text NOT NULL,
	`user_id` text NOT NULL,
	`scope` text NOT NULL,
	`family_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`family_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);