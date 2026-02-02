import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { Transaction, TransactionSchema } from 'src/transaction/schema/transaction.schema';
import { UserSchema } from '../auth/user.schema';
import { TradeModule } from 'src/trade/trade.module';
import { ReferralModule } from 'src/referral/referral.module';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Transaction', schema: TransactionSchema },
      { name: 'User', schema: UserSchema },
    ]),
    TradeModule,
    ReferralModule,
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule { }