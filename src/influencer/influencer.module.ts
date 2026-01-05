import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InfluencerController } from './influencer.controller';
import { InfluencerService } from './influencer.service';
import { UserSchema } from '../auth/user.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'User', schema: UserSchema }])],
  controllers: [InfluencerController],
  providers: [InfluencerService],
})
export class InfluencerModule {}