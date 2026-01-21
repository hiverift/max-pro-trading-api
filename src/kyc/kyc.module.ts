import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { Kyc,KycSchema } from './entities/kyc.entity';
import { UserSchema } from '../auth/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Kyc.name, schema: KycSchema },
      { name: 'User', schema: UserSchema },
    ]),
  ],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}