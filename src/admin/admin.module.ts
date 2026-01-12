import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserSchema } from '../auth/user.schema';
import { TransactionSchema } from 'src/wallet/schema/transaction.schema';
import { TradeSchema } from 'src/trade/schema/trade.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Transaction', schema: TransactionSchema },
      { name: 'Trade', schema: TradeSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}