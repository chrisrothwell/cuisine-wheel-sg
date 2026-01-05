CREATE TABLE `countries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`code` varchar(3) NOT NULL,
	`cuisineType` varchar(100) NOT NULL,
	`flagEmoji` varchar(10),
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `countries_id` PRIMARY KEY(`id`),
	CONSTRAINT `countries_name_unique` UNIQUE(`name`),
	CONSTRAINT `countries_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `group_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','member') NOT NULL DEFAULT 'member',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `group_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `group_user_unique` UNIQUE(`groupId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`creatorId` int NOT NULL,
	`isPublic` boolean NOT NULL DEFAULT true,
	`imageUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `restaurants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`countryId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` text NOT NULL,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`placeId` varchar(255),
	`phoneNumber` varchar(50),
	`website` varchar(500),
	`priceLevel` int,
	`imageUrl` text,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `restaurants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`restaurantId` int NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`isPublic` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_restaurant_review_unique` UNIQUE(`userId`,`restaurantId`)
);
--> statement-breakpoint
CREATE TABLE `visits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`restaurantId` int NOT NULL,
	`visitedAt` timestamp NOT NULL DEFAULT (now()),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `visits_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_restaurant_unique` UNIQUE(`userId`,`restaurantId`)
);
--> statement-breakpoint
CREATE INDEX `group_idx` ON `group_members` (`groupId`);--> statement-breakpoint
CREATE INDEX `member_user_idx` ON `group_members` (`userId`);--> statement-breakpoint
CREATE INDEX `creator_idx` ON `groups` (`creatorId`);--> statement-breakpoint
CREATE INDEX `country_idx` ON `restaurants` (`countryId`);--> statement-breakpoint
CREATE INDEX `place_id_idx` ON `restaurants` (`placeId`);--> statement-breakpoint
CREATE INDEX `review_user_idx` ON `reviews` (`userId`);--> statement-breakpoint
CREATE INDEX `review_restaurant_idx` ON `reviews` (`restaurantId`);--> statement-breakpoint
CREATE INDEX `rating_idx` ON `reviews` (`rating`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `visits` (`userId`);--> statement-breakpoint
CREATE INDEX `restaurant_idx` ON `visits` (`restaurantId`);