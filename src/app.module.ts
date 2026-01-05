import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { TerminusModule } from '@nestjs/terminus';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import { TransactionModule } from './transaction/transaction.module';
import { AuthModule } from './auth/auth.module';
import { WalletModule } from './wallet/wallet.module';
import { ReferralModule } from './referral/referral.module';
import { InfluencerModule } from './influencer/influencer.module';
import { AdminModule } from './admin/admin.module';
import { TradeModule } from './trade/trade.module';
import { CopyTradeModule } from './copy-trade/copy-trade.module';
import { HealthController } from './health/health.controller';
import { ReferralService } from './referral/referral.service';
import { PromoController } from './promo/promo.controller';
import { SupportController } from './support/support.controller';
import { UserController } from './user/user.controller';
import { UserModule } from './user/user.module';
import { UserService } from './user/user.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot('mongodb+srv://rs5045280:xbpneTRReMJD9LAc@cluster0.sbbouj5.mongodb.net/trading-db'),
    CacheModule.register({ isGlobal: true }),
    TerminusModule,
    JwtModule.register({
      global: true,
      secret: 'default_secret',
      signOptions: { expiresIn: '1h' },
    }),
    PassportModule,
    AuthModule,
    WalletModule,
    ReferralModule, 
    InfluencerModule,
    AdminModule,
    TradeModule,
    CopyTradeModule,
    TransactionModule,
    UserModule
  
  ],
  controllers: [HealthController, PromoController, SupportController, UserController],  // ← Only root controllers here
  providers: [ReferralService, UserService],                    // ← Remove all manual providers
})
export class AppModule {}