import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/auth/user.schema';
import { TransactionSchema } from 'src/transaction/schema/transaction.schema';
import { TradeSchema } from 'src/trade/schema/trade.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: 'Transaction', schema: TransactionSchema },
      { name: 'Trade', schema: TradeSchema },
    ]),
  ],
  exports: [
    MongooseModule,
  ],
})
export class UserModule { }
