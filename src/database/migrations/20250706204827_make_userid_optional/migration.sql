-- DropForeignKey
ALTER TABLE `loginlog` DROP FOREIGN KEY `LoginLog_userId_fkey`;

-- DropIndex
DROP INDEX `LoginLog_userId_fkey` ON `loginlog`;

-- AlterTable
ALTER TABLE `loginlog` MODIFY `userId` INTEGER NULL;
