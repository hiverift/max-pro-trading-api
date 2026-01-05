// New src/copy-trade/copy-trade.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CopyTradeController } from './copy-trade.controller';
import { CopyTradeService } from './copy-trade.service';
import { UserSchema } from '../auth/user.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'User', schema: UserSchema }])],
  controllers: [CopyTradeController],
  providers: [CopyTradeService],
  exports: [CopyTradeService],
})
export class CopyTradeModule {}