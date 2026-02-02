import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InfluencerController } from './influencer.controller';
import { InfluencerService } from './influencer.service';
import { UserSchema } from '../auth/user.schema';
import { Transaction, TransactionSchema } from 'src/transaction/schema/transaction.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'User', schema: UserSchema }, { name: Transaction.name, schema: TransactionSchema }])
  ],

  controllers: [InfluencerController],
  providers: [InfluencerService],
})
export class InfluencerModule { }