import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TradeController } from './trade.controller';
import { TradeService } from './trade.service';
import { AssetSchema } from './schema/asset.schema';
import { TradeSchema } from './schema/trade.schema';
import { UserSchema } from '../auth/user.schema';
import { ReferralModule } from 'src/referral/referral.module';
import { CopyTradeModule } from '../copy-trade/copy-trade.module';  // ← ADD THIS TOO
import { TradeSettings ,TradeSettingsSchema} from './schema/settings.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Asset', schema: AssetSchema },
      { name: 'Trade', schema: TradeSchema },
      { name: 'User', schema: UserSchema },
      { name: 'TradeSettings', schema: TradeSettingsSchema },
    ]),
    ReferralModule,     // ← ADD THIS LINE
    CopyTradeModule,    // ← ADD THIS LINE (for CopyTradeService)
  ],
  controllers: [TradeController],
  providers: [TradeService],
  exports: [TradeService], // optional
})
export class TradeModule {}