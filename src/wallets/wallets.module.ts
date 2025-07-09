import { Module } from '@nestjs/common';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { PrismaService } from '../database/prisma.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';

@Module({
  controllers: [WalletsController],
  providers: [WalletsService, PrismaService, RabbitMQService]
})
export class WalletsModule { }
