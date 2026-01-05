import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { TransactionSchema } from './schema/transaction.schema';
import { UserSchema } from '../auth/user.schema';
import { TradeModule } from 'src/trade/trade.module';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Transaction', schema: TransactionSchema },
      { name: 'User', schema: UserSchema },
    ]),
    TradeModule,
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}