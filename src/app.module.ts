import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { TerminusModule } from '@nestjs/terminus';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import { GoogleStrategy } from './auth/google.strategy';
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
import { UserController } from './user/user.controller';
import { UserModule } from './user/user.module';
import { UserService } from './user/user.service';
import { ConfigModule } from '@nestjs/config';
import { KycModule } from './kyc/kyc.module';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TicketModule } from './ticket/ticket.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'), // Path to the folder containing the uploaded images
    }),
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGO_URI as string, {
      retryAttempts: 0,   // do not retry forever
      retryDelay: 0,
    })
    ,
    CacheModule.register({ isGlobal: true }),
    TerminusModule,
    JwtModule.register({
      global: true,   
      secret: process.env.JWT_SECRET || 'default_secret',
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
    UserModule,
    KycModule,
    TicketModule

  ],
  controllers: [HealthController, PromoController, UserController],  // ← Only root controllers here
  providers: [ReferralService, UserService,GoogleStrategy],
})
export class AppModule { }