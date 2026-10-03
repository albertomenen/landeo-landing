CREATE TABLE `support_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`direction` text NOT NULL,
	`body` text NOT NULL,
	`status` text NOT NULL,
	`telegram_id` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `support_user_time` ON `support_messages` (`user_id`,`created_at`);