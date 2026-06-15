CREATE TABLE `google_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text,
	`expires_at` text NOT NULL,
	`calendar_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `google_connections_user_id_unique` ON `google_connections` (`user_id`);--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `source` text DEFAULT 'local' NOT NULL;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `google_event_id` text;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `shared_from_id` text;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `shared_to_family_at` text;