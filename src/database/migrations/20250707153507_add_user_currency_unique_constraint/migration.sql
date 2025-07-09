/*
  Warnings:

  - A unique constraint covering the columns `[userId,currency]` on the table `Wallet` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Wallet_userId_currency_key` ON `Wallet`(`userId`, `currency`);
