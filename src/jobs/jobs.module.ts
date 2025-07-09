// ../jobs/jobs.module.ts
import { Module } from '@nestjs/common';
import { LoginProcessor } from './login.processor';
import { PrismaService } from '../database/prisma.service';
import { RabbitMQModule } from '../rabbitmq/rabbitmq.module';
import { NotificationProcessor } from './notification.processor';
import { WalletFundingProcessor } from './funding.processor';
import { WalletWithdrawalProcessor, } from './withdrawal.processor';
import { WalletTransferProcessor, } from './transfer.processor';

@Module({
    imports: [RabbitMQModule],
    providers: [LoginProcessor, WalletFundingProcessor, WalletTransferProcessor,
        WalletWithdrawalProcessor, PrismaService, NotificationProcessor],
})
export class JobsModule { }
