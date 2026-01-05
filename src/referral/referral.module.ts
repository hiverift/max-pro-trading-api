import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReferralController } from './referral.controller';
import { ReferralService } from './referral.service';
import { User, UserSchema } from '../auth/user.schema';  // ← Import schema
import { WalletModule } from '../wallet/wallet.module';
import { UserModule } from 'src/user/user.module';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [
    UserModule,
   forwardRef(() => WalletModule),
  ],
  controllers: [ReferralController],
  providers: [ReferralService],
  exports: [ReferralService],
})
export class ReferralModule {}