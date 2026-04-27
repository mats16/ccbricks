CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `app_settings` (`key`, `value`) VALUES ('app_title', 'ccbricks');
--> statement-breakpoint
INSERT INTO `app_settings` (`key`, `value`) VALUES ('welcome_heading', 'Claude Code on Databricks');
--> statement-breakpoint
CREATE TABLE `mcp_servers` (
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`url` text,
	`headers` text,
	`command` text,
	`args` text,
	`env` text,
	`managed_type` text,
	`is_disabled` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `mcp_servers_pk` PRIMARY KEY(`user_id`, `id`),
	CONSTRAINT `fk_mcp_servers_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `session_events` (
	`uuid` text PRIMARY KEY,
	`session_id` text NOT NULL,
	`type` text NOT NULL,
	`subtype` text,
	`message` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_session_events_session_id_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY,
	`user_id` text,
	`title` text,
	`status` text DEFAULT 'init' NOT NULL,
	`sdk_session_id` text,
	`context` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`user_id` text PRIMARY KEY,
	`claude_config_backup` text DEFAULT 'auto' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_user_settings_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY,
	`email` text,
	`is_admin` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `session_events_session_created_at_idx` ON `session_events` (`session_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_updated_at_idx` ON `sessions` (`updated_at`);--> statement-breakpoint
CREATE INDEX `sessions_status_idx` ON `sessions` (`status`);
