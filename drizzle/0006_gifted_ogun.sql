CREATE TABLE `countries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`cuisine_type` text NOT NULL,
	`flag_emoji` text,
	`description` text,
	`region` text,
	`sub_region` text,
	`un_member` integer DEFAULT false NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `countries_name_unique` ON `countries` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `countries_code_unique` ON `countries` (`code`);--> statement-breakpoint
CREATE TABLE `group_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`joined_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `group_user_unique` ON `group_members` (`group_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`creator_id` integer NOT NULL,
	`is_public` integer DEFAULT true NOT NULL,
	`image_url` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `restaurants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`country_id` integer NOT NULL,
	`name` text NOT NULL,
	`address` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`place_id` text,
	`phone_number` text,
	`website` text,
	`price_level` integer,
	`image_url` text,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `restaurant_country_idx` ON `restaurants` (`country_id`);--> statement-breakpoint
CREATE INDEX `restaurant_place_id_idx` ON `restaurants` (`place_id`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`restaurantId` integer NOT NULL,
	`rating` integer NOT NULL,
	`comment` text,
	`is_public` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_restaurant_review_unique` ON `reviews` (`userId`,`restaurantId`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`open_id` text NOT NULL,
	`name` text,
	`email` text,
	`login_method` text,
	`role` text DEFAULT 'user' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`last_signed_in` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_open_id_unique` ON `users` (`open_id`);--> statement-breakpoint
CREATE TABLE `visits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`restaurantId` integer NOT NULL,
	`visited_at` integer NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `user_idx` ON `visits` (`userId`);--> statement-breakpoint
CREATE INDEX `restaurant_idx` ON `visits` (`restaurantId`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_restaurant_unique` ON `visits` (`userId`,`restaurantId`);