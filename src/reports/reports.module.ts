// src/reports/reports.module.ts
// New Module for Reports & Analytics (Milestone 10)

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { UserSchema } from '../auth/user.schema';
import { Transaction, TransactionSchema } from 'src/wallet/schema/transaction.schema';
import { Trade ,TradeSchema} from 'src/trade/schema/trade.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Transaction', schema: TransactionSchema },
      { name: 'Trade', schema: TradeSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}